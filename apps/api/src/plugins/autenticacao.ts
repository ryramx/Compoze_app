import type { FastifyInstance, FastifyRequest } from "fastify";
import fp from "fastify-plugin";

import { verificarAcesso } from "../modules/auth/tokens";
import { ErroDaApi } from "./erros";

declare module "fastify" {
  interface FastifyRequest {
    /** Quem fez a requisição. Só existe nas rotas protegidas por `autenticar`. */
    usuarioId: string;
  }
  interface FastifyInstance {
    autenticar: (req: FastifyRequest) => Promise<void>;
  }
}

/**
 * `Authorization: Bearer <access_token>`. Use como hook de `onRequest` no
 * escopo das rotas privadas: `app.addHook("onRequest", app.autenticar)`.
 */
export const autenticacao = fp(async (app: FastifyInstance) => {
  app.decorateRequest("usuarioId", "");
  app.decorate("autenticar", async (req: FastifyRequest) => {
    const [tipo, token] = (req.headers.authorization ?? "").split(" ");
    if (tipo?.toLowerCase() !== "bearer" || !token) throw new ErroDaApi(401, "Não autenticado.");
    const id = await verificarAcesso(token, app.config.JWT_SECRET);
    if (!id) throw new ErroDaApi(401, "Sessão expirada. Entre de novo.");
    req.usuarioId = id;
  });
});
