import type { FastifyReply, FastifyRequest } from "fastify";
import {
  activitiesQuerySchema,
  assigneeParamsSchema,
  assignTaskBodySchema,
  campaignIdParamsSchema,
  cancelTaskBodySchema,
  changeTaskStatusBodySchema,
  createTaskBodySchema,
  listTasksQuerySchema,
  myTasksQuerySchema,
  reopenTaskBodySchema,
  reorderTasksBodySchema,
  taskIdParamsSchema,
  updateTaskBodySchema,
} from "./task.schemas.js";
import * as taskService from "./task.service.js";

export async function createTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { campaignId } = campaignIdParamsSchema.parse(request.params);
  const body = createTaskBodySchema.parse(request.body);
  const task = await taskService.createTask(request.user, campaignId, body);
  return reply.status(201).send({ task });
}

export async function listCampaignTasksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { campaignId } = campaignIdParamsSchema.parse(request.params);
  const query = listTasksQuerySchema.parse(request.query);
  const result = await taskService.listCampaignTasks(
    request.user,
    campaignId,
    query,
  );
  return reply.send(result);
}

export async function reorderTasksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { campaignId } = campaignIdParamsSchema.parse(request.params);
  const body = reorderTasksBodySchema.parse(request.body);
  const result = await taskService.reorderTasks(
    request.user,
    campaignId,
    body.tasks,
  );
  return reply.send(result);
}

export async function myTasksHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const query = myTasksQuerySchema.parse(request.query);
  const result = await taskService.listMyTasks(request.user, query);
  return reply.send(result);
}

export async function summaryHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const summary = await taskService.getTaskSummary(request.user);
  return reply.send({ summary });
}

export async function getTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const task = await taskService.getTaskById(request.user, id);
  return reply.send({ task });
}

export async function updateTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const body = updateTaskBodySchema.parse(request.body);
  const task = await taskService.updateTask(request.user, id, body);
  return reply.send({ task });
}

export async function changeStatusHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const body = changeTaskStatusBodySchema.parse(request.body);
  const task = await taskService.changeStatus(request.user, id, body.status);
  return reply.send({ task });
}

export async function cancelTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const body = cancelTaskBodySchema.parse(request.body);
  const task = await taskService.cancelTask(request.user, id, body.reason);
  return reply.send({ task });
}

export async function reopenTaskHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const body = reopenTaskBodySchema.parse(request.body);
  const task = await taskService.reopenTask(request.user, id, body.status);
  return reply.send({ task });
}

export async function addAssigneesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const body = assignTaskBodySchema.parse(request.body);
  const task = await taskService.addAssignees(request.user, id, body.userIds);
  return reply.send({ task });
}

export async function removeAssigneeHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id, userId } = assigneeParamsSchema.parse(request.params);
  const task = await taskService.removeAssignee(request.user, id, userId);
  return reply.send({ task });
}

export async function listActivitiesHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = taskIdParamsSchema.parse(request.params);
  const query = activitiesQuerySchema.parse(request.query);
  const result = await taskService.listTaskActivities(
    request.user,
    id,
    query.page,
    query.limit,
  );
  return reply.send(result);
}
