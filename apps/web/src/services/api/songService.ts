import { api } from "@/lib/api";
import {
  musicaDaApi,
  patchDeMusicaParaApi,
  statusParaApi,
  tipoDeBlocoParaApi,
} from "@/services/api/adapters";
import type { ApiSongDetail, ApiSongSummary, ApiTrashItem } from "@/services/api/dto";
import type { Song, SongBlock, SongStatus } from "@/types";

export interface FiltroBusca {
  q?: string;
  status?: SongStatus;
  folderId?: string;
}

function querystring(filtro: FiltroBusca): string {
  const p = new URLSearchParams();
  if (filtro.q) p.set("q", filtro.q);
  if (filtro.status) p.set("status", statusParaApi(filtro.status));
  if (filtro.folderId) p.set("folder_id", filtro.folderId);
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
  const corpo: Record<string, unknown> = { title: input.title };
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

// ---------------------------------------------------------------- blocos

export async function addBlock(
  songId: string,
  bloco: { type: SongBlock["type"]; text?: string; label?: string; position?: number },
): Promise<void> {
  await api.post(`/songs/${songId}/blocks`, {
    type: tipoDeBlocoParaApi(bloco.type),
    content: bloco.text ?? "",
    label: bloco.label ?? null,
    // Só envia posição quando há uma: ausente significa "no fim da música".
    ...(bloco.position === undefined ? {} : { position: bloco.position }),
  });
}

export async function updateBlock(
  songId: string,
  blockId: string,
  patch: Partial<SongBlock>,
): Promise<void> {
  const corpo: Record<string, unknown> = {};
  if ("text" in patch) corpo.content = patch.text;
  if ("label" in patch) corpo.label = patch.label ?? null;
  if ("type" in patch && patch.type) corpo.type = tipoDeBlocoParaApi(patch.type);
  await api.patch(`/songs/${songId}/blocks/${blockId}`, corpo);
}

export async function removeBlock(songId: string, blockId: string): Promise<void> {
  await api.delete(`/songs/${songId}/blocks/${blockId}`);
}

// --------------------------------------------------------- colaboradores

export async function inviteCollaborator(songId: string, userId: string): Promise<void> {
  // Papel padrão COMPOSER: a interface ainda não tem seletor de função, e
  // COMPOSER é o papel com escrita mais próximo de "colaborador" genérico.
  await api.post(`/songs/${songId}/collaborators`, { user_id: userId, role: "COMPOSER" });
}

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
  await api.put(`/songs/${songId}/contributions`, {
    contributions: contribuicoes.map((c) => ({ user_id: c.userId, percentage: c.percentage })),
    confirm: confirmar,
  });
}
