import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Conversas (Fase 4b, ADR 0014). Por enquanto só a dois; a tabela de membros
 * já deixa a porta aberta para grupos (a dupla e o produtor, a banda).
 *
 * `direct_key` é o par de ids em ordem ("a:b"): garante uma conversa só por
 * dupla, mesmo que as duas abram ao mesmo tempo.
 */
export const conversations = pgTable("conversations", {
  id: idPrimario(),
  directKey: text("direct_key").unique(),
  createdAt: quando("created_at").notNull().defaultNow(),
  /** Hora da última mensagem: a lista de conversas ordena por ela. */
  lastMessageAt: quando("last_message_at"),
});

export const conversationMembers = pgTable(
  "conversation_members",
  {
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    /** Até onde a pessoa leu: o que veio depois conta como não lido. */
    lastReadAt: quando("last_read_at"),
    joinedAt: quando("joined_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.conversationId, t.userId] }), index("conversation_members_user_idx").on(t.userId)],
);

export const messages = pgTable(
  "messages",
  {
    id: idPrimario(),
    conversationId: uuid("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    // Conta apagada: a mensagem fica, sem autora, para a conversa não perder o fio.
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    content: text("content").notNull(),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("messages_conversation_idx").on(t.conversationId, t.id),
    check("messages_conteudo_check", sql`length(${t.content}) BETWEEN 1 AND 4000`),
  ],
);
