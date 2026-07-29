import type {
  Campaign,
  CampaignActivity,
  CampaignActivityType,
  CampaignPriority,
  CampaignStatus,
  User,
} from "@prisma/client";

export type {
  CampaignActivityType,
  CampaignPriority,
  CampaignStatus,
};

export type CampaignUserSummary = {
  id: string;
  name: string;
  email: string;
};

export type CampaignWithRelations = Campaign & {
  requester: Pick<User, "id" | "name" | "email">;
  marketingManager: Pick<User, "id" | "name" | "email"> | null;
};

export type CampaignActivityWithActor = CampaignActivity & {
  actor: Pick<User, "id" | "name" | "email">;
};

export type CampaignDetail = CampaignWithRelations & {
  activities: CampaignActivityWithActor[];
};

export type CampaignResponse = {
  id: string;
  title: string;
  description: string;
  objective: string | null;
  priority: CampaignPriority;
  status: CampaignStatus;
  startsAt: string | null;
  dueAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancellationReason: string | null;
  requester: CampaignUserSummary;
  marketingManager: CampaignUserSummary | null;
  taskProgress: {
    total: number;
    completed: number;
    percentage: number;
  };
  createdAt: string;
  updatedAt: string;
};

export type CampaignActivityResponse = {
  id: string;
  type: CampaignActivityType;
  description: string;
  metadata: unknown;
  actor: CampaignUserSummary;
  createdAt: string;
};

export type CampaignDetailResponse = CampaignResponse & {
  activities: CampaignActivityResponse[];
};

export type PaginationMeta = {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
};

export const STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  IN_ANALYSIS: "Em análise",
  IN_PROGRESS: "Em andamento",
  WAITING_REQUESTER: "Aguardando solicitante",
  WAITING_APPROVAL: "Aguardando aprovação",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const PRIORITY_LABELS: Record<CampaignPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};

function toIso(value: Date | null): string | null {
  return value ? value.toISOString() : null;
}

export function toCampaignResponse(
  campaign: CampaignWithRelations,
  taskProgress: {
    total: number;
    completed: number;
    percentage: number;
  } = { total: 0, completed: 0, percentage: 0 },
): CampaignResponse {
  return {
    id: campaign.id,
    title: campaign.title,
    description: campaign.description,
    objective: campaign.objective,
    priority: campaign.priority,
    status: campaign.status,
    startsAt: toIso(campaign.startsAt),
    dueAt: toIso(campaign.dueAt),
    completedAt: toIso(campaign.completedAt),
    cancelledAt: toIso(campaign.cancelledAt),
    cancellationReason: campaign.cancellationReason,
    requester: {
      id: campaign.requester.id,
      name: campaign.requester.name,
      email: campaign.requester.email,
    },
    marketingManager: campaign.marketingManager
      ? {
          id: campaign.marketingManager.id,
          name: campaign.marketingManager.name,
          email: campaign.marketingManager.email,
        }
      : null,
    taskProgress,
    createdAt: campaign.createdAt.toISOString(),
    updatedAt: campaign.updatedAt.toISOString(),
  };
}

export function toActivityResponse(
  activity: CampaignActivityWithActor,
): CampaignActivityResponse {
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
