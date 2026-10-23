import { DetalheDaCancao, Id, NovaVersao, ResumoDaVersao, Versao } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { obter as obterCancao } from "../songs/servico";
import * as s from "./servico";

const ParamCancao = z.object({ id: Id });
const ParamVersao = z.object({ id: Id, number: z.coerce.number().int().min(1) });

export const rotasDeVersoes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["versões"];

  app.get(
    "/songs/:id/versions",
    { schema: { tags, summary: "Histórico de versões, da mais nova à mais antiga", params: ParamCancao, response: { 200: z.array(ResumoDaVersao) } } },
    async (req) => s.listar(db, req.params.id, req.usuarioId),
  );

  app.get(
    "/songs/:id/versions/:number",
    { schema: { tags, params: ParamVersao, response: { 200: Versao } } },
    async (req) => s.obter(db, req.params.id, req.params.number, req.usuarioId),
  );

  app.post(
    "/songs/:id/versions",
    { schema: { tags, summary: "Guardar a versão de agora", params: ParamCancao, body: NovaVersao, response: { 201: Versao } } },
    async (req, reply) =>
      reply.status(201).send(await s.guardarManual(db, app.colab, req.params.id, req.usuarioId, req.body.label)),
  );

  app.post(
    "/songs/:id/register",
    {
      schema: {
        tags,
        summary: "Registrar a obra: estágio Registrada + versão de registro (só a dona, divisão fechada)",
        params: ParamCancao,
        response: { 201: z.object({ song: DetalheDaCancao, version: Versao }) },
      },
    },
    async (req, reply) => {
      const version = await s.registrar(db, app.colab, req.params.id, req.usuarioId);
      const song = await obterCancao(db, req.params.id, req.usuarioId);
      return reply.status(201).send({ song, version });
    },
  );
};
