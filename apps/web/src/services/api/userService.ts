import { api } from "@/lib/api";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiUserMe, ApiUserPublic } from "@/services/api/dto";
import type { User } from "@/types";

/** Resolve vários ids numa requisição só. Ids desconhecidos são omitidos. */
export async function getMany(ids: string[]): Promise<User[]> {
  if (ids.length === 0) return [];

  // O backend limita a 100 por consulta; quebrar em lotes evita que uma tela
  // com muita gente simplesmente falhe.
  const lotes: string[][] = [];
  for (let i = 0; i < ids.length; i += 100) lotes.push(ids.slice(i, i + 100));

  const respostas = await Promise.all(
    lotes.map((lote) => api.get<ApiUserPublic[]>(`/users?ids=${lote.join(",")}`)),
  );
  return respostas.flat().map(usuarioDaApi);
}

export async function getByUsername(username: string): Promise<User> {
  return usuarioDaApi(await api.get<ApiUserPublic>(`/users/${username}`));
}

export async function updateMe(patch: Partial<User>): Promise<User> {
  const corpo: Record<string, unknown> = {};
  if ("name" in patch) corpo.name = patch.name;
  if ("bio" in patch) corpo.bio = patch.bio ?? null;
  if ("avatar" in patch) corpo.avatar_url = patch.avatar || null;
  if (patch.location) {
    corpo.city = patch.location.city || null;
    corpo.country = patch.location.country || null;
    corpo.latitude = patch.location.lat || null;
    corpo.longitude = patch.location.lng || null;
  }
  return usuarioDaApi(await api.patch<ApiUserMe>("/users/me", corpo));
}

/**
 * Pessoas que escolheram aparecer no mapa (RN11), com a posição que elas
 * mesmas informaram. É a única rota que devolve coordenadas de outra pessoa;
 * o perfil público nunca as inclui.
 */
export async function noMapa(): Promise<User[]> {
  const dados = await api.get<(ApiUserPublic & { latitude: number; longitude: number })[]>("/map/people");
  return dados.map(usuarioDaApi);
}
