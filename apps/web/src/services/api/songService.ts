import { api } from "@/lib/api";
import {
  musicaDaApi,
  patchDeMusicaParaApi,
  statusParaApi,
} from "@/services/api/adapters";
import type {
  ApiContributions,
  ApiNewSong,
  ApiSongDetail,
  ApiSongSummary,
  ApiTrashItem,
} from "@/services/api/dto";
import type { Song, SongStatus } from "@/types";

export interface FiltroBusca {
  q?: string;
  status?: SongStatus;
  folderId?: string;
  /** Traz versos e coautores junto (`expand=blocks,collaborators`). */
  completas?: boolean;
}

function querystring(filtro: FiltroBusca): string {
  const p = new URLSearchParams();
  if (filtro.q) p.set("q", filtro.q);
  if (filtro.status) p.set("status", statusParaApi(filtro.status));
  if (filtro.folderId) p.set("folder_id", filtro.folderId);
  if (filtro.completas) p.set("expand", "blocks,collaborators");
  const s = p.toString();
  return s ? `?${s}` : "";
}

export async function list(filtro: FiltroBusca = {}): Promise<Song[]> {
  const dados = await api.get<ApiSongSummary[]>(`/songs${querystring(filtro)}`);
  return dados.map(musicaDaApi);
}

export async function getById(id: string): Promise<Song> {
  return musicaDaApi(await api.get<ApiSongDetail>(`/songs/${id}`));
}

export async function create(input: { title: string; folderId?: string }): Promise<Song> {
  const corpo: ApiNewSong = { title: input.title };
  if (input.folderId) corpo.folder_id = input.folderId;
  return musicaDaApi(await api.post<ApiSongDetail>("/songs", corpo));
}

export async function update(id: string, patch: Partial<Song>): Promise<Song> {
  return musicaDaApi(await api.patch<ApiSongDetail>(`/songs/${id}`, patchDeMusicaParaApi(patch)));
}

// --------------------------------------------------------------- lixeira

/** Item da lixeira com o prazo restante, que só existe nesta listagem (RN08). */
export type ItemDaLixeira = Song & { daysRemaining: number };

export async function listTrash(): Promise<ItemDaLixeira[]> {
  const dados = await api.get<ApiTrashItem[]>("/songs/trash");
  return dados.map((d) => ({ ...musicaDaApi(d), daysRemaining: d.days_remaining }));
}

export async function softDelete(id: string): Promise<void> {
  await api.delete(`/songs/${id}`);
}

export async function restore(id: string): Promise<Song> {
  return musicaDaApi(await api.post<ApiSongDetail>(`/songs/${id}/restore`));
}

export async function permanentDelete(id: string): Promise<void> {
  await api.delete(`/songs/${id}/permanent`);
}

// --------------------------------------------------------- colaboradores

export async function removeCollaborator(songId: string, userId: string): Promise<void> {
  await api.delete(`/songs/${songId}/collaborators/${userId}`);
}

/**
 * Define a divisão de coautoria.
 *
 * `confirmar` fecha a divisão e dispara a validação de soma 100 no backend
 * (RN05). Enquanto false, percentuais parciais são estado válido — é o que a
 * regra quer dizer com "quando formalmente definidos".
 */
export async function setContributions(
  songId: string,
  contribuicoes: { userId: string; percentage: number }[],
  confirmar = false,
): Promise<void> {
  const corpo: ApiContributions = {
    contributions: contribuicoes.map((c) => ({ user_id: c.userId, percentage: c.percentage })),
    confirm: confirmar,
  };
  await api.put(`/songs/${songId}/contributions`, corpo);
}
