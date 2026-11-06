"use client";
import {
  useEffect,
  useState,
  useRef,
  createContext,
  useContext,
  type FormEvent,
} from "react";
import dynamic from "next/dynamic";
import {
  House,
  LayoutGrid,
  Users,
  FolderOpen,
  Settings,
  Plus,
  ArrowUpRight,
  ArrowRight,
  Bell,
  ChevronDown,
  Check,
  X,
  Pause,
  Play,
  RotateCcw,
  MousePointer2,
  Eye,
  EyeOff,
  Sparkles,
  CircleHelp,
  Plug,
  ShieldCheck,
  Clock3,
  CheckCheck,
  LoaderCircle,
  Send,
  FileText,
  Coffee,
  Leaf,
  ExternalLink,
  Menu,
} from "lucide-react";
import {
  team,
  type Role,
  type Task,
  type OfficeState,
  type Approval,
} from "@/lib/team";
const Office = dynamic(() => import("@/components/Office"), {
  ssr: false,
  loading: () => (
    <div className="scene-fallback">
      <LoaderCircle className="spin" /> Unpacking the office…
    </div>
  ),
});
type Tab = "Office" | "Tasks" | "Team" | "Projects";
const ErrorContext = createContext("");
const icons = {
  Office: House,
  Tasks: LayoutGrid,
  Team: Users,
  Projects: FolderOpen,
};
const labels: Record<Task["status"], string> = {
  queued: "In queue",
  running: "Working",
  waiting: "Needs you",
  done: "Completed",
  failed: "Needs attention",
  paused: "Paused",
  cancelled: "Cancelled",
};
function Avatar({ id, size = "normal" }: { id: Role; size?: string }) {
  const m = team.find((t) => t.id === id)!;
  return (
    <span
      className={`avatar ${size}`}
      style={{ "--avatar": m.color } as React.CSSProperties}
    >
      <span className="avatar-hair" />
      <span className="avatar-face">
        <i />
        <i />
      </span>
      <span className="avatar-shirt" />
    </span>
  );
}
function Logo() {
  return (
    <div className="brand">
      <span className="brand-mark">
        <House size={22} strokeWidth={1.8} />
        <Leaf size={10} />
      </span>
      <span>
        meznest<span className="brand-dot">.</span>
      </span>
    </div>
  );
}
function Modal({
  title,
  subtitle,
  children,
  close,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  close: () => void;
}) {
  const ref = useRef<HTMLDialogElement>(null);
  const error = useContext(ErrorContext);
  useEffect(() => {
    ref.current?.showModal();
    const d = ref.current;
    return () => d?.close();
  }, []);
  return (
    <dialog
      ref={ref}
      className="modal"
      onCancel={close}
      onClick={(e) => {
        if (e.target === e.currentTarget) close();
      }}
    >
      <div className="modal-inner">
        <button
          className="icon-button modal-close"
          aria-label="Close dialog"
          onClick={close}
        >
          <X size={19} />
        </button>
        <span className="eyebrow">YOUR LITTLE WORKSPACE</span>
        <h2>{title}</h2>
        {subtitle && <p className="muted">{subtitle}</p>}
        {error && (
          <p className="inline-error" role="alert">
            {error}
          </p>
        )}
        {children}
      </div>
    </dialog>
  );
}
export default function Home() {
  const [state, setState] = useState<OfficeState | null>(null);
  const [tab, setTab] = useState<Tab>("Office");
  const [selected, setSelected] = useState<Role>("lead");
  const [modal, setModal] = useState<
    "task" | "settings" | "approvals" | "help" | null
  >(null);
  const [detail, setDetail] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showLabels, setShowLabels] = useState(true);
  const [resetKey, setResetKey] = useState(0);
  const [filter, setFilter] = useState("All tasks");
  const [sidebar, setSidebar] = useState(false);
  const [singleTask, setSingleTask] = useState(false);
  function openTask(single = false) {
    setSingleTask(single);
    setModal("task");
  }
  useEffect(() => {
    let disposed = false;
    let timer: ReturnType<typeof setTimeout>;
    async function refresh() {
      try {
        const r = await fetch("/api/office", { cache: "no-store" });
        const s = await r.json();
        if (!r.ok) throw new Error(s.error);
        if (!disposed) setState(s);
      } catch (e) {
        if (!disposed) setError((e as Error).message);
      } finally {
        if (!disposed) timer = setTimeout(refresh, 1800);
      }
    }
    void refresh();
    return () => {
      disposed = true;
      clearTimeout(timer);
    };
  }, []);
  async function act(data: Record<string, unknown>) {
    setBusy(true);
    setError("");
    try {
      const r = await fetch("/api/office", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });
      const s = await r.json();
      if (!r.ok) throw new Error(s.error);
      setState(s);
      return true;
    } catch (e) {
      setError((e as Error).message);
      return false;
    } finally {
      setBusy(false);
    }
  }
  const tasks = state?.tasks || [];
  const approvals = state?.approvals || [];
  const running = tasks.find((t) => ["running", "waiting"].includes(t.status));
  const active = running?.roles[running.stage];
  const member = team.find((t) => t.id === selected)!;
  const memberTask = tasks.find(
    (t) =>
      t.roles[t.stage] === selected &&
      ["running", "waiting"].includes(t.status),
  );
  const connected = state?.connection.status === "connected";
  const taskDetail = tasks.find((t) => t.id === detail);
  const done = tasks.filter((t) => t.status === "done").length;
  const visibleTasks = tasks.filter(
    (t) =>
      filter === "All tasks" ||
      (filter === "Active" &&
        ["running", "waiting", "queued"].includes(t.status)) ||
      (filter === "Completed" && t.status === "done"),
  );
  const go = (next: Tab) => {
    setTab(next);
    setSidebar(false);
  };
  return (
    <ErrorContext.Provider value={error}>
      <div className="app-shell">
        <aside className={`sidebar ${sidebar ? "open" : ""}`}>
          <Logo />
          <div className="workspace-switch">
            <span className="workspace-symbol">M</span>
            <div>
              <strong>Mezzky’s workspace</strong>
              <small>Personal studio</small>
            </div>
            <ChevronDown size={14} />
          </div>
          <span className="nav-caption">WORKSPACE</span>
          <nav>
            {(Object.keys(icons) as Tab[]).map((name) => {
              const Icon = icons[name];
              return (
                <button
                  key={name}
                  className={tab === name ? "active" : ""}
                  onClick={() => go(name)}
                >
                  <Icon size={19} />
                  {name}
                  {name === "Office" && <span className="tiny-dot" />}
                  {name === "Tasks" && tasks.length > 0 && (
                    <span className="nav-count">{tasks.length}</span>
                  )}
                </button>
              );
            })}
          </nav>
          <div className="sidebar-team">
            <span className="nav-caption">
              YOUR TEAM <span>5</span>
            </span>
            {team.map((m) => (
              <button
                key={m.id}
                className={selected === m.id ? "chosen" : ""}
                onClick={() => {
                  setSelected(m.id);
                  go("Office");
                }}
              >
                <Avatar id={m.id} size="small" />
                <span>
                  {m.name}
                  <small>{m.role}</small>
                </span>
                <span
                  className={`presence ${active === m.id ? "working" : ""}`}
                />
              </button>
            ))}
          </div>
          <div className="sidebar-bottom">
            <div className="local-note">
              <span>
                <Leaf size={16} /> A little room to grow
              </span>
              <p>
                Big ideas start with a<br />
                small, good team.
              </p>
              <div className="mini-plants">
                ╱╲ <span>✳</span> ╱╲
              </div>
            </div>
            <button
              className="sidebar-link"
              onClick={() => setModal("settings")}
            >
              <Settings size={18} /> Settings
            </button>
            <button className="sidebar-link" onClick={() => setModal("help")}>
              <CircleHelp size={18} /> A little guidance{" "}
              <ArrowUpRight size={15} />
            </button>
            <div className="profile">
              <span>MK</span>
              <div>
                <strong>Mezzky</strong>
                <small>Founder & big-idea person</small>
              </div>
              <span className="owner-dot" />
            </div>
          </div>
        </aside>
        {sidebar && (
          <button
            aria-label="Close navigation"
            className="sidebar-scrim"
            onClick={() => setSidebar(false)}
          />
        )}
        <main>
          <header className="topbar">
            <div className="breadcrumbs">
              <button
                className="icon-button mobile-menu"
                aria-label="Open navigation"
                onClick={() => setSidebar(true)}
              >
                <Menu size={20} />
              </button>
              <span>Workspace</span>
              <span className="slash">/</span>
              <strong>{tab}</strong>
            </div>
            <div className="top-actions">
              <span className="local-pill">
                <span /> Local workspace
              </span>
              <button
                className="icon-button notification"
                aria-label={`Approvals, ${approvals.length} pending`}
                onClick={() => setModal("approvals")}
              >
                <Bell size={19} />
                {approvals.length > 0 && <b>{approvals.length}</b>}
              </button>
              <span className="header-avatar">MK</span>
            </div>
          </header>
          <div className="page-content">
            <div className="page-heading">
              <div>
                <div className="eyebrow">
                  <span className="sun-symbol">✳</span> LITTLE TEAM. BIG IDEAS.
                </div>
                <h1>
                  {tab === "Office"
                    ? "Good things happen here."
                    : tab === "Tasks"
                      ? "From idea to done."
                      : tab === "Team"
                        ? "Meet your little team."
                        : "A home for your next idea."}
                </h1>
                <p>
                  {tab === "Office"
                    ? "Your team, your ideas, one cozy corner of the internet."
                    : tab === "Tasks"
                      ? "Give your team a brief. Make a little progress, together."
                      : tab === "Team"
                        ? "Five different minds. One shared sense of purpose."
                        : "Connect a local project and give your team room to build."}
                </p>
              </div>
              <button className="button primary" onClick={() => openTask()}>
                <Plus size={17} /> New task
              </button>
            </div>
            {error && (
              <div role="alert" className="error-banner">
                <span>{error}</span>
                <button aria-label="Dismiss error" onClick={() => setError("")}>
                  <X size={16} />
                </button>
              </div>
            )}
            {tab === "Office" && (
              <>
                <div className="office-grid">
                  <section className="office-card">
                    <div className="card-toolbar">
                      <div>
                        <span className="status-dot" />
                        <strong>The studio</strong>
                        <span className="subtle-divider" />
                        <span className="muted">
                          {running
                            ? "Ideas in motion"
                            : "Room for your next idea"}
                        </span>
                      </div>
                      <button
                        className="subtle-button"
                        onClick={() =>
                          void act({ action: "pause", paused: !state?.paused })
                        }
                        disabled={busy || !state}
                      >
                        {state?.paused ? (
                          <Play size={13} />
                        ) : (
                          <Pause size={13} />
                        )}{" "}
                        {state?.paused ? "Resume team" : "Pause team"}
                      </button>
                    </div>
                    <div className="scene-wrap">
                      <div className="scene-tag">
                        <span className={running ? "live-dot" : "quiet-dot"} />
                        {state?.paused
                          ? "Team paused"
                          : running
                            ? "Live activity"
                            : "A quiet moment"}
                        <span>·</span>
                        {active ? "1 working" : "5 ready"}
                      </div>
                      <Office
                        selected={selected}
                        onSelect={setSelected}
                        active={active}
                        showLabels={showLabels}
                        resetKey={resetKey}
                      />
                      <div className="scene-bottom">
                        <span>
                          <MousePointer2 size={13} /> Drag to look around ·
                          Scroll to zoom
                        </span>
                        <div>
                          <button
                            title={showLabels ? "Hide names" : "Show names"}
                            aria-label={
                              showLabels ? "Hide names" : "Show names"
                            }
                            onClick={() => setShowLabels(!showLabels)}
                          >
                            {showLabels ? (
                              <Eye size={16} />
                            ) : (
                              <EyeOff size={16} />
                            )}
                          </button>
                          <button
                            title="Reset view"
                            aria-label="Reset view"
                            onClick={() => setResetKey(resetKey + 1)}
                          >
                            <RotateCcw size={15} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="office-footer">
                      <span>
                        <span className="status-dot" />{" "}
                        {connected
                          ? "Connected to Codex"
                          : "Your studio is ready"}
                        <span className="footer-separator">·</span>
                        {connected
                          ? "One teammate at a time"
                          : "Connect to start real work"}
                      </span>
                      <button onClick={() => setModal("settings")}>
                        {connected ? "Connection settings" : "Connect Codex"}{" "}
                        <ArrowUpRight size={14} />
                      </button>
                    </div>
                  </section>
                  <aside className="member-card">
                    <div className="member-heading">
                      <span className="eyebrow">AT THE DESK</span>
                      <span
                        className={`status-badge ${memberTask ? "running" : ""}`}
                      >
                        {memberTask
                          ? labels[memberTask.status]
                          : "Ready to help"}
                      </span>
                    </div>
                    <div
                      className="member-portrait"
                      style={
                        {
                          "--member-color": member.color,
                        } as React.CSSProperties
                      }
                    >
                      <span className="portrait-circle" />
                      <Avatar id={selected} size="large" />
                      <span className="portrait-spark">✦</span>
                      <span className="portrait-leaf">✧</span>
                    </div>
                    <div className="member-name">
                      <h2>{member.name}</h2>
                      <span>{member.role}</span>
                    </div>
                    <p className="member-description">{member.description}</p>
                    <div className="skill-tags">
                      {member.skills.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <div className="member-current">
                      <span className="eyebrow">
                        {memberTask
                          ? "ON THEIR DESK"
                          : "A LITTLE BREATHING ROOM"}
                      </span>
                      <p>
                        {memberTask ? (
                          memberTask.title
                        ) : (
                          <>
                            <Coffee size={16} /> Waiting for the next good idea.
                          </>
                        )}
                      </p>
                    </div>
                    <button
                      className="button outline full"
                      onClick={() =>
                        memberTask ? setDetail(memberTask.id) : openTask(true)
                      }
                    >
                      {memberTask
                        ? "View current task"
                        : `Give ${member.name} a task`}
                      <ArrowRight size={15} />
                    </button>
                    <div className="member-pagination">
                      {team.map((m) => (
                        <button
                          aria-label={`View ${m.name}`}
                          key={m.id}
                          onClick={() => setSelected(m.id)}
                          className={m.id === selected ? "active" : ""}
                        />
                      ))}
                    </div>
                  </aside>
                </div>
                <div className="lower-grid">
                  <section className="panel tasks-panel">
                    <div className="section-heading">
                      <h2>
                        On the team's desk{" "}
                        <span>
                          {
                            tasks.filter(
                              (t) => !["done", "cancelled"].includes(t.status),
                            ).length
                          }
                        </span>
                      </h2>
                      <button onClick={() => go("Tasks")}>
                        All tasks <ArrowRight size={14} />
                      </button>
                    </div>
                    {tasks.length === 0 ? (
                      <div className="empty-task">
                        <span className="empty-icon">
                          <FileText size={23} />
                          <i>✦</i>
                        </span>
                        <div>
                          <h3>Every great project starts with an idea.</h3>
                          <p>
                            Tell your team what you’d like to build. They’ll
                            take it from there.
                          </p>
                          <button onClick={() => openTask()}>
                            Create your first task <ArrowRight size={14} />
                          </button>
                        </div>
                      </div>
                    ) : (
                      <div className="task-list">
                        {[...tasks]
                          .reverse()
                          .slice(0, 3)
                          .map((t) => (
                            <button
                              className="task-row"
                              key={t.id}
                              onClick={() => setDetail(t.id)}
                            >
                              <span
                                className={`task-check ${t.status === "done" ? "complete" : ""}`}
                              >
                                {t.status === "done" ? (
                                  <Check size={14} />
                                ) : (
                                  <span />
                                )}
                              </span>
                              <span className="task-row-title">
                                <strong>{t.title}</strong>
                                <small>
                                  {
                                    team.find(
                                      (m) =>
                                        m.id ===
                                        t.roles[
                                          Math.min(t.stage, t.roles.length - 1)
                                        ],
                                    )?.name
                                  }{" "}
                                  · {t.roles.length}{" "}
                                  {t.roles.length === 1 ? "role" : "roles"}
                                </small>
                              </span>
                              <span className={`status-badge ${t.status}`}>
                                {labels[t.status]}
                              </span>
                              <ArrowUpRight size={15} />
                            </button>
                          ))}
                      </div>
                    )}
                  </section>
                  <section className="panel activity-panel">
                    <div className="section-heading">
                      <h2>Around the office</h2>
                      <span className="activity-live">
                        <span /> Activity
                      </span>
                    </div>
                    {!state?.events.length ? (
                      <div className="welcome-event">
                        <span className="event-leaf">
                          <Leaf size={18} />
                        </span>
                        <div>
                          <strong>Welcome to your little studio.</strong>
                          <p>
                            Your team’s progress, handoffs, and small wins will
                            show up here.
                          </p>
                          <small>A fresh start</small>
                        </div>
                      </div>
                    ) : (
                      <div className="event-list">
                        {state.events.slice(0, 4).map((e) => (
                          <div className="event" key={e.id}>
                            {e.role ? (
                              <Avatar id={e.role} size="tiny" />
                            ) : (
                              <span className="event-leaf">
                                <Leaf size={13} />
                              </span>
                            )}
                            <div>
                              <p>{e.text}</p>
                              <time>
                                {new Date(e.time).toLocaleTimeString([], {
                                  hour: "2-digit",
                                  minute: "2-digit",
                                })}
                              </time>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </section>
                </div>
                <div className="page-footnote">
                  <span>
                    <ShieldCheck size={14} /> Your space. Your pace. You’re
                    always in charge.
                  </span>
                  <span>
                    Made for a little more possibility{" "}
                    <span className="flower">✳</span>
                  </span>
                </div>
              </>
            )}
            {tab === "Tasks" && (
              <>
                <div className="stats-grid">
                  {[
                    [tasks.length, "Total tasks", FileText],
                    [
                      tasks.filter((t) =>
                        ["running", "waiting"].includes(t.status),
                      ).length,
                      "In progress",
                      Clock3,
                    ],
                    [done, "Completed", CheckCheck],
                  ].map(([n, label, Icon]) => {
                    const I = Icon as typeof FileText;
                    return (
                      <div className="stat" key={String(label)}>
                        <I size={20} />
                        <strong>{String(n)}</strong>
                        <span>{String(label)}</span>
                      </div>
                    );
                  })}
                </div>
                <section className="panel">
                  <div className="section-heading">
                    <div className="tabs">
                      {["All tasks", "Active", "Completed"].map((f) => (
                        <button
                          className={filter === f ? "active" : ""}
                          key={f}
                          onClick={() => setFilter(f)}
                        >
                          {f}
                        </button>
                      ))}
                    </div>
                    <span className="muted">{visibleTasks.length} tasks</span>
                  </div>
                  {visibleTasks.length ? (
                    <div className="task-list">
                      {[...visibleTasks].reverse().map((t) => (
                        <button
                          className="task-row"
                          key={t.id}
                          onClick={() => setDetail(t.id)}
                        >
                          <Avatar
                            id={t.roles[Math.min(t.stage, t.roles.length - 1)]}
                          />
                          <span className="task-row-title">
                            <strong>{t.title}</strong>
                            <small>
                              {t.roles
                                .map((r) => team.find((m) => m.id === r)?.name)
                                .join(" → ")}
                            </small>
                          </span>
                          <span className={`status-badge ${t.status}`}>
                            {labels[t.status]}
                          </span>
                          <ArrowUpRight size={16} />
                        </button>
                      ))}
                    </div>
                  ) : (
                    <div className="large-empty">
                      <FileText size={32} />
                      <h3>
                        {filter === "Completed"
                          ? "Good work is on the way."
                          : "A clean desk. A world of possibilities."}
                      </h3>
                      <p>
                        {filter === "Completed"
                          ? "Finished tasks and their results will live here."
                          : "Add a brief and choose the teammates who can help."}
                      </p>
                      <button
                        className="button primary"
                        onClick={() => openTask()}
                      >
                        <Plus size={16} /> Create a task
                      </button>
                    </div>
                  )}
                </section>
              </>
            )}
            {tab === "Team" && (
              <div className="team-grid">
                {team.map((m) => (
                  <section className="panel team-tile" key={m.id}>
                    <Avatar id={m.id} size="large" />
                    <h2>{m.name}</h2>
                    <span className="muted">{m.role}</span>
                    <p>{m.description}</p>
                    <div className="skill-tags">
                      {m.skills.map((s) => (
                        <span key={s}>{s}</span>
                      ))}
                    </div>
                    <button
                      className="button outline full"
                      onClick={() => {
                        setSelected(m.id);
                        openTask(true);
                      }}
                    >
                      Assign a task <ArrowRight size={15} />
                    </button>
                  </section>
                ))}
              </div>
            )}
            {tab === "Projects" && (
              <section className="panel project-panel">
                <span className="project-folder">
                  <FolderOpen size={32} />
                </span>
                <div>
                  <span className="eyebrow">CONNECTED PROJECT</span>
                  <h2>
                    {state?.settings.workspace.split(/[\\/]/).pop() ||
                      "Your local project"}
                  </h2>
                  <code>{state?.settings.workspace || "Loading…"}</code>
                  <p>
                    Your team reads and edits files in this folder. Tasks and
                    history stay saved locally.
                  </p>
                  <div className="project-actions">
                    <button
                      className="button outline"
                      onClick={() => setModal("settings")}
                    >
                      Change project <FolderOpen size={15} />
                    </button>
                    {state?.settings.previewUrl ? (
                      <a
                        className="button primary"
                        href={state.settings.previewUrl}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Open preview <ExternalLink size={15} />
                      </a>
                    ) : (
                      <button
                        className="button outline"
                        onClick={() => setModal("settings")}
                      >
                        Set preview address <ArrowUpRight size={15} />
                      </button>
                    )}
                  </div>
                </div>
              </section>
            )}
          </div>
        </main>
        {modal === "task" && (
          <NewTask
            single={singleTask}
            selected={selected}
            busy={busy}
            connected={connected}
            close={() => setModal(null)}
            submit={async (data) => {
              if (await act({ action: "task", ...data })) setModal(null);
            }}
          />
        )}
        {modal === "settings" && state && (
          <SettingsModal
            state={state}
            busy={busy}
            close={() => setModal(null)}
            connect={() =>
              act({
                action:
                  state.connection.status === "signin" ? "login" : "connect",
              })
            }
            save={async (data) => {
              if (await act({ action: "settings", ...data })) setModal(null);
            }}
          />
        )}
        {modal === "approvals" && (
          <Modal
            title="A moment for your input."
            subtitle="Your team pauses here when a decision needs you."
            close={() => setModal(null)}
          >
            {approvals.length ? (
              approvals.map((a) => (
                <ApprovalCard
                  key={a.id}
                  approval={a}
                  busy={busy}
                  respond={(decision, answers) =>
                    act({ action: "approval", id: a.id, decision, answers })
                  }
                />
              ))
            ) : (
              <div className="large-empty">
                <ShieldCheck size={36} />
                <h3>Nothing needs your approval.</h3>
                <p>You’ll see requests here when a teammate needs your help.</p>
              </div>
            )}
          </Modal>
        )}
        {modal === "help" && (
          <Modal title="Make yourself at home." close={() => setModal(null)}>
            <div className="help-steps">
              {[
                [
                  "1",
                  "Connect your team",
                  "In Settings, connect your existing ChatGPT sign-in through local Codex. No API key is used.",
                ],
                [
                  "2",
                  "Share a good brief",
                  "Describe the outcome, choose one teammate or the full team, and add your task.",
                ],
                [
                  "3",
                  "Watch good work happen",
                  "Click a teammate for their current task. Read real output, answer approval requests, or pause the team.",
                ],
                [
                  "4",
                  "Keep the work close",
                  "Project files stay in your selected folder. Open your local preview from Projects.",
                ],
              ].map(([n, h, p]) => (
                <div key={n}>
                  <span>{n}</span>
                  <div>
                    <h3>{h}</h3>
                    <p>{p}</p>
                  </div>
                </div>
              ))}
            </div>
          </Modal>
        )}
        {taskDetail && (
          <Modal
            title={taskDetail.title}
            subtitle={`${labels[taskDetail.status]} · ${taskDetail.history.length} of ${taskDetail.roles.length} handoffs complete`}
            close={() => setDetail(null)}
          >
            <div className="task-detail">
              <h3>The brief</h3>
              <p className="preserve">{taskDetail.brief}</p>
              <div className="handoff-chain">
                {taskDetail.roles.map((r, i) => (
                  <span
                    key={r}
                    className={i < taskDetail.stage ? "finished" : ""}
                  >
                    <Avatar id={r} size="tiny" />
                    {team.find((m) => m.id === r)?.name}
                    {i < taskDetail.stage && <Check size={13} />}
                  </span>
                ))}
              </div>
              {taskDetail.history.map((h, i) => (
                <details key={i} open={i === taskDetail.history.length - 1}>
                  <summary>
                    {team.find((m) => m.id === h.role)?.name}’s handoff
                  </summary>
                  <pre>{h.text || "No text output was returned."}</pre>
                </details>
              ))}
              {taskDetail.status !== "done" && taskDetail.output && (
                <>
                  <h3>Latest from the desk</h3>
                  <pre>{taskDetail.output}</pre>
                </>
              )}
              {taskDetail.error && (
                <p className="inline-error">{taskDetail.error}</p>
              )}
              {["failed", "paused"].includes(taskDetail.status) && (
                <button
                  className="button primary"
                  disabled={busy}
                  onClick={() =>
                    void act({ action: "retry", id: taskDetail.id })
                  }
                >
                  <RotateCcw size={15} /> Retry this step
                </button>
              )}
              {["queued", "failed", "paused"].includes(taskDetail.status) && (
                <button
                  className="button outline"
                  disabled={busy}
                  onClick={() =>
                    void act({ action: "cancel", id: taskDetail.id })
                  }
                >
                  Cancel task
                </button>
              )}
              {taskDetail.status === "queued" && !connected && (
                <p className="connection-hint">
                  <Plug size={16} /> Waiting for a Codex connection.
                </p>
              )}
            </div>
          </Modal>
        )}
        {busy && (
          <div className="saving-indicator" role="status">
            <LoaderCircle size={15} className="spin" /> One moment…
          </div>
        )}
      </div>
    </ErrorContext.Provider>
  );
}
function NewTask({
  single,
  selected,
  busy,
  connected,
  close,
  submit,
}: {
  single: boolean;
  selected: Role;
  busy: boolean;
  connected: boolean;
  close: () => void;
  submit: (data: Record<string, unknown>) => Promise<void>;
}) {
  const [mode, setMode] = useState<"team" | "single">(
    single ? "single" : "team",
  );
  const [role, setRole] = useState<Role>(selected);
  function send(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const data = new FormData(e.currentTarget);
    void submit({
      title: data.get("title"),
      brief: data.get("brief"),
      roles: mode === "team" ? team.map((m) => m.id) : [role],
    });
  }
  return (
    <Modal
      title="What shall we make?"
      subtitle="A little context goes a long way. Tell your team about the idea."
      close={close}
    >
      <form onSubmit={send} className="form">
        <label>
          Give it a name
          <input
            autoFocus
            name="title"
            placeholder="A website for something wonderful"
            maxLength={100}
            required
          />
        </label>
        <label>
          The brief
          <textarea
            name="brief"
            placeholder="What are we building? Who is it for? Share the features, style, and anything your team should know…"
            rows={5}
            maxLength={20000}
            required
          />
        </label>
        <label>Who’s on it?</label>
        <div className="mode-choice">
          <button
            type="button"
            className={mode === "team" ? "selected" : ""}
            onClick={() => setMode("team")}
          >
            <Users size={18} />
            <strong>The whole team</strong>
            <small>Plan → design → build → review</small>
          </button>
          <button
            type="button"
            className={mode === "single" ? "selected" : ""}
            onClick={() => setMode("single")}
          >
            <Sparkles size={18} />
            <strong>One teammate</strong>
            <small>A focused task for one role</small>
          </button>
        </div>
        {mode === "single" && (
          <label>
            Teammate
            <select
              value={role}
              onChange={(e) => setRole(e.target.value as Role)}
            >
              {team.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name} — {m.role}
                </option>
              ))}
            </select>
          </label>
        )}
        <p className="form-note">
          <ShieldCheck size={15} />
          {connected
            ? "One teammate works at a time. You stay in control."
            : "Saved to the queue until you connect Codex."}
        </p>
        <button disabled={busy} className="button primary full" type="submit">
          Add to the team’s desk <ArrowRight size={16} />
        </button>
      </form>
    </Modal>
  );
}
function SettingsModal({
  state,
  busy,
  close,
  connect,
  save,
}: {
  state: OfficeState;
  busy: boolean;
  close: () => void;
  connect: () => Promise<boolean>;
  save: (d: Record<string, unknown>) => Promise<void>;
}) {
  return (
    <Modal
      title="A space that works for you."
      subtitle="Your team runs locally, using your existing Codex sign-in."
      close={close}
    >
      <div className="connection-card">
        <span className="connection-icon">
          <Plug size={22} />
        </span>
        <div>
          <strong>
            {state.connection.status === "connected"
              ? "Codex is connected"
              : "Connect your teammates"}
          </strong>
          <p>{state.connection.message}</p>
          {state.connection.plan && (
            <small>ChatGPT {state.connection.plan} · one active worker</small>
          )}
        </div>
        <button
          className="button outline"
          disabled={busy || state.connection.status === "connected"}
          onClick={() => void connect()}
        >
          {state.connection.status === "connected" ? (
            <Check size={17} />
          ) : busy ? (
            <LoaderCircle className="spin" size={17} />
          ) : state.connection.status === "signin" ? (
            "Sign in"
          ) : (
            "Connect"
          )}
        </button>
      </div>
      {state.connection.loginUrl && (
        <a
          className="button primary full"
          href={state.connection.loginUrl}
          target="_blank"
          rel="noreferrer"
        >
          Continue with ChatGPT <ExternalLink size={15} />
        </a>
      )}
      <p className="form-note">
        Sign in here with ChatGPT. Your subscription’s usage limits still apply.
      </p>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const d = new FormData(e.currentTarget);
          void save({
            workspace: d.get("workspace"),
            previewUrl: d.get("previewUrl"),
          });
        }}
      >
        <label>
          Project folder
          <input
            name="workspace"
            defaultValue={state.settings.workspace}
            required
          />
          <small>
            Your teammates work in this folder. Finish queued work before
            switching.
          </small>
        </label>
        <label>
          Project preview <span className="muted">(optional)</span>
          <input
            name="previewUrl"
            type="url"
            defaultValue={state.settings.previewUrl}
            placeholder="http://localhost:3001"
          />
          <small>The address of your project’s running local preview.</small>
        </label>
        <div className="settings-policy">
          <ShieldCheck size={18} />
          <p>
            Command approvals come to your inbox. Publishing, paid services, and
            production changes are outside this first version’s worker scope.
          </p>
        </div>
        <button className="button primary full" disabled={busy}>
          Save workspace
        </button>
      </form>
    </Modal>
  );
}
function ApprovalCard({
  approval,
  busy,
  respond,
}: {
  approval: Approval;
  busy: boolean;
  respond: (
    decision: string,
    answers?: Record<string, string>,
  ) => Promise<boolean>;
}) {
  return (
    <div className="approval-card">
      <h3>{approval.title}</h3>
      <pre>{approval.details}</pre>
      {approval.questions ? (
        <form
          className="form"
          onSubmit={(e) => {
            e.preventDefault();
            void respond(
              "accept",
              Object.fromEntries(new FormData(e.currentTarget)) as Record<
                string,
                string
              >,
            );
          }}
        >
          {approval.questions.map((q) => (
            <label key={q.id}>
              {q.question}
              {q.options?.length ? (
                <>
                  <select name={q.id} required>
                    <option value="">Choose an answer</option>
                    {q.options.map((o) => (
                      <option key={o.label} value={o.label}>
                        {o.label} — {o.description}
                      </option>
                    ))}
                  </select>
                </>
              ) : (
                <input name={q.id} required />
              )}
            </label>
          ))}
          <button className="button primary" disabled={busy}>
            Send answer <Send size={14} />
          </button>
        </form>
      ) : (
        <div className="approval-actions">
          <button
            disabled={busy}
            className="button outline"
            onClick={() => void respond("decline")}
          >
            Decline
          </button>
          <button
            disabled={busy}
            className="button primary"
            onClick={() => void respond("accept")}
          >
            Approve once <Check size={15} />
          </button>
        </div>
      )}
    </div>
  );
}
