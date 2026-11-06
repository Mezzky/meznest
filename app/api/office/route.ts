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
    return Response.json(getEngine().snapshot());
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
