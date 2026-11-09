export const team = [
  {
    id: "lead",
    name: "Comoy",
    role: "Team lead",
    color: "#b77c5b",
    initial: "C",
    description: "A little structure for your big ideas.",
    skills: ["Planning", "Coordination", "Architecture"],
  },
  {
    id: "design",
    name: "Sukijem",
    role: "Designer",
    color: "#ae8ba8",
    initial: "S",
    description: "Thoughtful details. Beautiful experiences.",
    skills: ["UI / UX", "Design systems", "Responsive design"],
  },
  {
    id: "frontend",
    name: "Dono",
    role: "Frontend developer",
    color: "#7a9e91",
    initial: "D",
    description: "Turning good designs into great interactions.",
    skills: ["React", "Next.js", "Accessibility"],
  },
  {
    id: "backend",
    name: "Kiwir",
    role: "Backend developer",
    color: "#7e95b2",
    initial: "K",
    description: "Making everything work behind the scenes.",
    skills: ["APIs", "Databases", "Authentication"],
  },
  {
    id: "review",
    name: "Ijum",
    role: "Reviewer & QA",
    color: "#c7a45e",
    initial: "I",
    description: "A fresh pair of eyes, before it goes out.",
    skills: ["Code review", "Testing", "Quality"],
  },
] as const;
export type Role = (typeof team)[number]["id"];
export type Task = {
  exportWarning?: string;
  sessions?: {role: Role; threadId: string; model: string}[];
  artifacts?: {name: string; file: string}[];
  stitch?: {projectId: string; screenId: string};
  parentId?: string;
  parallelIds?: string[];
  reviewRounds?: number;
  projectId?: string;
  workspace?: string;
  id: string;
  title: string;
  brief: string;
  roles: Role[];
  stage: number;
  status:
    | "queued"
    | "running"
    | "waiting"
    | "done"
    | "failed"
    | "paused"
    | "cancelled";
  createdAt: string;
  output: string;
  error?: string;
  threadId?: string;
  turnId?: string;
  history: { role: Role; text: string; threadId?: string }[];
};
export type Approval = {
  id: string;
  taskId: string;
  method: string;
  title: string;
  details: string;
  questions?: {
    id: string;
    question: string;
    options?: { label: string; description: string }[];
  }[];
};
export type OfficeState = {
  stitch?: {status: string; models: {model: string; displayName: string}[]};
  models?: { id: string; model: string; displayName: string; isDefault?: boolean }[];
  modelError?: string;
  workers?: Partial<Record<Role, { provider: string; model: string }>>;
  tasks: Task[];
  approvals: Approval[];
  events: { id: string; text: string; time: string; role?: Role }[];
  paused: boolean;
  projects: { id: string; name: string; workspace: string; previewUrl: string }[];
  settings: { workspace: string; previewUrl: string; projectId?: string };
  connection: {
    status: string;
    message: string;
    plan?: string;
    loginUrl?: string;
  };
};
