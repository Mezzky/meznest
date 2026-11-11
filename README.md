# Meznest

**Little team. Big ideas.**

Meznest is a personal AI design and development workspace presented as a cozy, interactive 3D office. Connect AI services, give your team a brief, and keep its work organized in project folders on your computer.

The application runs locally. Codex and Google Stitch perform AI work through their connected services; the office characters visualize worker activity.

## Meet the team

| Worker | Role | Responsibility |
| --- | --- | --- |
| Comoy | Team lead | Plan the work and coordinate handoffs |
| Sukijem | Designer | Create design direction or generate screens with Google Stitch |
| Dono | Frontend developer | Build pages, components, and interactions |
| Kiwir | Backend developer | Build server logic, APIs, and project backend features |
| Ijum | Reviewer / QA | Check the combined implementation and request fixes |

Assign a focused task to one worker or use the full team:

```text
Comoy → Sukijem → Dono + Kiwir → Integration → Ijum
                     parallel                    ↓
                                    Assigned fixes → Review
```

## Get started

Requires Node.js 20.9+ and a local Codex installation for coding workers. Development has been tested with Node.js 22 on Windows.

```sh
npm ci
npm run dev
```

Open [Meznest locally](http://127.0.0.1:4317).

On Windows, the included helper starts the app using Node directly and can install missing dependencies using the npm bundled with Node:

```powershell
.\Start-Meznest.ps1
```

Development uses Webpack to avoid the previously observed Turbopack reload loop. Both development and production bind to `127.0.0.1:4317`.

### Connect your AI services

**Codex**

1. Open **Team → Codex → Connect**, or open **Settings**.
2. Connect to the local Codex app-server. If sign-in is needed, choose **Sign in**, then **Continue with ChatGPT**, and finish the browser flow.
3. In Team, choose a model for each worker from the catalog reported by the connected Codex account.

Meznest uses the local Codex sign-in rather than asking for an OpenAI API key. Account access and usage limits still apply. The model selector uses provider-reported availability instead of a hardcoded free/paid model list.

**Google Stitch — optional for Sukijem**

1. Open **Team → Google Stitch → Connect**.
2. Follow the setup dialog to create a key in your Stitch account settings.
3. Enter the key in the local setup field, connect, then select **Google Stitch** as Sukijem's AI service and choose an advertised model.

Stitch keys entered in the UI remain in server memory and are not saved in `office.json`. Reconnect after restarting the server. The backend also supports `STITCH_API_KEY` as a key source when connecting. Stitch checks account eligibility and quotas when generating; its advertised model list does not guarantee free access.

Claude support is postponed and is not implemented.

### Create a project and find your results

1. Open **Projects**, add a project name, and enter the full path to its folder. You can enable **Create the folder if it doesn't exist**.
2. Choose **Continue work** and submit a brief for the team or a specific worker.
3. Open **Tasks** to inspect streamed output, status, completed handoffs, and available artifacts.
4. Find generated code and documents in the project's selected folder. Each task keeps its original folder even if you later select another project.
5. Open a project's **History → View results** to revisit earlier work, or **Continue with a new prompt** to build on it.

**Redo task** creates a new run of the same brief while keeping the original history. It does not restore an older version of the files. Use Git for file history and rollback.

A configured project preview link opens the preview server you have started separately; Meznest does not automatically launch it.

## Current features

- Responsive Office, Tasks, Team, and Projects views with warm ivory, sage, and terracotta styling.
- Project folders, per-project history, continuation prompts, and redo.
- Provider connection cards and per-worker model selection.
- Codex conversations retained by project, role, and selected model; parallel engineering copies use separate threads.
- Task details with conversation reads and links to open Codex threads. Automatic visibility in the Codex desktop sidebar is not guaranteed.
- Sequential planning/design, concurrent engineering, conflict-aware integration, and review-driven fixes.
- Pause, retry, cancellation, saved handoffs, and failure reporting.
- A procedural Three.js office with orbit, zoom, reset, and clickable workers.
- Articulated walking, desk typing, short social pauses, and coffee-station interactions.
- Individual completion celebrations: the finishing worker raises their hands, shows “Hooray!”, and emits colorful hand sparks/confetti for a short time.
- A controllable boss avatar and connected executive suite.

Idle movement and social animations are visual behavior, not separate AI conversations. Real task status drives working and completion states.

### Walk as the boss

Choose **Walk as boss** to control Mezzky. Use **WASD** to walk relative to the camera, drag to rotate, and press **E** near a teammate to inspect their work. **Esc** returns to the office overview; the home button returns the boss to the CEO suite. On-screen arrows support touch and mouse movement.

Walls and furniture block movement. This tour does not start or interrupt tasks.

## How the backend works

| Layer | Implementation |
| --- | --- |
| Web interface | React, TypeScript, Next.js App Router |
| 3D office | Three.js, React Three Fiber, and Drei |
| Local API | Next.js route handlers running in Node.js at `/api/office` |
| Task orchestration | Custom JavaScript `OfficeEngine` |
| Coding connection | Local Codex app-server over standard input/output |
| Design connection | `@google/stitch-sdk` |
| Persistence | Atomic local JSON writes and files on disk; no database |

The browser sends actions to the local API. The engine saves tasks, schedules workers, starts or resumes provider sessions, and records streamed output and handoffs. The interface polls for updates approximately every three seconds, backing off after failures.

Meznest has no hosted backend or multi-user accounts. Your computer and the Meznest server must remain running for work to continue.

### Parallel engineering and review

When frontend and backend stages are adjacent, each engineer receives a source copy under `.meznest/runs/`. Installed dependencies are linked, and workers are instructed not to modify those shared dependencies.

Before integration, changes are compared with the original snapshot. Conflicting edits between engineers or changes to the original project pause integration without overwriting conflicting files. The copies remain available for resolution; retry the parent task after resolving them.

Ijum reviews the combined project and returns structured findings assigned to frontend or backend. Assigned fixes return to review automatically. After three unsuccessful review rounds, or an invalid review verdict, the task pauses for attention.

Pause interrupts active Codex work, including running engineers. Work interrupted by a server restart is restored as paused. Stitch generation cannot currently be interrupted.

### Stitch results and export recovery

Stitch keeps a remote project and screen reference for each Meznest project and can edit the previous screen on subsequent work. Available exports are saved under:

```text
<project-folder>/design/stitch/<task-id>/
```

Results may include `screen.html`, `screen.png` or `screen.jpg`, and `stitch-reference.json`. Image-only designs are supported; HTML is not invented when Stitch does not provide it.

Screen retrieval uses the canonical resource name to avoid the previous `get_screen` invalid-argument error. When a screen ID has already been saved, retry retrieves that screen rather than generating another design.

A successful remote design does not guarantee a successful local download. If an export returns an HTTP error, Meznest preserves the reference and displays an export warning with a link to the Stitch project. A multi-role task pauses before implementation when exports need attention. Download failures such as HTTP 401 are reported, not treated as downloaded files.

## Storage and backups

**There is no database right now.**

| Location | Contents |
| --- | --- |
| `.meznest/office.json` | Projects, tasks, history, settings, and session references |
| `.meznest/runs/` | Engineering working copies used for integration |
| Selected project folders | Generated code, documents, and available design exports |

The `.meznest` directory is ignored by Git. Cloning or pulling the repository does not transfer local history or settings. Back up the state and project folders while the app is stopped. When moving to another computer, update project paths and sign in there separately.

Only one Meznest server should use a state directory at a time. Writes to the JSON store are atomic, but this is not a database or a file-versioning system.

## Permissions and limitations

This version is intended for one user on one computer. API handlers reject remote Host headers and cross-origin requests. Do not expose the local server through a public tunnel or reverse proxy.

Workers currently use `approvalPolicy: "never"` and `sandbox: "danger-full-access"`, as configured for autonomous local work. Routine command and file operations do not require step-by-step approval. This is broad access, not enforced confinement to the selected project folder.

Role instructions tell workers to preserve user changes and prohibit publishing, deploying, spending money, sending external messages, deleting user data, and changing production systems. These instructions are not an operating-system security boundary. Protocol handling for approvals and questions remains in the engine.

Current limitations include:

- No cloud sync, multi-user support, or database.
- No automatic Git checkpoints or rollback.
- No automatic project-preview server startup.
- No enforced spending cap or detailed usage dashboard.
- No guarantee that every Stitch result includes downloadable HTML or images.
- No guarantee that Codex threads automatically appear in the desktop sidebar.
- Full-team real-world model behavior and animation quality still need broader end-to-end validation.

## Checks and production startup

```sh
npm run check
npm test
npm run build
npm start
```

The automated tests cover engine scheduling, protocol handling, recovery, collaboration/integration, and Stitch export behavior using mocks. They do not prove live provider execution.

At the November 9 update, TypeScript checks and all 24 tests passed. Live Codex account/model discovery, individual coding tasks, and Stitch design generation have been observed. Stitch export authorization failures remain a known limitation. Earlier production builds reported dynamic-filesystem tracing warnings in the collaboration engine.

## Recent updates

### November 9, 2026

- Refreshed Team service cards and worker provider/model controls.
- Added Google Stitch integration, project/screen reuse, and artifact downloads.
- Added persistent Codex sessions, conversation viewing, and thread links.
- Fixed Stitch screen lookup arguments and added retry/export recovery, including image-only results.
- Replaced the global completion overlay with individual worker celebrations and hand sparks.

### November 6, 2026 and subsequent workspace improvements

- Added folder-based project management, history, continuation, and redo.
- Renamed workers to Comoy, Sukijem, Dono, Kiwir, and Ijum.
- Improved walking, typing, coffee interactions, and short social pauses.
- Added boss exploration, parallel engineering copies, integration checks, and review fixes.
- Enabled autonomous worker permissions, Windows executable discovery, and Webpack development startup.

## Source map

| Path | Purpose |
| --- | --- |
| `app/page.tsx` | Workspace UI, project management, connections, and polling |
| `app/globals.css` | Responsive styling |
| `components/Office.tsx` | Office scene, movement, and worker animations |
| `app/api/office/route.ts` | Local API, actions, and artifact downloads |
| `lib/engine.mjs` | Saved state, task scheduling, Codex transport, and handoffs |
| `lib/collaboration.mjs` | Engineering copies and file integration |
| `lib/stitch.mjs` | Stitch connection, generation, and exports |
| `lib/team.ts` | Team definitions and UI types |
| `tests/` | Engine, collaboration, and Stitch tests |
| `Start-Meznest.ps1` | Windows startup helper |
| `PROJECT_CONTEXT.md` | Project background and historical handoff notes |

Read `AGENTS.md` before contributing. For Next.js changes, consult the documentation bundled with the installed package as instructed there.
