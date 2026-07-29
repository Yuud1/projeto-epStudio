import type { FastifyReply, FastifyRequest } from "fastify";
import { ForbiddenError, UnauthorizedError } from "../errors/app-error.js";
import type { UserRole } from "../types/auth.js";

export function authorize(roles: UserRole[]) {
  return async function authorizeHandler(
    request: FastifyRequest,
    _reply: FastifyReply,
  ) {
    if (!request.user) {
      throw new UnauthorizedError("Não autenticado.");
    }

    if (!roles.includes(request.user.role)) {
      request.log.warn(
        { userId: request.user.sub, role: request.user.role },
        "Tentativa de acesso não autorizado",
      );
      throw new ForbiddenError();
    }
  };
}
