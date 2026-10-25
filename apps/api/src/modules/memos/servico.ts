import { MEMO_BYTES_MAX, type MemoDeVoz } from "@compoze/contracts";
import { songMemoAudio, songMemos, type Banco } from "@compoze/db";
import { and, desc, eq } from "drizzle-orm";

import { ErroDaApi } from "../../plugins/erros";
import { acessar, exigirEscrita } from "../songs/acesso";

/**
 * Memos de voz (Fase 3c, ADR 0012). Quem vê a canção ouve; quem escreve
 * grava. Apagar ou renomear: quem gravou ou a dona.
 */

type Linha = typeof songMemos.$inferSelect;

const mapear = (l: Linha): MemoDeVoz => ({
  id: l.id,
  song_id: l.songId,
  author_id: l.authorId,
  title: l.title,
  duration_ms: l.durationMs,
  mime_type: l.mimeType,
  size_bytes: l.sizeBytes,
  created_at: l.createdAt.toISOString(),
});

// O que os navegadores e o WebView do Android gravam com MediaRecorder.
const TIPOS = /^audio\/(webm|ogg|mp4|aac|mpeg|x-m4a|wav)$/;

/** `audio/webm;codecs=opus` → `audio/webm`. */
export function tipoBase(contentType: string | undefined): string {
  return (contentType ?? "").split(";")[0]!.trim().toLowerCase();
}

export async function listar(db: Banco, songId: string, usuarioId: string): Promise<MemoDeVoz[]> {
  await acessar(db, songId, usuarioId);
  const linhas = await db.select().from(songMemos).where(eq(songMemos.songId, songId)).orderBy(desc(songMemos.createdAt));
  return linhas.map(mapear);
}

async function doMemo(db: Banco, songId: string, memoId: string): Promise<Linha> {
  const [l] = await db.select().from(songMemos).where(and(eq(songMemos.id, memoId), eq(songMemos.songId, songId)));
  if (!l) throw new ErroDaApi(404, "Memo não encontrado.");
  return l;
}

/**
 * Guarda o memo com o id que o aparelho gerou (ADR 0005). Reenviar o mesmo
 * id devolve o que já está lá: a fila do aparelho pode mandar duas vezes.
 */
export async function guardar(
  db: Banco,
  songId: string,
  memoId: string,
  usuarioId: string,
  audio: { bytes: Buffer; contentType: string | undefined; durationMs: number; title: string },
): Promise<{ memo: MemoDeVoz; novo: boolean }> {
  exigirEscrita(await acessar(db, songId, usuarioId));
  const mimeType = tipoBase(audio.contentType);
  if (!TIPOS.test(mimeType)) throw new ErroDaApi(415, "Formato de áudio não aceito.");
  if (audio.bytes.length === 0) throw new ErroDaApi(422, "O áudio veio vazio.");
  if (audio.bytes.length > MEMO_BYTES_MAX) throw new ErroDaApi(413, "O memo passa de 8 MB.");

  return db.transaction(async (tx) => {
    const [novo] = await tx
      .insert(songMemos)
      .values({
        id: memoId,
        songId,
        authorId: usuarioId,
        title: audio.title,
        durationMs: audio.durationMs,
        mimeType,
        sizeBytes: audio.bytes.length,
      })
      .onConflictDoNothing()
      .returning();
    if (!novo) {
      const [existente] = await tx.select().from(songMemos).where(eq(songMemos.id, memoId));
      // O mesmo id em outra canção, ou de outra pessoa, não é reenvio.
      if (!existente || existente.songId !== songId || existente.authorId !== usuarioId) {
        throw new ErroDaApi(409, "Já existe um memo com este id.");
      }
      return { memo: mapear(existente), novo: false };
    }
    await tx.insert(songMemoAudio).values({ memoId, bytes: audio.bytes });
    return { memo: mapear(novo), novo: true };
  });
}

export async function audio(db: Banco, songId: string, memoId: string, usuarioId: string) {
  await acessar(db, songId, usuarioId);
  const memo = await doMemo(db, songId, memoId);
  const [a] = await db.select().from(songMemoAudio).where(eq(songMemoAudio.memoId, memoId));
  if (!a) throw new ErroDaApi(404, "Memo não encontrado.");
  return { mimeType: memo.mimeType, bytes: Buffer.from(a.bytes) };
}

async function exigirAutoraOuDona(db: Banco, songId: string, memoId: string, usuarioId: string): Promise<Linha> {
  const acesso = await acessar(db, songId, usuarioId);
  exigirEscrita(acesso);
  const memo = await doMemo(db, songId, memoId);
  if (memo.authorId !== usuarioId && acesso.papel !== "OWNER") {
    throw new ErroDaApi(403, "Só quem gravou ou a dona da canção mexe neste memo.");
  }
  return memo;
}

export async function renomear(db: Banco, songId: string, memoId: string, usuarioId: string, title: string) {
  await exigirAutoraOuDona(db, songId, memoId, usuarioId);
  const [l] = await db.update(songMemos).set({ title }).where(eq(songMemos.id, memoId)).returning();
  return mapear(l!);
}

/** Apaga de vez, com o áudio: memo não passa pela lixeira. */
export async function apagar(db: Banco, songId: string, memoId: string, usuarioId: string): Promise<void> {
  await exigirAutoraOuDona(db, songId, memoId, usuarioId);
  await db.delete(songMemos).where(eq(songMemos.id, memoId));
}
