import type { FastifyReply, FastifyRequest } from "fastify";
import {
  activitiesQuerySchema,
  assignCampaignBodySchema,
  campaignIdParamsSchema,
  cancelCampaignBodySchema,
  changeStatusBodySchema,
  createCampaignBodySchema,
  listCampaignsQuerySchema,
  reopenCampaignBodySchema,
  updateCampaignBodySchema,
} from "./campaign.schemas.js";
import * as campaignService from "./campaign.service.js";

export async function createCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createCampaignBodySchema.parse(request.body);
  const campaign = await campaignService.createCampaign(request.user, body);
  return reply.status(201).send({ campaign });
}

export async function listCampaignsHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = listCampaignsQuerySchema.parse(request.query);
  const result = await campaignService.listCampaigns(request.user, query);
  return reply.send(result);
}

export async function summaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const summary = await campaignService.getCampaignSummary(request.user);
  return reply.send({ summary });
}

export async function getCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const campaign = await campaignService.getCampaignById(request.user, id);
  return reply.send({ campaign });
}

export async function updateCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const body = updateCampaignBodySchema.parse(request.body);
  const campaign = await campaignService.updateCampaign(
    request.user,
    id,
    body,
  );
  return reply.send({ campaign });
}

export async function submitCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const campaign = await campaignService.submitCampaign(request.user, id);
  return reply.send({ campaign });
}

export async function claimCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const campaign = await campaignService.claimCampaign(request.user, id);
  return reply.send({ campaign });
}

export async function assignCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const body = assignCampaignBodySchema.parse(request.body);
  const campaign = await campaignService.assignCampaign(
    request.user,
    id,
    body.marketingManagerId,
  );
  return reply.send({ campaign });
}

export async function changeStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const body = changeStatusBodySchema.parse(request.body);
  const campaign = await campaignService.changeStatus(
    request.user,
    id,
    body.status,
  );
  return reply.send({ campaign });
}

export async function cancelCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const body = cancelCampaignBodySchema.parse(request.body);
  const campaign = await campaignService.cancelCampaign(
    request.user,
    id,
    body.reason,
  );
  return reply.send({ campaign });
}

export async function reopenCampaignHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const body = reopenCampaignBodySchema.parse(request.body);
  const campaign = await campaignService.reopenCampaign(
    request.user,
    id,
    body.status,
  );
  return reply.send({ campaign });
}

export async function listActivitiesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = campaignIdParamsSchema.parse(request.params);
  const query = activitiesQuerySchema.parse(request.query);
  const result = await campaignService.listActivities(
    request.user,
    id,
    query.page,
    query.limit,
  );
  return reply.send(result);
}
