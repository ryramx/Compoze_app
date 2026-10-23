import { sql } from "drizzle-orm";
import { check, index, pgTable, text, uniqueIndex, uuid } from "drizzle-orm/pg-core";

import { collaboratorRole } from "./enums";
import { songs } from "./songs";
import { citext, idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Convites para escrever numa canção (ADR 0010). Dois jeitos:
 *
 * - **Pela conta** (`invited_user_id`): a pessoa vê o convite no app e aceita
 *   ou recusa. Ninguém entra numa canção sem querer.
 * - **Por link** (`token_hash`): para quem ainda não tem conta. Quem abrir o
 *   link e entrar aceita; o link vale uma vez. Só o hash do token fica aqui,
 *   então quem lê o banco não consegue usar os links.
 *
 * Um convite está pendente enquanto não foi aceito, recusado nem revogado, e
 * `expires_at` não passou.
 */
export const songInvites = pgTable(
  "song_invites",
  {
    id: idPrimario(),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    role: collaboratorRole("role").notNull(),
    invitedUserId: uuid("invited_user_id").references(() => users.id, { onDelete: "cascade" }),
    tokenHash: text("token_hash"),
    /** Para onde o link foi mandado, se foi por e-mail. */
    email: citext("email"),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: quando("created_at").notNull().defaultNow(),
    expiresAt: quando("expires_at").notNull(),
    acceptedBy: uuid("accepted_by").references(() => users.id, { onDelete: "set null" }),
    acceptedAt: quando("accepted_at"),
    declinedAt: quando("declined_at"),
    revokedAt: quando("revoked_at"),
  },
  (t) => [
    // Ou é pela conta, ou é por link: nunca os dois, nunca nenhum.
    check("song_invites_tipo_check", sql`(${t.invitedUserId} IS NULL) <> (${t.tokenHash} IS NULL)`),
    uniqueIndex("song_invites_token_idx").on(t.tokenHash),
    // Um convite aberto por pessoa e canção.
    uniqueIndex("song_invites_pendente_idx")
      .on(t.songId, t.invitedUserId)
      .where(sql`${t.acceptedAt} IS NULL AND ${t.declinedAt} IS NULL AND ${t.revokedAt} IS NULL`),
    index("song_invites_convidada_idx").on(t.invitedUserId),
    index("song_invites_song_idx").on(t.songId),
  ],
);
