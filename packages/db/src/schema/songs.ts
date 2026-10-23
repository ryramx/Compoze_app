import { sql } from "drizzle-orm";
import {
  boolean,
  check,
  customType,
  index,
  integer,
  jsonb,
  numeric,
  pgTable,
  smallint,
  text,
  unique,
  uniqueIndex,
  uuid,
} from "drizzle-orm/pg-core";

import { blockType, collaboratorRole, songStatus, versionReason, visibility } from "./enums";
import { folders } from "./folders";
import { carimbos, idPrimario, quando, sincronizavel } from "./tipos";
import { users } from "./users";

const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  fromDriver: (b) => new Uint8Array(b),
  toDriver: (u) => Buffer.from(u),
});

export const songs = pgTable(
  "songs",
  {
    id: idPrimario(),
    ownerId: uuid("owner_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    // RN07: ir para a lixeira não desvincula da pasta; só apagar a pasta solta a canção.
    folderId: uuid("folder_id").references(() => folders.id, { onDelete: "set null" }),
    title: text("title").notNull(),
    description: text("description"),
    status: songStatus("status").notNull().default("IDEIA"),
    visibility: visibility("visibility").notNull().default("PRIVATE"),
    musicalKey: text("musical_key"),
    bpm: smallint("bpm"),
    timeSignature: text("time_signature"),
    tags: text("tags").array().notNull().default(sql`'{}'`),
    contributionsConfirmed: boolean("contributions_confirmed").notNull().default(false),
    ...sincronizavel,
  },
  (t) => [
    check("songs_bpm_check", sql`${t.bpm} BETWEEN 20 AND 300`),
    index("songs_owner_idx").on(t.ownerId, t.deletedAt),
    index("songs_tags_idx").using("gin", t.tags),
    // Índices de busca sem acento (compoze_normalizar) ficam na migração 0004.
  ],
);

/**
 * Blocos da canção. A partir da Fase 2 são uma projeção do documento Yjs
 * (`song_documents`), por isso não têm lápide: o conteúdo sincroniza pelo Yjs,
 * não pelo delta. A unicidade de posição é adiável (migração 0002) para que
 * reordenar numa transação não esbarre em duplicata intermediária.
 */
export const songBlocks = pgTable(
  "song_blocks",
  {
    id: idPrimario(),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    type: blockType("type").notNull(),
    label: text("label"),
    content: text("content").notNull().default(""),
    position: integer("position").notNull(),
    authorId: uuid("author_id").references(() => users.id, { onDelete: "set null" }),
    version: integer("version").notNull().default(1),
    ...carimbos,
  },
  (t) => [check("song_blocks_position_check", sql`${t.position} >= 0`)],
);

export const songCollaborators = pgTable(
  "song_collaborators",
  {
    id: idPrimario(),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    userId: uuid("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: collaboratorRole("role").notNull(),
    contributionPercent: numeric("contribution_percent", { precision: 5, scale: 2, mode: "number" }),
    invitedBy: uuid("invited_by").references(() => users.id, { onDelete: "set null" }),
    ...sincronizavel,
  },
  (t) => [
    unique("song_collaborators_song_user_key").on(t.songId, t.userId),
    // Uma dona por canção.
    uniqueIndex("song_collaborators_one_owner_idx").on(t.songId).where(sql`${t.role} = 'OWNER'`),
    index("song_collaborators_user_idx").on(t.userId),
    check(
      "song_collaborators_percent_check",
      sql`${t.contributionPercent} BETWEEN 0 AND 100`,
    ),
  ],
);

/** Versões imutáveis: base da prova de autoria (estágio "Registrada"). */
export const songVersions = pgTable(
  "song_versions",
  {
    id: idPrimario(),
    songId: uuid("song_id").notNull().references(() => songs.id, { onDelete: "cascade" }),
    number: integer("number").notNull(),
    snapshot: jsonb("snapshot").notNull(),
    sha256: text("sha256").notNull(),
    /** Hash da versão anterior da mesma canção: as versões formam uma corrente (ADR 0009). */
    previousSha256: text("previous_sha256"),
    reason: versionReason("reason").notNull(),
    /** Nome dado por quem guardou ("antes do refrão novo"); nulo nas automáticas. */
    label: text("label"),
    createdBy: uuid("created_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: quando("created_at").notNull().defaultNow(),
  },
  (t) => [unique("song_versions_song_number_key").on(t.songId, t.number)],
);

/** Estado Yjs da canção (Fase 2). */
export const songDocuments = pgTable("song_documents", {
  songId: uuid("song_id").primaryKey().references(() => songs.id, { onDelete: "cascade" }),
  ydoc: bytea("ydoc").notNull(),
  updatedAt: quando("updated_at").notNull().defaultNow(),
});

