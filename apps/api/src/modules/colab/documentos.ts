import { TIPOS_DE_BLOCO } from "@compoze/contracts";
import { lerBlocos, semear, Y, type BlocoDoDocumento } from "@compoze/documento";
import { songBlocks, songCollaborators, songDocuments, songs, type Banco } from "@compoze/db";
import { and, asc, eq, inArray, isNull, notInArray, sql } from "drizzle-orm";

/**
 * Persistência do documento Yjs de cada canção (ADR 0007).
 *
 * `song_documents.ydoc` guarda o estado completo. `song_blocks` é a projeção
 * dele em linhas, refeita a cada gravação, para que busca, listagens e o
 * contrato REST continuem lendo blocos como sempre.
 */

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TIPOS = new Set<string>(TIPOS_DE_BLOCO);

/**
 * Abre o documento de uma canção: o estado salvo ou, na primeira vez, um
 * documento semeado com os blocos que já estavam no banco.
 */
export async function carregarDocumento(db: Banco, songId: string, doc: Y.Doc): Promise<void> {
  const [salvo] = await db.select({ ydoc: songDocuments.ydoc }).from(songDocuments).where(eq(songDocuments.songId, songId));
  if (salvo) {
    Y.applyUpdate(doc, new Uint8Array(salvo.ydoc));
    return;
  }
  const linhas = await db.select().from(songBlocks).where(eq(songBlocks.songId, songId)).orderBy(asc(songBlocks.position));
  semear(
    doc,
    linhas.map((b) => ({ id: b.id, type: b.type, label: b.label, content: b.content, author_id: b.authorId })),
  );
}

/** Blocos que podem virar linha: id em UUID, tipo conhecido, sem repetição. */
function validos(blocos: BlocoDoDocumento[]): BlocoDoDocumento[] {
  const vistos = new Set<string>();
  return blocos.filter((b) => {
    if (!UUID.test(b.id) || !TIPOS.has(b.type) || vistos.has(b.id)) return false;
    vistos.add(b.id);
    return true;
  });
}

/**
 * Grava o documento e refaz a projeção em `song_blocks`, numa transação.
 * Devolve `false` se a canção não existe mais (apagada de vez enquanto o
 * documento estava aberto): não há o que gravar.
 */
export async function gravarDocumento(db: Banco, songId: string, doc: Y.Doc): Promise<boolean> {
  const estado = Buffer.from(Y.encodeStateAsUpdate(doc));
  const candidatos = validos(lerBlocos(doc));

  return db.transaction(async (tx) => {
    const [cancao] = await tx.execute<{ id: string }>(sql`SELECT id FROM ${songs} WHERE ${songs.id} = ${songId} FOR UPDATE`).then((r) => r.rows);
    if (!cancao) return false;

    await tx
      .insert(songDocuments)
      .values({ songId, ydoc: estado })
      .onConflictDoUpdate({ target: songDocuments.songId, set: { ydoc: estado, updatedAt: sql`now()` } });

    // Autoria só aceita quem é da canção: um id qualquer vira "sem autora".
    const membros = new Set(
      (
        await tx
          .select({ id: songCollaborators.userId })
          .from(songCollaborators)
          .where(and(eq(songCollaborators.songId, songId), isNull(songCollaborators.deletedAt)))
      ).map((m) => m.id),
    );

    const atuais = new Map(
      (await tx.select().from(songBlocks).where(eq(songBlocks.songId, songId))).map((b) => [b.id, b]),
    );
    // Um id de bloco que já pertence a outra canção não é projetado aqui: fica
    // só no documento, sem tomar a linha da outra canção.
    const deOutra = candidatos.length
      ? new Set(
          (
            await tx
              .select({ id: songBlocks.id })
              .from(songBlocks)
              .where(and(inArray(songBlocks.id, candidatos.map((b) => b.id)), sql`${songBlocks.songId} <> ${songId}`))
          ).map((b) => b.id),
        )
      : new Set<string>();
    const blocos = candidatos.filter((b) => !deOutra.has(b.id));
    const ids = blocos.map((b) => b.id);
    let mudou = false;

    const removidos = await tx
      .delete(songBlocks)
      .where(and(eq(songBlocks.songId, songId), ids.length ? notInArray(songBlocks.id, ids) : sql`true`))
      .returning({ id: songBlocks.id });
    if (removidos.length) mudou = true;

    // A restrição (song_id, position) é verificada no fim da transação, então
    // as posições podem trocar de lugar livremente aqui dentro.
    for (const [position, b] of blocos.entries()) {
      const atual = atuais.get(b.id);
      if (!atual) {
        await tx.insert(songBlocks).values({
          id: b.id,
          songId,
          type: b.type,
          label: b.label,
          content: b.content,
          position,
          authorId: b.author_id && membros.has(b.author_id) ? b.author_id : null,
        });
        mudou = true;
      } else if (
        atual.position !== position ||
        atual.content !== b.content ||
        atual.label !== b.label ||
        atual.type !== b.type
      ) {
        await tx
          .update(songBlocks)
          .set({ position, content: b.content, label: b.label, type: b.type })
          .where(eq(songBlocks.id, b.id));
        mudou = true;
      }
    }

    if (mudou) await tx.update(songs).set({ updatedAt: sql`now()` }).where(eq(songs.id, songId));
    return true;
  });
}
