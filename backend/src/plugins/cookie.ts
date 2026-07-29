import cookie from "@fastify/cookie";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

async function cookiePlugin(app: FastifyInstance) {
  await app.register(cookie);
}

export default fp(cookiePlugin);
