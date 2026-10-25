import { AtualizarMemo, DadosDoMemo, Id, MEMO_BYTES_MAX, MemoDeVoz } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const ParamCancao = z.object({ id: Id });
const ParamMemo = z.object({ id: Id, memo_id: Id });

export const rotasDeMemos: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["memos"];

  // O áudio sobe cru, sem multipart. Vale só dentro deste plugin.
  app.addContentTypeParser(/^audio\//, { parseAs: "buffer", bodyLimit: MEMO_BYTES_MAX }, (_req, corpo, pronto) =>
    pronto(null, corpo),
  );

  app.get(
    "/songs/:id/memos",
    { schema: { tags, summary: "Memos de voz, do mais novo ao mais antigo", params: ParamCancao, response: { 200: z.array(MemoDeVoz) } } },
    async (req) => s.listar(db, req.params.id, req.usuarioId),
  );

  app.put(
    "/songs/:id/memos/:memo_id",
    {
      schema: {
        tags,
        summary: "Subir um memo de voz (corpo: o áudio, Content-Type audio/*)",
        params: ParamMemo,
        querystring: DadosDoMemo,
        response: { 200: MemoDeVoz, 201: MemoDeVoz },
      },
    },
    async (req, reply) => {
      const bytes = Buffer.isBuffer(req.body) ? req.body : Buffer.alloc(0);
      const { memo, novo } = await s.guardar(db, req.params.id, req.params.memo_id, req.usuarioId, {
        bytes,
        contentType: req.headers["content-type"],
        durationMs: req.query.duration_ms,
        title: req.query.title,
      });
      return reply.status(novo ? 201 : 200).send(memo);
    },
  );

  app.get(
    "/songs/:id/memos/:memo_id/audio",
    { schema: { tags, summary: "O áudio do memo", params: ParamMemo } },
    async (req, reply) => {
      const { mimeType, bytes } = await s.audio(db, req.params.id, req.params.memo_id, req.usuarioId);
      // Áudio não muda: o mesmo id é sempre o mesmo som.
      return reply.type(mimeType).header("cache-control", "private, max-age=31536000, immutable").send(bytes);
    },
  );

  app.patch(
    "/songs/:id/memos/:memo_id",
    { schema: { tags, params: ParamMemo, body: AtualizarMemo, response: { 200: MemoDeVoz } } },
    async (req) => s.renomear(db, req.params.id, req.params.memo_id, req.usuarioId, req.body.title),
  );

  app.delete(
    "/songs/:id/memos/:memo_id",
    { schema: { tags, params: ParamMemo } },
    async (req, reply) => {
      await s.apagar(db, req.params.id, req.params.memo_id, req.usuarioId);
      return reply.status(204).send();
    },
  );
};
