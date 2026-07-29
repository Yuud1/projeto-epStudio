import type { FastifyReply, FastifyRequest } from "fastify";
import { UnauthorizedError } from "../errors/app-error.js";
import type { AuthenticatedUser } from "../types/auth.js";

export async function authenticate(
  request: FastifyRequest,
  _reply: FastifyReply,
) {
  try {
    const payload = await request.accessJwtVerify<AuthenticatedUser>();
    request.user = {
      sub: payload.sub,
      email: payload.email,
      role: payload.role,
    };
  } catch {
    throw new UnauthorizedError("Não autenticado.");
  }
}
