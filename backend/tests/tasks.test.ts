import argon2 from "argon2";
import type { FastifyInstance } from "fastify";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { buildApp } from "../src/app.js";
import { prisma } from "../src/lib/prisma.js";

async function login(app: FastifyInstance, email: string, password: string) {
  const response = await app.inject({
    method: "POST",
    url: "/auth/login",
    payload: { email, password },
  });
  expect(response.statusCode).toBe(200);
  return response.json().accessToken as string;
}

describe("Tasks API", () => {
  let app: FastifyInstance;
  let adminToken: string;
  let requesterToken: string;
  let managerToken: string;
  let otherManagerToken: string;
  let designerToken: string;
  let otherDesignerToken: string;
  let campaignId: string;
  let designerId: string;
  let otherDesignerId: string;
  let requesterId: string;

  beforeAll(async () => {
    app = await buildApp();
    await app.ready();

    await prisma.taskActivity.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.task.deleteMany();
    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-task@epstudio.local",
            "req-task@epstudio.local",
            "mkt-task@epstudio.local",
            "mkt2-task@epstudio.local",
            "des-task@epstudio.local",
            "des2-task@epstudio.local",
          ],
        },
      },
    });

    const passwordHash = await argon2.hash("Senha@123");

    const admin = await prisma.user.create({
      data: {
        name: "Admin Task",
        email: "admin-task@epstudio.local",
        passwordHash,
        role: "ADMIN",
      },
    });
    const requester = await prisma.user.create({
      data: {
        name: "Requester Task",
        email: "req-task@epstudio.local",
        passwordHash,
        role: "REQUESTER",
      },
    });
    const manager = await prisma.user.create({
      data: {
        name: "Manager Task",
        email: "mkt-task@epstudio.local",
        passwordHash,
        role: "MARKETING_MANAGER",
      },
    });
    await prisma.user.create({
      data: {
        name: "Manager Two",
        email: "mkt2-task@epstudio.local",
        passwordHash,
        role: "MARKETING_MANAGER",
      },
    });
    const designer = await prisma.user.create({
      data: {
        name: "Designer Task",
        email: "des-task@epstudio.local",
        passwordHash,
        role: "DESIGNER",
      },
    });
    const otherDesigner = await prisma.user.create({
      data: {
        name: "Designer Two",
        email: "des2-task@epstudio.local",
        passwordHash,
        role: "DESIGNER",
      },
    });

    requesterId = requester.id;
    designerId = designer.id;
    otherDesignerId = otherDesigner.id;

    const campaign = await prisma.campaign.create({
      data: {
        title: "Campanha com tarefas",
        description: "Campanha para testes do módulo de tarefas.",
        status: "IN_ANALYSIS",
        requesterId: requester.id,
        marketingManagerId: manager.id,
      },
    });
    campaignId = campaign.id;

    adminToken = await login(app, "admin-task@epstudio.local", "Senha@123");
    requesterToken = await login(app, "req-task@epstudio.local", "Senha@123");
    managerToken = await login(app, "mkt-task@epstudio.local", "Senha@123");
    otherManagerToken = await login(app, "mkt2-task@epstudio.local", "Senha@123");
    designerToken = await login(app, "des-task@epstudio.local", "Senha@123");
    otherDesignerToken = await login(app, "des2-task@epstudio.local", "Senha@123");

    void admin;
  });

  afterAll(async () => {
    await prisma.taskActivity.deleteMany();
    await prisma.taskAssignee.deleteMany();
    await prisma.task.deleteMany();
    await prisma.campaignActivity.deleteMany();
    await prisma.campaign.deleteMany();
    await prisma.refreshToken.deleteMany();
    await prisma.user.deleteMany({
      where: {
        email: {
          in: [
            "admin-task@epstudio.local",
            "req-task@epstudio.local",
            "mkt-task@epstudio.local",
            "mkt2-task@epstudio.local",
            "des-task@epstudio.local",
            "des2-task@epstudio.local",
          ],
        },
      },
    });
    await app.close();
    await prisma.$disconnect();
  });

  it("bloqueia criação sem token", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      payload: { title: "x", description: "y" },
    });
    expect(response.statusCode).toBe(401);
  });

  it("gestor cria tarefa TODO com posição e assignee", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Criar arte para o feed",
        description: "Criar peça quadrada para Instagram.",
        priority: "HIGH",
        assigneeIds: [designerId],
      },
    });

    expect(response.statusCode).toBe(201);
    const task = response.json().task;
    expect(task.status).toBe("TODO");
    expect(task.position).toBe(0);
    expect(task.assignees[0].user.id).toBe(designerId);
    expect(JSON.stringify(response.json())).not.toContain("passwordHash");
  });

  it("requester não cria e assignee inválido falha", async () => {
    const denied = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${requesterToken}` },
      payload: {
        title: "Tarefa do solicitante",
        description: "Não deveria criar.",
      },
    });
    expect(denied.statusCode).toBe(403);

    const invalid = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Assignee inválido",
        description: "Requester não pode ser responsável.",
        assigneeIds: [requesterId],
      },
    });
    expect(invalid.statusCode).toBe(400);
  });

  it("outro gestor não cria na campanha alheia", async () => {
    const response = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${otherManagerToken}` },
      payload: {
        title: "Invasão",
        description: "Outro gestor não deveria criar aqui.",
      },
    });
    expect(response.statusCode).toBe(403);
  });

  it("visibilidade por papel", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${adminToken}` },
      payload: {
        title: "Tarefa exclusiva designer 2",
        description: "Somente des2 deve ver como operacional.",
        assigneeIds: [otherDesignerId],
      },
    });
    const taskId = created.json().task.id as string;

    const requesterList = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${requesterToken}` },
    });
    expect(requesterList.statusCode).toBe(200);
    expect(requesterList.json().data.length).toBeGreaterThan(0);

    const designerList = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${designerToken}` },
    });
    const designerIds = (designerList.json().data as Array<{ id: string }>).map(
      (t) => t.id,
    );
    expect(designerIds).not.toContain(taskId);

    const otherDetail = await app.inject({
      method: "GET",
      url: `/tasks/${taskId}`,
      headers: { authorization: `Bearer ${designerToken}` },
    });
    expect(otherDetail.statusCode).toBe(404);
  });

  it("fluxo de status operacional e conclusão do gestor", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Fluxo status",
        description: "Designer inicia e envia para revisão.",
        assigneeIds: [designerId],
      },
    });
    const taskId = created.json().task.id as string;

    const start = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${designerToken}` },
      payload: { status: "IN_PROGRESS" },
    });
    expect(start.statusCode).toBe(200);

    const review = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${designerToken}` },
      payload: { status: "IN_REVIEW" },
    });
    expect(review.statusCode).toBe(200);

    const doneDenied = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${designerToken}` },
      payload: { status: "DONE" },
    });
    expect(doneDenied.statusCode).toBe(403);

    const done = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "DONE" },
    });
    expect(done.statusCode).toBe(200);
    expect(done.json().task.completedAt).toBeTruthy();

    const invalid = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { status: "TODO" },
    });
    expect(invalid.statusCode).toBe(422);
  });

  it("cancelamento e progresso", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Cancelável",
        description: "Será cancelada pelo gestor.",
        assigneeIds: [designerId],
      },
    });
    const taskId = created.json().task.id as string;

    const opCancel = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/cancel`,
      headers: { authorization: `Bearer ${designerToken}` },
      payload: { reason: "Tentativa inválida do operacional." },
    });
    expect(opCancel.statusCode).toBe(403);

    const cancel = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/cancel`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { reason: "A peça deixou de fazer parte da campanha." },
    });
    expect(cancel.statusCode).toBe(200);

    const detail = await app.inject({
      method: "GET",
      url: `/campaigns/${campaignId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(detail.statusCode).toBe(200);
    const progress = detail.json().campaign.taskProgress;
    expect(progress.total).toBeGreaterThanOrEqual(0);
    expect(progress.percentage).toBeGreaterThanOrEqual(0);
    expect(progress.percentage).toBeLessThanOrEqual(100);
  });

  it("atribuição e remoção", async () => {
    const created = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Com assignees",
        description: "Teste de atribuição e remoção.",
      },
    });
    const taskId = created.json().task.id as string;

    const assign = await app.inject({
      method: "POST",
      url: `/tasks/${taskId}/assignees`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: { userIds: [designerId, designerId] },
    });
    expect(assign.statusCode).toBe(200);
    expect(assign.json().task.assignees).toHaveLength(1);

    const remove = await app.inject({
      method: "DELETE",
      url: `/tasks/${taskId}/assignees/${designerId}`,
      headers: { authorization: `Bearer ${managerToken}` },
    });
    expect(remove.statusCode).toBe(200);
    expect(remove.json().task.assignees).toHaveLength(0);
  });

  it("minhas tarefas e designer não altera tarefa alheia", async () => {
    const mine = await app.inject({
      method: "GET",
      url: "/tasks/my",
      headers: { authorization: `Bearer ${designerToken}` },
    });
    expect(mine.statusCode).toBe(200);

    const created = await app.inject({
      method: "POST",
      url: `/campaigns/${campaignId}/tasks`,
      headers: { authorization: `Bearer ${managerToken}` },
      payload: {
        title: "Só des2",
        description: "Designer 1 não pode alterar.",
        assigneeIds: [otherDesignerId],
      },
    });
    const taskId = created.json().task.id as string;

    const denied = await app.inject({
      method: "PATCH",
      url: `/tasks/${taskId}/status`,
      headers: { authorization: `Bearer ${designerToken}` },
      payload: { status: "IN_PROGRESS" },
    });
    expect(denied.statusCode).toBe(404);
  });
});
