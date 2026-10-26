import { sql } from "drizzle-orm";
import { boolean, index, pgTable, text } from "drizzle-orm/pg-core";

import { carimbos, citext, idPrimario, ponto } from "./tipos";

export const users = pgTable(
  "users",
  {
    id: idPrimario(),
    name: text("name").notNull(),
    username: citext("username").notNull().unique(),
    email: citext("email").notNull().unique(),
    // argon2id. Nula para quem entrar só por OAuth (fase futura).
    passwordHash: text("password_hash"),
    bio: text("bio"),
    avatarUrl: text("avatar_url"),
    // Capa do perfil (ADR 0021): `/images/{id}`, como a foto.
    coverUrl: text("cover_url"),
    city: text("city"),
    state: text("state"),
    country: text("country"),
    // RN11: nula por padrão; só entra no mapa com `show_on_map` ligado.
    location: ponto("location"),
    showOnMap: boolean("show_on_map").notNull().default(false),
    instruments: text("instruments").array().notNull().default(sql`'{}'`),
    specialties: text("specialties").array().notNull().default(sql`'{}'`),
    genres: text("genres").array().notNull().default(sql`'{}'`),
    externalLinks: text("external_links").array().notNull().default(sql`'{}'`),
    ...carimbos,
  },
  (t) => [
    index("users_location_idx").using("gist", t.location).where(sql`${t.showOnMap}`),
  ],
);
