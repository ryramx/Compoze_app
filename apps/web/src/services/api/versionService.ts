import { textoDaVersao } from "@compoze/contracts/canonico";
import { api } from "@/lib/api";
import { musicaDaApi } from "@/services/api/adapters";
import type { ApiSongDetail, ApiVersion, ApiVersionSummary } from "@/services/api/dto";
import type { Song } from "@/types";

/**
 * Histórico de versões e registro da obra (ADR 0009). As versões ficam no
 * formato da API, sem tradução: é esse formato exato que entra no hash, e o
 * app confere o hash com ele.
 */

export const listar = (songId: string) => api.get<ApiVersionSummary[]>(`/songs/${songId}/versions`);

export const obter = (songId: string, numero: number) => api.get<ApiVersion>(`/songs/${songId}/versions/${numero}`);

export const guardar = (songId: string, label?: string | null) =>
  api.post<ApiVersion>(`/songs/${songId}/versions`, label ? { label } : {});

export async function registrar(songId: string): Promise<{ musica: Song; versao: ApiVersion }> {
  const r = await api.post<{ song: ApiSongDetail; version: ApiVersion }>(`/songs/${songId}/register`, {});
  return { musica: musicaDaApi(r.song), versao: r.version };
}

/** Recalcula o SHA-256 da versão no próprio aparelho e compara com o guardado. */
export async function conferir(v: ApiVersion): Promise<boolean> {
  const bytes = new TextEncoder().encode(textoDaVersao(v));
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  const hex = [...new Uint8Array(hash)].map((b) => b.toString(16).padStart(2, "0")).join("");
  return hex === v.sha256;
}
