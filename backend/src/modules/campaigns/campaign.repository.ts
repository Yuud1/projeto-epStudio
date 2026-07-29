import type {
  CampaignActivityType,
  CampaignPriority,
  CampaignStatus,
  Prisma,
} from "@prisma/client";
import { prisma } from "../../lib/prisma.js";
import type { ListCampaignsQuery } from "./campaign.schemas.js";
import type {
  CampaignActivityWithActor,
  CampaignDetail,
  CampaignWithRelations,
} from "./campaign.types.js";

const campaignInclude = {
  requester: {
    select: { id: true, name: true, email: true },
  },
  marketingManager: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CampaignInclude;

const activityInclude = {
  actor: {
    select: { id: true, name: true, email: true },
  },
} satisfies Prisma.CampaignActivityInclude;

export async function createCampaign(
  data: Prisma.CampaignCreateInput,
): Promise<CampaignWithRelations> {
  return prisma.campaign.create({
    data,
    include: campaignInclude,
  });
}

export async function findCampaignById(
  id: string,
): Promise<CampaignWithRelations | null> {
  return prisma.campaign.findUnique({
    where: { id },
    include: campaignInclude,
  });
}

export async function findCampaignDetail(
  id: string,
): Promise<CampaignDetail | null> {
  return prisma.campaign.findUnique({
    where: { id },
    include: {
      ...campaignInclude,
      activities: {
        include: activityInclude,
        orderBy: { createdAt: "desc" },
      },
    },
  });
}

export async function listCampaigns(
  visibilityWhere: Prisma.CampaignWhereInput,
  query: ListCampaignsQuery,
): Promise<{ items: CampaignWithRelations[]; total: number }> {
  const filters: Prisma.CampaignWhereInput[] = [visibilityWhere];

  if (query.status) {
    filters.push({ status: query.status });
  }

  if (query.priority) {
    filters.push({ priority: query.priority });
  }

  if (query.requesterId) {
    filters.push({ requesterId: query.requesterId });
  }

  if (query.marketingManagerId) {
    filters.push({ marketingManagerId: query.marketingManagerId });
  }

  if (query.search) {
    filters.push({
      OR: [
        { title: { contains: query.search, mode: "insensitive" } },
        { description: { contains: query.search, mode: "insensitive" } },
      ],
    });
  }

  if (query.createdFrom || query.createdTo) {
    filters.push({
      createdAt: {
        ...(query.createdFrom ? { gte: query.createdFrom } : {}),
        ...(query.createdTo ? { lte: query.createdTo } : {}),
      },
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

  const where: Prisma.CampaignWhereInput = { AND: filters };
  const skip = (query.page - 1) * query.limit;

  const [items, total] = await Promise.all([
    prisma.campaign.findMany({
      where,
      include: campaignInclude,
      orderBy: { [query.sortBy]: query.sortOrder },
      skip,
      take: query.limit,
    }),
    prisma.campaign.count({ where }),
  ]);

  return { items, total };
}

export async function updateCampaign(
  id: string,
  data: Prisma.CampaignUpdateInput,
): Promise<CampaignWithRelations> {
  return prisma.campaign.update({
    where: { id },
    data,
    include: campaignInclude,
  });
}

export async function claimCampaignAtomic(
  id: string,
  managerId: string,
): Promise<number> {
  const result = await prisma.campaign.updateMany({
    where: {
      id,
      status: "OPEN",
      marketingManagerId: null,
    },
    data: {
      marketingManagerId: managerId,
      status: "IN_ANALYSIS",
    },
  });

  return result.count;
}

export async function createActivity(
  tx: Prisma.TransactionClient,
  data: {
    type: CampaignActivityType;
    description: string;
    metadata?: Prisma.InputJsonValue;
    campaignId: string;
    actorId: string;
  },
) {
  return tx.campaignActivity.create({
    data: {
      type: data.type,
      description: data.description,
      metadata: data.metadata,
      campaignId: data.campaignId,
      actorId: data.actorId,
    },
  });
}

export async function listActivities(
  campaignId: string,
  page: number,
  limit: number,
): Promise<{ items: CampaignActivityWithActor[]; total: number }> {
  const where = { campaignId };
  const skip = (page - 1) * limit;

  const [items, total] = await Promise.all([
    prisma.campaignActivity.findMany({
      where,
      include: activityInclude,
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
    prisma.campaignActivity.count({ where }),
  ]);

  return { items, total };
}

export async function countByStatuses(
  visibilityWhere: Prisma.CampaignWhereInput,
  statuses: CampaignStatus[],
): Promise<number> {
  return prisma.campaign.count({
    where: {
      AND: [visibilityWhere, { status: { in: statuses } }],
    },
  });
}

export async function findMarketingManager(id: string) {
  return prisma.user.findUnique({
    where: { id },
    select: {
      id: true,
      name: true,
      email: true,
      role: true,
      active: true,
    },
  });
}

export { prisma };
export type { CampaignPriority, CampaignStatus };
