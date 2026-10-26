import {
  Comentario,
  ConsultaDoMural,
  Id,
  NovaPublicacao,
  NovoComentario,
  PaginaDoMural,
  PerfilPublico,
  Publicacao,
  UsuarioPublico,
} from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { avisoDeSeguidor } from "../avisos/servico";
import * as s from "./servico";

const ParamPessoa = z.object({ id: Id });
const ParamPost = z.object({ id: Id });
const ParamComentario = z.object({ id: Id, comment_id: Id });

export const rotasDeGente: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const pessoas = ["pessoas"];
  const mural = ["mural"];

  // ------------------------------------------------------------- seguir
  app.get(
    "/profiles/:username",
    {
      schema: {
        tags: pessoas,
        summary: "Perfil com seguidores e se eu sigo",
        params: z.object({ username: z.string().min(1).max(30) }),
        response: { 200: PerfilPublico },
      },
    },
    async (req) => s.perfil(db, req.params.username, req.usuarioId),
  );

  app.put(
    "/users/:id/follow",
    { schema: { tags: pessoas, summary: "Seguir (de novo não faz nada)", params: ParamPessoa } },
    async (req, reply) => {
      if (await s.seguir(db, req.usuarioId, req.params.id)) {
        void app.avisador.avisarDepois(avisoDeSeguidor(db, req.usuarioId, req.params.id));
      }
      return reply.status(204).send();
    },
  );

  app.delete("/users/:id/follow", { schema: { tags: pessoas, params: ParamPessoa } }, async (req, reply) => {
    await s.deixarDeSeguir(db, req.usuarioId, req.params.id);
    return reply.status(204).send();
  });

  app.get(
    "/users/:id/followers",
    { schema: { tags: pessoas, params: ParamPessoa, response: { 200: z.array(UsuarioPublico) } } },
    async (req) => s.lista(db, req.params.id, "seguidores"),
  );

  app.get(
    "/users/:id/following",
    { schema: { tags: pessoas, params: ParamPessoa, response: { 200: z.array(UsuarioPublico) } } },
    async (req) => s.lista(db, req.params.id, "seguindo"),
  );

  app.get(
    "/suggestions/people",
    { schema: { tags: pessoas, summary: "Quem escreve comigo e eu ainda não sigo", response: { 200: z.array(UsuarioPublico) } } },
    async (req) => s.sugestoes(db, req.usuarioId),
  );

  // -------------------------------------------------------------- mural
  app.get(
    "/feed",
    { schema: { tags: mural, summary: "Mural: eu e quem eu sigo, ou uma pessoa (?author_id=)", querystring: ConsultaDoMural, response: { 200: PaginaDoMural } } },
    async (req) => s.mural(db, req.usuarioId, req.query),
  );

  app.post(
    "/posts",
    { schema: { tags: mural, body: NovaPublicacao, response: { 200: Publicacao, 201: Publicacao } } },
    async (req, reply) => {
      const { post, nova } = await s.publicar(db, req.usuarioId, req.body);
      return reply.status(nova ? 201 : 200).send(post);
    },
  );

  app.get("/posts/:id", { schema: { tags: mural, params: ParamPost, response: { 200: Publicacao } } }, async (req) =>
    s.obterPublicacao(db, req.params.id, req.usuarioId),
  );

  app.delete("/posts/:id", { schema: { tags: mural, params: ParamPost } }, async (req, reply) => {
    await s.apagarPublicacao(db, req.params.id, req.usuarioId);
    return reply.status(204).send();
  });

  app.put("/posts/:id/like", { schema: { tags: mural, params: ParamPost, response: { 200: Publicacao } } }, async (req) =>
    s.curtir(db, req.params.id, req.usuarioId, true),
  );

  app.delete("/posts/:id/like", { schema: { tags: mural, params: ParamPost, response: { 200: Publicacao } } }, async (req) =>
    s.curtir(db, req.params.id, req.usuarioId, false),
  );

  app.get(
    "/posts/:id/comments",
    { schema: { tags: mural, params: ParamPost, response: { 200: z.array(Comentario) } } },
    async (req) => s.comentarios(db, req.params.id, req.usuarioId),
  );

  app.post(
    "/posts/:id/comments",
    { schema: { tags: mural, params: ParamPost, body: NovoComentario, response: { 201: Comentario } } },
    async (req, reply) => reply.status(201).send(await s.comentar(db, req.params.id, req.usuarioId, req.body)),
  );

  app.delete("/posts/:id/comments/:comment_id", { schema: { tags: mural, params: ParamComentario } }, async (req, reply) => {
    await s.apagarComentario(db, req.params.id, req.params.comment_id, req.usuarioId);
    return reply.status(204).send();
  });
};
