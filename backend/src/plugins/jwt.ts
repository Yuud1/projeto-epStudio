import fjwt from "@fastify/jwt";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";
import { env } from "../config/env.js";

async function jwtPlugin(app: FastifyInstance) {
  await app.register(fjwt, {
    secret: env.JWT_ACCESS_SECRET,
    namespace: "access",
    jwtVerify: "accessJwtVerify",
    jwtSign: "accessJwtSign",
    sign: {
      expiresIn: env.JWT_ACCESS_EXPIRES_IN,
    },
  });

  await app.register(fjwt, {
    secret: env.JWT_REFRESH_SECRET,
    namespace: "refresh",
    jwtVerify: "refreshJwtVerify",
    jwtSign: "refreshJwtSign",
    sign: {
      expiresIn: `${env.JWT_REFRESH_EXPIRES_IN_DAYS}d`,
    },
  });
}

export default fp(jwtPlugin);
