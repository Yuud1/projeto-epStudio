import type {
  FastifyError,
  FastifyReply,
  FastifyRequest,
} from "fastify";
import { ZodError } from "zod";
import { env } from "../../config/env.js";
import { AppError } from "./app-error.js";

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply,
) {
  if (error instanceof ZodError) {
    return reply.status(400).send({
      message: "Dados inválidos.",
      errors: error.flatten().fieldErrors,
    });
  }

  if (error instanceof AppError) {
    return reply.status(error.statusCode).send({
      message: error.message,
      code: error.code,
      ...(error.details ? { errors: error.details } : {}),
    });
  }

  if ("validation" in error && error.validation) {
    return reply.status(400).send({
      message: "Dados inválidos.",
      errors: error.validation,
    });
  }

  if ("statusCode" in error && typeof error.statusCode === "number") {
    const statusCode = error.statusCode;

    if (statusCode === 401) {
      return reply.status(401).send({ message: "Não autenticado." });
    }

    if (statusCode === 403) {
      return reply.status(403).send({
        message: "Você não possui permissão para acessar este recurso.",
      });
    }
  }

  request.log.error({ err: error }, "Erro inesperado");

  return reply.status(500).send({
    message: "Erro interno do servidor.",
    ...(env.NODE_ENV === "development" && !(error instanceof AppError)
      ? { error: error.message }
      : {}),
  });
}
