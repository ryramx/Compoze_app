import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { songs } from "./songs";
import { bytea, idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Memos de voz da canção (Fase 3c, ADR 0012): a melodia cantarolada no
 * corredor, o riff gravado no celular. Gravados no aparelho, sobem quando há
 * rede, e quem escreve na canção ouve.
 *
 * O áudio fica numa tabela à parte (`song_memo_audio`): listar memos não lê
 * bytes, e trocar o lugar do áudio por um storage S3 depois mexe só nela.
 */
export const songMemos = pgTable(
  "song_memos",
  {
    id: idPrimario(),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    title: text("title").notNull().default(""),
    durationMs: integer("duration_ms").notNull(),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("song_memos_song_idx").on(t.songId, t.createdAt),
    check("song_memos_duracao_check", sql`${t.durationMs} >= 0`),
    check("song_memos_tamanho_check", sql`${t.sizeBytes} > 0`),
  ],
);

export const songMemoAudio = pgTable("song_memo_audio", {
  memoId: uuid("memo_id").primaryKey().references(() => songMemos.id, { onDelete: "cascade" }),
  bytes: bytea("bytes").notNull(),
});
