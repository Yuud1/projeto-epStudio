import Fastify from "fastify";
import cors from "@fastify/cors";
import { env } from "./config/env.js";
import cookiePlugin from "./plugins/cookie.js";
import jwtPlugin from "./plugins/jwt.js";
import authPlugin from "./plugins/auth.js";
import { authRoutes } from "./modules/auth/auth.routes.js";
import { campaignRoutes } from "./modules/campaigns/campaign.routes.js";
import { taskRoutes } from "./modules/tasks/task.routes.js";
import { usersRoutes } from "./modules/users/users.routes.js";
import { healthRoutes } from "./routes/health.js";
import { errorHandler } from "./shared/errors/error-handler.js";

export async function buildApp() {
  const app = Fastify({
    logger: env.NODE_ENV !== "test",
  });

  app.setErrorHandler(errorHandler);

  await app.register(cors, {
    origin: env.FRONTEND_URL,
    credentials: true,
  });

  await app.register(cookiePlugin);
  await app.register(jwtPlugin);
  await app.register(authPlugin);

  await app.register(healthRoutes);
  await app.register(authRoutes);
  await app.register(usersRoutes);
  await app.register(campaignRoutes);
  await app.register(taskRoutes);

  return app;
}
