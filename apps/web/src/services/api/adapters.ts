/**
 * Tradução entre o contrato da API e os tipos de domínio da interface.
 *
 * As divergências não são acidentais: vêm das decisões D01–D10
 * (contrato em docs/backend/contrato-da-api.md), em que o PRD venceu o protótipo. Este arquivo é
 * a fronteira onde isso é resolvido, para que nenhuma tela precise saber que a
 * API fala `snake_case` nem que o status vai em maiúsculas.
 *
 * Duas traduções merecem atenção porque perdem informação:
 *
 * - `visibility` (3 estados) vira `hidden` (booleano). A interface ainda não
 *   distingue UNLISTED de PUBLIC, então ambos viram "não oculto". Ao escrever,
 *   só alternamos entre PRIVATE e PUBLIC — nunca produzimos UNLISTED, para não
 *   apagar sem querer um estado que a tela não sabe representar.
 * - `role` do colaborador não tem correspondente na interface, que só conhece
 *   percentual. É preservado ao ler e nunca sobrescrito ao escrever.
 */

import type {
  ApiBlock,
  ApiBlockType,
  ApiCollaborator,
  ApiFolder,
  ApiProjectDetail,
  ApiSongDetail,
  ApiSongSummary,
  ApiSongStatus,
  ApiUserMe,
  ApiUserPublic,
} from "@/services/api/dto";
import type { Folder, Project, Song, SongBlock, SongStatus, User } from "@/types";

// ---------------------------------------------------------------- status

const STATUS_DA_API: Record<ApiSongStatus, SongStatus> = {
  IDEIA: "ideia",
  ESCRITA: "escrita",
  REVISAO: "revisao",
  FINALIZADA: "finalizada",
  REGISTRADA: "registrada",
  GRAVADA: "gravada",
  // A interface não tem telas para estes dois estados auxiliares; tratá-los
  // como "ideia" os mostraria errado, então mapeamos para o estado mais
  // próximo do que significam: obra fora do fluxo ativo.
  ARQUIVADA: "gravada",
  CANCELADA: "gravada",
};

const STATUS_PARA_API: Record<SongStatus, ApiSongStatus> = {
  ideia: "IDEIA",
  escrita: "ESCRITA",
  revisao: "REVISAO",
  finalizada: "FINALIZADA",
  registrada: "REGISTRADA",
  gravada: "GRAVADA",
};

export const statusDaApi = (s: ApiSongStatus): SongStatus => STATUS_DA_API[s] ?? "ideia";
export const statusParaApi = (s: SongStatus): ApiSongStatus => STATUS_PARA_API[s];

// ---------------------------------------------------------------- blocos

const TIPO_DA_API: Record<ApiBlockType, SongBlock["type"]> = {
  SECTION: "section",
  LYRIC: "lyric-line",
  CHORD: "chord-line",
  NOTE: "note",
};

const TIPO_PARA_API: Record<SongBlock["type"], ApiBlockType> = {
  section: "SECTION",
  "lyric-line": "LYRIC",
  "chord-line": "CHORD",
  note: "NOTE",
};

export const tipoDeBlocoDaApi = (t: ApiBlockType): SongBlock["type"] => TIPO_DA_API[t];
export const tipoDeBlocoParaApi = (t: SongBlock["type"]): ApiBlockType => TIPO_PARA_API[t];

export function blocoDaApi(b: ApiBlock): SongBlock {
  return {
    id: b.id,
    type: tipoDeBlocoDaApi(b.type),
    label: b.label ?? undefined,
    // A API chama de `content`; a interface, de `text`.
    text: b.content,
    authorId: b.author_id,
  };
}

// ---------------------------------------------------------------- música

export function musicaDaApi(s: ApiSongDetail | ApiSongSummary): Song {
  const detalhe = "blocks" in s ? s : undefined;

  return {
    id: s.id,
    title: s.title,
    status: statusDaApi(s.status),
    // A interface chama o dono de `creatorId`; a API, de `owner_id`.
    creatorId: s.owner_id,
    collaborators: (detalhe?.collaborators ?? []).map((c: ApiCollaborator) => ({
      userId: c.user_id,
      // Percentual ainda não acertado vira 0 na tela — a interface não tem
      // como representar "indefinido" num número.
      percentage: c.contribution_percent ?? 0,
    })),
    createdAt: s.created_at,
    updatedAt: s.updated_at,
    folderId: s.folder_id ?? undefined,
    blocks: (detalhe?.blocks ?? []).map(blocoDaApi),
    key: s.musical_key ?? undefined,
    bpm: s.bpm ?? undefined,
    timeSignature: s.time_signature ?? undefined,
    tags: s.tags,
    hidden: s.visibility === "PRIVATE",
    contributionsConfirmed: s.contributions_confirmed,
    deletedAt: s.deleted_at ?? undefined,
  };
}

/** Converte um patch da interface no corpo que a API espera. */
export function patchDeMusicaParaApi(patch: Partial<Song>): Record<string, unknown> {
  const corpo: Record<string, unknown> = {};

  if ("title" in patch) corpo.title = patch.title;
  if ("status" in patch && patch.status) corpo.status = statusParaApi(patch.status);
  if ("folderId" in patch) corpo.folder_id = patch.folderId ?? null;
  if ("key" in patch) corpo.musical_key = patch.key ?? null;
  if ("bpm" in patch) corpo.bpm = patch.bpm ?? null;
  if ("timeSignature" in patch) corpo.time_signature = patch.timeSignature ?? null;
  if ("tags" in patch) corpo.tags = patch.tags ?? [];
  // Só PRIVATE e PUBLIC: nunca produzimos UNLISTED a partir de um booleano,
  // para não apagar um estado que a tela não sabe representar.
  if ("hidden" in patch) corpo.visibility = patch.hidden ? "PRIVATE" : "PUBLIC";

  return corpo;
}

// ---------------------------------------------------------------- pasta

export function pastaDaApi(f: ApiFolder): Folder {
  return {
    id: f.id,
    name: f.name,
    ownerId: f.owner_id,
    parentId: f.parent_id ?? undefined,
  };
}

// ---------------------------------------------------------------- projeto

const TIPO_PROJETO_DA_API = {
  SINGLE: "single",
  EP: "ep",
  ALBUM: "album",
  OTHER: "single",
} as const;

const STATUS_PROJETO_DA_API = {
  PLANEJAMENTO: "planejamento",
  PRODUCAO: "producao",
  MIXAGEM: "mixagem",
  LANCADO: "lancado",
} as const;

const ESTILO_PROJETO_DA_API = {
  ACUSTICO: "acustico",
  BANDA: "banda",
  AO_VIVO: "ao-vivo",
} as const;

export function projetoDaApi(p: ApiProjectDetail): Project {
  const meta = p.funding_target ?? 0;
  return {
    id: p.id,
    name: p.name,
    type: TIPO_PROJETO_DA_API[p.type],
    style: p.style ? ESTILO_PROJETO_DA_API[p.style] : "banda",
    description: p.description ?? "",
    cover: p.cover_url ?? "",
    releaseDate: p.release_date ?? "",
    estimatedCost: p.estimated_cost ?? 0,
    fundingGoal: meta,
    // A API guarda valor absoluto arrecadado; a tela mostra percentual. O
    // cálculo fica aqui para que o backend nunca tenha um percentual que possa
    // divergir da meta.
    fundingProgress: meta > 0 ? Math.min(100, Math.round((p.funding_current / meta) * 100)) : 0,
    status: STATUS_PROJETO_DA_API[p.status],
    songIds: (p.songs ?? []).map((v) => v.song_id),
    // A API ainda não expõe colaboradores de projeto; a tela trata lista vazia.
    collaboratorIds: [],
    ownerId: p.owner_id,
  };
}

// ---------------------------------------------------------------- usuário

export function usuarioDaApi(u: ApiUserPublic | ApiUserMe): User {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    avatar: u.avatar_url ?? "",
    bio: u.bio ?? "",
    location: {
      city: u.city ?? "",
      country: u.country ?? "",
      // Coordenadas só chegam em /users/me; no perfil público a API não as
      // envia (RN11), e o mapa trata 0,0 como "sem posição".
      lat: "latitude" in u ? (u.latitude ?? 0) : 0,
      lng: "longitude" in u ? (u.longitude ?? 0) : 0,
    },
    followers: 0,
    following: 0,
    // Cor de autor é enfeite de interface, não dado do servidor (decisão D06).
    // Derivada do id para que a mesma pessoa tenha sempre a mesma cor.
    authorColor: corDeAutor(u.id),
  };
}

export function corDeAutor(userId: string): 1 | 2 | 3 | 4 | 5 {
  let soma = 0;
  for (const ch of userId) soma = (soma + ch.charCodeAt(0)) % 5;
  return ((soma % 5) + 1) as 1 | 2 | 3 | 4 | 5;
}
