import {
  AtualizarBloco,
  AtualizarCancao,
  Bloco,
  DetalheDaCancao,
  DivisaoDeCoautoria,
  FiltroDeCancoes,
  Id,
  ItemDaLixeira,
  NovaCancao,
  NovoBloco,
  NovoColaborador,
  ResumoDaCancao,
} from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const ParamCancao = z.object({ id: Id });

export const rotasDeCancoes: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["canções"];

  app.get(
    "/songs",
    {
      schema: {
        tags,
        querystring: FiltroDeCancoes,
        response: { 200: z.union([z.array(DetalheDaCancao), z.array(ResumoDaCancao)]) },
      },
    },
    async (req) => s.listar(db, req.usuarioId, req.query),
  );

  app.post(
    "/songs",
    { schema: { tags, body: NovaCancao, response: { 201: DetalheDaCancao } } },
    async (req, reply) => reply.status(201).send(await s.criar(db, req.usuarioId, req.body)),
  );

  app.get(
    "/songs/trash",
    { schema: { tags, summary: "Lixeira (RN07/RN08)", response: { 200: z.array(ItemDaLixeira) } } },
    async (req) => s.lixeira(db, req.usuarioId),
  );

  app.get(
    "/songs/:id",
    { schema: { tags, params: ParamCancao, response: { 200: DetalheDaCancao } } },
    async (req) => s.obter(db, req.params.id, req.usuarioId),
  );

  app.patch(
    "/songs/:id",
    { schema: { tags, params: ParamCancao, body: AtualizarCancao, response: { 200: DetalheDaCancao } } },
    async (req) => s.atualizar(db, req.params.id, req.usuarioId, req.body),
  );

  app.delete("/songs/:id", { schema: { tags, params: ParamCancao } }, async (req, reply) => {
    await s.mandarParaLixeira(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  app.post(
    "/songs/:id/restore",
    { schema: { tags, params: ParamCancao, response: { 200: DetalheDaCancao } } },
    async (req) => s.restaurar(db, req.params.id, req.usuarioId),
  );

  app.delete("/songs/:id/permanent", { schema: { tags, params: ParamCancao } }, async (req, reply) => {
    await s.apagarDeVez(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  // ------------------------------------------------------------ blocos
  const ParamBloco = ParamCancao.extend({ block_id: Id });

  app.post(
    "/songs/:id/blocks",
    { schema: { tags, params: ParamCancao, body: NovoBloco, response: { 201: DetalheDaCancao } } },
    async (req, reply) => reply.status(201).send(await s.adicionarBloco(db, req.params.id, req.usuarioId, req.body)),
  );

  app.patch(
    "/songs/:id/blocks/:block_id",
    { schema: { tags, params: ParamBloco, body: AtualizarBloco, response: { 200: Bloco } } },
    async (req) => s.atualizarBloco(db, req.params.id, req.params.block_id, req.usuarioId, req.body),
  );

  app.delete("/songs/:id/blocks/:block_id", { schema: { tags, params: ParamBloco } }, async (req, reply) => {
    await s.removerBloco(db, req.params.id, req.params.block_id, req.usuarioId);
    return reply.status(204).send();
  });

  // --------------------------------------------------------- coautoria
  app.post(
    "/songs/:id/collaborators",
    { schema: { tags, params: ParamCancao, body: NovoColaborador, response: { 201: DetalheDaCancao } } },
    async (req, reply) => reply.status(201).send(await s.convidar(db, req.params.id, req.usuarioId, req.body)),
  );

  app.delete(
    "/songs/:id/collaborators/:user_id",
    { schema: { tags, params: ParamCancao.extend({ user_id: Id }) } },
    async (req, reply) => {
      await s.removerCoautor(db, req.params.id, req.usuarioId, req.params.user_id);
      return reply.status(204).send();
    },
  );

  app.put(
    "/songs/:id/contributions",
    {
      schema: {
        tags,
        summary: "Divisão de coautoria (RN05)",
        params: ParamCancao,
        body: DivisaoDeCoautoria,
        response: { 200: DetalheDaCancao },
      },
    },
    async (req) => s.dividir(db, req.params.id, req.usuarioId, req.body),
  );
};
