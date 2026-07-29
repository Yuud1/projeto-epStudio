export type TaskStatus =
  | "TODO"
  | "IN_PROGRESS"
  | "BLOCKED"
  | "IN_REVIEW"
  | "DONE"
  | "CANCELLED";

export type TaskPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type TaskActivityType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "DUE_DATE_CHANGED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "POSITION_CHANGED"
  | "CANCELLED"
  | "COMPLETED"
  | "REOPENED";

export interface TaskUserSummary {
  id: string;
  name: string;
  email: string;
  role?: string;
}

export interface TaskCampaignSummary {
  id: string;
  title: string;
  status: string;
}

export interface TaskAssignee {
  id: string;
  assignedAt: string;
  user: TaskUserSummary;
}

export interface Task {
  id: string;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  position: number;
  dueAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  campaign: TaskCampaignSummary;
  createdBy: TaskUserSummary;
  assignees: TaskAssignee[];
  activitiesCount?: number;
  createdAt: string;
  updatedAt: string;
}

export interface TaskActivity {
  id: string;
  type: TaskActivityType;
  description: string;
  metadata: unknown;
  actor: TaskUserSummary;
  createdAt: string;
}

export interface TaskDetail extends Task {
  activities: TaskActivity[];
}

export interface TaskListResponse {
  data: Task[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface TaskFilters {
  status?: TaskStatus;
  priority?: TaskPriority;
  search?: string;
  campaignId?: string;
  page?: number;
  limit?: number;
}

export interface CreateTaskInput {
  title: string;
  description?: string | null;
  priority?: TaskPriority;
  dueAt?: string | null;
  assigneeIds?: string[];
}

export interface TaskSummary {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  done: number;
  overdue: number;
}

export interface TaskProgress {
  total: number;
  completed: number;
  percentage: number;
}

export const TASK_STATUS_LABELS: Record<TaskStatus, string> = {
  TODO: "A fazer",
  IN_PROGRESS: "Em andamento",
  BLOCKED: "Bloqueada",
  IN_REVIEW: "Em revisão",
  DONE: "Concluída",
  CANCELLED: "Cancelada",
};

export const TASK_PRIORITY_LABELS: Record<TaskPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};
