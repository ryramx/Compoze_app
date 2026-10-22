import { api } from "@/lib/api";
import { projetoDaApi } from "@/services/api/adapters";
import type { ApiProject, ApiProjectDetail } from "@/services/api/dto";
import type { Project, ProjectType } from "@/types";

const TIPO_PARA_API = {
  single: "SINGLE",
  ep: "EP",
  album: "ALBUM",
} as const;

const ESTILO_PARA_API = {
  acustico: "ACUSTICO",
  banda: "BANDA",
  "ao-vivo": "AO_VIVO",
} as const;

const STATUS_PARA_API = {
  planejamento: "PLANEJAMENTO",
  producao: "PRODUCAO",
  mixagem: "MIXAGEM",
  lancado: "LANCADO",
} as const;

export async function list(): Promise<Project[]> {
  // A listagem não traz as músicas do projeto; `projetoDaApi` trata a ausência
  // como lista vazia e a tela de detalhe busca o projeto completo.
  const dados = await api.get<ApiProject[]>("/projects");
  return dados.map((p) => projetoDaApi({ ...p, songs: [] }));
}

export async function getById(id: string): Promise<Project> {
  return projetoDaApi(await api.get<ApiProjectDetail>(`/projects/${id}`));
}

export interface EntradaProjeto {
  name: string;
  type?: ProjectType;
  style?: Project["style"];
  description?: string;
  releaseDate?: string;
  estimatedCost?: number;
  fundingGoal?: number;
}

export async function create(input: EntradaProjeto): Promise<Project> {
  const corpo: Record<string, unknown> = { name: input.name };
  if (input.type) corpo.type = TIPO_PARA_API[input.type];
  if (input.style) corpo.style = ESTILO_PARA_API[input.style];
  if (input.description) corpo.description = input.description;
  if (input.releaseDate) corpo.release_date = input.releaseDate;
  if (input.estimatedCost !== undefined) corpo.estimated_cost = input.estimatedCost;
  if (input.fundingGoal !== undefined) corpo.funding_target = input.fundingGoal;

  return projetoDaApi(await api.post<ApiProjectDetail>("/projects", corpo));
}

export async function update(id: string, patch: Partial<Project>): Promise<Project> {
  const corpo: Record<string, unknown> = {};
  if (patch.name) corpo.name = patch.name;
  if (patch.description !== undefined) corpo.description = patch.description;
  if (patch.type) corpo.type = TIPO_PARA_API[patch.type];
  if (patch.style) corpo.style = ESTILO_PARA_API[patch.style];
  if (patch.status) corpo.status = STATUS_PARA_API[patch.status];
  if (patch.releaseDate !== undefined) corpo.release_date = patch.releaseDate || null;
  if (patch.estimatedCost !== undefined) corpo.estimated_cost = patch.estimatedCost;
  if (patch.fundingGoal !== undefined) corpo.funding_target = patch.fundingGoal;

  return projetoDaApi(await api.patch<ApiProjectDetail>(`/projects/${id}`, corpo));
}

export async function remove(id: string): Promise<void> {
  // Vai para a lixeira; as músicas não vão junto (decisão D02).
  await api.delete(`/projects/${id}`);
}

export async function restore(id: string): Promise<Project> {
  return projetoDaApi(await api.post<ApiProjectDetail>(`/projects/${id}/restore`));
}

export async function addSong(
  projectId: string,
  songId: string,
  trackNumber?: number,
): Promise<Project> {
  return projetoDaApi(
    await api.post<ApiProjectDetail>(`/projects/${projectId}/songs`, {
      song_id: songId,
      ...(trackNumber === undefined ? {} : { track_number: trackNumber }),
    }),
  );
}

export async function removeSong(projectId: string, songId: string): Promise<void> {
  await api.delete(`/projects/${projectId}/songs/${songId}`);
}
