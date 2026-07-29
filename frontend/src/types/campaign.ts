export type CampaignStatus =
  | "DRAFT"
  | "OPEN"
  | "IN_ANALYSIS"
  | "IN_PROGRESS"
  | "WAITING_REQUESTER"
  | "WAITING_APPROVAL"
  | "COMPLETED"
  | "CANCELLED";

export type CampaignPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export type CampaignActivityType =
  | "CREATED"
  | "UPDATED"
  | "STATUS_CHANGED"
  | "PRIORITY_CHANGED"
  | "ASSIGNED"
  | "UNASSIGNED"
  | "DUE_DATE_CHANGED"
  | "CANCELLED"
  | "REOPENED"
  | "COMPLETED";

export interface CampaignUserSummary {
  id: string;
  name: string;
  email: string;
}

export interface Campaign {
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
  createdAt: string;
  updatedAt: string;
}

export interface CampaignActivity {
  id: string;
  type: CampaignActivityType;
  description: string;
  metadata: unknown;
  actor: CampaignUserSummary;
  createdAt: string;
}

export interface CampaignDetail extends Campaign {
  activities: CampaignActivity[];
}

export interface PaginationMeta {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
}

export interface CampaignListResponse {
  data: Campaign[];
  pagination: PaginationMeta;
}

export interface CampaignFilters {
  status?: CampaignStatus;
  priority?: CampaignPriority;
  search?: string;
  page?: number;
  limit?: number;
  sortBy?: "createdAt" | "dueAt" | "priority" | "status" | "title" | "updatedAt";
  sortOrder?: "asc" | "desc";
  marketingManagerId?: string;
  requesterId?: string;
}

export interface CreateCampaignInput {
  title: string;
  description: string;
  objective?: string | null;
  priority?: CampaignPriority;
  startsAt?: string | null;
  dueAt?: string | null;
  saveAsDraft?: boolean;
}

export interface UpdateCampaignInput {
  title?: string;
  description?: string;
  objective?: string | null;
  priority?: CampaignPriority;
  startsAt?: string | null;
  dueAt?: string | null;
}

export interface ChangeStatusInput {
  status: CampaignStatus;
}

export interface CancelCampaignInput {
  reason: string;
}

export interface CampaignSummary {
  open: number;
  inProgress: number;
  waitingApproval: number;
  completed: number;
}

export const CAMPAIGN_STATUS_LABELS: Record<CampaignStatus, string> = {
  DRAFT: "Rascunho",
  OPEN: "Aberto",
  IN_ANALYSIS: "Em análise",
  IN_PROGRESS: "Em andamento",
  WAITING_REQUESTER: "Aguardando solicitante",
  WAITING_APPROVAL: "Aguardando aprovação",
  COMPLETED: "Concluído",
  CANCELLED: "Cancelado",
};

export const CAMPAIGN_PRIORITY_LABELS: Record<CampaignPriority, string> = {
  LOW: "Baixa",
  MEDIUM: "Média",
  HIGH: "Alta",
  URGENT: "Urgente",
};
