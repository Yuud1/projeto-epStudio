import type { Campaign, Task } from "@prisma/client";
import type { AuthenticatedUser } from "../../shared/types/auth.js";
import {
  isOperationalRole,
  TASK_ASSIGNEE_ROLES,
} from "../../shared/types/auth.js";
import {
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import { CAMPAIGN_MESSAGES } from "../campaigns/campaign.errors.js";
import {
  canViewCampaign,
} from "../campaigns/campaign.permissions.js";
import { TASK_MESSAGES } from "./task.errors.js";
import type { TaskWithRelations } from "./task.types.js";

export function isAdmin(user: AuthenticatedUser) {
  return user.role === "ADMIN";
}

export function isMarketingManager(user: AuthenticatedUser) {
  return user.role === "MARKETING_MANAGER";
}

export function isRequester(user: AuthenticatedUser) {
  return user.role === "REQUESTER";
}

export function isAssigneeRole(role: AuthenticatedUser["role"]) {
  return TASK_ASSIGNEE_ROLES.includes(role);
}

export function canManageCampaignTasks(
  user: AuthenticatedUser,
  campaign: Pick<Campaign, "marketingManagerId" | "status">,
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (isMarketingManager(user)) {
    return campaign.marketingManagerId === user.sub;
  }

  return false;
}

export function canCreateTaskInCampaign(
  user: AuthenticatedUser,
  campaign: Pick<Campaign, "marketingManagerId" | "status">,
): boolean {
  if (
    campaign.status === "DRAFT" ||
    campaign.status === "COMPLETED" ||
    campaign.status === "CANCELLED"
  ) {
    return false;
  }

  return canManageCampaignTasks(user, campaign);
}

export function isTaskAssignee(
  user: AuthenticatedUser,
  task: { assignees: Array<{ user: { id: string } }> },
): boolean {
  return task.assignees.some((assignee) => assignee.user.id === user.sub);
}

export function canViewTask(
  user: AuthenticatedUser,
  task: TaskWithRelations,
  options?: { hasAssignedTaskInCampaign?: boolean },
): boolean {
  if (isAdmin(user)) {
    return true;
  }

  if (isRequester(user)) {
    return task.campaign.requesterId === user.sub;
  }

  if (isMarketingManager(user)) {
    return task.campaign.marketingManagerId === user.sub;
  }

  if (isOperationalRole(user.role)) {
    return isTaskAssignee(user, task);
  }

  return false;
}

export function assertCanViewTask(
  user: AuthenticatedUser,
  task: TaskWithRelations | null,
): asserts task is TaskWithRelations {
  if (!task || !canViewTask(user, task)) {
    throw new NotFoundError(TASK_MESSAGES.NOT_FOUND);
  }
}

export function assertCanViewCampaignForTasks(
  user: AuthenticatedUser,
  campaign: Pick<
    Campaign,
    "id" | "requesterId" | "marketingManagerId" | "status"
  > | null,
  options?: { hasAssignedTask?: boolean },
): asserts campaign is NonNullable<typeof campaign> {
  if (!campaign || !canViewCampaign(user, campaign, options)) {
    throw new NotFoundError(CAMPAIGN_MESSAGES.NOT_FOUND);
  }
}

export function canEditTaskFields(
  user: AuthenticatedUser,
  task: TaskWithRelations,
): void {
  if (task.status === "DONE" || task.status === "CANCELLED") {
    throw new ForbiddenError("Não é possível editar tarefas concluídas ou canceladas.");
  }

  if (!canManageCampaignTasks(user, task.campaign)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }
}

export function canChangeTaskStatus(
  user: AuthenticatedUser,
  task: TaskWithRelations,
): boolean {
  if (task.status === "CANCELLED") {
    return false;
  }

  if (isAdmin(user) || canManageCampaignTasks(user, task.campaign)) {
    return true;
  }

  if (isOperationalRole(user.role)) {
    return isTaskAssignee(user, task);
  }

  return false;
}

export function canCancelTask(
  user: AuthenticatedUser,
  task: TaskWithRelations,
): boolean {
  if (task.status === "DONE" || task.status === "CANCELLED") {
    return false;
  }

  return canManageCampaignTasks(user, task.campaign);
}

export function filterTasksForOperationalListing(
  user: AuthenticatedUser,
): boolean {
  return isOperationalRole(user.role);
}

export type { Task };
