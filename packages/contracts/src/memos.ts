import { z } from "zod";

import { DataHora, Id } from "./comum";

/**
 * Memos de voz da canção (Fase 3c, ADR 0012). O áudio sobe cru
 * (`PUT /songs/{id}/memos/{memo_id}` com `Content-Type: audio/...`) e desce
 * por `GET .../audio`; aqui ficam só os dados de cada memo.
 */

/** Teto de um memo: uns 10 minutos em Opus, 4 a 5 em AAC. */
export const MEMO_BYTES_MAX = 8 * 1024 * 1024;
export const MEMO_TITULO_MAX = 120;

export const MemoDeVoz = z.object({
  id: Id,
  song_id: Id,
  author_id: Id.nullable(),
  title: z.string(),
  duration_ms: z.number().int(),
  mime_type: z.string(),
  size_bytes: z.number().int(),
  created_at: DataHora,
});
export type MemoDeVoz = z.infer<typeof MemoDeVoz>;

/** Dados que acompanham o áudio no PUT, pela query string. */
export const DadosDoMemo = z.object({
  duration_ms: z.coerce.number().int().min(0).max(60 * 60 * 1000),
  title: z.string().trim().max(MEMO_TITULO_MAX).default(""),
});

export const AtualizarMemo = z.object({
  title: z.string().trim().max(MEMO_TITULO_MAX),
});
