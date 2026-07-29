import type { TaskStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../shared/types/auth.js";
import {
  isOperationalRole,
  TASK_ASSIGNEE_ROLES,
} from "../../shared/types/auth.js";
import {
  ConflictError,
  ForbiddenError,
  ValidationError,
} from "../../shared/errors/app-error.js";
import * as activityCopy from "../task-activities/task-activity.service.js";
import { TASK_MESSAGES } from "./task.errors.js";
import {
  assertCanViewCampaignForTasks,
  assertCanViewTask,
  canCancelTask,
  canChangeTaskStatus,
  canCreateTaskInCampaign,
  canEditTaskFields,
  canManageCampaignTasks,
  filterTasksForOperationalListing,
  isAdmin,
  isMarketingManager,
  isRequester,
  isTaskAssignee,
} from "./task.permissions.js";
import * as repository from "./task.repository.js";
import type {
  CreateTaskBody,
  ListTasksQuery,
  MyTasksQuery,
  UpdateTaskBody,
} from "./task.schemas.js";
import {
  assertTaskTransition,
  operationalAllowedTransitions,
  reopenTaskStatuses,
} from "./task.transitions.js";
import {
  toTaskActivityResponse,
  toTaskResponse,
  type TaskDetailResponse,
  type TaskResponse,
  type TaskSummaryResponse,
} from "./task.types.js";

async function actorName(user: AuthenticatedUser): Promise<string> {
  const found = await repository.prisma.user.findUnique({
    where: { id: user.sub },
    select: { name: true },
  });
  return found?.name ?? user.email;
}

function ensureDueAtNotPast(dueAt: Date | null | undefined) {
  if (dueAt && dueAt.getTime() < Date.now() - 60_000) {
    throw new ValidationError(TASK_MESSAGES.DUE_IN_PAST);
  }
}

function uniqueIds(ids: string[]): string[] {
  return [...new Set(ids)];
}

async function validateAssignees(ids: string[]) {
  const unique = uniqueIds(ids);
  if (unique.length === 0) {
    return [];
  }

  const users = await repository.findAssignableUsers(unique);

  if (users.length !== unique.length) {
    throw new ValidationError(TASK_MESSAGES.INVALID_ASSIGNEE);
  }

  for (const user of users) {
    if (!user.active || !TASK_ASSIGNEE_ROLES.includes(user.role)) {
      throw new ValidationError(TASK_MESSAGES.INVALID_ASSIGNEE);
    }
  }

  return users;
}

export async function createTask(
  user: AuthenticatedUser,
  campaignId: string,
  body: CreateTaskBody,
): Promise<TaskResponse> {
  const campaign = await repository.findCampaignForTasks(campaignId);

  if (!campaign) {
    throw new ValidationError("Campanha não encontrada.");
  }

  if (!canCreateTaskInCampaign(user, campaign)) {
    throw new ForbiddenError(TASK_MESSAGES.CAMPAIGN_LOCKED);
  }

  ensureDueAtNotPast(body.dueAt ?? null);
  const assignees = await validateAssignees(body.assigneeIds);
  const name = await actorName(user);
  const position = await repository.getNextPosition(campaignId);

  const task = await repository.prisma.$transaction(async (tx) => {
    const created = await tx.task.create({
      data: {
        title: body.title,
        description: body.description ?? null,
        priority: body.priority,
        dueAt: body.dueAt ?? null,
        position,
        campaignId,
        createdById: user.sub,
        assignees: {
          create: assignees.map((assignee) => ({
            userId: assignee.id,
            assignedById: user.sub,
          })),
        },
      },
      include: repository.taskInclude,
    });

    await repository.createActivity(tx, {
      type: "CREATED",
      description: activityCopy.createdDescription(name),
      taskId: created.id,
      actorId: user.sub,
    });

    for (const assignee of assignees) {
      await repository.createActivity(tx, {
        type: "ASSIGNED",
        description: activityCopy.assignedDescription(name, assignee.name),
        taskId: created.id,
        actorId: user.sub,
        metadata: { userId: assignee.id },
      });
    }

    return created;
  });

  return toTaskResponse(task as Parameters<typeof toTaskResponse>[0]);
}

export async function listCampaignTasks(
  user: AuthenticatedUser,
  campaignId: string,
  query: ListTasksQuery,
) {
  const campaign = await repository.findCampaignForTasks(campaignId);
  const hasAssignedTask =
    isOperationalRole(user.role)
      ? await repository.prisma.taskAssignee.count({
          where: { userId: user.sub, task: { campaignId } },
        }).then((count) => count > 0)
      : false;

  assertCanViewCampaignForTasks(user, campaign, { hasAssignedTask });

  const assigneeOnly = filterTasksForOperationalListing(user)
    ? user.sub
    : undefined;

  if (
    filterTasksForOperationalListing(user) &&
    query.assigneeId &&
    query.assigneeId !== user.sub
  ) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  const { items, total } = await repository.listCampaignTasks(
    campaignId,
    query,
    assigneeOnly,
  );

  return {
    data: items.map(toTaskResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getTaskById(
  user: AuthenticatedUser,
  id: string,
): Promise<TaskDetailResponse> {
  const task = await repository.findTaskDetail(id);
  assertCanViewTask(user, task as Parameters<typeof assertCanViewTask>[1]);

  return {
    ...toTaskResponse(task as Parameters<typeof toTaskResponse>[0]),
    activities: (task?.activities ?? []).map(toTaskActivityResponse),
  };
}

export async function updateTask(
  user: AuthenticatedUser,
  id: string,
  body: UpdateTaskBody,
): Promise<TaskResponse> {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);
  canEditTaskFields(user, existing);

  if (body.dueAt !== undefined) {
    ensureDueAtNotPast(body.dueAt);
  }

  const name = await actorName(user);
  const priorityChanged =
    body.priority !== undefined && body.priority !== existing.priority;
  const dueChanged =
    body.dueAt !== undefined &&
    (body.dueAt?.getTime() ?? null) !== (existing.dueAt?.getTime() ?? null);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        ...(body.title !== undefined ? { title: body.title } : {}),
        ...(body.description !== undefined
          ? { description: body.description }
          : {}),
        ...(body.priority !== undefined ? { priority: body.priority } : {}),
        ...(body.dueAt !== undefined ? { dueAt: body.dueAt } : {}),
      },
      include: repository.taskInclude,
    });

    await repository.createActivity(tx, {
      type: "UPDATED",
      description: activityCopy.updatedDescription(name),
      taskId: id,
      actorId: user.sub,
    });

    if (priorityChanged && body.priority) {
      await repository.createActivity(tx, {
        type: "PRIORITY_CHANGED",
        description: activityCopy.priorityChangedDescription(
          name,
          existing.priority,
          body.priority,
        ),
        taskId: id,
        actorId: user.sub,
        metadata: { from: existing.priority, to: body.priority },
      });
    }

    if (dueChanged) {
      await repository.createActivity(tx, {
        type: "DUE_DATE_CHANGED",
        description: activityCopy.dueDateChangedDescription(name),
        taskId: id,
        actorId: user.sub,
        metadata: {
          from: existing.dueAt?.toISOString() ?? null,
          to: body.dueAt?.toISOString() ?? null,
        },
      });
    }

    return task;
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function addAssignees(
  user: AuthenticatedUser,
  id: string,
  userIds: string[],
): Promise<TaskResponse> {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  if (!canManageCampaignTasks(user, existing.campaign)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  if (existing.status === "DONE" || existing.status === "CANCELLED") {
    throw new ForbiddenError("Não é possível atribuir responsáveis nesta tarefa.");
  }

  const assignees = await validateAssignees(userIds);
  const existingIds = new Set(existing.assignees.map((item) => item.user.id));
  const toAdd = assignees.filter((assignee) => !existingIds.has(assignee.id));
  const name = await actorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    if (toAdd.length > 0) {
      await tx.taskAssignee.createMany({
        data: toAdd.map((assignee) => ({
          taskId: id,
          userId: assignee.id,
          assignedById: user.sub,
        })),
        skipDuplicates: true,
      });

      for (const assignee of toAdd) {
        await repository.createActivity(tx, {
          type: "ASSIGNED",
          description: activityCopy.assignedDescription(name, assignee.name),
          taskId: id,
          actorId: user.sub,
          metadata: { userId: assignee.id },
        });
      }
    }

    return tx.task.findUniqueOrThrow({
      where: { id },
      include: repository.taskInclude,
    });
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function removeAssignee(
  user: AuthenticatedUser,
  id: string,
  userId: string,
): Promise<TaskResponse> {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  if (!canManageCampaignTasks(user, existing.campaign)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  const assignment = existing.assignees.find((item) => item.user.id === userId);
  if (!assignment) {
    throw new ValidationError("Atribuição não encontrada.");
  }

  const name = await actorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    await tx.taskAssignee.delete({ where: { id: assignment.id } });

    await repository.createActivity(tx, {
      type: "UNASSIGNED",
      description: activityCopy.unassignedDescription(name, assignment.user.name),
      taskId: id,
      actorId: user.sub,
      metadata: { userId },
    });

    return tx.task.findUniqueOrThrow({
      where: { id },
      include: repository.taskInclude,
    });
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function changeStatus(
  user: AuthenticatedUser,
  id: string,
  status: TaskStatus,
): Promise<TaskResponse> {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  if (!canChangeTaskStatus(user, existing)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  if (status === "CANCELLED") {
    throw new ValidationError(
      "Use o endpoint de cancelamento para cancelar uma tarefa.",
    );
  }

  assertTaskTransition(existing.status, status);

  if (isOperationalRole(user.role) && !canManageCampaignTasks(user, existing.campaign)) {
    if (!isTaskAssignee(user, existing)) {
      throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
    }

    if (!operationalAllowedTransitions[existing.status].includes(status)) {
      throw new ForbiddenError(TASK_MESSAGES.INVALID_TRANSITION);
    }
  }

  const name = await actorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        status,
        ...(status === "IN_PROGRESS" && !existing.startedAt
          ? { startedAt: new Date() }
          : {}),
        ...(status === "DONE" ? { completedAt: new Date() } : {}),
      },
      include: repository.taskInclude,
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.statusChangedDescription(
        name,
        existing.status,
        status,
      ),
      taskId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    if (status === "IN_PROGRESS" && existing.status === "TODO") {
      await repository.createActivity(tx, {
        type: "STATUS_CHANGED",
        description: activityCopy.startedDescription(name),
        taskId: id,
        actorId: user.sub,
      });
    }

    if (status === "IN_REVIEW") {
      await repository.createActivity(tx, {
        type: "STATUS_CHANGED",
        description: activityCopy.sentToReviewDescription(name),
        taskId: id,
        actorId: user.sub,
      });
    }

    if (status === "DONE") {
      await repository.createActivity(tx, {
        type: "COMPLETED",
        description: activityCopy.completedDescription(name),
        taskId: id,
        actorId: user.sub,
      });
    }

    return task;
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function cancelTask(
  user: AuthenticatedUser,
  id: string,
  reason: string,
): Promise<TaskResponse> {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  if (existing.status === "DONE") {
    throw new ForbiddenError(TASK_MESSAGES.ALREADY_DONE);
  }

  if (existing.status === "CANCELLED") {
    throw new ConflictError(TASK_MESSAGES.ALREADY_CANCELLED);
  }

  if (!canCancelTask(user, existing)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  const name = await actorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        status: "CANCELLED",
        cancelledAt: new Date(),
        cancellationReason: reason,
      },
      include: repository.taskInclude,
    });

    await repository.createActivity(tx, {
      type: "CANCELLED",
      description: activityCopy.cancelledDescription(name),
      taskId: id,
      actorId: user.sub,
      metadata: { reason, from: existing.status },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.statusChangedDescription(
        name,
        existing.status,
        "CANCELLED",
      ),
      taskId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: "CANCELLED" },
    });

    return task;
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function reopenTask(
  user: AuthenticatedUser,
  id: string,
  status: "TODO" | "IN_PROGRESS",
): Promise<TaskResponse> {
  if (!isAdmin(user)) {
    throw new ForbiddenError();
  }

  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  if (existing.status !== "DONE" && existing.status !== "CANCELLED") {
    throw new ValidationError("Somente tarefas concluídas ou canceladas podem ser reabertas.");
  }

  if (!reopenTaskStatuses.includes(status)) {
    throw new ValidationError("Status de reabertura inválido.");
  }

  if (status === "IN_PROGRESS" && existing.assignees.length === 0) {
    throw new ValidationError(
      "A tarefa precisa de responsável para voltar para Em andamento.",
    );
  }

  const name = await actorName(user);

  const updated = await repository.prisma.$transaction(async (tx) => {
    const task = await tx.task.update({
      where: { id },
      data: {
        status,
        completedAt: null,
        cancelledAt: null,
        cancellationReason: null,
        ...(status === "IN_PROGRESS" && !existing.startedAt
          ? { startedAt: new Date() }
          : {}),
      },
      include: repository.taskInclude,
    });

    await repository.createActivity(tx, {
      type: "REOPENED",
      description: activityCopy.reopenedDescription(name),
      taskId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    await repository.createActivity(tx, {
      type: "STATUS_CHANGED",
      description: activityCopy.statusChangedDescription(
        name,
        existing.status,
        status,
      ),
      taskId: id,
      actorId: user.sub,
      metadata: { from: existing.status, to: status },
    });

    return task;
  });

  return toTaskResponse(updated as Parameters<typeof toTaskResponse>[0]);
}

export async function reorderTasks(
  user: AuthenticatedUser,
  campaignId: string,
  tasks: Array<{ id: string; position: number }>,
) {
  const campaign = await repository.findCampaignForTasks(campaignId);
  assertCanViewCampaignForTasks(user, campaign);

  if (!canManageCampaignTasks(user, campaign)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  const ids = tasks.map((item) => item.id);
  if (new Set(ids).size !== ids.length) {
    throw new ValidationError("IDs duplicados na reordenação.");
  }

  const existing = await repository.prisma.task.findMany({
    where: { campaignId, id: { in: ids } },
    select: { id: true, position: true },
  });

  if (existing.length !== ids.length) {
    throw new ValidationError("Todas as tarefas devem pertencer à campanha.");
  }

  const name = await actorName(user);
  const previous = new Map(existing.map((item) => [item.id, item.position]));

  await repository.prisma.$transaction(async (tx) => {
    for (const [index, item] of [...tasks]
      .sort((a, b) => a.position - b.position)
      .entries()) {
      await tx.task.update({
        where: { id: item.id },
        data: { position: index },
      });

      if (previous.get(item.id) !== index) {
        await repository.createActivity(tx, {
          type: "POSITION_CHANGED",
          description: activityCopy.positionChangedDescription(name),
          taskId: item.id,
          actorId: user.sub,
          metadata: { from: previous.get(item.id), to: index },
        });
      }
    }
  });

  const { items } = await repository.listCampaignTasks(campaignId, {
    page: 1,
    limit: 100,
    sortBy: "position",
    sortOrder: "asc",
  });

  return { data: items.map(toTaskResponse) };
}

export async function listMyTasks(user: AuthenticatedUser, query: MyTasksQuery) {
  if (isRequester(user)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  let forceAssignee = user.sub;

  if (isAdmin(user) && query.assigneeId) {
    forceAssignee = query.assigneeId;
  } else if (!isAdmin(user) && query.assigneeId && query.assigneeId !== user.sub) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  // Managers without assignee filter still see their assigned tasks via /tasks/my
  const { items, total } = await repository.listMyTasks(
    user.sub,
    query,
    isAdmin(user) && query.assigneeId ? forceAssignee : user.sub,
  );

  return {
    data: items.map(toTaskResponse),
    pagination: {
      page: query.page,
      limit: query.limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / query.limit),
    },
  };
}

export async function getTaskSummary(
  user: AuthenticatedUser,
): Promise<TaskSummaryResponse> {
  if (isRequester(user)) {
    throw new ForbiddenError(TASK_MESSAGES.FORBIDDEN);
  }

  if (isAdmin(user)) {
    return repository.countManagedTasksByStatus(null);
  }

  if (isMarketingManager(user)) {
    return repository.countManagedTasksByStatus(user.sub);
  }

  return repository.countMyTasksByStatus(user.sub);
}

export async function listTaskActivities(
  user: AuthenticatedUser,
  id: string,
  page: number,
  limit: number,
) {
  const existing = await repository.findTaskById(id);
  assertCanViewTask(user, existing);

  const { items, total } = await repository.listActivities(id, page, limit);

  return {
    data: items.map(toTaskActivityResponse),
    pagination: {
      page,
      limit,
      total,
      totalPages: total === 0 ? 0 : Math.ceil(total / limit),
    },
  };
}
