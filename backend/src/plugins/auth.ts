import fp from "fastify-plugin";
import type { FastifyInstance } from "fastify";

/**
 * Plugin de autenticação — os hooks authenticate/authorize
 * são exportados de shared/auth e aplicados nas rotas.
 */
async function authPlugin(_app: FastifyInstance) {
  // Intencionalmente vazio: autenticação é aplicada por rota.
}

export default fp(authPlugin);
