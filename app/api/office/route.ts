import { readLocalCodex, readLocalChat } from "@/lib/local-codex.mjs";
import path from "node:path";
import fs from "node:fs";
import { getEngine } from "@/lib/engine.mjs";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";
function guard(request: Request) {
  const authority = request.headers.get("host");
  const host = authority ? new URL(`http://${authority}`).hostname : "";
  if (!["localhost", "127.0.0.1", "[::1]"].includes(host))
    throw new Error("Meznest is available only on this computer.");
  const origin = request.headers.get("origin");
  if (origin && new URL(origin).host !== request.headers.get("host"))
    throw new Error("Cross-origin access is not allowed.");
}
export async function GET(request: Request) {
  try {
    guard(request);
    const url = new URL(request.url);
    if (url.searchParams.has('usage')) {
      const engine=getEngine();
      await engine.connect();
      if(engine.connection.status!=="connected") return Response.json({error:"Sign in through Settings → Connect to view Codex usage."},{status:409});
      const limits=await engine.request("account/rateLimits/read",{});
      const buckets=Object.values(limits.rateLimitsByLimitId||{});
      return Response.json({buckets:buckets.length?buckets:limits.rateLimits?[limits.rateLimits]:[],allowed:limits.ordinaryUsageAllowed??null});
    }
    if (url.searchParams.has('localChat')) return Response.json(readLocalChat(url.searchParams.get('localChat')));
    if (url.searchParams.has('artifact')) {
      const task = getEngine().state.tasks.find((t: { id: string }) => t.id === url.searchParams.get('task'));
      const artifact = task?.artifacts?.find((a: { name: string }) => a.name === url.searchParams.get('artifact'));
      if (!artifact) return Response.json({error:'Artifact not found'}, {status:404});
      return new Response(fs.readFileSync(artifact.file), {headers:{'Content-Type':'application/octet-stream','Content-Disposition':'attachment; filename="'+artifact.name+'"','X-Content-Type-Options':'nosniff'}});
    }
    const file = path.join(process.cwd(), ".meznest", "desktop-codex-snapshot.json");
    let localCodex; try { localCodex = readLocalCodex(); const assignments=getEngine().state.localAssignments||{}; localCodex.threads=localCodex.threads.map(t=>({...t,role:assignments[t.id]||t.role})); } catch { localCodex = {live:false,capturedAt:new Date().toISOString(),threads:[],error:"Local Codex history unavailable"}; }
    return Response.json({...getEngine().snapshot(), localCodex});
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 403 });
  }
}
export async function POST(request: Request) {
  try {
    guard(request);
    if (!request.headers.get("content-type")?.includes("application/json"))
      return Response.json({ error: "JSON required." }, { status: 415 });
    const text = await request.text();
    if (text.length > 30000)
      return Response.json({ error: "Request is too large." }, { status: 413 });
    const data = JSON.parse(text);
    const engine = getEngine();
    switch (data.action) {
      case "team-enable": {
        const project=engine.state.projects.find((p:{workspace:string})=>p.workspace===data.workspace) || readLocalCodex().threads.find(t=>t.workspace===data.workspace);
        if(!project)throw new Error("Project not found");
        const file=path.join(project.workspace,"AGENTS.md"),original=fs.existsSync(file)?fs.readFileSync(file,"utf8"):"";
        const begin="<!-- MEZNEST TEAM MODE -->",end="<!-- END MEZNEST TEAM MODE -->";
        const start=original.indexOf(begin),finish=original.indexOf(end);
        const clean=start>=0&&finish>=start?original.slice(0,start)+original.slice(finish+end.length):original;
        fs.writeFileSync(file,clean);engine.state.teamProjects ||= {};engine.state.teamProjects[project.workspace]=!!data.enabled;engine.save();break;
      }
      case "team-dispatch": return Response.json({error:"Team mode is visual only. Complete this request directly in the current Codex chat. Do not start additional workers."},{status:409});
      case "local-assign": {
        if (!["", "lead", "design", "frontend", "backend", "review"].includes(data.role)) throw new Error("Invalid worker");
        if (!readLocalCodex().threads.some(t=>t.id===data.id)) throw new Error("Chat not found");
        engine.state.localAssignments ||= {};
        engine.state.localAssignments[data.id]=data.role; engine.save(); break;
      }
      case "connect":
        await engine.connect();
        break;
      case "login":
        await engine.login();
        break;
      case "task":
        engine.add(data);
        break;
      case "pause":
        if (typeof data.paused !== "boolean")
          throw new Error("Invalid pause value.");
        await engine.pause(data.paused);
        break;
      case "retry":
        engine.retry(data.id);
        break;
      case "cancel":
        engine.cancel(data.id);
        break;
      case "approval":
        engine.approve(data.id, data.decision, data.answers);
        break;
      case "project-add": engine.addProject(data); break;
      case "project-select": engine.selectProject(data.id); break;
      case "redo": engine.redo(data.id); break;
      case "stitch-connect": await engine.connectStitch(data.apiKey); break;
      case "stitch-disconnect": await engine.disconnectStitch(); break;
      case "thread-history": {
        const task = engine.state.tasks.find((t: {id:string}) => t.id === data.id);
        if (!task || (!task.sessions?.some((s: {threadId:string}) => s.threadId === data.threadId) && task.threadId !== data.threadId)) throw new Error("Conversation not found in this task.");
        const result = await engine.request("thread/read", {threadId:data.threadId,includeTurns:true});
        return Response.json({turns:(result.thread?.turns || []).map((turn: {id:string;status:string;items?:{type:string;text?:string;content?:{text?:string}[]}[]}) => ({id:turn.id,status:turn.status,messages:(turn.items || []).filter(item=>['userMessage','agentMessage'].includes(item.type)).map(item=>({role:item.type==='userMessage'?'You':'Worker',text:item.text || item.content?.map(c=>c.text || '').join('\n') || ''}))}))});
      }
      case "models": await engine.loadModels(); break;
      case "worker-settings": engine.workerSettings(data); break;
      case "settings":
        engine.settings(data);
        break;
      default:
        return Response.json({ error: "Unknown action." }, { status: 400 });
    }
    return Response.json(engine.snapshot());
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 400 });
  }
}
