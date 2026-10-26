import { AtualizarLancamento, Id, Lancamento, NovoLancamento } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const ParamProjeto = z.object({ id: Id });
const ParamLancamento = z.object({ id: Id, entry_id: Id });

/** Entradas e custos do projeto (ADR 0021). Só a dona. */
export const rotasDeLancamentos: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["projetos"];

  app.get(
    "/projects/:id/entries",
    { schema: { tags, summary: "Entradas e custos do projeto", params: ParamProjeto, response: { 200: z.array(Lancamento) } } },
    async (req) => s.listar(db, req.params.id, req.usuarioId),
  );

  app.post(
    "/projects/:id/entries",
    {
      schema: {
        tags,
        summary: "Lançar uma entrada (soma no arrecadado) ou um custo",
        params: ParamProjeto,
        body: NovoLancamento,
        response: { 201: Lancamento },
      },
    },
    async (req, reply) => reply.status(201).send(await s.criar(db, req.params.id, req.usuarioId, req.body)),
  );

  app.patch(
    "/projects/:id/entries/:entry_id",
    { schema: { tags, summary: "Corrigir um lançamento", params: ParamLancamento, body: AtualizarLancamento, response: { 200: Lancamento } } },
    async (req) => s.atualizar(db, req.params.id, req.usuarioId, req.params.entry_id, req.body),
  );

  app.delete(
    "/projects/:id/entries/:entry_id",
    { schema: { tags, summary: "Apagar um lançamento", params: ParamLancamento } },
    async (req, reply) => {
      await s.remover(db, req.params.id, req.usuarioId, req.params.entry_id);
      return reply.status(204).send();
    },
  );
};
