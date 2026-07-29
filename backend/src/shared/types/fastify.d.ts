import type { AuthenticatedUser } from "./auth.js";

declare module "@fastify/jwt" {
  interface FastifyJWT {
    payload: AuthenticatedUser;
    user: AuthenticatedUser;
    namespaces: "access" | "refresh";
  }
}

declare module "fastify" {
  interface FastifyRequest {
    accessJwtVerify: <T = AuthenticatedUser>() => Promise<T>;
    refreshJwtVerify: <T = AuthenticatedUser>() => Promise<T>;
    user: AuthenticatedUser;
  }
}

export {};
