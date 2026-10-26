import { AtualizarFaixa, AtualizarProjeto, DetalheDoProjeto, Id, NovaFaixa, NovoProjeto } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

export const rotasDeProjetos: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["projetos"];
  const params = z.object({ id: Id });

  app.get("/projects", { schema: { tags, response: { 200: z.array(DetalheDoProjeto) } } }, async (req) => s.listar(db, req.usuarioId));

  app.post(
    "/projects",
    { schema: { tags, body: NovoProjeto, response: { 201: DetalheDoProjeto } } },
    async (req, reply) => reply.status(201).send(await s.criar(db, req.usuarioId, req.body)),
  );

  app.get(
    "/projects/:id",
    { schema: { tags, params, response: { 200: DetalheDoProjeto } } },
    async (req) => s.obter(db, req.params.id, req.usuarioId),
  );

  app.patch(
    "/projects/:id",
    { schema: { tags, params, body: AtualizarProjeto, response: { 200: DetalheDoProjeto } } },
    async (req) => s.atualizar(db, req.params.id, req.usuarioId, req.body),
  );

  app.delete("/projects/:id", { schema: { tags, params } }, async (req, reply) => {
    await s.remover(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  app.post(
    "/projects/:id/restore",
    { schema: { tags, params, response: { 200: DetalheDoProjeto } } },
    async (req) => s.restaurar(db, req.params.id, req.usuarioId),
  );

  app.post(
    "/projects/:id/songs",
    { schema: { tags, params, body: NovaFaixa, response: { 201: DetalheDoProjeto } } },
    async (req, reply) => reply.status(201).send(await s.adicionarFaixa(db, req.params.id, req.usuarioId, req.body)),
  );

  app.patch(
    "/projects/:id/songs/:song_id",
    {
      schema: {
        tags,
        summary: "Trocar o número da faixa (troca com a que já tinha o número)",
        params: params.extend({ song_id: Id }),
        body: AtualizarFaixa,
        response: { 200: DetalheDoProjeto },
      },
    },
    async (req) => s.numerarFaixa(db, req.params.id, req.usuarioId, req.params.song_id, req.body.track_number),
  );

  app.delete(
    "/projects/:id/songs/:song_id",
    { schema: { tags, params: params.extend({ song_id: Id }) } },
    async (req, reply) => {
      await s.removerFaixa(db, req.params.id, req.usuarioId, req.params.song_id);
      return reply.status(204).send();
    },
  );
};
