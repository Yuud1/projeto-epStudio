import type { Prisma, TaskActivityType, TaskStatus } from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ListTasksQuery, MyTasksQuery } from "./task.schemas.js";
import type {
  TaskActivityWithActor,
  TaskWithRelations,
} from "./task.types.js";

const taskInclude = {
  campaign: {
    select: {
      id: true,
      title: true,
      status: true,
      requesterId: true,
      marketingManagerId: true,
    },
  },
  createdBy: {
    select: { id: true, name: true, email: true },
  },
  assignees: {
    include: {
      user: {
        select: { id: true, name: true, email: true, role: true },
      },
    },
    orderBy: { assignedAt: "asc" as const },
  },
  _count: {
    select: { activities: true },
  },
} satisfies Prisma.TaskInclude;

export async function findTaskById(id: string): Promise<TaskWithRelations | null> {
  return prisma.task.findUnique({
    where: { id },
    include: taskInclude,
  }) as Promise<TaskWithRelations | null>;
}

export async function findTaskDetail(id: string) {
  return prisma.task.findUnique({
    where: { id },
    include: {
      ...taskInclude,
      activities: {
        include: {
          actor: { select: { id: true, name: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function getNextPosition(campaignId: string): Promise<number> {
  const last = await prisma.task.findFirst({
    where: { campaignId },
    orderBy: { position: "desc" },
    select: { position: true },
  });

  return (last?.position ?? -1) + 1;
}

export async function listCampaignTasks(
  campaignId: string,
  query: ListTasksQuery,
  assigneeOnlyUserId?: string,
): Promise<{ items: TaskWithRelations[]; total: number }> {
  const filters: Prisma.TaskWhereInput[] = [{ campaignId }];

  if (assigneeOnlyUserId) {
    filters.push({
      assignees: { some: { userId: assigneeOnlyUserId } },
    });
  }

  if (query.status) filters.push({ status: query.status });
  if (query.priority) filters.push({ priority: query.priority });
  if (query.assigneeId) {
    filters.push({ assignees: { some: { userId: query.assigneeId } } });
  }
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  if (query.dueFrom || query.dueTo) {
    filters.push({
      dueAt: {
        ...(query.dueFrom ? { gte: query.dueFrom } : {}),
        ...(query.dueTo ? { lte: query.dueTo } : {}),
      },
    });
  }

  const where: Prisma.TaskWhereInput = { AND: filters };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take: query.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { items: items as TaskWithRelations[], total };
}

export async function listMyTasks(
  userId: string,
  query: MyTasksQuery,
  forceAssigneeId?: string,
): Promise<{ items: TaskWithRelations[]; total: number }> {
  const assigneeId = forceAssigneeId ?? userId;
  const filters: Prisma.TaskWhereInput[] = [
    { assignees: { some: { userId: assigneeId } } },
  ];

  if (query.status) filters.push({ status: query.status });
  if (query.priority) filters.push({ priority: query.priority });
  if (query.campaignId) filters.push({ campaignId: query.campaignId });
  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }
  if (query.dueFrom || query.dueTo) {
    filters.push({
      dueAt: {
        ...(query.dueFrom ? { gte: query.dueFrom } : {}),
        ...(query.dueTo ? { lte: query.dueTo } : {}),
      },
    });
  }

  const where: Prisma.TaskWhereInput = { AND: filters };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.task.findMany({
      where,
      include: taskInclude,
      orderBy: [
        { dueAt: "asc" },
        { priority: "desc" },
        { createdAt: "desc" },
      ],
      skip,
      take: query.limit,
    }),
    prisma.task.count({ where }),
  ]);

  return { items: items as TaskWithRelations[], total };
}

export async function createActivity(
  tx: Prisma.TransactionClient,
  data: {
    type: TaskActivityType;
    description: string;
    metadata?: Prisma.InputJsonValue;
    taskId: string;
    actorId: string;
  },
) {
  return tx.taskActivity.create({ data });
}

export async function listActivities(
  taskId: string,
  page: number,
  limit: number,
): Promise<{ items: TaskActivityWithActor[]; total: number }> {
  const where = { taskId };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.taskActivity.findMany({
      where,
      include: {
        actor: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.taskActivity.count({ where }),
  ]);

  return { items, total };
}

export async function countMyTasksByStatus(userId: string) {
  const now = new Date();
  const base = { assignees: { some: { userId } } };

  const [total, todo, inProgress, blocked, inReview, done, overdue] =
    await Promise.all([
      prisma.task.count({
        where: { ...base, status: { not: "CANCELLED" } },
      }),
      prisma.task.count({ where: { ...base, status: "TODO" } }),
      prisma.task.count({ where: { ...base, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...base, status: "BLOCKED" } }),
      prisma.task.count({ where: { ...base, status: "IN_REVIEW" } }),
      prisma.task.count({ where: { ...base, status: "DONE" } }),
      prisma.task.count({
        where: {
          ...base,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueAt: { lt: now },
        },
      }),
    ]);

  return { total, todo, inProgress, blocked, inReview, done, overdue };
}

export async function countManagedTasksByStatus(managerId: string | null) {
  const now = new Date();
  const campaignFilter =
    managerId === null
      ? {}
      : { campaign: { marketingManagerId: managerId } };

  const base = { ...campaignFilter, status: { not: "CANCELLED" as TaskStatus } };

  const [total, todo, inProgress, blocked, inReview, done, overdue] =
    await Promise.all([
      prisma.task.count({ where: base }),
      prisma.task.count({ where: { ...campaignFilter, status: "TODO" } }),
      prisma.task.count({ where: { ...campaignFilter, status: "IN_PROGRESS" } }),
      prisma.task.count({ where: { ...campaignFilter, status: "BLOCKED" } }),
      prisma.task.count({ where: { ...campaignFilter, status: "IN_REVIEW" } }),
      prisma.task.count({ where: { ...campaignFilter, status: "DONE" } }),
      prisma.task.count({
        where: {
          ...campaignFilter,
          status: { notIn: ["DONE", "CANCELLED"] },
          dueAt: { lt: now },
        },
      }),
    ]);

  return { total, todo, inProgress, blocked, inReview, done, overdue };
}

export async function findAssignableUsers(ids: string[]) {
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });
}

export async function findCampaignForTasks(campaignId: string) {
  return prisma.campaign.findUnique({
    where: { id: campaignId },
    select: {
      id: true,
      title: true,
      status: true,
      requesterId: true,
      marketingManagerId: true,
    },
  });
}

export { prisma, taskInclude };
