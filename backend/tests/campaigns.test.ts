import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

async function login(
  app: FastifyInstance,
  email: string,
  password: string,
): Promise<string> {
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });

  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

describe("Campaigns API", () => {
  let app: FastifyInstance;
  let requesterToken: string;
  let managerToken: string;
  let otherManagerToken: string;
  let adminToken: string;
  let requesterId: string;
  let managerId: string;
  let otherManagerId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "req-campaign@epstudio.local",
            "mkt-campaign@epstudio.local",
            "mkt2-campaign@epstudio.local",
            "admin-campaign@epstudio.local",
          ],
        },
      },
    });

    const passwordHash = await argon2.hash("Senha@123");

    const requester = await prisma.user.create({
      data: {
        name: "Solicitante Teste",
        email: "req-campaign@epstudio.local",
        passwordHash,
        role: "REQUESTER",
      },
    });

    const manager = await prisma.user.create({
      data: {
        name: "Marketing Um",
        email: "mkt-campaign@epstudio.local",
        passwordHash,
        role: "MARKETING_MANAGER",
      },
    });

    const otherManager = await prisma.user.create({
      data: {
        name: "Marketing Dois",
        email: "mkt2-campaign@epstudio.local",
        passwordHash,
        role: "MARKETING_MANAGER",
      },
    });

    await prisma.user.create({
      data: {
        name: "Admin Campanha",
        email: "admin-campaign@epstudio.local",
        passwordHash,
        role: "ADMIN",
      },
    });

    requesterId = requester.id;
    managerId = manager.id;
    otherManagerId = otherManager.id;

    requesterToken = await login(
      app,
      "req-campaign@epstudio.local",
      "Senha@123",
    );
    managerToken = await login(app, "mkt-campaign@epstudio.local", "Senha@123");
    otherManagerToken = await login(
      app,
      "mkt2-campaign@epstudio.local",
      "Senha@123",
    );
    adminToken = await login(app, "admin-campaign@epstudio.local", "Senha@123");
  });

  afterAll(async () => {
    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "req-campaign@epstudio.local",
            "mkt-campaign@epstudio.local",
            "mkt2-campaign@epstudio.local",
            "admin-campaign@epstudio.local",
          ],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it("bloqueia rotas sem token", async () => {
    const response = await app.inject({ method: "GET", url: "/campaigns" });
    expect(response.statusCode).toBe(401);
  });

  it("REQUESTER cria chamado OPEN e vira solicitante", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Campanha Fecha Mês",
        description: "Criar materiais para divulgação das ofertas.",
        priority: "HIGH",
        saveAsDraft: false,
      },
    });

    expect(response.statusCode).toBe(201);
    const body = response.json();
    expect(body.campaign.status).toBe("OPEN");
    expect(body.campaign.requester.id).toBe(requesterId);
    expect(JSON.stringify(body)).not.toContain("passwordHash");
  });

  it("rascunho nasce DRAFT", async () => {
    const response = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Rascunho de banner",
        description: "Descrição suficiente para o rascunho.",
        saveAsDraft: true,
      },
    });

    expect(response.statusCode).toBe(201);
    expect(response.json().campaign.status).toBe("DRAFT");
  });

  it("REQUESTER visualiza somente os próprios", async () => {
    await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Chamado do Admin",
        description: "Chamado criado pelo administrador do sistema.",
      },
    });

    const response = await app.inject({
      method: "GET",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
    });

    expect(response.statusCode).toBe(200);
    const data = response.json().data as Array<{ requester: { id: string } }>;
    expect(data.every((item) => item.requester.id === requesterId)).toBe(true);
  });

  it("gestor assume chamado aberto e outro gestor recebe 409", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Campanha para assumir",
        description: "Chamado aberto para teste de claim concorrente.",
      },
    });

    const campaignId = created.json().campaign.id as string;

    const claim = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/claim`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    expect(claim.statusCode).toBe(200);
    expect(claim.json().campaign.status).toBe("IN_ANALYSIS");
    expect(claim.json().campaign.marketingManager.id).toBe(managerId);

    const secondClaim = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/claim`,
      headers: { authorization: `Bearer ${otherManagerToken}` },
    });

    expect(secondClaim.statusCode).toBe(409);
  });

  it("REQUESTER não consegue assumir", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Campanha sem claim",
        description: "Solicitante não deve conseguir assumir este chamado.",
      },
    });

    const response = await app.inject({
      method: "POST",
      url: `/campaigns/${created.json().campaign.id}/claim`,
      headers: { authorization: `Bearer ${requesterToken}` },
    });

    expect(response.statusCode).toBe(403);
  });

  it("gestor não visualiza chamado atribuído a outro", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Privado de outro gestor",
        description: "Chamado que será atribuído ao primeiro gestor.",
      },
    });

    const campaignId = created.json().campaign.id as string;

    await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/claim`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const list = await app.inject({
      method: "GET",
      url: "/campaigns",
      headers: { authorization: `Bearer ${otherManagerToken}` },
    });

    const ids = (list.json().data as Array<{ id: string }>).map((c) => c.id);
    expect(ids).not.toContain(campaignId);

    const detail = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}`,
      headers: { authorization: `Bearer ${otherManagerToken}` },
    });

    expect(detail.statusCode).toBe(404);
  });

  it("ADMIN atribui responsável e papel incorreto falha", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Atribuição admin",
        description: "Chamado para atribuição administrativa de responsável.",
      },
    });

    const campaignId = created.json().campaign.id as string;

    const invalid = await app.inject({
      method: "PATCH",
      url: `/campaigns/${campaignId}/assignee`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { marketingManagerId: requesterId },
    });

    expect(invalid.statusCode).toBe(400);

    const valid = await app.inject({
      method: "PATCH",
      url: `/campaigns/${campaignId}/assignee`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: { marketingManagerId: otherManagerId },
    });

    expect(valid.statusCode).toBe(200);
    expect(valid.json().campaign.marketingManager.id).toBe(otherManagerId);
    expect(valid.json().campaign.status).toBe("IN_ANALYSIS");
  });

  it("transição válida e inválida de status", async () => {
    const created = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Fluxo de status",
        description: "Chamado para validar mapa de transições de status.",
      },
    });

    const campaignId = created.json().campaign.id as string;

    await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/claim`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const valid = await app.inject({
      method: "PATCH",
      url: `/campaigns/${campaignId}/status`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "IN_PROGRESS" },
    });

    expect(valid.statusCode).toBe(200);
    expect(valid.json().campaign.status).toBe("IN_PROGRESS");

    const invalid = await app.inject({
      method: "PATCH",
      url: `/campaigns/${campaignId}/status`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "DRAFT" },
    });

    expect(invalid.statusCode).toBe(422);

    const completed = await app.inject({
      method: "PATCH",
      url: `/campaigns/${campaignId}/status`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "COMPLETED" },
    });

    expect(completed.statusCode).toBe(200);
    expect(completed.json().campaign.completedAt).toBeTruthy();
  });

  it("cancelamento respeita papéis e exige motivo", async () => {
    const open = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Cancelável pelo solicitante",
        description: "Chamado aberto que o solicitante pode cancelar.",
      },
    });

    const openId = open.json().campaign.id as string;

    const missingReason = await app.inject({
      method: "POST",
      url: `/campaigns/${openId}/cancel`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {},
    });
    expect(missingReason.statusCode).toBe(400);

    const cancelled = await app.inject({
      method: "POST",
      url: `/campaigns/${openId}/cancel`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { reason: "Promoção cancelada pela diretoria." },
    });
    expect(cancelled.statusCode).toBe(200);
    expect(cancelled.json().campaign.status).toBe("CANCELLED");

    const inProgress = await app.inject({
      method: "POST",
      url: "/campaigns",
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Em andamento protegido",
        description: "Chamado que solicitante não cancela após assumir.",
      },
    });

    const progressId = inProgress.json().campaign.id as string;

    await app.inject({
      method: "POST",
      url: `/campaigns/${progressId}/claim`,
      headers: { authorization: `Bearer ${managerToken}` },
    });

    const requesterCancel = await app.inject({
      method: "POST",
      url: `/campaigns/${progressId}/cancel`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: { reason: "Tentativa inválida de cancelamento." },
    });
    expect(requesterCancel.statusCode).toBe(403);

    const managerCancel = await app.inject({
      method: "POST",
      url: `/campaigns/${progressId}/cancel`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { reason: "Demanda cancelada pelo marketing." },
    });
    expect(managerCancel.statusCode).toBe(200);
  });

  it("ADMIN visualiza todos e histórico respeita permissões", async () => {
    const list = await app.inject({
      method: "GET",
      url: "/campaigns?limit=100",
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(list.statusCode).toBe(200);
    expect(list.json().data.length).toBeGreaterThan(0);
    expect(JSON.stringify(list.json())).not.toContain("passwordHash");

    const campaignId = list.json().data[0].id as string;

    const activities = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}/activities`,
      headers: { authorization: `Bearer ${adminToken}` },
    });

    expect(activities.statusCode).toBe(200);
    expect(Array.isArray(activities.json().data)).toBe(true);
  });
});
