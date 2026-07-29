import argon2 from "argon2";
import { randomUUID } from "node:crypto";
import type { FastifyInstance, FastifyReply, FastifyRequest } from "fastify";
import {
  env,
  REFRESH_COOKIE_NAME,
  refreshCookieMaxAgeSeconds,
} from "../../config/env.js";
import { prisma } from "../../lib/prisma.js";
import { UnauthorizedError } from "../../shared/errors/app-error.js";
import { hashToken } from "../../shared/auth/token-hash.js";
import type { AuthenticatedUser, PublicUser } from "../../shared/types/auth.js";
import { AUTH_ERROR_MESSAGES } from "./auth.errors.js";
import type { LoginBody } from "./auth.schemas.js";
import { toPublicUser } from "./auth.types.js";

type AuthResult = {
  accessToken: string;
  user: PublicUser;
};

function buildCookieOptions() {
  return {
    path: "/",
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
    maxAge: refreshCookieMaxAgeSeconds,
  } as const;
}

function clearRefreshCookie(reply: FastifyReply) {
  reply.clearCookie(REFRESH_COOKIE_NAME, {
    path: "/",
    httpOnly: true,
    secure: env.COOKIE_SECURE,
    sameSite: env.COOKIE_SAME_SITE,
  });
}

function setRefreshCookie(reply: FastifyReply, token: string) {
  reply.setCookie(REFRESH_COOKIE_NAME, token, buildCookieOptions());
}

async function createTokenPair(
  app: FastifyInstance,
  user: { id: string; email: string; role: AuthenticatedUser["role"] },
) {
  const payload: AuthenticatedUser = {
    sub: user.id,
    email: user.email,
    role: user.role,
  };

  const accessToken = app.jwt.access.sign(payload);
  const refreshToken = app.jwt.refresh.sign({
    ...payload,
    jti: randomUUID(),
  } as AuthenticatedUser & { jti: string });

  const tokenHash = hashToken(refreshToken);
  const expiresAt = new Date(
    Date.now() + env.JWT_REFRESH_EXPIRES_IN_DAYS * 24 * 60 * 60 * 1000,
  );

  await prisma.refreshToken.create({
    data: {
      tokenHash,
      expiresAt,
      userId: user.id,
    },
  });

  return { accessToken, refreshToken };
}

export async function login(
  app: FastifyInstance,
  reply: FastifyReply,
  body: LoginBody,
): Promise<AuthResult> {
  const user = await prisma.user.findUnique({
    where: { email: body.email },
  });

  if (!user) {
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  const passwordValid = await argon2.verify(user.passwordHash, body.password);

  if (!passwordValid) {
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_CREDENTIALS);
  }

  if (!user.active) {
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INACTIVE_USER);
  }

  const { accessToken, refreshToken } = await createTokenPair(app, user);
  setRefreshCookie(reply, refreshToken);

  app.log.info({ userId: user.id }, "Login bem-sucedido");

  return {
    accessToken,
    user: toPublicUser(user),
  };
}

export async function refresh(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<AuthResult> {
  const rawToken = request.cookies[REFRESH_COOKIE_NAME];

  if (!rawToken) {
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_REFRESH);
  }

  let payload: AuthenticatedUser;

  try {
    payload = app.jwt.refresh.verify<AuthenticatedUser>(rawToken);
  } catch {
    clearRefreshCookie(reply);
    app.log.warn("Refresh inválido: assinatura ou expiração");
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_REFRESH);
  }

  const tokenHash = hashToken(rawToken);
  const storedToken = await prisma.refreshToken.findUnique({
    where: { tokenHash },
    include: { user: true },
  });

  if (!storedToken || storedToken.revokedAt || storedToken.expiresAt <= new Date()) {
    if (storedToken && !storedToken.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
    }

    clearRefreshCookie(reply);
    app.log.warn({ userId: payload.sub }, "Refresh inválido ou revogado");
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INVALID_REFRESH);
  }

  if (!storedToken.user.active) {
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revokedAt: new Date() },
    });
    clearRefreshCookie(reply);
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.INACTIVE_USER);
  }

  await prisma.refreshToken.update({
    where: { id: storedToken.id },
    data: { revokedAt: new Date() },
  });

  const { accessToken, refreshToken } = await createTokenPair(
    app,
    storedToken.user,
  );
  setRefreshCookie(reply, refreshToken);

  return {
    accessToken,
    user: toPublicUser(storedToken.user),
  };
}

export async function me(userId: string): Promise<{ user: PublicUser }> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user || !user.active) {
    throw new UnauthorizedError(AUTH_ERROR_MESSAGES.UNAUTHENTICATED);
  }

  return { user: toPublicUser(user) };
}

export async function logout(
  app: FastifyInstance,
  request: FastifyRequest,
  reply: FastifyReply,
): Promise<{ message: string }> {
  const rawToken = request.cookies[REFRESH_COOKIE_NAME];

  if (rawToken) {
    const tokenHash = hashToken(rawToken);
    const storedToken = await prisma.refreshToken.findUnique({
      where: { tokenHash },
    });

    if (storedToken && !storedToken.revokedAt) {
      await prisma.refreshToken.update({
        where: { id: storedToken.id },
        data: { revokedAt: new Date() },
      });
      app.log.info({ userId: storedToken.userId }, "Logout realizado");
    }
  }

  clearRefreshCookie(reply);

  return { message: "Logout realizado com sucesso." };
}
