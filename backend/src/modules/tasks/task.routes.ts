import type { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/auth/authenticate.js";
import * as controller from "./task.controller.js";

export async function taskRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/campaigns/:campaignId/tasks", controller.createTaskHandler);
  app.get("/campaigns/:campaignId/tasks", controller.listCampaignTasksHandler);
  app.patch(
    "/campaigns/:campaignId/tasks/reorder",
    controller.reorderTasksHandler,
  );

  app.get("/tasks/my", controller.myTasksHandler);
  app.get("/tasks/summary", controller.summaryHandler);

  app.get("/tasks/:id", controller.getTaskHandler);
  app.patch("/tasks/:id", controller.updateTaskHandler);
  app.patch("/tasks/:id/status", controller.changeStatusHandler);
  app.post("/tasks/:id/cancel", controller.cancelTaskHandler);
  app.post("/tasks/:id/reopen", controller.reopenTaskHandler);

  app.post("/tasks/:id/assignees", controller.addAssigneesHandler);
  app.delete(
    "/tasks/:id/assignees/:userId",
    controller.removeAssigneeHandler,
  );

  app.get("/tasks/:id/activities", controller.listActivitiesHandler);
}
