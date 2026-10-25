import { api } from "@/lib/api";
import { projetoDaApi } from "@/services/api/adapters";
import type { ApiNewProject, ApiProjectDetail, ApiProjectPatch } from "@/services/api/dto";
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
  // A listagem já vem com as faixas de cada projeto.
  const dados = await api.get<ApiProjectDetail[]>("/projects");
  return dados.map(projetoDaApi);
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

/** Corpo de `POST /projects`. Com `id`, o projeto nasce no aparelho (ADR 0005). */
export function corpoDeNovoProjeto(input: EntradaProjeto, id?: string): ApiNewProject {
  const corpo: ApiNewProject = { name: input.name };
  if (id) corpo.id = id;
  if (input.type) corpo.type = TIPO_PARA_API[input.type];
  if (input.style) corpo.style = ESTILO_PARA_API[input.style];
  if (input.description) corpo.description = input.description;
  if (input.releaseDate) corpo.release_date = input.releaseDate;
  if (input.estimatedCost !== undefined) corpo.estimated_cost = input.estimatedCost;
  if (input.fundingGoal !== undefined) corpo.funding_target = input.fundingGoal;
  return corpo;
}

/** Corpo de `PATCH /projects/{id}`: só os campos que mudaram. */
export function patchDeProjeto(patch: Partial<Project>): ApiProjectPatch {
  const corpo: ApiProjectPatch = {};
  if (patch.name) corpo.name = patch.name;
  if (patch.description !== undefined) corpo.description = patch.description;
  if (patch.type) corpo.type = TIPO_PARA_API[patch.type];
  if (patch.style) corpo.style = ESTILO_PARA_API[patch.style];
  if (patch.status) corpo.status = STATUS_PARA_API[patch.status];
  if (patch.releaseDate !== undefined) corpo.release_date = patch.releaseDate || null;
  if (patch.estimatedCost !== undefined) corpo.estimated_cost = patch.estimatedCost;
  if (patch.fundingGoal !== undefined) corpo.funding_target = patch.fundingGoal;
  return corpo;
}

export async function create(input: EntradaProjeto): Promise<Project> {
  return projetoDaApi(await api.post<ApiProjectDetail>("/projects", corpoDeNovoProjeto(input)));
}

export async function update(id: string, patch: Partial<Project>): Promise<Project> {
  return projetoDaApi(await api.patch<ApiProjectDetail>(`/projects/${id}`, patchDeProjeto(patch)));
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

/** Capa do projeto (ADR 0015): a imagem já reduzida, ou null para a capa tipográfica. */
export async function trocarCapa(id: string, imagem: Blob | null): Promise<Project> {
  const caminho = `/projects/${id}/cover`;
  return projetoDaApi(imagem ? await api.subir<ApiProjectDetail>(caminho, imagem) : await api.delete<ApiProjectDetail>(caminho));
}
