import type { StartedPostgreSqlContainer } from "@testcontainers/postgresql";
import { eq, sql } from "drizzle-orm";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

import { conectar, folders, songBlocks, songCollaborators, songs, songVersions, users, type Conexao } from "../src";
import { migrar } from "../src/migrar";
import { subirPostgres } from "./postgres";

let pg: StartedPostgreSqlContainer;
let c: Conexao;

beforeAll(async () => {
  pg = await subirPostgres();
  await migrar(pg.getConnectionUri());
  c = conectar(pg.getConnectionUri());
});

afterAll(async () => {
  await c?.fechar();
  await pg?.stop();
});

let n = 0;
async function pessoa() {
  n += 1;
  const [u] = await c.db
    .insert(users)
    .values({ name: `Pessoa ${n}`, username: `pessoa${n}`, email: `pessoa${n}@teste.dev` })
    .returning();
  return u!;
}

/** Código SQLSTATE do erro do Postgres (o Drizzle embrulha o erro do driver). */
async function codigoDoErro(p: Promise<unknown>): Promise<string | undefined> {
  try {
    await p;
  } catch (e) {
    const err = e as { code?: string; cause?: { code?: string } };
    return err.cause?.code ?? err.code;
  }
  return undefined;
}

describe("migrações", () => {
  it("rodam no PostgreSQL 18 e são idempotentes", async () => {
    const { rows } = await c.pool.query<{ server_version_num: string }>("SHOW server_version_num");
    expect(Number(rows[0]!.server_version_num)).toBeGreaterThanOrEqual(180000);
    await expect(migrar(pg.getConnectionUri())).resolves.toBeUndefined();
  });

  it("criam as extensões de busca e mapa", async () => {
    const { rows } = await c.pool.query<{ extname: string }>("SELECT extname FROM pg_extension");
    expect(rows.map((r) => r.extname)).toEqual(expect.arrayContaining(["citext", "postgis", "pg_trgm", "unaccent"]));
  });
});

describe("ids", () => {
  it("o banco gera UUID v7", async () => {
    const u = await pessoa();
    expect(u.id).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-7[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
  });

  it("aceita o id gerado no aparelho (offline, ADR 0005)", async () => {
    const dona = await pessoa();
    const id = "01920000-0000-7000-8000-000000000abc";
    const [s] = await c.db.insert(songs).values({ id, ownerId: dona.id, title: "Feita no avião" }).returning();
    expect(s!.id).toBe(id);
  });
});

describe("restrições", () => {
  it("e-mail e @ são únicos sem diferenciar maiúsculas", async () => {
    const u = await pessoa();
    const repetido = c.db.insert(users).values({ name: "Outra", username: u.username.toUpperCase(), email: "x@teste.dev" });
    expect(await codigoDoErro(repetido)).toBe("23505");
  });

  it("bpm fica entre 20 e 300", async () => {
    const dona = await pessoa();
    expect(await codigoDoErro(c.db.insert(songs).values({ ownerId: dona.id, title: "Rápida", bpm: 400 }))).toBe("23514");
  });

  it("uma canção tem uma dona só", async () => {
    const [a, b] = [await pessoa(), await pessoa()];
    const [s] = await c.db.insert(songs).values({ ownerId: a.id, title: "Dupla" }).returning();
    await c.db.insert(songCollaborators).values({ songId: s!.id, userId: a.id, role: "OWNER" });
    const segunda = c.db.insert(songCollaborators).values({ songId: s!.id, userId: b.id, role: "OWNER" });
    expect(await codigoDoErro(segunda)).toBe("23505");
  });

  it("reordenar blocos numa transação não esbarra na posição única", async () => {
    const dona = await pessoa();
    const [s] = await c.db.insert(songs).values({ ownerId: dona.id, title: "Ordem" }).returning();
    const [b0, b1] = await c.db
      .insert(songBlocks)
      .values([
        { songId: s!.id, type: "LYRIC", content: "um", position: 0 },
        { songId: s!.id, type: "LYRIC", content: "dois", position: 1 },
      ])
      .returning();
    await c.db.transaction(async (tx) => {
      await tx.update(songBlocks).set({ position: 1 }).where(eq(songBlocks.id, b0!.id));
      await tx.update(songBlocks).set({ position: 0 }).where(eq(songBlocks.id, b1!.id));
    });
    const duplicada = c.db.insert(songBlocks).values({ songId: s!.id, type: "NOTE", position: 0 });
    expect(await codigoDoErro(duplicada)).toBe("23505");
  });

  it("pasta não pode ficar dentro de si mesma nem de uma filha", async () => {
    const dona = await pessoa();
    const [mae] = await c.db.insert(folders).values({ ownerId: dona.id, name: "Mãe" }).returning();
    const [filha] = await c.db.insert(folders).values({ ownerId: dona.id, name: "Filha", parentId: mae!.id }).returning();
    expect(await codigoDoErro(c.db.update(folders).set({ parentId: filha!.id }).where(eq(folders.id, mae!.id)))).toBe("23514");
    expect(await codigoDoErro(c.db.update(folders).set({ parentId: mae!.id }).where(eq(folders.id, mae!.id)))).toBe("23514");
  });

  it("versão registrada é imutável", async () => {
    const dona = await pessoa();
    const [s] = await c.db.insert(songs).values({ ownerId: dona.id, title: "Registrada" }).returning();
    const [v] = await c.db
      .insert(songVersions)
      .values({ songId: s!.id, number: 1, snapshot: { blocos: [] }, sha256: "abc", reason: "REGISTRO" })
      .returning();
    expect(await codigoDoErro(c.db.update(songVersions).set({ sha256: "outro" }).where(eq(songVersions.id, v!.id)))).toBe("23001");
  });
});

describe("sincronização", () => {
  it("cada escrita sobe a versão e carimba a hora do servidor", async () => {
    const dona = await pessoa();
    const [s] = await c.db.insert(songs).values({ ownerId: dona.id, title: "v1" }).returning();
    const [s2] = await c.db
      .update(songs)
      .set({ title: "v2", version: 99, updatedAt: new Date("2000-01-01") })
      .where(eq(songs.id, s!.id))
      .returning();
    expect(s2!.version).toBe(2);
    expect(s2!.updatedAt.getTime()).toBeGreaterThan(new Date("2020-01-01").getTime());
  });

  it("exclusão lógica preserva a pasta (RN07)", async () => {
    const dona = await pessoa();
    const [p] = await c.db.insert(folders).values({ ownerId: dona.id, name: "Rascunhos" }).returning();
    const [s] = await c.db.insert(songs).values({ ownerId: dona.id, title: "Na lixeira", folderId: p!.id }).returning();
    const [apagada] = await c.db.update(songs).set({ deletedAt: sql`now()` }).where(eq(songs.id, s!.id)).returning();
    expect(apagada!.deletedAt).not.toBeNull();
    expect(apagada!.folderId).toBe(p!.id);
  });

  it("guarda localização como ponto geográfico (RN11)", async () => {
    const u = await pessoa();
    await c.db.update(users).set({ location: { lat: -23.55, lng: -46.63 }, showOnMap: true }).where(eq(users.id, u.id));
    const { rows } = await c.pool.query<{ lat: number; lng: number }>(
      "SELECT ST_Y(location::geometry) AS lat, ST_X(location::geometry) AS lng FROM users WHERE id = $1",
      [u.id],
    );
    expect(rows[0]).toEqual({ lat: -23.55, lng: -46.63 });
  });
});
