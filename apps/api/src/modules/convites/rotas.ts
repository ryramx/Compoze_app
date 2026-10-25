import { ConviteCriado, ConviteRecebido, ConvitesDaCancao, DetalheDaCancao, Id, NovoConvite } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { avisoDeConvite } from "../avisos/servico";
import * as s from "./servico";

const ParamCancao = z.object({ id: Id });
const ParamToken = z.object({ token: z.string().min(20).max(100) });

export const rotasDeConvites: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["convites"];

  // ----------------------------------------------------------- a dona
  app.get(
    "/songs/:id/invites",
    { schema: { tags, summary: "Convites abertos da canção (só a dona)", params: ParamCancao, response: { 200: ConvitesDaCancao } } },
    async (req) => ({
      email_enabled: app.carteiro.habilitado,
      invites: await s.listarDaCancao(db, req.params.id, req.usuarioId),
    }),
  );

  app.post(
    "/songs/:id/invites",
    {
      schema: {
        tags,
        summary: "Convidar pela conta ({ user_id }) ou criar um link ({ link: true, email? })",
        params: ParamCancao,
        body: NovoConvite,
        response: { 201: ConviteCriado },
      },
    },
    async (req, reply) => {
      const convite = await s.convidar(db, app.carteiro, app.config.WEB_URL, req.params.id, req.usuarioId, req.body);
      void app.avisador.avisarDepois(avisoDeConvite(db, convite));
      return reply.status(201).send(convite);
    },
  );

  app.delete(
    "/songs/:id/invites/:invite_id",
    { schema: { tags, summary: "Cancelar um convite", params: ParamCancao.extend({ invite_id: Id }) } },
    async (req, reply) => {
      await s.revogar(db, req.params.id, req.params.invite_id, req.usuarioId);
      return reply.status(204).send();
    },
  );

  // ------------------------------------------------- quem foi convidada
  app.get(
    "/invites",
    { schema: { tags, summary: "Convites pela conta esperando resposta", response: { 200: z.array(ConviteRecebido) } } },
    async (req) => s.meus(db, req.usuarioId),
  );

  app.post(
    "/invites/:invite_id/accept",
    { schema: { tags, params: z.object({ invite_id: Id }), response: { 200: DetalheDaCancao } } },
    async (req) => s.aceitarPorId(db, req.params.invite_id, req.usuarioId),
  );

  app.post(
    "/invites/:invite_id/decline",
    { schema: { tags, params: z.object({ invite_id: Id }) } },
    async (req, reply) => {
      await s.recusar(db, req.params.invite_id, req.usuarioId);
      return reply.status(204).send();
    },
  );

  app.get(
    "/invites/link/:token",
    { schema: { tags, summary: "O que o link convida a fazer", params: ParamToken, response: { 200: ConviteRecebido } } },
    async (req) => s.verPorToken(db, req.params.token, req.usuarioId),
  );

  app.post(
    "/invites/link/:token/accept",
    { schema: { tags, params: ParamToken, response: { 200: DetalheDaCancao } } },
    async (req) => s.aceitarPorToken(db, req.params.token, req.usuarioId),
  );
};
