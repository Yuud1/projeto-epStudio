import type { FastifyReply, FastifyRequest } from "fastify";
import { loginBodySchema } from "./auth.schemas.js";
import * as authService from "./auth.service.js";

export async function loginHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const body = loginBodySchema.parse(request.body);
  const result = await authService.login(request.server, reply, body);
  return reply.send(result);
}

export async function refreshHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await authService.refresh(request.server, request, reply);
  return reply.send(result);
}

export async function meHandler(request: FastifyRequest, reply: FastifyReply) {
  const result = await authService.me(request.user.sub);
  return reply.send(result);
}

export async function logoutHandler(
  request: FastifyRequest,
  reply: FastifyReply,
) {
  const result = await authService.logout(request.server, request, reply);
  return reply.send(result);
}
