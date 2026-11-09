import { StitchConnection } from "./stitch.mjs";
import { prepareCopies, integrateCopies } from "./collaboration.mjs";
import { spawn, execFileSync } from "node:child_process";
import { createInterface } from "node:readline";
import fs from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

const roles = {
  lead: "Comoy, team lead. Plan the requested work, split frontend and backend ownership, define API request/response contracts and acceptance criteria, and provide a concise actionable handoff. Do not implement code.",
  design:
    "Sukijem, designer. Define the layout, visual system, responsive behavior and accessibility. Provide implementation guidance. Do not implement code.",
  frontend:
    "Dono, frontend developer. Implement the frontend using React and Next.js as appropriate. Run relevant checks.",
  backend:
    "Kiwir, backend developer. Implement needed server, API and data functionality. If none is required, explain briefly. Run relevant checks.",
  review:
    "Ijum, reviewer. Inspect the integrated work, run appropriate checks, and report actionable findings with engineer ownership. Do not implement fixes yourself.",
};
export function resolveCodexExecutable() {
  if (process.env.CODEX_BIN) return process.env.CODEX_BIN;
  if (process.platform !== "win32") return "codex";
  try {
    const executable = execFileSync("powershell.exe", [
      "-NoProfile", "-NonInteractive", "-Command",
      "$c = Get-Command codex.exe -ErrorAction SilentlyContinue; if ($c) { $c.Source } else { Get-AppxPackage -Name OpenAI.Codex | ForEach-Object { Join-Path $_.InstallLocation 'app/resources/codex.exe' } }",
    ], { encoding: "utf8", windowsHide: true, timeout: 10000 }).trim()
      .split(/\r?\n/).find((candidate) => fs.existsSync(candidate));
    if (executable) return executable;
  } catch { /* Fall back to normal PATH lookup. */ }
  return "codex";
}
export function initialState(workspace) {
  return {
    tasks: [],
    approvals: [],
    events: [],
    paused: false,
    settings: { workspace, previewUrl: "" },
  };
}
export function validateTask(input) {
  if (
    typeof input.brief !== "string" ||
    !input.brief.trim() ||
    input.brief.length > 20000
  )
    throw new Error("Enter a brief between 1 and 20,000 characters.");
  if (
    !Array.isArray(input.roles) ||
    !input.roles.length ||
    input.roles.some((r) => !roles[r])
  )
    throw new Error("Choose at least one team member.");
  return {
    id: randomUUID(),
    title: String(input.title || input.brief.split("\n")[0])
      .trim()
      .slice(0, 100),
    brief: input.brief.trim(),
    roles: Object.keys(roles).filter(role => input.roles.includes(role)),
    stage: 0,
    status: "queued",
    createdAt: new Date().toISOString(),
    output: "",
    history: [],
  };
}
export class OfficeEngine {
  constructor({
    directory = path.join(process.cwd(), ".meznest"),
    workspace = process.cwd(),
    executable,
    spawnProcess = spawn,
  } = {}) {
    this.directory = directory;
    this.file = path.join(directory, "office.json");
    this.executable = executable;
    this.spawnProcess = spawnProcess;
    fs.mkdirSync(directory, { recursive: true });
    this.state = fs.existsSync(this.file)
      ? JSON.parse(fs.readFileSync(this.file, "utf8"))
      : initialState(workspace);
    for (const task of this.state.tasks)
      if (["running", "waiting"].includes(task.status)) {
        task.status = "paused";
        task.error =
          "Session stopped. Retry to continue from the last completed handoff.";
      }
    this.state.projects ||= [{ id: randomUUID(), name: path.basename(this.state.settings.workspace), workspace: this.state.settings.workspace, previewUrl: this.state.settings.previewUrl }];
    this.state.settings.projectId ||= this.state.projects[0].id;
    for (const task of this.state.tasks) { task.projectId ||= this.state.projects[0].id; task.workspace ||= this.state.projects[0].workspace; }
    this.state.approvals = [];
    this.connection = {
      status: "disconnected",
      message: "Connect your local Codex to bring the team to life.",
    };
    this.pending = new Map();
    this.approvalRequests = new Map();
    this.seq = 0;
    this.busy = false;
    this.child = null;
    this.connecting = null;
  }
  save() {
    const temp = this.file + ".tmp";
    fs.writeFileSync(temp, JSON.stringify(this.state, null, 2));
    fs.renameSync(temp, this.file);
  }
  snapshot() {
    return { ...this.state, connection: this.connection, models: this.models || [], modelError: this.modelError || "", stitch: this.stitch?.snapshot() || { status: "disconnected", models: [] } };
  }
  event(text, role) {
    this.state.events.unshift({
      id: randomUUID(),
      time: new Date().toISOString(),
      text,
      role,
    });
    this.state.events = this.state.events.slice(0, 150);
    this.save();
  }
  send(message) {
    if (!this.child?.stdin.writable) throw new Error("Codex is disconnected.");
    this.child.stdin.write(JSON.stringify(message) + "\n");
  }
  request(method, params = {}) {
    const id = ++this.seq;
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(
          new Error(
            `Codex did not respond to ${method}. Reconnect and try again.`,
          ),
        );
      }, 60000);
      this.pending.set(id, { resolve, reject, timer });
      try {
        this.send({ id, method, params });
      } catch (e) {
        clearTimeout(timer);
        this.pending.delete(id);
        reject(e);
      }
    });
  }
  async connect() {
    if (
      this.connection.status === "connected" ||
      this.connection.status === "signin"
    )
      return this.snapshot();
    if (this.connecting) return this.connecting;
    this.connecting = this.open().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }
  async open() {
    this.connection = {
      status: "connecting",
      message: "Connecting to local Codex…",
    };
    try {
      const child = this.spawnProcess(
        this.executable || resolveCodexExecutable(),
        ["app-server", "--listen", "stdio://"],
        { windowsHide: true, stdio: ["pipe", "pipe", "pipe"] },
      );
      this.child = child;
      createInterface({ input: child.stdout }).on("line", (line) => {
        try {
          this.message(JSON.parse(line));
        } catch {
          /* Non-protocol diagnostics are not client events. */
        }
      });
      child.stderr.on("data", () => {});
      child.on("error", (error) => this.disconnected(error.message, child));
      child.on("exit", () =>
        this.disconnected("Local Codex stopped. Reconnect to continue.", child),
      );
      await this.request("initialize", {
        clientInfo: { name: "meznest", title: "Meznest", version: "0.1.0" },
        capabilities: { experimentalApi: true },
      });
      this.send({ method: "initialized", params: {} });
      const { account } = await this.request("account/read", {
        refreshToken: false,
      });
      if (!account) {
        this.connection = {
          status: "signin",
          message: "Sign in with ChatGPT to connect your team.",
        };
        return this.snapshot();
      }
      if (account.type !== "chatgpt")
        throw new Error(
          "Sign in to Codex with your ChatGPT account, then reconnect. Meznest does not switch to paid API billing.",
        );
      this.connection = {
        status: "connected",
        message: "Connected through your ChatGPT account",
        plan: account.planType,
      };
      await this.loadModels().catch(error => { this.modelError = error.message; });
      this.event("Your team is connected and ready.");
      void this.pump();
      return this.snapshot();
    } catch (error) {
      this.child?.kill();
      this.child = null;
      this.connection = { status: "error", message: error.message };
      throw error;
    }
  }
  async loadModels() {
    if (this.connection.status !== "connected") throw new Error("Connect Codex first.");
    const models = []; let cursor;
    do { const page = await this.request("model/list", { limit: 100, includeHidden: false, ...(cursor ? { cursor } : {}) }); models.push(...(page.data || []).filter(m => !m.hidden)); cursor = page.nextCursor; } while (cursor);
    this.models = models; this.modelError = "";
  }
  async connectStitch(key) { this.stitch ||= new StitchConnection(); await this.stitch.connect(key || process.env.STITCH_API_KEY); }
  async disconnectStitch() { if (this.state.tasks.some(t => t.provider === 'stitch' && t.status === 'running')) throw new Error('Wait for the design to finish.'); await this.stitch?.close(); }
  workerSettings(input) {
    if (!roles[input.role]) throw new Error("Unknown worker.");
    if (input.provider === "stitch") {
      if (input.role !== "design") throw new Error("Stitch is available for the designer.");
      if (this.stitch?.status !== "connected") throw new Error("Connect Stitch first.");
      if (input.model && !this.stitch.models.some(m => m.model === input.model)) throw new Error("Choose a model reported by Stitch.");
      this.state.workers ||= {}; this.state.workers[input.role] = { provider: 'stitch', model: input.model || '' }; this.save(); return;
    }
    if (input.provider !== "codex") throw new Error("This provider is not connected yet.");
    if (input.model && !(this.models || []).some(m => m.model === input.model)) throw new Error("Refresh models and choose an available model.");
    this.state.workers ||= {};
    this.state.workers[input.role] = { provider: "codex", model: input.model || "" };
    this.save();
  }
  async login() {
    if (!this.child) await this.connect();
    if (this.connection.status === "connected") return;
    if (this.connection.loginUrl) return;
    const result = await this.request("account/login/start", {
      type: "chatgpt",
    });
    this.connection = {
      status: "signin",
      message:
        "Finish signing in in your browser. Your team will connect automatically.",
      loginUrl: result.authUrl,
    };
  }
  disconnected(message, child) {
    if (this.child !== child) return;
    this.child = null;
    this.connection = { status: "error", message };
    this.models = [];
    for (const item of this.pending.values()) {
      clearTimeout(item.timer);
      item.reject(new Error(message));
    }
    this.pending.clear();
    for (const task of this.state.tasks)
      if (["running", "waiting"].includes(task.status) && task.provider !== "stitch") {
        task.status = "failed";
        task.error = message;
      }
    this.state.approvals = [];
    this.approvalRequests.clear();
    this.busy = false;
    this.save();
  }
  message(msg) {
    if (msg.method && msg.id !== undefined) {
      this.serverRequest(msg);
      return;
    }
    if (msg.id !== undefined) {
      const p = this.pending.get(msg.id);
      if (p) {
        clearTimeout(p.timer);
        this.pending.delete(msg.id);
        msg.error
          ? p.reject(new Error(msg.error.message))
          : p.resolve(msg.result);
      }
      return;
    }
    const p = msg.params || {};
    if (msg.method === "account/login/completed") {
      if (p.success)
        void this.request("account/read", { refreshToken: false })
          .then(async ({ account }) => {
            if (account?.type === "chatgpt") {
              this.connection = {
                status: "connected",
                message: "Connected through your ChatGPT account",
                plan: account.planType,
              };
              await this.loadModels().catch(error => { this.modelError = error.message; });
              this.event("Your team is connected and ready.");
              void this.pump();
            }
          })
          .catch((error) => {
            this.connection = { status: "error", message: error.message };
          });
      else
        this.connection = {
          status: "signin",
          message: p.error || "Sign-in was not completed. Try again.",
        };
      return;
    }
    const task = this.state.tasks.find(
      (t) =>
        t.threadId === p.threadId && ["running", "waiting"].includes(t.status),
    );
    if (!task) return;
    if (msg.method === "turn/started") task.turnId = p.turn.id;
    if (msg.method === "item/agentMessage/delta") {
      task.output = (task.output + p.delta).slice(-100000);
      this.save();
    }
    if (msg.method === "item/completed" && p.item?.type === "agentMessage") {
      if (!task.output.includes(p.item.text)) task.output += p.item.text;
      this.save();
    }
    if (msg.method === "item/started" && p.item?.type === "commandExecution")
      this.event("Running a project check or command.", task.roles[task.stage]);
    if (msg.method === "item/completed" && p.item?.type === "fileChange")
      this.event("Updated project files.", task.roles[task.stage]);
    if (msg.method === "serverRequest/resolved") {
      const key = String(p.requestId);
      this.approvalRequests.delete(key);
      this.state.approvals = this.state.approvals.filter((a) => a.id !== key);
      if (!this.state.approvals.some((a) => a.taskId === task.id))
        task.status = "running";
      this.save();
    }
    if (msg.method === "turn/completed") {
      this.state.approvals = this.state.approvals.filter(
        (a) => a.taskId !== task.id,
      );
      for (const [key] of this.approvalRequests) if (!this.state.approvals.some(a=>a.id===key)) this.approvalRequests.delete(key);
      if (p.turn.status === "completed") {
        task.history.push({ role: task.roles[task.stage], text: task.output, threadId: task.threadId, provider: "codex" });
        if (task.roles[task.stage] === "review" && task.roles.some(r => ["frontend","backend"].includes(r))) {
          try {
            const match=task.output.match(/MEZNEST_REVIEW\s*(\{[^\n]*\})/);
            if (!match) throw Error("Reviewer did not provide a structured verdict. Retry review.");
            const verdict=JSON.parse(match[1]);
            if(!["pass","changes_requested"].includes(verdict.verdict)) throw Error("Invalid review verdict.");
            if(verdict.verdict === "changes_requested") {
              const owners=[...new Set((verdict.findings||[]).map(f=>f.owner))];
              if(!owners.length || owners.some(r=>!["frontend","backend"].includes(r)||!task.roles.includes(r)))throw Error("Review findings need valid engineer owners.");
              task.reviewRounds=(task.reviewRounds||0)+1;
              if(task.reviewRounds>=3)throw Error("Three review rounds completed. Inspect unresolved findings before retrying.");
              owners.sort((a,b)=>["frontend","backend"].indexOf(a)-["frontend","backend"].indexOf(b));
              task.roles.splice(task.stage+1,0,...owners,"review");
            }
          } catch(error) { task.status="paused"; task.error=error.message; this.busy=false; this.save(); return; }
        }
        task.stage++;
        task.status = task.stage >= task.roles.length ? "done" : "queued";
        this.event(
          task.status === "done"
            ? `Completed: ${task.title}`
            : "Handoff ready for the next teammate.",
          task.roles[task.stage - 1],
        );
      } else {
        task.status = p.turn.status === "interrupted" ? "paused" : "failed";
        task.error = p.turn.error?.message || "Work was interrupted.";
        this.save();
      }
      this.busy = false;
      this.finishParallel(task);
      void this.pump();
    }
  }
  serverRequest(msg) {
    const task = this.state.tasks.find(
      (t) =>
        t.threadId === msg.params?.threadId &&
        ["running", "waiting"].includes(t.status),
    );
    const supported = [
      "item/commandExecution/requestApproval",
      "item/fileChange/requestApproval",
      "item/tool/requestUserInput",
    ];
    if (!task || !supported.includes(msg.method)) {
      this.send({
        id: msg.id,
        error: {
          code: -32601,
          message:
            "This request is not supported by Meznest. Stop and report the needed action to the user.",
        },
      });
      return;
    }
    const id = String(msg.id);
    this.approvalRequests.set(id, msg.id);
    task.status = "waiting";
    this.state.approvals.push({
      id,
      taskId: task.id,
      method: msg.method,
      title: msg.method.includes("requestUserInput")
        ? "Your teammate has a question"
        : "Your approval is needed",
      details:
        msg.params.command ||
        msg.params.reason ||
        "Review the requested file change.",
      questions: msg.params.questions,
    });
    this.event("Waiting for your input.", task.roles[task.stage]);
  }
  approve(id, decision, answers) {
    const approval = this.state.approvals.find((a) => a.id === id);
    if (!approval || !this.approvalRequests.has(id))
      throw new Error("This request has already been resolved.");
    if (!["accept", "decline"].includes(decision))
      throw new Error("Invalid approval decision.");
    let result = { decision };
    if (approval.questions) {
      const values = {};
      for (const q of approval.questions) {
        if (typeof answers?.[q.id] !== "string" || !answers[q.id].trim())
          throw new Error("Answer each question.");
        values[q.id] = { answers: [answers[q.id]] };
      }
      result = { answers: values };
    }
    this.send({ id: this.approvalRequests.get(id), result });
    this.approvalRequests.delete(id);
    this.state.approvals = this.state.approvals.filter((a) => a.id !== id);
    const task = this.state.tasks.find((t) => t.id === approval.taskId);
    if (task && !this.state.approvals.some((a) => a.taskId === task.id))
      task.status = "running";
    this.event(
      approval.questions
        ? "Your answer was sent."
        : decision === "accept"
          ? "Action approved for this request."
          : "Action declined.",
    );
  }
  add(input) {
    const task = validateTask(input);
    task.projectId = this.state.settings.projectId;
    task.workspace = this.state.settings.workspace;
    this.state.tasks.push(task);
    this.event(`Added to the queue: ${task.title}`);
    void this.pump();
    return task;
  }
  finishParallel(child) {
    if (!child.parentId) return;
    const parent=this.state.tasks.find(t=>t.id===child.parentId);
    if(!parent || parent.status === "cancelled")return;
    const children=this.state.tasks.filter(t=>parent.parallelIds?.includes(t.id));
    if(children.some(t=>["failed","paused"].includes(t.status))) { parent.status="paused"; parent.error="An engineer stopped. Retry the stopped engineer to continue."; this.save(); return; }
    if(!children.every(t=>t.status==="done"))return;
    try {
      const files=integrateCopies(parent.workspace,parent.parallelRoot,children.map(t=>t.roles[0]),parent.baseline);
      parent.history.push(...children.flatMap(t=>t.history.filter((h,i)=>i >= parent.history.length)),{role:"lead",text:"Integrated engineering changes: "+files.join(", ")});
      parent.stage+=children.length; parent.status=parent.stage>=parent.roles.length?"done":"queued";
      parent.parallelIds=undefined; parent.error=undefined; this.save();
    } catch(error) { parent.status="paused";parent.error=error.message;this.save(); }
  }
  async pump() {
    if (
      this.busy ||
      this.state.paused ||
      (this.connection.status !== "connected" && this.stitch?.status !== "connected")
    )
      return;
    const active=this.state.tasks.filter(t=>["running","waiting"].includes(t.status)&&!t.parallelIds);
    const task = this.state.tasks.find(t => t.status === "queued" && (active.length===0 || (t.parentId && active.length<2 && active.every(a=>a.parentId===t.parentId))));
    if (!task) return;
    if (!task.parentId && task.roles[task.stage]==="frontend" && task.roles[task.stage+1]==="backend") {
      try {
        task.parallelRoot=path.join(this.directory,"runs",task.id,String(task.stage));
        task.baseline=prepareCopies(task.workspace,task.parallelRoot,["frontend","backend"]);
        task.parallelIds=[];
        for(const role of ["frontend","backend"]) {
          const child=validateTask({title:task.title+" · "+role,brief:task.brief,roles:[role]});
          Object.assign(child,{parentId:task.id,projectId:task.projectId,workspace:path.join(task.parallelRoot,role),history:[...task.history]});
          task.parallelIds.push(child.id);this.state.tasks.push(child);
        }
        task.status="waiting";this.save();void this.pump();return;
      } catch(error) {task.status="failed";task.error=error.message;this.save();return;}
    }
    this.busy = true;
    task.status = "running";
    task.output = "";
    task.error = undefined;
    task.threadId = undefined;
    task.turnId = undefined;
    this.save();
    try {
      const role = task.roles[task.stage];
      const worker = this.state.workers?.[role] || { provider: 'codex', model: '' };
      task.provider = worker.provider;
      if (worker.provider === 'stitch') {
        const project = this.state.projects.find(p => p.id === task.projectId);
        if (!project) throw new Error('Project not found.');
        this.event('Sukijem is generating a design in Stitch.', role);
        task.output = await this.stitch.generate(project, task, worker.model, () => this.save());
        task.history.push({ role, text: task.output, provider: 'stitch', stitch: task.stitch });
        task.stage++; task.status = task.stage >= task.roles.length ? 'done' : task.exportWarning ? 'paused' : 'queued';
        if (task.status === 'paused') task.error = 'Design created in Stitch, but exports need attention before implementation. ' + task.exportWarning;
        this.busy = false; this.event(task.exportWarning ? 'Stitch design created; local export needs attention.' : 'Stitch design saved to the project folder.', role); void this.pump(); return;
      }
      if (this.connection.status !== 'connected') throw new Error('Connect Codex to run this worker.');
      const project = this.state.projects.find(p => p.id === task.projectId);
      const sessionKey = role + ':' + (worker.model || 'default');
      const resumeId = !task.parentId && project?.codexThreads?.[sessionKey];
      const result = await this.request(resumeId ? "thread/resume" : "thread/start", {
        ...(resumeId ? { threadId: resumeId } : {}),
        cwd: task.workspace || this.state.settings.workspace,
        ...(this.state.workers?.[role]?.model ? { model: this.state.workers[role].model } : {}),
        approvalPolicy: "never",
        sandbox: "danger-full-access",
        developerInstructions: `You are ${roles[role]} You are part of Meznest, a personal website development team. Work only inside the selected project. Never publish, deploy, spend money, send external messages, delete user data, or change production systems. If such an action is needed, explain it in your final handoff and stop. Do not spawn agents. Preserve user changes. For parallel engineering copies, never edit linked node_modules or files outside your assigned workspace. Frontend owns UI and backend owns server code; coordinate through the supplied planning handoff. Summarize actual work, files changed, validation, and remaining issues. Do not claim unperformed work.`,
      });
      task.threadId = result.thread.id;
      if (project && !task.parentId) { project.codexThreads ||= {}; project.codexThreads[sessionKey] = task.threadId; }
      task.sessions ||= []; task.sessions.push({ role, threadId: task.threadId, model: worker.model || 'default' });
      this.save();
      this.event(`${roles[role].split(",")[0]} started: ${task.title}`, role);
      const projectHistory = this.state.tasks.filter(t => t.id !== task.id && t.projectId === task.projectId && t.status === "done").slice(-5).map(t => t.title + "\n" + t.history.map(h => h.text).join("\n")).join("\n\n").slice(-30000);
      const context = task.history
        .map((h) => `${h.role}:\n${h.text}`)
        .join("\n\n");
      const started = await this.request("turn/start", {
        threadId: task.threadId,
        input: [
          {
            type: "text",
            text: `Project brief:\n${task.brief}\n\nPrevious teammates' handoffs:\n${context || "You are first."}\n\nPrevious completed work in this project:\n${projectHistory}\n\nComplete your assigned role now. If reviewing engineering, run integration checks and do not implement fixes yourself. End with a single line MEZNEST_REVIEW {"verdict":"pass","findings":[]} or MEZNEST_REVIEW {"verdict":"changes_requested","findings":[{"owner":"frontend","description":"Reproduction and expected behavior"}]}. Owners must be frontend or backend.`,
            text_elements: [],
          },
        ],
      });
      task.turnId = started.turn.id;
      this.busy = false;
      this.save();
      if(task.parentId) void this.pump();
      if (this.state.paused && ["running", "waiting"].includes(task.status))
        await this.request("turn/interrupt", {
          threadId: task.threadId,
          turnId: task.turnId,
        });
    } catch (error) {
      task.status = "failed";
      task.error = error.message;
      this.busy = false;
      this.event(`Could not complete ${task.title}: ${error.message}`);
      this.finishParallel(task);
    }
  }
  async pause(paused) {
    if (paused && this.state.tasks.some(t => t.provider === "stitch" && t.status === "running")) throw new Error("Stitch generation cannot be interrupted. Wait for it to finish before pausing.");
    this.state.paused = paused;
    this.save();
    if (paused) {
      for (const task of this.state.tasks.filter(t => ["running", "waiting"].includes(t.status))) {
      if (task?.turnId)
        await this.request("turn/interrupt", {
          threadId: task.threadId,
          turnId: task.turnId,
        });
      }
    } else void this.pump();
  }
  retry(id) {
    const t = this.state.tasks.find((t) => t.id === id);
    if (!t || !["failed", "paused"].includes(t.status))
      throw new Error("Only stopped tasks can be retried.");
    if(t.parallelIds) { const children=this.state.tasks.filter(c=>t.parallelIds.includes(c.id)); if(children.every(c=>c.status==="done")) { this.finishParallel(children[0]); void this.pump(); return; } for(const child of children) if(["paused","failed"].includes(child.status)){child.status="queued";child.error=undefined;} t.status="waiting";this.save();void this.pump();return; }
    t.status = "queued";
    t.error = undefined;
    this.save();
    void this.pump();
  }
  cancel(id) {
    const t = this.state.tasks.find((t) => t.id === id);
    if (!t || !["queued", "failed", "paused"].includes(t.status))
      throw new Error("Pause active work before cancelling it.");
    if(t.parallelIds) for(const child of this.state.tasks.filter(c=>t.parallelIds.includes(c.id))) { if(["running","waiting"].includes(child.status))throw Error("Pause engineers before cancelling."); child.status="cancelled"; }
    t.status = "cancelled";
    this.event(`Cancelled: ${t.title}`);
  }
  addProject(input) {
    if (typeof input.workspace !== "string" || !path.isAbsolute(input.workspace)) throw new Error("Enter an absolute folder path.");
    const workspace = path.resolve(String(input.workspace || ""));
    if (!input.workspace) throw new Error("Enter a project folder.");
    if (input.createFolder) fs.mkdirSync(workspace, { recursive: true });
    if (!fs.statSync(workspace).isDirectory()) throw new Error("Choose a folder.");
    const canonical = fs.realpathSync(workspace);
    if (this.state.projects.some(p => p.workspace === canonical)) throw new Error("This folder is already a project.");
    const project = { id: randomUUID(), name: String(input.name || path.basename(canonical)).slice(0,100), workspace: canonical, previewUrl: "" };
    this.state.projects.push(project); this.save();
    this.selectProject(project.id);
  }
  selectProject(id) {
    const project = this.state.projects.find(p => p.id === id);
    if (!project) throw new Error("Project not found.");
    this.state.settings = { workspace: project.workspace, previewUrl: project.previewUrl, projectId: project.id };
    this.save();
  }
  redo(id) {
    const source = this.state.tasks.find(t => t.id === id);
    if (!source) throw new Error("Task not found.");
    const task = validateTask({ title: source.title + " (redo)", brief: source.brief, roles: source.roles });
    task.workspace = source.workspace; task.projectId = source.projectId;
    this.state.tasks.push(task); this.save(); void this.pump();
  }
  settings(input) {
    if (this.busy || this.state.tasks.some((t) => t.status === "queued"))
      throw new Error("Finish queued work before changing the project folder.");
    if (
      typeof input.workspace !== "string" ||
      !path.isAbsolute(input.workspace) ||
      !fs.statSync(input.workspace).isDirectory()
    )
      throw new Error("Choose an existing absolute project folder.");
    const preview = String(input.previewUrl || "");
    if (preview) {
      const u = new URL(preview);
      if (
        !["http:", "https:"].includes(u.protocol) ||
        !["localhost", "127.0.0.1", "[::1]"].includes(u.hostname)
      )
        throw new Error(
          "Use a local preview URL, such as http://localhost:3001.",
        );
    }
    this.state.settings = {
      workspace: fs.realpathSync(input.workspace),
      previewUrl: preview,
    };
    let project = this.state.projects.find(p => p.workspace === this.state.settings.workspace);
    if (!project) {
      project = { id: randomUUID(), name: path.basename(this.state.settings.workspace), workspace: this.state.settings.workspace, previewUrl: preview };
      this.state.projects.push(project);
    }
    project.previewUrl = preview;
    this.state.settings.projectId = project.id;
    this.save();
  }
  close() {
    this.child?.kill();
  }
}
export function getEngine() {
  globalThis.__meznestEngine ||= new OfficeEngine();
  const engine = globalThis.__meznestEngine;
  Object.setPrototypeOf(engine, OfficeEngine.prototype);
  if (engine.stitch) Object.setPrototypeOf(engine.stitch, StitchConnection.prototype);
  if (!engine.state.projects) {
    const project = { id: randomUUID(), name: path.basename(engine.state.settings.workspace), workspace: engine.state.settings.workspace, previewUrl: engine.state.settings.previewUrl };
    engine.state.projects = [project];
    engine.state.settings.projectId = project.id;
    for (const task of engine.state.tasks) { task.projectId ||= project.id; task.workspace ||= project.workspace; }
    engine.save();
  }
  return engine;
}
