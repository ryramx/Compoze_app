import { idempotencyKeys } from "@compoze/db";
import { and, eq, lt, sql } from "drizzle-orm";
import type { FastifyInstance } from "fastify";
import fp from "fastify-plugin";

import type { Banco } from "@compoze/db";
import { ErroDaApi } from "./erros";

declare module "fastify" {
  interface FastifyRequest {
    /** Chave de idempotência desta escrita, quando a primeira tentativa é esta. */
    chaveIdempotente?: string;
  }
}

const ESCRITAS = new Set(["POST", "PUT", "PATCH", "DELETE"]);
const CHAVE = /^[A-Za-z0-9_.:-]{8,200}$/;

/**
 * `Idempotency-Key` nas escritas autenticadas (ADR 0008).
 *
 * A primeira requisição com uma chave roda normalmente e tem a resposta
 * guardada. Um reenvio com a mesma chave recebe a mesma resposta (com o
 * cabeçalho `Idempotent-Replayed: true`) sem repetir a escrita. Erro 5xx não é
 * guardado: o reenvio tenta de novo de verdade.
 */
export const idempotencia = fp(async (app: FastifyInstance) => {
  app.decorateRequest("chaveIdempotente", undefined);

  // preHandler: depois da autenticação da rota, então `usuarioId` já existe.
  app.addHook("preHandler", async (req, reply) => {
    const chave = req.headers["idempotency-key"];
    if (typeof chave !== "string" || !ESCRITAS.has(req.method) || !req.usuarioId) return;
    if (!CHAVE.test(chave)) throw new ErroDaApi(422, "Idempotency-Key inválida.");

    const { db } = app.banco;
    const [nova] = await db
      .insert(idempotencyKeys)
      .values({ userId: req.usuarioId, key: chave, method: req.method, path: req.url })
      .onConflictDoNothing()
      .returning({ key: idempotencyKeys.key });
    if (nova) {
      req.chaveIdempotente = chave;
      return;
    }

    const [anterior] = await db
      .select()
      .from(idempotencyKeys)
      .where(and(eq(idempotencyKeys.userId, req.usuarioId), eq(idempotencyKeys.key, chave)));
    if (!anterior) throw new ErroDaApi(409, "Requisição igual ainda em andamento. Tente de novo.");
    if (anterior.method !== req.method || anterior.path !== req.url) {
      throw new ErroDaApi(422, "Esta Idempotency-Key já foi usada em outra requisição.");
    }
    if (anterior.status === null) throw new ErroDaApi(409, "Requisição igual ainda em andamento. Tente de novo.");

    reply.code(anterior.status).header("idempotent-replayed", "true");
    if (anterior.body === null) return reply.send();
    return reply.type("application/json; charset=utf-8").send(anterior.body);
  });

  app.addHook("onSend", async (req, reply, payload) => {
    const chave = req.chaveIdempotente;
    if (!chave) return payload;
    const alvo = and(eq(idempotencyKeys.userId, req.usuarioId), eq(idempotencyKeys.key, chave));
    if (reply.statusCode >= 500) {
      await app.banco.db.delete(idempotencyKeys).where(alvo);
    } else {
      const corpo = typeof payload === "string" && payload.length > 0 ? payload : null;
      await app.banco.db.update(idempotencyKeys).set({ status: reply.statusCode, body: corpo }).where(alvo);
    }
    return payload;
  });
});

/** Apaga as chaves com mais de 24 h. Roda junto com o expurgo diário. */
export async function expurgarIdempotencia(db: Banco): Promise<number> {
  const r = await db
    .delete(idempotencyKeys)
    .where(lt(idempotencyKeys.createdAt, sql`now() - interval '24 hours'`))
    .returning({ key: idempotencyKeys.key });
  return r.length;
}
