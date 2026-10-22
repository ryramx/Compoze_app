import { folders, songs, type Banco } from "@compoze/db";
import { and, asc, eq, isNull, sql } from "drizzle-orm";

import { pasta } from "../../lib/mapear";
import { ErroDaApi } from "../../plugins/erros";

const naoEncontrada = () => new ErroDaApi(404, "Pasta não encontrada.");

async function daPessoa(db: Banco, id: string, donaId: string) {
  const [f] = await db
    .select()
    .from(folders)
    .where(and(eq(folders.id, id), eq(folders.ownerId, donaId), isNull(folders.deletedAt)));
  return f;
}

export async function listar(db: Banco, donaId: string) {
  const linhas = await db
    .select()
    .from(folders)
    .where(and(eq(folders.ownerId, donaId), isNull(folders.deletedAt)))
    .orderBy(asc(folders.name));
  return linhas.map(pasta);
}

export async function criar(db: Banco, donaId: string, d: { id?: string; name: string; parent_id?: string | null }) {
  if (d.parent_id && !(await daPessoa(db, d.parent_id, donaId))) throw new ErroDaApi(422, "Pasta de cima não encontrada.");
  const [f] = await db
    .insert(folders)
    .values({ ...(d.id ? { id: d.id } : {}), ownerId: donaId, name: d.name, parentId: d.parent_id ?? null })
    .returning();
  return pasta(f!);
}

export async function atualizar(db: Banco, id: string, donaId: string, p: { name?: string; parent_id?: string | null }) {
  if (!(await daPessoa(db, id, donaId))) throw naoEncontrada();
  if (p.parent_id && !(await daPessoa(db, p.parent_id, donaId))) throw new ErroDaApi(422, "Pasta de cima não encontrada.");
  const mudancas: Partial<typeof folders.$inferInsert> = {};
  if (p.name !== undefined) mudancas.name = p.name;
  // Ciclo (A dentro de uma filha de A) é barrado pelo gatilho do banco → 422.
  if (p.parent_id !== undefined) mudancas.parentId = p.parent_id;
  if (Object.keys(mudancas).length === 0) return pasta((await daPessoa(db, id, donaId))!);
  const [f] = await db.update(folders).set(mudancas).where(eq(folders.id, id)).returning();
  return pasta(f!);
}

/** Nada do que estava dentro some: subpastas sobem um nível e canções ficam sem pasta. */
export async function remover(db: Banco, id: string, donaId: string) {
  const f = await daPessoa(db, id, donaId);
  if (!f) throw naoEncontrada();
  await db.transaction(async (tx) => {
    await tx.update(folders).set({ parentId: f.parentId }).where(eq(folders.parentId, id));
    await tx.update(songs).set({ folderId: null }).where(eq(songs.folderId, id));
    await tx.update(folders).set({ deletedAt: sql`now()`, parentId: null }).where(eq(folders.id, id));
  });
}
