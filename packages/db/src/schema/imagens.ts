import { sql } from "drizzle-orm";
import { check, index, integer, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { bytea, idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Imagens enviadas: foto de perfil e capa de projeto (Fase 4c, ADR 0015).
 * Ficam no próprio Postgres, como o áudio dos memos (ADR 0012), porque um
 * storage S3 pede cartão. O aparelho reduz a imagem antes de subir, então
 * cada uma tem centenas de KB, não MB.
 *
 * `users.avatar_url` e `projects.cover_url` apontam para `/images/{id}`.
 * Imagem que ninguém aponta mais sai no expurgo diário.
 */
export const images = pgTable(
  "images",
  {
    id: idPrimario(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    mimeType: text("mime_type").notNull(),
    sizeBytes: integer("size_bytes").notNull(),
    bytes: bytea("bytes").notNull(),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("images_owner_idx").on(t.ownerId),
    check("images_tamanho_check", sql`${t.sizeBytes} > 0`),
  ],
);
