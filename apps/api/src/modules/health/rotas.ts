import { Saude } from "@compoze/contracts";
import type { FastifyPluginAsyncZod } from "fastify-type-provider-zod";

import { VERSAO } from "../../versao";

/** `GET /health`: a API está de pé e alcança o banco? Usado pelo Render e pela CI. */
export const rotasDeSaude: FastifyPluginAsyncZod = async (app) => {
  app.get(
    "/health",
    {
      schema: {
        tags: ["sistema"],
        summary: "Saúde da API e do banco",
        response: { 200: Saude, 503: Saude },
      },
    },
    async (_req, reply) => {
      const inicio = performance.now();
      try {
        const { rows } = await app.banco.pool.query<{ v: string }>("SELECT current_setting('server_version') AS v");
        return {
          status: "ok" as const,
          versao: VERSAO,
          banco: { ok: true, versao: rows[0]?.v ?? null, latencia_ms: Math.round(performance.now() - inicio) },
        };
      } catch (err) {
        app.log.warn({ err }, "banco indisponível");
        return reply.status(503).send({
          status: "degradado",
          versao: VERSAO,
          banco: { ok: false, versao: null, latencia_ms: null },
        });
      }
    },
  );
};
