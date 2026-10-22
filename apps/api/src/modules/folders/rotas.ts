import { AtualizarPasta, Id, NovaPasta, Pasta } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

export const rotasDePastas: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["pastas"];
  const params = z.object({ id: Id });

  app.get("/folders", { schema: { tags, response: { 200: z.array(Pasta) } } }, async (req) => s.listar(db, req.usuarioId));

  app.post(
    "/folders",
    { schema: { tags, body: NovaPasta, response: { 201: Pasta } } },
    async (req, reply) => reply.status(201).send(await s.criar(db, req.usuarioId, req.body)),
  );

  app.patch(
    "/folders/:id",
    { schema: { tags, params, body: AtualizarPasta, response: { 200: Pasta } } },
    async (req) => s.atualizar(db, req.params.id, req.usuarioId, req.body),
  );

  app.delete("/folders/:id", { schema: { tags, params } }, async (req, reply) => {
    await s.remover(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });
};
