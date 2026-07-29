import argon2 from "argon2";
import { Prisma } from "@prisma/client";
import type { FastifyBaseLogger } from "fastify";
import { prisma } from "../../lib/prisma.js";
import {
  ConflictError,
  ForbiddenError,
  NotFoundError,
} from "../../shared/errors/app-error.js";
import type { CreateUserBody, UpdateUserBody } from "./users.schemas.js";
import { toUserListItem, type UserListItem } from "./users.types.js";

export async function listUsers(): Promise<UserListItem[]> {
  const users = await prisma.user.findMany({
    orderBy: { createdAt: "asc" },
  });

  return users.map(toUserListItem);
}

export async function getUserById(id: string): Promise<UserListItem> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  return toUserListItem(user);
}

export async function createUser(
  data: CreateUserBody,
  log: FastifyBaseLogger,
): Promise<UserListItem> {
  const passwordHash = await argon2.hash(data.password);

  try {
    const user = await prisma.user.create({
      data: {
        name: data.name,
        email: data.email,
        passwordHash,
        role: data.role,
        active: true,
      },
    });

    log.info({ userId: user.id }, "Usuário criado");

    return toUserListItem(user);
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new ConflictError("Já existe um usuário com este e-mail.");
    }

    throw error;
  }
}

export async function updateUser(
  id: string,
  data: UpdateUserBody,
  actorUserId: string,
): Promise<UserListItem> {
  const user = await prisma.user.findUnique({ where: { id } });

  if (!user) {
    throw new NotFoundError("Usuário não encontrado.");
  }

  if (id === actorUserId) {
    if (data.active === false) {
      throw new ForbiddenError(
        "Você não pode desativar a própria conta.",
      );
    }

    if (data.role && data.role !== "ADMIN") {
      throw new ForbiddenError(
        "Você não pode remover o próprio papel de administrador.",
      );
    }
  }

  const updated = await prisma.user.update({
    where: { id },
    data: {
      ...(data.name !== undefined ? { name: data.name } : {}),
      ...(data.role !== undefined ? { role: data.role } : {}),
      ...(data.active !== undefined ? { active: data.active } : {}),
    },
  });

  return toUserListItem(updated);
}
