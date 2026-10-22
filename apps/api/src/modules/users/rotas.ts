import { AtualizarEu, Id, UsuarioEu, UsuarioNoMapa, UsuarioPublico } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";
import { z } from "zod";

import { atualizarEu, eu, noMapa, porIds, porUsername } from "./servico";

export const rotasDePessoas: FastifyPluginAsyncZod = async (app) => {
  app.addHook("onRequest", app.autenticar);
  const db = app.banco.db;
  const tags = ["pessoas"];

  app.get("/users/me", { schema: { tags, response: { 200: UsuarioEu } } }, async (req) => eu(db, req.usuarioId));

  app.patch(
    "/users/me",
    { schema: { tags, body: AtualizarEu, response: { 200: UsuarioEu } } },
    async (req) => atualizarEu(db, req.usuarioId, req.body),
  );

  app.get(
    "/users",
    {
      schema: {
        tags,
        querystring: z.object({
          ids: z
            .string()
            // Ids desconhecidos ou malformados são omitidos, como diz o contrato.
            .transform((s) => [...new Set(s.split(",").map((x) => x.trim()))].filter((x) => Id.safeParse(x).success))
            .pipe(z.array(Id).max(100, "No máximo 100 ids por consulta.")),
        }),
        response: { 200: z.array(UsuarioPublico) },
      },
    },
    async (req) => porIds(db, req.query.ids),
  );

  app.get(
    "/users/:username",
    { schema: { tags, params: z.object({ username: z.string().min(1).max(30) }), response: { 200: UsuarioPublico } } },
    async (req) => porUsername(db, req.params.username),
  );

  app.get(
    "/map/people",
    { schema: { tags: ["mapa"], response: { 200: z.array(UsuarioNoMapa) } } },
    async () => noMapa(db),
  );
};
