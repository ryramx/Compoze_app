import { ConsultaDeNovidades, PaginaDeNovidades } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import * as s from "./servico";

export const rotasDeNovidades: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["novidades"];

  app.get(
    "/notifications",
    {
      schema: {
        tags,
        summary: "Novidades: mensagens, comentários, curtidas, seguidores, convites e apoios, do mais novo ao mais antigo",
        querystring: ConsultaDeNovidades,
        response: { 200: PaginaDeNovidades },
      },
    },
    async (req) => s.listar(db, req.usuarioId, req.query),
  );

  app.put("/notifications/seen", { schema: { tags, summary: "Marcar como visto tudo o que chegou até agora" } }, async (req, reply) => {
    await s.marcarVisto(db, req.usuarioId);
    return reply.status(204).send();
  });
};
