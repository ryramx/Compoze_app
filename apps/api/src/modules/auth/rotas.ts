import { Cadastro, Erro, Login, ParDeTokens, Renovar, TrocarSenha } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { cadastrar, entrar, renovar, trocarSenha } from "./servico";

export const rotasDeAutenticacao: FastifyPluginAsyncZod = async (app) => {
  const ctx = { db: app.banco.db, config: app.config };
  const tags = ["autenticação"];
  const config = { rateLimit: { max: app.config.LIMITE_AUTH_POR_MINUTO, timeWindow: "1 minute" } };

  app.post(
    "/auth/register",
    { config, schema: { tags, body: Cadastro, response: { 201: ParDeTokens, 409: Erro } } },
    async (req, reply) => reply.status(201).send(await cadastrar(ctx, req.body)),
  );

  app.post(
    "/auth/login",
    { config, schema: { tags, body: Login, response: { 200: ParDeTokens, 401: Erro } } },
    async (req) => entrar(ctx, req.body.email, req.body.password),
  );

  app.post(
    "/auth/refresh",
    { config, schema: { tags, body: Renovar, response: { 200: ParDeTokens, 401: Erro } } },
    async (req) => renovar(ctx, req.body.refresh_token),
  );

  app.post(
    "/auth/password",
    {
      config,
      onRequest: app.autenticar,
      schema: {
        tags,
        summary: "Senha nova para quem está dentro; derruba as outras sessões",
        body: TrocarSenha,
        response: { 200: ParDeTokens, 401: Erro },
      },
    },
    async (req) => trocarSenha(ctx, req.usuarioId, req.body.new_password),
  );
};
