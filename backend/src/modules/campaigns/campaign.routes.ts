import type { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/auth/authenticate.js";
import * as controller from "./campaign.controller.js";

export async function campaignRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.post("/campaigns", controller.createCampaignHandler);
  app.get("/campaigns", controller.listCampaignsHandler);
  app.get("/campaigns/summary", controller.summaryHandler);
  app.get("/campaigns/:id", controller.getCampaignHandler);
  app.patch("/campaigns/:id", controller.updateCampaignHandler);

  app.post("/campaigns/:id/submit", controller.submitCampaignHandler);
  app.post("/campaigns/:id/claim", controller.claimCampaignHandler);
  app.patch("/campaigns/:id/assignee", controller.assignCampaignHandler);
  app.patch("/campaigns/:id/status", controller.changeStatusHandler);
  app.post("/campaigns/:id/cancel", controller.cancelCampaignHandler);
  app.post("/campaigns/:id/reopen", controller.reopenCampaignHandler);

  app.get("/campaigns/:id/activities", controller.listActivitiesHandler);
}
