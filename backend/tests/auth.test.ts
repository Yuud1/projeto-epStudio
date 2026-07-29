import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { REFRESH_COOKIE_NAME } from "../src/config/env.js";
import { prisma } from "../src/lib/prisma.js";
import { hashToken } from "../src/shared/auth/token-hash.js";

function getCookieValue(
  setCookieHeader: string | string[] | undefined,
  name: string,
): string | null {
  if (!setCookieHeader) {
    return null;
  }

  const cookies = Array.isArray(setCookieHeader)
    ? setCookieHeader
    : [setCookieHeader];

  for (const cookie of cookies) {
    const match = cookie.match(new RegExp(`${name}=([^;]+)`));
    if (match) {
      return match[1];
    }
  }

  return null;
}

describe("Authentication API", () => {
  let app: FastifyInstance;
  let adminId: string;
  let requesterId: string;
  let inactiveId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    const passwordHash = await argon2.hash("Admin@123");
    const requesterHash = await argon2.hash("Gerente@123");
    const inactiveHash = await argon2.hash("Inactive@123");

    await prisma.refreshToken.deleteMany();
    await prisma.taskActivity.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.task.deleteMany();
    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany({
      where: {
        requester: {
          email: {
            in: [
              "admin@epstudio.local",
              "gerente@epstudio.local",
              "inactive@epstudio.local",
              "designer-test@epstudio.local",
            ],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@epstudio.local",
            "gerente@epstudio.local",
            "inactive@epstudio.local",
            "designer-test@epstudio.local",
          ],
        },
      },
    });

    const admin = await prisma.user.create({
      data: {
        name: "Administrador",
        email: "admin@epstudio.local",
        passwordHash,
        role: "ADMIN",
        active: true,
      },
    });

    const requester = await prisma.user.create({
      data: {
        name: "Gerente da Loja",
        email: "gerente@epstudio.local",
        passwordHash: requesterHash,
        role: "REQUESTER",
        active: true,
      },
    });

    const inactive = await prisma.user.create({
      data: {
        name: "Usuário Inativo",
        email: "inactive@epstudio.local",
        passwordHash: inactiveHash,
        role: "REQUESTER",
        active: false,
      },
    });

    adminId = admin.id;
    requesterId = requester.id;
    inactiveId = inactive.id;
  });

  beforeEach(async () => {
    await prisma.refreshToken.deleteMany({
      where: {
        userId: { in: [adminId, requesterId, inactiveId] },
      },
    });
  });

  afterAll(async () => {
    await prisma.refreshToken.deleteMany();
    await prisma.taskActivity.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.task.deleteMany();
    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany({
      where: {
        requester: {
          email: {
            in: [
              "admin@epstudio.local",
              "gerente@epstudio.local",
              "inactive@epstudio.local",
              "designer-test@epstudio.local",
            ],
          },
        },
      },
    });
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin@epstudio.local",
            "gerente@epstudio.local",
            "inactive@epstudio.local",
            "designer-test@epstudio.local",
          ],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it("faz login com credenciais válidas", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "Admin@123",
      },
    });

    expect(response.statusCode).toBe(200);
    const body = response.json();
    expect(body.accessToken).toBeTypeOf("string");
    expect(body.user.email).toBe("admin@epstudio.local");
    expect(body.user).not.toHaveProperty("passwordHash");
    expect(JSON.stringify(body)).not.toContain("passwordHash");

    const cookie = getCookieValue(
      response.headers["set-cookie"],
      REFRESH_COOKIE_NAME,
    );
    expect(cookie).toBeTruthy();
  });

  it("rejeita login com senha inválida", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "senha-errada",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("E-mail ou senha inválidos.");
  });

  it("rejeita login de usuário inativo", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "inactive@epstudio.local",
        password: "Inactive@123",
      },
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Usuário inativo.");
  });

  it("bloqueia /auth/me sem token", async () => {
    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
    });

    expect(response.statusCode).toBe(401);
    expect(response.json().message).toBe("Não autenticado.");
  });

  it("permite /auth/me com token válido", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "Admin@123",
      },
    });

    const { accessToken } = login.json();

    const response = await app.inject({
      method: "GET",
      url: "/auth/me",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().user.email).toBe("admin@epstudio.local");
    expect(JSON.stringify(response.json())).not.toContain("passwordHash");
  });

  it("renova sessão com refresh válido", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "Admin@123",
      },
    });

    const refreshCookie = getCookieValue(
      login.headers["set-cookie"],
      REFRESH_COOKIE_NAME,
    );

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: {
        cookie: `${REFRESH_COOKIE_NAME}=${refreshCookie}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(response.json().accessToken).toBeTypeOf("string");
    expect(response.json().user.email).toBe("admin@epstudio.local");
  });

  it("rejeita refresh revogado", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "Admin@123",
      },
    });

    const refreshCookie = getCookieValue(
      login.headers["set-cookie"],
      REFRESH_COOKIE_NAME,
    );

    expect(refreshCookie).toBeTruthy();

    await prisma.refreshToken.updateMany({
      where: { tokenHash: hashToken(refreshCookie!) },
      data: { revokedAt: new Date() },
    });

    const response = await app.inject({
      method: "POST",
      url: "/auth/refresh",
      headers: {
        cookie: `${REFRESH_COOKIE_NAME}=${refreshCookie}`,
      },
    });

    expect(response.statusCode).toBe(401);
  });

  it("permite ADMIN listar usuários", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "admin@epstudio.local",
        password: "Admin@123",
      },
    });

    const { accessToken } = login.json();

    const response = await app.inject({
      method: "GET",
      url: "/users",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(200);
    expect(Array.isArray(response.json().users)).toBe(true);
    expect(JSON.stringify(response.json())).not.toContain("passwordHash");
  });

  it("bloqueia REQUESTER em /users", async () => {
    const login = await app.inject({
      method: "POST",
      url: "/auth/login",
      payload: {
        email: "gerente@epstudio.local",
        password: "Gerente@123",
      },
    });

    const { accessToken } = login.json();

    const response = await app.inject({
      method: "GET",
      url: "/users",
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    });

    expect(response.statusCode).toBe(403);
    expect(response.json().message).toBe(
      "Você não possui permissão para acessar este recurso.",
    );
  });
});
