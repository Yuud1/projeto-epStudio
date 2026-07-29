import type {
  Campaign,
  CampaignPriority,
  CampaignStatus,
  Prisma,
  UserRole,
} from "@prisma/client";
import type { AuthenticatedUser } from "../../shared/types/auth.js";
import {
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import { CAMPAIGN_MESSAGES } from "./campaign.errors.js";
import type { CampaignWithRelations } from "./campaign.types.js";

export function buildVisibilityWhere(
  user: AuthenticatedUser,
): Prisma.CampaignWhereInput {
  if (user.role === "ADMIN") {
    return {};
  }

  if (user.role === "REQUESTER") {
    return { requesterId: user.sub };
  }

  if (user.role === "MARKETING_MANAGER") {
    return {
      OR: [
        { status: "OPEN", marketingManagerId: null },
        { marketingManagerId: user.sub },
      ],
    };
  }

  return { id: "__none__" };
}

export function canViewCampaign(
  user: AuthenticatedUser,
  campaign: Pick<Campaign, "requesterId" | "marketingManagerId" | "status">,
): boolean {
  if (user.role === "ADMIN") {
    return true;
  }

  if (user.role === "REQUESTER") {
    return campaign.requesterId === user.sub;
  }

  if (user.role === "MARKETING_MANAGER") {
    if (campaign.marketingManagerId === user.sub) {
      return true;
    }

    return campaign.status === "OPEN" && campaign.marketingManagerId === null;
  }

  return false;
}

export function assertCanView(
  user: AuthenticatedUser,
  campaign: CampaignWithRelations | null,
): asserts campaign is CampaignWithRelations {
  if (!campaign || !canViewCampaign(user, campaign)) {
    throw new NotFoundError(CAMPAIGN_MESSAGES.NOT_FOUND);
  }
}

export function isRequester(user: AuthenticatedUser): boolean {
  return user.role === "REQUESTER";
}

export function isMarketingManager(user: AuthenticatedUser): boolean {
  return user.role === "MARKETING_MANAGER";
}

export function isAdmin(user: AuthenticatedUser): boolean {
  return user.role === "ADMIN";
}

export function canCreateCampaign(role: UserRole): boolean {
  return (
    role === "ADMIN" || role === "REQUESTER" || role === "MARKETING_MANAGER"
  );
}

export function canEditCampaignFields(
  user: AuthenticatedUser,
  campaign: Campaign,
  fields: {
    title?: boolean;
    description?: boolean;
    objective?: boolean;
    priority?: boolean;
    startsAt?: boolean;
    dueAt?: boolean;
  },
): void {
  if (isAdmin(user)) {
    return;
  }

  if (isRequester(user)) {
    if (campaign.requesterId !== user.sub) {
      throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
    }

    if (campaign.status === "DRAFT") {
      return;
    }

    if (
      campaign.status === "OPEN" &&
      campaign.marketingManagerId === null
    ) {
      if (fields.priority) {
        throw new ForbiddenError(
          "Você não pode alterar a prioridade deste chamado.",
        );
      }
      return;
    }

    throw new ForbiddenError(
      "Você não pode editar este chamado no status atual.",
    );
  }

  if (isMarketingManager(user)) {
    if (campaign.marketingManagerId !== user.sub) {
      throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
    }

    if (
      campaign.status === "COMPLETED" ||
      campaign.status === "CANCELLED" ||
      campaign.status === "DRAFT"
    ) {
      throw new ForbiddenError(
        "Você não pode editar este chamado no status atual.",
      );
    }

    return;
  }

  throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
}

export function canClaim(user: AuthenticatedUser, campaign: Campaign): boolean {
  return (
    isMarketingManager(user) &&
    campaign.status === "OPEN" &&
    campaign.marketingManagerId === null
  );
}

export function canChangeStatus(
  user: AuthenticatedUser,
  campaign: Campaign,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (isMarketingManager(user)) {
    return campaign.marketingManagerId === user.sub;
  }

  return false;
}

export function canCancel(
  user: AuthenticatedUser,
  campaign: Campaign,
): boolean {
  if (campaign.status === "COMPLETED" || campaign.status === "CANCELLED") {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  if (isRequester(user) && campaign.requesterId === user.sub) {
    return campaign.status === "DRAFT" || campaign.status === "OPEN";
  }

  if (isMarketingManager(user)) {
    return campaign.marketingManagerId === user.sub;
  }

  return false;
}

export function canSubmit(
  user: AuthenticatedUser,
  campaign: Campaign,
): boolean {
  if (campaign.status !== "DRAFT") {
    return false;
  }

  if (isAdmin(user)) {
    return true;
  }

  return isRequester(user) && campaign.requesterId === user.sub;
}

export type SummaryCounts = {
  open: number;
  inProgress: number;
  waitingApproval: number;
  completed: number;
};

export function priorityRank(priority: CampaignPriority): number {
  switch (priority) {
    case "LOW":
      return 1;
    case "MEDIUM":
      return 2;
    case "HIGH":
      return 3;
    case "URGENT":
      return 4;
    default:
      return 0;
  }
}
