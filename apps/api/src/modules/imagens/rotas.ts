import { DetalheDoProjeto, Id, IMAGEM_BYTES_MAX, UsuarioEu } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import * as s from "./servico";

const corpo = (b: unknown) => (Buffer.isBuffer(b) ? b : Buffer.alloc(0));

export const rotasDeImagens: FastifyPluginAsyncZod = async (app) => {
  const db = app.banco.db;
  const tags = ["imagens"];

  // A imagem sobe crua, sem multipart. O tipo de verdade sai dos bytes.
  app.addContentTypeParser(/^image\//, { parseAs: "buffer", bodyLimit: IMAGEM_BYTES_MAX }, (_req, b, pronto) => pronto(null, b));

  // Pública: `<img src>` não manda o token. O id (UUIDv7, 74 bits aleatórios)
  // não se adivinha, e só aparece para quem já vê o perfil ou o projeto.
  app.get(
    "/images/:id",
    { schema: { tags, summary: "Os bytes de uma imagem enviada", security: [], params: z.object({ id: Id }) } },
    async (req, reply) => {
      const { mimeType, bytes } = await s.ler(db, req.params.id);
      return reply
        .type(mimeType)
        // Imagem não muda: trocar a foto gera outro id.
        .header("cache-control", "public, max-age=31536000, immutable")
        // O helmet põe same-origin; o front mora em outro domínio.
        .header("cross-origin-resource-policy", "cross-origin")
        .send(bytes);
    },
  );

  const privado = { onRequest: app.autenticar };
  const projeto = z.object({ id: Id });

  app.put(
    "/users/me/avatar",
    { ...privado, schema: { tags, summary: "Trocar a foto de perfil (corpo: a imagem)", response: { 200: UsuarioEu } } },
    async (req) => s.trocarImagemDoPerfil(db, req.usuarioId, "avatar", corpo(req.body)),
  );
  app.delete(
    "/users/me/avatar",
    { ...privado, schema: { tags, summary: "Tirar a foto de perfil", response: { 200: UsuarioEu } } },
    async (req) => s.trocarImagemDoPerfil(db, req.usuarioId, "avatar", null),
  );
  app.put(
    "/users/me/cover",
    { ...privado, schema: { tags, summary: "Trocar a capa do perfil (corpo: a imagem)", response: { 200: UsuarioEu } } },
    async (req) => s.trocarImagemDoPerfil(db, req.usuarioId, "capa", corpo(req.body)),
  );
  app.delete(
    "/users/me/cover",
    { ...privado, schema: { tags, summary: "Tirar a capa do perfil", response: { 200: UsuarioEu } } },
    async (req) => s.trocarImagemDoPerfil(db, req.usuarioId, "capa", null),
  );
  app.put(
    "/projects/:id/cover",
    { ...privado, schema: { tags, summary: "Trocar a capa do projeto (corpo: a imagem)", params: projeto, response: { 200: DetalheDoProjeto } } },
    async (req) => s.trocarCapa(db, req.params.id, req.usuarioId, corpo(req.body)),
  );
  app.delete(
    "/projects/:id/cover",
    { ...privado, schema: { tags, summary: "Voltar à capa tipográfica", params: projeto, response: { 200: DetalheDoProjeto } } },
    async (req) => s.trocarCapa(db, req.params.id, req.usuarioId, null),
  );
};
