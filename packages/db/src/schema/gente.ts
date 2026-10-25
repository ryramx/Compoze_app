import { sql } from "drizzle-orm";
import { check, index, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";

import { songs } from "./songs";
import { idPrimario, quando } from "./tipos";
import { users } from "./users";

/**
 * Gente (Fase 4a, ADR 0013): seguir pessoas e o mural. Tudo aqui é público
 * para quem tem conta: seguir não pede aceite, e o mural de alguém aparece
 * no perfil dele. O que é privado continua sendo a canção.
 */

export const follows = pgTable(
  "follows",
  {
    followerId: uuid("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followedId: uuid("followed_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    primaryKey({ columns: [t.followerId, t.followedId] }),
    // Quem me segue: a outra direção da chave primária.
    index("follows_followed_idx").on(t.followedId),
    check("follows_nao_a_si_check", sql`${t.followerId} <> ${t.followedId}`),
  ],
);

/** Publicação no mural. Pode citar uma canção que não seja privada. */
export const posts = pgTable(
  "posts",
  {
    id: idPrimario(),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    // Se a canção for apagada de vez, o post fica, sem ela.
    songId: uuid("song_id").references(() => songs.id, { onDelete: "set null" }),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    // O mural lê por autora, do mais novo ao mais antigo (UUID v7 é ordenado no tempo).
    index("posts_author_idx").on(t.authorId, t.id),
    check("posts_conteudo_check", sql`length(${t.content}) BETWEEN 1 AND 1000`),
  ],
);

export const postLikes = pgTable(
  "post_likes",
  {
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [primaryKey({ columns: [t.postId, t.userId] })],
);

export const postComments = pgTable(
  "post_comments",
  {
    id: idPrimario(),
    postId: uuid("post_id").notNull().references(() => posts.id, { onDelete: "cascade" }),
    authorId: uuid("author_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    content: text("content").notNull(),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [
    index("post_comments_post_idx").on(t.postId, t.id),
    check("post_comments_conteudo_check", sql`length(${t.content}) BETWEEN 1 AND 500`),
  ],
);
