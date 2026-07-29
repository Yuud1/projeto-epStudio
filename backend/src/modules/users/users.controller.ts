import type { FastifyReply, FastifyRequest } from "fastify";
import {
  createUserBodySchema,
  updateUserBodySchema,
  userIdParamsSchema,
} from "./users.schemas.js";
import * as usersService from "./users.service.js";

export async function listUsersHandler(
  _request: FastifyRequest,
  reply: FastifyReply,
) {
  const users = await usersService.listUsers();
  return reply.send({ users });
}

export async function getUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = userIdParamsSchema.parse(request.params);
  const user = await usersService.getUserById(id);
  return reply.send({ user });
}

export async function createUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = createUserBodySchema.parse(request.body);
  const user = await usersService.createUser(body, request.log);
  return reply.status(201).send({ user });
}

export async function updateUserHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const { id } = userIdParamsSchema.parse(request.params);
  const body = updateUserBodySchema.parse(request.body);
  const user = await usersService.updateUser(id, body, request.user.sub);
  return reply.send({ user });
}
