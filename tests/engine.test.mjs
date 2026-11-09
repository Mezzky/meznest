import { test } from "node:test";
import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import path from "node:path";
import { OfficeEngine, validateTask } from "../lib/engine.mjs";

function fixture(t) {
  const directory = mkdtempSync(path.join(process.cwd(), ".meznest/test-"));
  const engine = new OfficeEngine({ directory });
  t.after(() => {
    engine.close();
    rmSync(directory, { recursive: true, force: true });
  });
  return { engine, directory };
}
function fakeConnection(engine) {
  let id = 0;
  const requests = [];
  engine.connection = { status: "connected", message: "Test only" };
  engine.request = async (method, params) => {
    requests.push({ method, params });
    if (method === "thread/start") return { thread: { id: `thread-${++id}` } };
    if (method === "turn/start") return { turn: { id: `turn-${id}` } };
    return {};
  };
  return requests;
}
const tick = () => new Promise((resolve) => setImmediate(resolve));
test("invalid tasks cannot enter the worker queue", () => {
  assert.throws(() => validateTask({ brief: "", roles: ["lead"] }));
  assert.throws(() => validateTask({ brief: "Build it", roles: ["unknown"] }));
  assert.throws(() => validateTask({ brief: "Build it", roles: [] }));
  assert.deepEqual(
    validateTask({ brief: "Build it", roles: ["lead", "lead"] }).roles,
    ["lead"],
  );
});
test("queue runs one worker, carries handoffs and completes only on real completion events", async (t) => {
  const { engine } = fixture(t);
  const requests = fakeConnection(engine);
  const first = engine.add({
    brief: "Build a local page",
    roles: ["lead", "frontend"],
  });
  const second = engine.add({ brief: "Review it", roles: ["review"] });
  await tick();
  assert.equal(first.status, "running");
  const workerConfig = requests.find((r) => r.method === "thread/start").params;
  assert.equal(workerConfig.approvalPolicy, "never");
  assert.equal(workerConfig.sandbox, "danger-full-access");
  assert.equal(second.status, "queued");
  assert.equal(requests.filter((r) => r.method === "turn/start").length, 1);
  engine.message({
    method: "item/agentMessage/delta",
    params: { threadId: first.threadId, delta: "Plan: build a welcome page." },
  });
  engine.message({
    method: "turn/completed",
    params: { threadId: first.threadId, turn: { status: "completed" } },
  });
  await tick();
  assert.equal(first.stage, 1);
  assert.equal(first.status, "running");
  assert.match(
    requests.filter((r) => r.method === "turn/start")[1].params.input[0].text,
    /Plan: build a welcome page/,
  );
  engine.message({
    method: "turn/completed",
    params: { threadId: first.threadId, turn: { status: "completed" } },
  });
  await tick();
  assert.equal(first.status, "done");
  assert.equal(second.status, "running");
});
test("approval requests remain blocked until answered and cannot be replayed", async (t) => {
  const { engine } = fixture(t);
  fakeConnection(engine);
  const task = engine.add({ brief: "A test task", roles: ["frontend"] });
  await tick();
  const sent = [];
  engine.send = (m) => sent.push(m);
  engine.message({
    id: 41,
    method: "item/commandExecution/requestApproval",
    params: { threadId: task.threadId, command: "npm test" },
  });
  assert.equal(task.status, "waiting");
  assert.equal(engine.state.approvals.length, 1);
  engine.approve("41", "decline");
  assert.deepEqual(sent[0], { id: 41, result: { decision: "decline" } });
  assert.equal(task.status, "running");
  assert.throws(() => engine.approve("41", "accept"));
});
test("unsupported server actions fail closed", (t) => {
  const { engine } = fixture(t);
  const sent = [];
  engine.send = (m) => sent.push(m);
  engine.message({ id: 9, method: "unknown/action", params: {} });
  assert.equal(sent[0].error.code, -32601);
});
test("restart preserves history and stops interrupted work without replaying it", async (t) => {
  const { engine, directory } = fixture(t);
  fakeConnection(engine);
  const task = engine.add({ brief: "Remember this", roles: ["lead"] });
  await tick();
  task.history.push({ role: "lead", text: "Saved handoff" });
  engine.save();
  const reloaded = new OfficeEngine({ directory });
  assert.equal(reloaded.state.tasks[0].status, "paused");
  assert.equal(reloaded.state.tasks[0].history[0].text, "Saved handoff");
  assert.equal(reloaded.state.approvals.length, 0);
  assert.equal(reloaded.connection.status, "disconnected");
});
test("pause prevents queued execution and issues an interrupt for active work", async (t) => {
  const { engine } = fixture(t);
  const requests = fakeConnection(engine);
  await engine.pause(true);
  const task = engine.add({ brief: "Wait for me", roles: ["lead"] });
  await tick();
  assert.equal(task.status, "queued");
  await engine.pause(false);
  await tick();
  assert.equal(task.status, "running");
  await engine.pause(true);
  assert.equal(requests.at(-1).method, "turn/interrupt");
  engine.message({
    method: "turn/completed",
    params: { threadId: task.threadId, turn: { status: "interrupted" } },
  });
  assert.equal(task.status, "paused");
});
test("project switching is refused with pending work and remote preview URLs are rejected", (t) => {
  const { engine } = fixture(t);
  assert.throws(() =>
    engine.settings({
      workspace: process.cwd(),
      previewUrl: "https://example.com",
    }),
  );
  engine.add({ brief: "Queued", roles: ["lead"] });
  assert.throws(() =>
    engine.settings({ workspace: process.cwd(), previewUrl: "" }),
  );
});
test("worker failures are visible and do not count as completed work", async (t) => {
  const { engine } = fixture(t);
  fakeConnection(engine);
  const task = engine.add({ brief: "Fail honestly", roles: ["review"] });
  await tick();
  engine.message({
    method: "turn/completed",
    params: {
      threadId: task.threadId,
      turn: { status: "failed", error: { message: "Usage limit reached" } },
    },
  });
  assert.equal(task.status, "failed");
  assert.equal(task.stage, 0);
  assert.equal(task.history.length, 0);
  assert.equal(task.error, "Usage limit reached");
});

test("projects retain task folders and redo preserves project history", (t) => {
  const { engine, directory } = fixture(t);
  const original = engine.state.settings.workspace;
  const first = engine.add({ brief: "First project work", roles: ["frontend"] });
  engine.addProject({ name: "Second", workspace: path.join(directory, "second"), createFolder: true });
  const second = engine.add({ brief: "Second project work", roles: ["review"] });
  assert.equal(first.workspace, original);
  assert.notEqual(first.projectId, second.projectId);
  engine.redo(first.id);
  const redo = engine.state.tasks.at(-1);
  assert.equal(redo.workspace, first.workspace);
  assert.equal(redo.projectId, first.projectId);
  assert.notEqual(redo.id, first.id);
  assert.equal(engine.state.tasks.length, 3);
});

test("worker model selection validates the catalog and reaches Codex", async (t) => {
  const { engine } = fixture(t);
  const requests = fakeConnection(engine);
  engine.models = [{ id: "test", model: "test-model", displayName: "Test" }];
  assert.throws(() => engine.workerSettings({role:"frontend",provider:"codex",model:"unavailable"}));
  assert.throws(() => engine.workerSettings({role:"frontend",provider:"claude",model:"test-model"}));
  engine.workerSettings({role:"frontend",provider:"codex",model:"test-model"});
  engine.add({brief:"Build a page",roles:["frontend"]});
  await tick();
  assert.equal(requests.find(r=>r.method==="thread/start").params.model,"test-model");
});

test("follow-up work resumes the same project and worker conversation", async t => {
 const {engine}=fixture(t);const requests=fakeConnection(engine);
 const first=engine.add({brief:"First",roles:["frontend"]});await tick();
 const threadId=first.threadId;
 engine.message({method:"turn/completed",params:{threadId,turn:{status:"completed"}}});await tick();
 const original=engine.request;engine.request=async(method,params)=>method==="thread/resume"?(requests.push({method,params}),{thread:{id:params.threadId}}):original(method,params);
 const next=engine.add({brief:"Continue",roles:["frontend"]});await tick();
 assert.equal(next.threadId,threadId);assert.equal(requests.filter(r=>r.method==="thread/start").length,1);
 assert.equal(next.sessions[0].threadId,threadId);
});
test("Stitch design writes a real handoff without invoking Codex",async t=>{
 const {engine}=fixture(t);const requests=fakeConnection(engine);
 engine.stitch={status:"connected",models:[],snapshot:()=>({status:"connected",models:[]}),generate:async(project,task)=>{task.artifacts=[{name:"screen.html",file:"test-only"}];return "Design exported";}};
 engine.workerSettings({role:"design",provider:"stitch",model:""});
 const task=engine.add({brief:"Design",roles:["design"]});await tick();
 assert.equal(task.status,"done");assert.equal(task.history[0].provider,"stitch");assert.equal(requests.length,0);
});
test("Stitch errors fail the task without a fabricated handoff",async t=>{
 const {engine}=fixture(t);fakeConnection(engine);
 engine.stitch={status:"connected",models:[],generate:async()=>{throw new Error("Design generation failed");}};
 engine.workerSettings({role:"design",provider:"stitch",model:""});
 const task=engine.add({brief:"Design",roles:["design"]});await tick();
 assert.equal(task.status,"failed");assert.equal(task.history.length,0);assert.match(task.error,/generation failed/);
});
