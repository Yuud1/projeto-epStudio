import type { FastifyInstance } from "fastify";
import { authenticate } from "../../shared/auth/authenticate.js";
import { authorize } from "../../shared/auth/authorize.js";
import * as usersController from "./users.controller.js";

export async function usersRoutes(app: FastifyInstance) {
  app.addHook("preHandler", authenticate);

  app.get(
    "/users/assignable",
    {
      preHandler: [authorize(["ADMIN", "MARKETING_MANAGER"])],
    },
    usersController.listAssignableUsersHandler,
  );

  app.get(
    "/users",
    { preHandler: [authorize(["ADMIN"])] },
    usersController.listUsersHandler,
  );
  app.get(
    "/users/:id",
    { preHandler: [authorize(["ADMIN"])] },
    usersController.getUserHandler,
  );
  app.post(
    "/users",
    { preHandler: [authorize(["ADMIN"])] },
    usersController.createUserHandler,
  );
  app.patch(
    "/users/:id",
    { preHandler: [authorize(["ADMIN"])] },
    usersController.updateUserHandler,
  );
}
