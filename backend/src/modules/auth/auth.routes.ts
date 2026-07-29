import type { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/auth/authenticate.js";
import * as authController from "./auth.controller.js";

export async function authRoutes(app: FastifyInstance) {
  app.post("/auth/login", authController.loginHandler);
  app.post("/auth/refresh", authController.refreshHandler);
  app.post("/auth/logout", authController.logoutHandler);
  app.get(
    "/auth/me",
    { preHandler: [authenticate] },
    authController.meHandler,
  );
}
