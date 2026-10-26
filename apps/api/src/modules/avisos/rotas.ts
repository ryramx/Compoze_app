import { CancelarInscricao, ChaveDoPush, InscricaoPush } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import * as s from "./servico";

export const rotasDeAvisos: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["avisos"];

  app.get(
    "/push/public-key",
    { schema: { tags, summary: "Chave pública VAPID, para PushManager.subscribe", response: { 200: ChaveDoPush } } },
    async () => ({ key: await app.avisador.chavePublica(), fcm: app.avisador.androidLigado }),
  );

  app.put(
    "/push/subscriptions",
    { schema: { tags, summary: "Inscrever este aparelho (Web Push ou token do Firebase)", body: InscricaoPush } },
    async (req, reply) => {
      await s.inscrever(db, req.usuarioId, req.body);
      return reply.status(204).send();
    },
  );

  app.delete(
    "/push/subscriptions",
    { schema: { tags, summary: "Cancelar a inscrição deste aparelho", body: CancelarInscricao } },
    async (req, reply) => {
      await s.cancelar(db, req.usuarioId, req.body.endpoint);
      return reply.status(204).send();
    },
  );
};
