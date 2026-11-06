export const team = [
  {
    id: "lead",
    name: "Milo",
    role: "Team lead",
    color: "#b77c5b",
    initial: "M",
    description: "A little structure for your big ideas.",
    skills: ["Planning", "Coordination", "Architecture"],
  },
  {
    id: "design",
    name: "Luna",
    role: "Designer",
    color: "#ae8ba8",
    initial: "L",
    description: "Thoughtful details. Beautiful experiences.",
    skills: ["UI / UX", "Design systems", "Responsive design"],
  },
  {
    id: "frontend",
    name: "Finn",
    role: "Frontend developer",
    color: "#7a9e91",
    initial: "F",
    description: "Turning good designs into great interactions.",
    skills: ["React", "Next.js", "Accessibility"],
  },
  {
    id: "backend",
    name: "Otto",
    role: "Backend developer",
    color: "#7e95b2",
    initial: "O",
    description: "Making everything work behind the scenes.",
    skills: ["APIs", "Databases", "Authentication"],
  },
  {
    id: "review",
    name: "Pip",
    role: "Reviewer & QA",
    color: "#c7a45e",
    initial: "P",
    description: "A fresh pair of eyes, before it goes out.",
    skills: ["Code review", "Testing", "Quality"],
  },
] as const;
export type Role = (typeof team)[number]["id"];
export type Task = {
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
  history: { role: Role; text: string }[];
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
  tasks: Task[];
  approvals: Approval[];
  events: { id: string; text: string; time: string; role?: Role }[];
  paused: boolean;
  settings: { workspace: string; previewUrl: string };
  connection: {
    status: string;
    message: string;
    plan?: string;
    loginUrl?: string;
  };
};
