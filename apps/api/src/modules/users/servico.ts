import type { AtualizarEu, UsuarioEu, UsuarioPublico } from "@compoze/contracts";
import { users, type Banco } from "@compoze/db";
import { and, eq, getTableColumns, inArray, isNotNull, sql } from "drizzle-orm";

import { usuarioEu, usuarioPublico } from "../../lib/mapear";
import { ErroDaApi } from "../../plugins/erros";

// Nunca selecionar `password_hash` nem `location` por acidente: estas são as
// únicas colunas que saem do banco para as rotas de pessoas.
const { passwordHash: _hash, location: _local, ...colunasPublicas } = getTableColumns(users);
const latitude = sql<number | null>`ST_Y(${users.location}::geometry)`;
const longitude = sql<number | null>`ST_X(${users.location}::geometry)`;

export async function eu(db: Banco, id: string): Promise<UsuarioEu> {
  const [u] = await db.select({ ...colunasPublicas, lat: latitude, lng: longitude }).from(users).where(eq(users.id, id));
  if (!u) throw new ErroDaApi(401, "Sessão de uma conta que não existe mais.");
  return usuarioEu(u, { lat: u.lat, lng: u.lng });
}

export async function atualizarEu(db: Banco, id: string, p: AtualizarEu): Promise<UsuarioEu> {
  const mudancas: Partial<typeof users.$inferInsert> = {};
  if (p.name !== undefined) mudancas.name = p.name;
  if (p.bio !== undefined) mudancas.bio = p.bio;
  if (p.avatar_url !== undefined) mudancas.avatarUrl = p.avatar_url;
  if (p.city !== undefined) mudancas.city = p.city;
  if (p.state !== undefined) mudancas.state = p.state;
  if (p.country !== undefined) mudancas.country = p.country;
  if (p.show_on_map !== undefined) mudancas.showOnMap = p.show_on_map;
  if (p.instruments !== undefined) mudancas.instruments = p.instruments;
  if (p.specialties !== undefined) mudancas.specialties = p.specialties;
  if (p.genres !== undefined) mudancas.genres = p.genres;
  if (p.external_links !== undefined) mudancas.externalLinks = p.external_links;

  const posicao =
    p.latitude === undefined
      ? {}
      : {
          location:
            p.latitude === null || p.longitude === null || p.longitude === undefined
              ? sql`NULL`
              : sql`ST_SetSRID(ST_MakePoint(${p.longitude}, ${p.latitude}), 4326)::geography`,
        };

  if (Object.keys(mudancas).length > 0 || "location" in posicao) {
    await db
      .update(users)
      .set({ ...mudancas, ...posicao } as typeof mudancas)
      .where(eq(users.id, id));
  }
  return eu(db, id);
}

export async function porIds(db: Banco, ids: string[]): Promise<UsuarioPublico[]> {
  if (ids.length === 0) return [];
  const linhas = await db.select(colunasPublicas).from(users).where(inArray(users.id, ids));
  return linhas.map(usuarioPublico);
}

export async function porUsername(db: Banco, username: string): Promise<UsuarioPublico> {
  const [u] = await db.select(colunasPublicas).from(users).where(eq(users.username, username));
  if (!u) throw new ErroDaApi(404, "Pessoa não encontrada.");
  return usuarioPublico(u);
}

/** RN11: só quem ligou `show_on_map` e informou posição. Sem e-mail. */
export async function noMapa(db: Banco) {
  const linhas = await db
    .select({ ...colunasPublicas, lat: latitude, lng: longitude })
    .from(users)
    .where(and(eq(users.showOnMap, true), isNotNull(users.location)));
  return linhas.map((u) => ({ ...usuarioPublico(u), latitude: u.lat!, longitude: u.lng! }));
}
