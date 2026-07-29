import type { CampaignStatus, Prisma } from "@prisma/client";
import type { AuthenticatedUser } from "../../shared/types/auth.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
  UnprocessableEntityError,
  ValidationError,
} from "../../shared/errors/app-error.js";
import * as activityCopy from "../campaign-activities/campaign-activity.service.js";
import { CAMPAIGN_MESSAGES } from "./campaign.errors.js";
import {
  assertCanView,
  buildVisibilityWhere,
  canCancel,
  canChangeStatus,
  canClaim,
  canCreateCampaign,
  canEditCampaignFields,
  canSubmit,
  isAdmin,
  isMarketingManager,
  isRequester,
} from "./campaign.permissions.js";
import * as repository from "./campaign.repository.js";
import type {
  CreateCampaignBody,
  ListCampaignsQuery,
  UpdateCampaignBody,
} from "./campaign.schemas.js";
import { assertTransition, reopenTargetStatuses } from "./campaign.transitions.js";
import {
  toActivityResponse,
  toCampaignResponse,
  type CampaignDetailResponse,
  type CampaignResponse,
  type PaginationMeta,
} from "./campaign.types.js";

async function resolveActorName(user: AuthenticatedUser): Promise<string> {
  const found = await repository.prisma.user.findUnique({
    where: { id: user.sub },
    select: { name: true },
  });

  return found?.name ?? user.email;
}

function ensureDueAtNotPast(dueAt: Date | null | undefined) {
  if (dueAt && dueAt.getTime() < Date.now() - 60_000) {
    throw new ValidationError("O prazo não pode ser anterior ao momento atual.");
  }
}

export async function createCampaign(
  user: AuthenticatedUser,
  body: CreateCampaignBody,
): Promise<CampaignResponse> {
  if (!canCreateCampaign(user.role)) {
    throw new ForbiddenError();
  }

  ensureDueAtNotPast(body.dueAt ?? null);

  const actorName = await resolveActorName(user);
  const status = body.saveAsDraft ? "DRAFT" : "OPEN";

  const campaign = await repository.prisma.$transaction(async (tx) => {
    const created = await tx.campaign.create({
      data: {
        title: body.title,
        description: body.description,
        objective: body.objective ?? null,
        priority: body.priority,
        status,
        startsAt: body.startsAt ?? null,
        dueAt: body.dueAt ?? null,
        requester: { connect: { id: user.sub } },
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "CREATED",
      description: activityCopy.buildCreatedDescription(actorName),
      campaignId: created.id,
      actorId: user.sub,
      metadata: { status },
    });

    return created;
  });

  return toCampaignResponse(campaign);
}

export async function listCampaigns(
  user: AuthenticatedUser,
  query: ListCampaignsQuery,
): Promise<{ data: CampaignResponse[]; pagination: PaginationMeta }> {
  const visibility = buildVisibilityWhere(user);

  let scopedQuery = query;

  if (isRequester(user) && query.requesterId && query.requesterId !== user.sub) {
    throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
  }

  if (isRequester(user)) {
    scopedQuery = { ...query, requesterId: user.sub };
  }

  if (
    isMarketingManager(user) &&
    query.marketingManagerId &&
    query.marketingManagerId !== user.sub
  ) {
    throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
  }

  const { items, total } = await repository.listCampaigns(visibility, scopedQuery);
  const totalPages = total === 0 ? 0 : Math.ceil(total / scopedQuery.limit);

  return {
    data: items.map(toCampaignResponse),
    pagination: {
      page: scopedQuery.page,
      limit: scopedQuery.limit,
      total,
      totalPages,
    },
  };
}

export async function getCampaignSummary(user: AuthenticatedUser) {
  const visibility = buildVisibilityWhere(user);

  const [open, inProgress, waitingApproval, completed] = await Promise.all([
    repository.countByStatuses(visibility, ["OPEN"]),
    repository.countByStatuses(visibility, ["IN_ANALYSIS", "IN_PROGRESS"]),
    repository.countByStatuses(visibility, ["WAITING_APPROVAL"]),
    repository.countByStatuses(visibility, ["COMPLETED"]),
  ]);

  return { open, inProgress, waitingApproval, completed };
}

export async function getCampaignById(
  user: AuthenticatedUser,
  id: string,
): Promise<CampaignDetailResponse> {
  const campaign = await repository.findCampaignDetail(id);
  assertCanView(user, campaign);

  return {
    ...toCampaignResponse(campaign),
    activities: campaign.activities.map(toActivityResponse),
  };
}

export async function updateCampaign(
  user: AuthenticatedUser,
  id: string,
  body: UpdateCampaignBody,
): Promise<CampaignResponse> {
  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw new ForbiddenError(
      "Você não pode editar chamados concluídos ou cancelados.",
    );
  }

  canEditCampaignFields(user, existing, {
    title: body.title !== undefined,
    description: body.description !== undefined,
    objective: body.objective !== undefined,
    priority: body.priority !== undefined,
    startsAt: body.startsAt !== undefined,
    dueAt: body.dueAt !== undefined,
  });

  if (body.dueAt !== undefined) {
    ensureDueAtNotPast(body.dueAt);
  }

  // Requester on OPEN cannot change priority (already gated), strip if somehow sent
  if (isRequester(user) && existing.status === "OPEN" && body.priority) {
    throw new ForbiddenError(
      "Você não pode alterar a prioridade deste chamado.",
    );
  }

  const actorName = await resolveActorName(user);
  const priorityChanged =
    body.priority !== undefined && body.priority !== existing.priority;
  const dueChanged =
    body.dueAt !== undefined &&
    (body.dueAt?.getTime() ?? null) !== (existing.dueAt?.getTime() ?? null);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.objective !== undefined ? { objective: body.objective } : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.startsAt !== undefined ? { startsAt: body.startsAt } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt } : {}),
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "UPDATED",
      description: activityCopy.buildUpdatedDescription(actorName),
      campaignId: id,
      actorId: user.sub,
    });

    if (priorityChanged && body.priority) {
      await repository.createActivity(tx, {
        type: "PRIORITY_CHANGED",
        description: activityCopy.buildPriorityChangedDescription(
          actorName,
          existing.priority,
          body.priority,
        ),
        campaignId: id,
        actorId: user.sub,
        metadata: { from: existing.priority, to: body.priority },
      });
    }

    if (dueChanged) {
      await repository.createActivity(tx, {
        type: "DUE_DATE_CHANGED",
        description: activityCopy.buildDueDateChangedDescription(actorName),
        campaignId: id,
        actorId: user.sub,
        metadata: {
          from: existing.dueAt?.toISOString() ?? null,
          to: body.dueAt?.toISOString() ?? null,
        },
      });
    }

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function submitCampaign(
  user: AuthenticatedUser,
  id: string,
): Promise<CampaignResponse> {
  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (!canSubmit(user, existing)) {
    throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
  }

  if (existing.title.trim().length < 3 || existing.description.trim().length < 10) {
    throw new ValidationError(
      "O chamado precisa de título e descrição válidos para ser enviado.",
    );
  }

  const actorName = await resolveActorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: { status: "OPEN" },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.buildStatusChangedDescription(
        actorName,
        "DRAFT",
        "OPEN",
      ),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: "DRAFT", to: "OPEN" },
    });

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function claimCampaign(
  user: AuthenticatedUser,
  id: string,
): Promise<CampaignResponse> {
  if (!isMarketingManager(user)) {
    throw new ForbiddenError("Somente gestores de marketing podem assumir chamados.");
  }

  const existing = await repository.findCampaignById(id);

  if (!existing) {
    throw new NotFoundError(CAMPAIGN_MESSAGES.NOT_FOUND);
  }

  if (!canClaim(user, existing)) {
    if (existing.status !== "OPEN" || existing.marketingManagerId) {
      throw new ConflictError(CAMPAIGN_MESSAGES.ALREADY_CLAIMED);
    }
    throw new ForbiddenError(CAMPAIGN_MESSAGES.CANNOT_CLAIM);
  }

  const claimedCount = await repository.claimCampaignAtomic(id, user.sub);

  if (claimedCount === 0) {
    throw new ConflictError(CAMPAIGN_MESSAGES.ALREADY_CLAIMED);
  }

  const actorName = await resolveActorName(user);

  await repository.prisma.$transaction(async (tx) => {
    await repository.createActivity(tx, {
      type: "ASSIGNED",
      description: activityCopy.buildAssignedDescription(actorName, actorName, true),
      campaignId: id,
      actorId: user.sub,
      metadata: { marketingManagerId: user.sub },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.buildStatusChangedDescription(
        actorName,
        "OPEN",
        "IN_ANALYSIS",
      ),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: "OPEN", to: "IN_ANALYSIS" },
    });
  });

  const updated = await repository.findCampaignById(id);
  assertCanView(user, updated);
  return toCampaignResponse(updated);
}

export async function assignCampaign(
  user: AuthenticatedUser,
  id: string,
  marketingManagerId: string | null,
): Promise<CampaignResponse> {
  if (!isAdmin(user)) {
    throw new ForbiddenError();
  }

  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (existing.status === "COMPLETED" || existing.status === "CANCELLED") {
    throw new ForbiddenError(
      "Não é possível alterar o responsável de chamados concluídos ou cancelados.",
    );
  }

  const actorName = await resolveActorName(user);
  let nextStatus: CampaignStatus = existing.status;
  let managerName: string | null = null;

  if (marketingManagerId) {
    const manager = await repository.findMarketingManager(marketingManagerId);

    if (!manager || !manager.active || manager.role !== "MARKETING_MANAGER") {
      throw new ValidationError(CAMPAIGN_MESSAGES.INVALID_ASSIGNEE);
    }

    managerName = manager.name;

    if (existing.status === "OPEN") {
      nextStatus = "IN_ANALYSIS";
    }
  } else if (existing.marketingManagerId) {
    // Removing assignee returns to OPEN when it was in analysis without deeper progress
    if (
      existing.status === "IN_ANALYSIS" ||
      existing.status === "OPEN"
    ) {
      nextStatus = "OPEN";
    }
  }

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: {
        marketingManagerId,
        status: nextStatus,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    if (marketingManagerId && managerName) {
      await repository.createActivity(tx, {
        type: "ASSIGNED",
        description: activityCopy.buildAssignedDescription(
          actorName,
          managerName,
          false,
        ),
        campaignId: id,
        actorId: user.sub,
        metadata: { marketingManagerId },
      });
    } else {
      await repository.createActivity(tx, {
        type: "UNASSIGNED",
        description: activityCopy.buildUnassignedDescription(actorName),
        campaignId: id,
        actorId: user.sub,
      });
    }

    if (nextStatus !== existing.status) {
      await repository.createActivity(tx, {
        type: "STATUS_CHANGED",
        description: activityCopy.buildStatusChangedDescription(
          actorName,
          existing.status,
          nextStatus,
        ),
        campaignId: id,
        actorId: user.sub,
        metadata: { from: existing.status, to: nextStatus },
      });
    }

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function changeStatus(
  user: AuthenticatedUser,
  id: string,
  status: CampaignStatus,
): Promise<CampaignResponse> {
  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (isRequester(user)) {
    throw new ForbiddenError(
      "Solicitantes não podem alterar o status livremente.",
    );
  }

  if (!canChangeStatus(user, existing)) {
    throw new ForbiddenError(CAMPAIGN_MESSAGES.FORBIDDEN);
  }

  assertTransition(existing.status, status);

  if (status === "IN_ANALYSIS" && !existing.marketingManagerId && !isAdmin(user)) {
    throw new UnprocessableEntityError(
      "O chamado precisa de um responsável para entrar em análise.",
    );
  }

  const actorName = await resolveActorName(user);

  const data: Prisma.CampaignUpdateInput = {
    status,
  };

  if (status === "COMPLETED") {
    data.completedAt = new Date();
  }

  if (status === "CANCELLED") {
    throw new ValidationError(
      "Use o endpoint de cancelamento para cancelar um chamado.",
    );
  }

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data,
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.buildStatusChangedDescription(
        actorName,
        existing.status,
        status,
      ),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    if (status === "COMPLETED") {
      await repository.createActivity(tx, {
        type: "COMPLETED",
        description: activityCopy.buildCompletedDescription(actorName),
        campaignId: id,
        actorId: user.sub,
      });
    }

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function cancelCampaign(
  user: AuthenticatedUser,
  id: string,
  reason: string,
): Promise<CampaignResponse> {
  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (existing.status === "COMPLETED") {
    throw new ForbiddenError(CAMPAIGN_MESSAGES.CANNOT_CANCEL_COMPLETED);
  }

  if (existing.status === "CANCELLED") {
    throw new ConflictError("Este chamado já está cancelado.");
  }

  if (!canCancel(user, existing)) {
    throw new ForbiddenError(
      "Você não possui permissão para cancelar este chamado.",
    );
  }

  const actorName = await resolveActorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "CANCELLED",
      description: activityCopy.buildCancelledDescription(actorName),
      campaignId: id,
      actorId: user.sub,
      metadata: { reason, from: existing.status },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.buildStatusChangedDescription(
        actorName,
        existing.status,
        "CANCELLED",
      ),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: "CANCELLED" },
    });

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function reopenCampaign(
  user: AuthenticatedUser,
  id: string,
  status: "OPEN" | "IN_ANALYSIS",
): Promise<CampaignResponse> {
  if (!isAdmin(user)) {
    throw new ForbiddenError();
  }

  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  if (existing.status !== "COMPLETED" && existing.status !== "CANCELLED") {
    throw new UnprocessableEntityError(
      "Somente chamados concluídos ou cancelados podem ser reabertos.",
    );
  }

  if (!reopenTargetStatuses.includes(status)) {
    throw new ValidationError("Status de reabertura inválido.");
  }

  if (status === "IN_ANALYSIS" && !existing.marketingManagerId) {
    throw new ValidationError(CAMPAIGN_MESSAGES.REOPEN_REQUIRES_MANAGER);
  }

  const actorName = await resolveActorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const campaign = await tx.campaign.update({
      where: { id },
      data: {
        status,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        ...(status === "OPEN" ? { marketingManagerId: null } : {}),
      },
      include: {
        requester: { select: { id: true, name: true, email: true } },
        marketingManager: { select: { id: true, name: true, email: true } },
      },
    });

    await repository.createActivity(tx, {
      type: "REOPENED",
      description: activityCopy.buildReopenedDescription(actorName),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.buildStatusChangedDescription(
        actorName,
        existing.status,
        status,
      ),
      campaignId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    return campaign;
  });

  return toCampaignResponse(updated);
}

export async function listActivities(
  user: AuthenticatedUser,
  id: string,
  page: number,
  limit: number,
) {
  const existing = await repository.findCampaignById(id);
  assertCanView(user, existing);

  const { items, total } = await repository.listActivities(id, page, limit);
  const totalPages = total === 0 ? 0 : Math.ceil(total / limit);

  return {
    data: items.map(toActivityResponse),
    pagination: { page, limit, total, totalPages },
  };
}
