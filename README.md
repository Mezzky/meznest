# Meznest

**Little team. Big ideas.** A local AI design and development studio with a cozy, interactive low-poly office.

## Start

Requires Node.js 20.9+ and Codex CLI on PATH. Tested with Node 22 on Windows.

```sh
npm install
npm run dev
```

Open http://127.0.0.1:4317. On this computer, the global npm shim is broken; `./Start-Meznest.ps1` uses the npm bundled with Node instead. Dependencies are already installed.

## Bring your team online

1. Open **Settings → Connect**.
2. If no local account is available, choose **Sign in**, then **Continue with ChatGPT**. Finish the official sign-in in your browser.
3. Set the project folder. It defaults to this repository; select another folder before assigning client work.
4. Create a task and select the full team or a single role.
5. Open tasks to inspect live text and completed handoffs. Answer command/file approvals in the bell inbox. Pause interrupts active work; retry resumes from the last completed role.

The team is Comoy (lead), Sukijem (designer), Dono (frontend), Kiwir (backend), and Ijum (review). Roles run sequentially and share previous handoffs. This version uses the Codex app-server protocol and your local ChatGPT sign-in, without reading authentication files or accepting API keys. Account limits apply. The computer and Meznest server must remain running for work to continue.

## What works

- Three.js office with orbit/zoom/reset controls, clickable avatars and labels.
- Responsive Office, Tasks, Team and Projects views.
- Persistent tasks, activity, handoffs, project settings and completion output.
- One active role at a time, queued work, pause, retry and cancellation.
- Codex stdio initialization, account check and browser sign-in.
- Real streamed messages, role handoffs, failures, command/file approvals and user questions.
- Local preview links configured in Projects/Settings.

There is no fabricated worker activity. Before sign-in, tasks are saved but cannot execute. A real model turn still needs to be verified after sign-in on this machine.

## Boundaries

This is a single-user local application, not a hosted service. Both launch scripts bind to loopback. API handlers reject remote Host and cross-origin requests. Do not expose it through a tunnel or public reverse proxy. Only one Meznest server should use the state directory at a time.

Workers use workspace-write permissions, no default network access, and untrusted-command approval routed to you. Publishing, sending messages, spending money and production changes are prohibited in their role instructions. Unknown server requests fail closed. These instructions complement Codex's controls; they are not a separate OS security boundary. Review approval details before accepting.

State is written atomically to `.meznest/office.json` (ignored by Git). This first version uses a local JSON store rather than a database. Back up that file and your project. Interrupted running tasks become paused after a restart; completed handoffs survive. The first version does not automatically create Git checkpoints, launch client-project preview servers, or enforce a monetary budget. Use Git in your project to review and revert changes.

## Checks

```sh
npm run check
npm test
npm run build
npm start
```

The engine tests use a mock protocol transport to verify scheduling, approvals, failure handling and restart recovery. They do not claim real AI execution.

## Source map

- `app/page.tsx`: workspace interface and forms
- `app/globals.css`: responsive visual design
- `components/Office.tsx`: procedural low-poly scene
- `lib/engine.mjs`: saved state, Codex transport and queue
- `app/api/office/route.ts`: local API
- `lib/team.ts`: roles and UI types
- `tests/engine.test.mjs`: task engine tests

Protocol reference: https://learn.chatgpt.com/docs/app-server

## November 6 workspace update

- Projects now have saved folders, per-project task history, continuation prompts, and redo as a new task. Tasks retain their original project folder when selection changes.
- Workers are Comoy, Sukijem, Dono, Kiwir, and Ijum. Office animations include articulated walking/typing, brief social pauses, and a coffee station. Visual QA remains incomplete.
- At the user's request, workers now use approvalPolicy never and danger-full-access. Earlier workspace-write/no-network descriptions below are historical.
- Development uses Webpack to avoid the observed Turbopack reload loop. Windows Codex executable discovery is included.
- Nine engine tests and TypeScript checks pass. Real single-role tasks completed locally; full five-role execution remains unverified. Old test output files were deleted at the user's request; their task history remains local.
