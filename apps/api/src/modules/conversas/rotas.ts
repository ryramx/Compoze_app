import { ConsultaDeMensagens, Conversa, Id, Mensagem, NovaConversa, NovaMensagem, PaginaDeMensagens } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const ParamConversa = z.object({ id: Id });
// Proxies (o do Render inclusive) derrubam conexão parada; um comentário a
// cada 25 s mantém o fluxo vivo.
const PULSO_MS = 25_000;

export const rotasDeConversas: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["conversas"];

  app.get("/conversations", { schema: { tags, response: { 200: z.array(Conversa) } } }, async (req) => s.listar(db, req.usuarioId));

  app.post(
    "/conversations",
    { schema: { tags, summary: "Abre a conversa com a pessoa (ou devolve a que já existe)", body: NovaConversa, response: { 200: Conversa, 201: Conversa } } },
    async (req, reply) => {
      const { conversa, nova } = await s.abrir(db, req.usuarioId, req.body.user_id);
      return reply.status(nova ? 201 : 200).send(conversa);
    },
  );

  app.get("/conversations/:id", { schema: { tags, params: ParamConversa, response: { 200: Conversa } } }, async (req) =>
    s.obter(db, req.params.id, req.usuarioId),
  );

  app.get(
    "/conversations/:id/messages",
    { schema: { tags, params: ParamConversa, querystring: ConsultaDeMensagens, response: { 200: PaginaDeMensagens } } },
    async (req) => s.mensagens(db, req.params.id, req.usuarioId, req.query),
  );

  app.post(
    "/conversations/:id/messages",
    { schema: { tags, params: ParamConversa, body: NovaMensagem, response: { 200: Mensagem, 201: Mensagem } } },
    async (req, reply) => {
      const { mensagem, nova } = await s.enviar(db, app.aoVivo, req.params.id, req.usuarioId, req.body);
      return reply.status(nova ? 201 : 200).send(mensagem);
    },
  );

  app.post("/conversations/:id/read", { schema: { tags, params: ParamConversa } }, async (req, reply) => {
    await s.marcarLida(db, app.aoVivo, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  // Fluxo ao vivo (Server-Sent Events). O app abre com fetch, para mandar o
  // token no cabeçalho, o que o EventSource do navegador não deixa.
  app.get("/events", { schema: { tags, summary: "Eventos ao vivo (text/event-stream): mensagens e leituras" } }, (req, reply) => {
    reply.hijack();
    const res = reply.raw;
    res.writeHead(200, {
      ...(reply.getHeaders() as Record<string, string>),
      "content-type": "text/event-stream; charset=utf-8",
      "cache-control": "no-cache, no-transform",
      connection: "keep-alive",
      // Sem isto, proxies com buffer seguram os eventos.
      "x-accel-buffering": "no",
    });
    res.write(": conectado\n\n");
    const parar = app.aoVivo.ouvir(req.usuarioId, (e) => res.write(`event: ${e.type}\ndata: ${JSON.stringify(e)}\n\n`));
    const pulso = setInterval(() => res.write(": pulso\n\n"), PULSO_MS);
    const fechar = () => {
      clearInterval(pulso);
      parar();
      app.aoVivoFechar.delete(fechar);
      res.end();
    };
    app.aoVivoFechar.add(fechar);
    req.raw.on("close", fechar);
  });
};
