import type { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/auth/authenticate.js";
import { authorize } from "../../shared/auth/authorize.js";
import * as usersController from "./users.controller.js";

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);
  app.addHook("preHandler", authorize(["ADMIN"]));

  app.get("/users", usersController.listUsersHandler);
  app.get("/users/:id", usersController.getUserHandler);
  app.post("/users", usersController.createUserHandler);
  app.patch("/users/:id", usersController.updateUserHandler);
}
