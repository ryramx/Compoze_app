import { projects, songs, type Banco } from "@compoze/db";
import { and, isNotNull, lt, sql } from "drizzle-orm";
import { PgBoss } from "pg-boss";
import type { FastifyBaseLogger } from "fastify";

import { expurgarIdempotencia } from "../../plugins/idempotencia";
import { RETENCAO_DIAS } from "../songs/servico";

/**
 * RN08: apaga de vez canções e projetos que estão na lixeira há mais de
 * 30 dias. Blocos, coautores, versões e faixas vão junto (ON DELETE CASCADE).
 */
export async function expurgarLixeira(db: Banco): Promise<{ cancoes: number; projetos: number }> {
  const limite = sql`now() - make_interval(days => ${RETENCAO_DIAS})`;
  const cancoes = await db
    .delete(songs)
    .where(and(isNotNull(songs.deletedAt), lt(songs.deletedAt, limite)))
    .returning({ id: songs.id });
  const projetos = await db
    .delete(projects)
    .where(and(isNotNull(projects.deletedAt), lt(projects.deletedAt, limite)))
    .returning({ id: projects.id });
  return { cancoes: cancoes.length, projetos: projetos.length };
}

const FILA = "expurgo-da-lixeira";

/**
 * Agenda o expurgo todo dia às 3h (horário de Brasília) com pg-boss, a fila
 * sobre o próprio Postgres. Com várias instâncias da API, o pg-boss garante
 * que só uma roda o job.
 */
export async function agendarExpurgo(url: string, db: Banco, log: FastifyBaseLogger): Promise<PgBoss> {
  const boss = new PgBoss(url);
  boss.on("error", (err) => log.error({ err }, "pg-boss"));
  await boss.start();
  await boss.createQueue(FILA);
  await boss.schedule(FILA, "0 3 * * *", null, { tz: "America/Sao_Paulo" });
  await boss.work(FILA, async () => {
    const r = await expurgarLixeira(db);
    log.info(r, "lixeira expurgada (RN08)");
    log.info({ chaves: await expurgarIdempotencia(db) }, "chaves de idempotência vencidas apagadas");
  });
  return boss;
}
