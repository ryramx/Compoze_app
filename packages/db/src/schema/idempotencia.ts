import { index, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { quando } from "./tipos";
import { users } from "./users";

/**
 * Respostas já dadas a escritas com `Idempotency-Key` (ADR 0008). O aparelho
 * reenvia a fila de escritas depois de uma queda sem saber se a primeira
 * tentativa chegou; a chave faz o reenvio devolver a mesma resposta em vez de
 * repetir a escrita. `status` nulo: a primeira tentativa ainda está rodando.
 * Guardadas por 24 h.
 */
export const idempotencyKeys = pgTable(
  "idempotency_keys",
  {
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    key: text("key").notNull(),
    method: text("method").notNull(),
    path: text("path").notNull(),
    status: integer("status"),
    body: text("body"),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.userId, t.key] }), index("idempotency_keys_created_idx").on(t.createdAt)],
);
