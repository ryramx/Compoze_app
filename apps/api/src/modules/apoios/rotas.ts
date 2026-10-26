import { Apoio, ApoioComPix, ApoioRecebido, Id, NovoApoio, NovoPixDoProjeto, PixDoProjeto, ProjetoParaApoiar } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const ParamProjeto = z.object({ id: Id });
const ParamApoio = z.object({ id: Id, apoio_id: Id });

export const rotasDeApoios: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["apoios"];

  // ------------------------------------------------------------ a dona

  app.get(
    "/projects/:id/pix",
    { schema: { tags, summary: "A chave PIX do projeto (só a dona)", params: ParamProjeto, response: { 200: PixDoProjeto.nullable() } } },
    async (req) => s.pixDoProjeto(db, req.params.id, req.usuarioId),
  );

  app.put(
    "/projects/:id/pix",
    { schema: { tags, summary: "Cadastrar ou trocar a chave PIX", params: ParamProjeto, body: NovoPixDoProjeto, response: { 200: PixDoProjeto } } },
    async (req) => s.definirPix(db, req.params.id, req.usuarioId, req.body),
  );

  app.delete("/projects/:id/pix", { schema: { tags, summary: "Parar de receber apoio", params: ParamProjeto } }, async (req, reply) => {
    await s.removerPix(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  app.get(
    "/projects/:id/contributions",
    { schema: { tags, summary: "Apoios para conferir e já decididos", params: ParamProjeto, response: { 200: z.array(ApoioRecebido) } } },
    async (req) => s.recebidos(db, req.params.id, req.usuarioId),
  );

  for (const [acao, status] of [["confirm", "CONFIRMADO"], ["refuse", "RECUSADO"]] as const) {
    app.post(
      `/projects/:id/contributions/:apoio_id/${acao}`,
      {
        schema: {
          tags,
          summary: acao === "confirm" ? "Confirmar: o dinheiro chegou" : "Recusar: o dinheiro não chegou",
          params: ParamApoio,
          response: { 200: ApoioRecebido },
        },
      },
      async (req) => {
        const r = await s.decidir(db, req.params.id, req.params.apoio_id, req.usuarioId, status);
        if (r.aviso) void app.avisador.avisar(r.aviso.para, r.aviso.aviso);
        return r.apoio;
      },
    );
  }

  // ------------------------------------------------------- quem apoia

  app.get(
    "/support/:id",
    { schema: { tags, summary: "O projeto, para quem vai apoiar", params: ParamProjeto, response: { 200: ProjetoParaApoiar } } },
    async (req) => s.paraApoiar(db, req.params.id),
  );

  app.post(
    "/support/:id/contributions",
    { schema: { tags, summary: "Gerar o PIX de um apoio", params: ParamProjeto, body: NovoApoio, response: { 201: ApoioComPix } } },
    async (req, reply) => reply.status(201).send(await s.apoiar(db, req.params.id, req.usuarioId, req.body)),
  );

  app.get(
    "/support/:id/contributions",
    { schema: { tags, summary: "Os meus apoios a este projeto", params: ParamProjeto, response: { 200: z.array(Apoio) } } },
    async (req) => s.meus(db, req.params.id, req.usuarioId),
  );

  app.post(
    "/support/:id/contributions/:apoio_id/paid",
    { schema: { tags, summary: "Avisar que pagou", params: ParamApoio, response: { 200: Apoio } } },
    async (req) => {
      const r = await s.avisarPago(db, req.params.id, req.params.apoio_id, req.usuarioId);
      if (r.aviso) void app.avisador.avisar(r.aviso.para, r.aviso.aviso);
      return r.apoio;
    },
  );
};
