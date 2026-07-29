import type {
  Campaign,
  Task,
  TaskActivity,
  TaskActivityType,
  TaskPriority,
  TaskStatus,
  User,
  UserRole,
} from "@prisma/client";

export type { TaskActivityType, TaskPriority, TaskStatus };

export type UserSummary = {
  id: string;
  name: string;
  email: string;
  role?: UserRole;
};

export type CampaignSummary = {
  id: string;
  title: string;
  status: Campaign["status"];
};

export type TaskAssigneeView = {
  id: string;
  assignedAt: string;
  user: UserSummary;
};

export type TaskWithRelations = Task & {
  campaign: Pick<Campaign, "id" | "title" | "status" | "requesterId" | "marketingManagerId">;
  createdBy: Pick<User, "id" | "name" | "email">;
  assignees: Array<{
    id: string;
    assignedAt: Date;
    user: Pick<User, "id" | "name" | "email" | "role">;
  }>;
  _count?: { activities: number };
};

export type TaskActivityWithActor = TaskActivity & {
  actor: Pick<User, "id" | "name" | "email">;
};

export type TaskResponse = {
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
  campaign: CampaignSummary;
  createdBy: UserSummary;
  assignees: TaskAssigneeView[];
  activitiesCount?: number;
  createdAt: string;
  updatedAt: string;
};

export type TaskActivityResponse = {
  id: string;
  type: TaskActivityType;
  description: string;
  metadata: unknown;
  actor: UserSummary;
  createdAt: string;
};

export type TaskDetailResponse = TaskResponse & {
  activities: TaskActivityResponse[];
};

export type TaskSummaryResponse = {
  total: number;
  todo: number;
  inProgress: number;
  blocked: number;
  inReview: number;
  done: number;
  overdue: number;
};

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

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toTaskResponse(task: TaskWithRelations): TaskResponse {
  return {
    id: task.id,
    title: task.title,
    description: task.description,
    status: task.status,
    priority: task.priority,
    position: task.position,
    dueAt: toIso(task.dueAt),
    startedAt: toIso(task.startedAt),
    completedAt: toIso(task.completedAt),
    cancelledAt: toIso(task.cancelledAt),
    cancellationReason: task.cancellationReason,
    campaign: {
      id: task.campaign.id,
      title: task.campaign.title,
      status: task.campaign.status,
    },
    createdBy: {
      id: task.createdBy.id,
      name: task.createdBy.name,
      email: task.createdBy.email,
    },
    assignees: task.assignees.map((assignee) => ({
      id: assignee.id,
      assignedAt: assignee.assignedAt.toISOString(),
      user: {
        id: assignee.user.id,
        name: assignee.user.name,
        email: assignee.user.email,
        role: assignee.user.role,
      },
    })),
    activitiesCount: task._count?.activities,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  };
}

export function toTaskActivityResponse(
  activity: TaskActivityWithActor,
): TaskActivityResponse {
  return {
    id: activity.id,
    type: activity.type,
    description: activity.description,
    metadata: activity.metadata,
    actor: {
      id: activity.actor.id,
      name: activity.actor.name,
      email: activity.actor.email,
    },
    createdAt: activity.createdAt.toISOString(),
  };
}
