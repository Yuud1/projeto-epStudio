import type { CampaignStatus } from "@prisma/client";
import { UnprocessableEntityError } from "../../shared/errors/app-error.js";
import { STATUS_LABELS } from "./campaign.types.js";

export const allowedTransitions: Record<CampaignStatus, CampaignStatus[]> = {
  DRAFT: ["OPEN", "CANCELLED"],
  OPEN: ["IN_ANALYSIS", "CANCELLED"],
  IN_ANALYSIS: ["IN_PROGRESS", "WAITING_REQUESTER", "CANCELLED"],
  IN_PROGRESS: [
    "WAITING_REQUESTER",
    "WAITING_APPROVAL",
    "COMPLETED",
    "CANCELLED",
  ],
  WAITING_REQUESTER: ["IN_ANALYSIS", "IN_PROGRESS", "CANCELLED"],
  WAITING_APPROVAL: ["IN_PROGRESS", "COMPLETED", "CANCELLED"],
  COMPLETED: [],
  CANCELLED: [],
};

export const reopenTargetStatuses: CampaignStatus[] = ["OPEN", "IN_ANALYSIS"];

export function assertTransition(
  from: CampaignStatus,
  to: CampaignStatus,
): void {
  const allowed = allowedTransitions[from];

  if (!allowed.includes(to)) {
    throw new UnprocessableEntityError(
      `Não é possível alterar o status de ${STATUS_LABELS[from]} para ${STATUS_LABELS[to]}.`,
    );
  }
}
