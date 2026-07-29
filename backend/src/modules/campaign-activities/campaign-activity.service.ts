import type { CampaignActivityType, CampaignPriority, CampaignStatus, Prisma } from "@prisma/client";
import { PRIORITY_LABELS, STATUS_LABELS } from "../campaigns/campaign.types.js";

export function buildCreatedDescription(actorName: string): string {
  return `${actorName} criou o chamado.`;
}

export function buildUpdatedDescription(actorName: string): string {
  return `${actorName} atualizou o chamado.`;
}

export function buildStatusChangedDescription(
  actorName: string,
  from: CampaignStatus,
  to: CampaignStatus,
): string {
  return `${actorName} alterou o status de ${STATUS_LABELS[from]} para ${STATUS_LABELS[to]}.`;
}

export function buildPriorityChangedDescription(
  actorName: string,
  from: CampaignPriority,
  to: CampaignPriority,
): string {
  return `${actorName} alterou a prioridade de ${PRIORITY_LABELS[from]} para ${PRIORITY_LABELS[to]}.`;
}

export function buildAssignedDescription(
  actorName: string,
  managerName: string,
  selfAssigned: boolean,
): string {
  if (selfAssigned) {
    return `${actorName} assumiu o chamado.`;
  }

  return `${actorName} atribuiu o chamado a ${managerName}.`;
}

export function buildUnassignedDescription(actorName: string): string {
  return `${actorName} removeu o responsável do chamado.`;
}

export function buildDueDateChangedDescription(actorName: string): string {
  return `${actorName} alterou o prazo do chamado.`;
}

export function buildCancelledDescription(actorName: string): string {
  return `${actorName} cancelou o chamado.`;
}

export function buildReopenedDescription(actorName: string): string {
  return `${actorName} reabriu o chamado.`;
}

export function buildCompletedDescription(actorName: string): string {
  return `${actorName} concluiu o chamado.`;
}

export type ActivityInput = {
  type: CampaignActivityType;
  description: string;
  metadata?: Prisma.InputJsonValue;
  campaignId: string;
  actorId: string;
};
