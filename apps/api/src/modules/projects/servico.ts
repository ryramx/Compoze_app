import type { AtualizarProjeto } from "@compoze/contracts";
import { projects, projectSongs, type Banco } from "@compoze/db";
import { and, asc, desc, eq, inArray, isNull, sql } from "drizzle-orm";

import { detalheDoProjeto } from "../../lib/mapear";
import { ErroDaApi } from "../../plugins/erros";
import { acessar } from "../songs/acesso";

const naoEncontrado = () => new ErroDaApi(404, "Projeto não encontrado.");

async function daPessoa(db: Banco, id: string, donaId: string) {
  const [p] = await db.select().from(projects).where(and(eq(projects.id, id), eq(projects.ownerId, donaId)));
  if (!p) throw naoEncontrado();
  return p;
}

async function detalhe(db: Banco, p: typeof projects.$inferSelect) {
  const faixas = await db
    .select({ songId: projectSongs.songId, trackNumber: projectSongs.trackNumber })
    .from(projectSongs)
    .where(and(eq(projectSongs.projectId, p.id), isNull(projectSongs.deletedAt)))
    .orderBy(asc(projectSongs.trackNumber));
  return detalheDoProjeto(p, faixas);
}

export async function listar(db: Banco, donaId: string) {
  const linhas = await db
    .select()
    .from(projects)
    .where(and(eq(projects.ownerId, donaId), isNull(projects.deletedAt)))
    .orderBy(desc(projects.updatedAt));
  // Já com as faixas: a tela de projetos mostra a contagem sem buscar um a um.
  const ids = linhas.map((p) => p.id);
  const faixas = ids.length
    ? await db
        .select({ projectId: projectSongs.projectId, songId: projectSongs.songId, trackNumber: projectSongs.trackNumber })
        .from(projectSongs)
        .where(and(inArray(projectSongs.projectId, ids), isNull(projectSongs.deletedAt)))
        .orderBy(asc(projectSongs.trackNumber))
    : [];
  return linhas.map((p) => detalheDoProjeto(p, faixas.filter((f) => f.projectId === p.id)));
}

function camposDoProjeto(p: AtualizarProjeto): Partial<typeof projects.$inferInsert> {
  const m: Partial<typeof projects.$inferInsert> = {};
  if (p.name !== undefined) m.name = p.name;
  if (p.type !== undefined) m.type = p.type;
  if (p.style !== undefined) m.style = p.style;
  if (p.status !== undefined) m.status = p.status;
  if (p.description !== undefined) m.description = p.description;
  if (p.release_date !== undefined) m.releaseDate = p.release_date;
  if (p.estimated_cost !== undefined) m.estimatedCost = p.estimated_cost;
  if (p.funding_target !== undefined) m.fundingTarget = p.funding_target;
  return m;
}

export async function criar(db: Banco, donaId: string, d: AtualizarProjeto & { id?: string; name: string }) {
  const [p] = await db
    .insert(projects)
    .values({ ...camposDoProjeto(d), ...(d.id ? { id: d.id } : {}), name: d.name, ownerId: donaId })
    .returning();
  return detalhe(db, p!);
}

export async function obter(db: Banco, id: string, donaId: string) {
  return detalhe(db, await daPessoa(db, id, donaId));
}

export async function atualizar(db: Banco, id: string, donaId: string, d: AtualizarProjeto) {
  const atual = await daPessoa(db, id, donaId);
  const mudancas = camposDoProjeto(d);
  if (Object.keys(mudancas).length === 0) return detalhe(db, atual);
  const [p] = await db.update(projects).set(mudancas).where(eq(projects.id, id)).returning();
  return detalhe(db, p!);
}

/** Lixeira. As canções do projeto não vão junto. */
export async function remover(db: Banco, id: string, donaId: string) {
  const p = await daPessoa(db, id, donaId);
  if (!p.deletedAt) await db.update(projects).set({ deletedAt: sql`now()` }).where(eq(projects.id, id));
}

export async function restaurar(db: Banco, id: string, donaId: string) {
  const p = await daPessoa(db, id, donaId);
  if (!p.deletedAt) return detalhe(db, p);
  const [r] = await db.update(projects).set({ deletedAt: null }).where(eq(projects.id, id)).returning();
  return detalhe(db, r!);
}

export async function adicionarFaixa(db: Banco, id: string, donaId: string, d: { song_id: string; track_number?: number }) {
  const p = await daPessoa(db, id, donaId);
  if (p.deletedAt) throw new ErroDaApi(409, "O projeto está na lixeira. Restaure antes de mexer nas faixas.");
  // Só entra canção que a pessoa pode ver (404 igual ao das canções).
  await acessar(db, d.song_id, donaId);

  await db.transaction(async (tx) => {
    await tx.execute(sql`SELECT 1 FROM ${projects} WHERE ${projects.id} = ${id} FOR UPDATE`);
    const [existente] = await tx
      .select()
      .from(projectSongs)
      .where(and(eq(projectSongs.projectId, id), eq(projectSongs.songId, d.song_id)));
    if (existente && !existente.deletedAt) return;

    const [{ ultima }] = (await tx
      .select({ ultima: sql<number>`coalesce(max(${projectSongs.trackNumber}), 0)::int` })
      .from(projectSongs)
      .where(and(eq(projectSongs.projectId, id), isNull(projectSongs.deletedAt)))) as [{ ultima: number }];
    const numero = d.track_number ?? ultima + 1;

    if (existente) {
      await tx
        .update(projectSongs)
        .set({ deletedAt: null, trackNumber: numero })
        .where(and(eq(projectSongs.projectId, id), eq(projectSongs.songId, d.song_id)));
    } else {
      await tx.insert(projectSongs).values({ projectId: id, songId: d.song_id, trackNumber: numero });
    }
    await tx.update(projects).set({ updatedAt: sql`now()` }).where(eq(projects.id, id));
  });
  return obter(db, id, donaId);
}

export async function removerFaixa(db: Banco, id: string, donaId: string, songId: string) {
  await daPessoa(db, id, donaId);
  const [r] = await db
    .update(projectSongs)
    .set({ deletedAt: sql`now()` })
    .where(and(eq(projectSongs.projectId, id), eq(projectSongs.songId, songId), isNull(projectSongs.deletedAt)))
    .returning({ songId: projectSongs.songId });
  if (!r) throw new ErroDaApi(404, "Essa canção não é faixa do projeto.");
}
