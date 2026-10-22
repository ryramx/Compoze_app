import { check, date, index, integer, pgTable, primaryKey, text, uuid } from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

import { projectStatus, projectStyle, projectType } from "./enums";
import { songs } from "./songs";
import { idPrimario, sincronizavel } from "./tipos";
import { users } from "./users";

export const projects = pgTable(
  "projects",
  {
    id: idPrimario(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    description: text("description"),
    type: projectType("type").notNull().default("SINGLE"),
    status: projectStatus("status").notNull().default("PLANEJAMENTO"),
    style: projectStyle("style"),
    releaseDate: date("release_date", { mode: "string" }),
    coverUrl: text("cover_url"),
    // Valores em reais inteiros, como no contrato.
    estimatedCost: integer("estimated_cost"),
    fundingTarget: integer("funding_target"),
    fundingCurrent: integer("funding_current").notNull().default(0),
    ...sincronizavel,
  },
  (t) => [
    index("projects_owner_idx").on(t.ownerId, t.deletedAt),
    check("projects_money_check", sql`coalesce(${t.estimatedCost}, 0) >= 0 AND coalesce(${t.fundingTarget}, 0) >= 0 AND ${t.fundingCurrent} >= 0`),
  ],
);

export const projectSongs = pgTable(
  "project_songs",
  {
    projectId: uuid("project_id").notNull().references(() => projects.id, { onDelete: "cascade" }),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    trackNumber: integer("track_number").notNull(),
    ...sincronizavel,
  },
  (t) => [primaryKey({ columns: [t.projectId, t.songId] }), index("project_songs_song_idx").on(t.songId)],
);
