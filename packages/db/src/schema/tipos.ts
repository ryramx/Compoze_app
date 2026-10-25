import { sql } from "drizzle-orm";
import { customType, integer, timestamp, uuid } from "drizzle-orm/pg-core";

/** Texto que compara sem diferenciar maiúsculas (extensão `citext`): e-mail e @. */
export const citext = customType<{ data: string }>({
  dataType: () => "citext",
});

/**
 * Ponto geográfico (PostGIS), SRID 4326. Trafega como `{ lat, lng }` e é
 * gravado em EWKT; a leitura usa `ST_X`/`ST_Y` nas consultas do mapa.
 */
export const ponto = customType<{ data: { lat: number; lng: number }; driverData: string }>({
  dataType: () => "geography(Point, 4326)",
  toDriver: ({ lat, lng }) => `SRID=4326;POINT(${lng} ${lat})`,
});

/** Bytes crus: estado Yjs, áudio dos memos. */
export const bytea = customType<{ data: Uint8Array; driverData: Buffer }>({
  dataType: () => "bytea",
  fromDriver: (b) => new Uint8Array(b),
  toDriver: (u) => Buffer.from(u),
});

/** Chave primária UUID v7. O Postgres 18 gera; o aparelho também pode enviar (ADR 0005). */
export const idPrimario = () => uuid("id").primaryKey().default(sql`uuidv7()`);

const quando = (nome: string) => timestamp(nome, { withTimezone: true, mode: "date" });

/** Criação e última alteração. `updated_at` é sempre do relógio do servidor (gatilho). */
export const carimbos = {
  createdAt: quando("created_at").notNull().defaultNow(),
  updatedAt: quando("updated_at").notNull().defaultNow(),
};

/**
 * Colunas de sincronização (ADR 0005): `version` sobe a cada escrita e
 * `deleted_at` é a lápide que o delta usa para informar exclusões.
 * Ambas são mantidas pelo gatilho `compoze_tocar`, não pelo código.
 */
export const sincronizavel = {
  ...carimbos,
  version: integer("version").notNull().default(1),
  deletedAt: quando("deleted_at"),
};

export { quando };
