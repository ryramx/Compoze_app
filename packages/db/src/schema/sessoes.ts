import { index, pgTable, text, uuid } from "drizzle-orm/pg-core";

import { idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Refresh tokens. Guardamos só o hash (SHA-256) do token, nunca o token.
 * Cada login abre uma família; cada renovação gasta o token atual e emite o
 * próximo da mesma família. Se um token já gasto aparecer de novo, alguém o
 * copiou: a família inteira é revogada (detecção de reuso).
 */
export const refreshTokens = pgTable(
  "refresh_tokens",
  {
    id: idPrimario(),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    familyId: uuid("family_id").notNull(),
    tokenHash: text("token_hash").notNull().unique(),
    expiresAt: quando("expires_at").notNull(),
    usedAt: quando("used_at"),
    revokedAt: quando("revoked_at"),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [index("refresh_tokens_family_idx").on(t.familyId), index("refresh_tokens_user_idx").on(t.userId)],
);
