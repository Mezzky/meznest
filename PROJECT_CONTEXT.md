# Meznest — Project Context & Handoff

## Project goal

Build **Meznest**, a personal AI design and development team represented by workers inside a cute, interactive 3D virtual office.

The team should help take projects from website design through frontend, backend, and review. The office is the interface to real AI work: worker animations and status should reflect actual activity.

**Brand:** Mezzky  
**App name:** Meznest — preserve this exact spelling.  
**Tagline:** Little team. Big ideas.

## User preferences and constraints

- Personal use initially.
- Comfortable with coding.
- Usually builds websites and apps using **React and Next.js**.
- Wants a cute, cozy, low-poly 3D office that runs in a browser.
- Preserve the established concept and visual style.
- Workers should act independently within limits.
- Major risks require the user's approval; the user remains the boss.
- Initial monthly budget is approximately **US$20**, already spent on ChatGPT Plus.
- Prefer the existing ChatGPT account over separately billed API usage.
- Start as a local application without additional hosting costs.

## Visual direction

- Warm ivory background, sage green details, and terracotta buttons.
- Soft lighting, rounded furniture, plants, and charming worker avatars.
- Angled 3D office view with orbit, zoom, and reset controls.
- Calm workspace interface with a sidebar, office scene, teammate details, tasks, and activity feed.
- Responsive layouts for desktop and smaller screens.

The current scene is built procedurally with Three.js; it does not require downloaded 3D models.

## The five teammates

| Name | Role | Responsibility |
|---|---|---|
| Comoy | Team lead | Plan work, break down briefs, coordinate handoffs |
| Sukijem | Designer | Layouts, visual direction, responsive design, accessibility guidance |
| Dono | Frontend developer | React/Next.js pages, components, interactions |
| Kiwir | Backend developer | APIs, databases, authentication, server functionality |
| Ijum | Reviewer / QA | Review implementation, run checks, fix clear defects, report limitations |

Roles share one underlying coding engine and run **one at a time**.

A full-team task follows:

**Comoy → Sukijem → Dono → Kiwir → Ijum**

Users can also assign a focused task to one teammate.

## Repository and workspace

**GitHub repository:** https://github.com/Mezzky/meznest

**Configured Git remote:**

```text
git@github.com:Mezzky/meznest.git
```

`origin` was changed from HTTPS to SSH and verified for both fetch and push.

**Original Windows workspace:**

```text
D:\Coding-Kuy\Website\meznest
```

Do not assume the latest code has been committed or pushed. That was not verified in the previous chat.

## Current implementation

Meznest v1 has been built using:

- Next.js App Router
- React and TypeScript
- Three.js
- React Three Fiber and Drei
- Lucide icons
- A local Node.js task engine
- Codex app-server over standard input/output
- An atomic local JSON state store

The last successful build used **Next.js 16.4.5**. Use the repository's lockfile for the installed dependency versions.

### Implemented interface

- Interactive low-poly office with five avatars.
- Clickable worker name labels and teammate details.
- Orbit, zoom, reset, and label visibility controls.
- Office, Tasks, Team, and Projects views.
- New-task form supporting the whole team or one role.
- Task details showing the brief, live text, and completed handoffs.
- Task filtering and completion counts.
- Pause, retry, and cancellation controls.
- Activity feed.
- Approval inbox.
- Project-folder settings and configurable local preview link.
- ChatGPT sign-in controls.
- Responsive layouts.

### Implemented task engine

- Saves tasks, activity, handoffs, and settings.
- Queues work and runs one role at a time.
- Passes completed handoffs to subsequent roles.
- Handles Codex initialization and account checks.
- Starts the official ChatGPT browser sign-in flow.
- Receives streamed agent output and completion events.
- Handles command/file approval requests and user questions.
- Records failures without falsely marking work complete.
- Restores interrupted running tasks as paused after a restart.
- Rejects unsupported server requests.
- Does not simulate successful AI work.

## Important verification status

The previous chat verified:

- Production build passes.
- TypeScript checks pass.
- All **8 task-engine tests** pass.
- Browser rendering works without reported rendering errors in the final checked version.
- Creating a task works.
- Tasks survive a page refresh.
- Cancelling a queued task works.
- Selecting a teammate and opening a role-specific task form works.
- Smaller-screen layout was inspected.
- Remote Host, cross-origin, non-JSON, and invalid-task requests were rejected.
- Local Codex app-server responds.
- Missing-account detection works.
- The sign-in button produces the official ChatGPT authorization link.

**Still unverified:** a real AI coding task from start to finish.

The local Codex service had no signed-in ChatGPT account. The user must finish sign-in before testing real worker execution, real approvals, and real role handoffs.

Do not describe the complete AI workflow as proven until that test succeeds.

## Local startup

The app uses:

```text
http://127.0.0.1:4317
```

Port **4317** was chosen because port 3000 had a cached service worker from another local application. Keep the dedicated port unless there is a reason to change it.

Standard commands:

```bash
npm ci
npm run dev
```

Production commands:

```bash
npm run build
npm start
```

Checks:

```bash
npm run check
npm test
```

A Windows helper is included:

```powershell
.\Start-Meznest.ps1
```

The original computer's global npm shim was broken. The helper uses Node directly and, when necessary, npm bundled with Node. This is an environment-specific workaround, not necessarily a problem on the next device.

A production server was left running on the original computer. That server and its localhost address do not transfer to another device.

## Setup on another device

1. Ensure the latest changes are committed and pushed from the original computer.
2. Configure GitHub SSH access on the new device.
3. Clone or pull the repository.
4. Install a compatible Node.js version and the Codex CLI.
5. Run `npm ci`.
6. Start Meznest.
7. Open Settings and set the correct local project folder.
8. Choose **Connect → Sign in → Continue with ChatGPT** if needed.
9. Complete sign-in yourself.
10. Verify a small real task in a disposable project folder.

The old Windows project path will not necessarily exist on the new device.

## Local state and portability

Saved application data lives in:

```text
.meznest/office.json
```

The `.meznest` directory is ignored by Git. Cloning the repository therefore does **not** transfer task history or workspace settings.

To preserve history, copy the state file separately while the application is stopped, then update the workspace path on the destination device.

Do not copy authentication credentials into the repository. Sign in normally on the new device.

## Permissions and safety behavior

- Meznest is designed for one user on one local computer.
- Development and production scripts bind to loopback.
- API handlers reject non-local Host headers and cross-origin requests.
- Do not publicly expose this version through hosting or a tunnel.
- Workers use workspace-write permissions.
- Network access is disabled by default in the worker configuration.
- Untrusted-command approvals are routed to the user.
- Worker instructions prohibit publishing, external messages, spending money, destructive user-data actions, and production changes.
- Unknown server requests fail closed.

These instructions complement Codex's controls; they are not an independent operating-system security boundary.

## Current limitations

- Real model execution still needs verification after sign-in.
- State uses a local JSON file, not a database.
- No automatic Git checkpoints or automatic rollback.
- No automatic launch of client-project preview servers.
- Preview links point to a local server the user or team has started separately.
- No enforced monetary spending cap or detailed usage dashboard.
- No multi-user support, hosted service, or simultaneous worker execution.
- Only one Meznest server should use the state directory at a time.
- The computer and application server must remain running during work.

## Source map

| Repository path | Purpose |
|---|---|
| `app/page.tsx` | Main workspace interface and forms |
| `app/globals.css` | Visual design and responsive styling |
| `app/layout.tsx` | Root layout and metadata |
| `components/Office.tsx` | Procedural 3D office and projected worker labels |
| `lib/team.ts` | Team definitions and interface types |
| `lib/engine.mjs` | Persistence, Codex transport, task scheduling |
| `app/api/office/route.ts` | Local API and request validation |
| `tests/engine.test.mjs` | Engine tests using a mock protocol transport |
| `Start-Meznest.ps1` | Windows startup helper |
| `README.md` | Setup, architecture, boundaries, and limitations |

## Repository instructions

Read and follow `AGENTS.md`.

It specifically requires reading the relevant documentation inside:

```text
node_modules/next/dist/docs/
```

before writing Next.js code. This installed version may differ from familiar Next.js APIs and conventions.

Do not remove the generated Next.js agent-rules block.

## Recommended next work

1. Inspect the repository and confirm the latest implementation is present.
2. Complete ChatGPT sign-in through Meznest.
3. Run a small real task in a disposable project.
4. Verify real output, file changes, approval handling, interruption, and retry.
5. Test the complete five-role workflow on a small website brief.
6. Address integration failures before expanding the feature set.
7. Later, consider Git checkpoints, richer project previews, usage visibility, and more durable storage.

Preserve the current Meznest identity and cozy low-poly design while continuing development.

## November 6 workspace update

- Projects now have saved folders, per-project task history, continuation prompts, and redo as a new task. Tasks retain their original project folder when selection changes.
- Workers are Comoy, Sukijem, Dono, Kiwir, and Ijum. Office animations include articulated walking/typing, brief social pauses, and a coffee station. Visual QA remains incomplete.
- At the user's request, workers now use approvalPolicy never and danger-full-access. Earlier workspace-write/no-network descriptions below are historical.
- Development uses Webpack to avoid the observed Turbopack reload loop. Windows Codex executable discovery is included.
- Nine engine tests and TypeScript checks pass. Real single-role tasks completed locally; full five-role execution remains unverified. Old test output files were deleted at the user's request; their task history remains local.
