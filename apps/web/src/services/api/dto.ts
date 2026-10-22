/**
 * Tipos como o backend os devolve — `snake_case`, enums em maiúsculas.
 *
 * Eles vivem separados dos tipos de domínio em `src/types/` de propósito. O
 * contrato da API e o modelo que a interface usa divergem em vários pontos
 * (ver docs/backend/contrato-da-api.md), e misturar os
 * dois espalharia a tradução por todas as telas. Aqui e em `adapters.ts` é o
 * único lugar que conhece as duas formas.
 */

export type ApiSongStatus =
  | "IDEIA"
  | "ESCRITA"
  | "REVISAO"
  | "FINALIZADA"
  | "REGISTRADA"
  | "GRAVADA"
  | "ARQUIVADA"
  | "CANCELADA";

export type ApiVisibility = "PUBLIC" | "PRIVATE" | "UNLISTED";

export type ApiBlockType = "SECTION" | "LYRIC" | "CHORD" | "NOTE";

export type ApiCollaboratorRole =
  | "OWNER"
  | "COMPOSER"
  | "LYRICIST"
  | "MUSICIAN"
  | "PRODUCER"
  | "VIEWER";

export interface ApiTokenPair {
  access_token: string;
  refresh_token: string;
  token_type: string;
}

export interface ApiUserPublic {
  id: string;
  name: string;
  username: string;
  bio: string | null;
  avatar_url: string | null;
  city: string | null;
  state: string | null;
  country: string | null;
  instruments: string[];
  specialties: string[];
  genres: string[];
  external_links: string[];
  created_at: string;
}

export interface ApiUserMe extends ApiUserPublic {
  email: string;
  show_on_map: boolean;
  latitude: number | null;
  longitude: number | null;
}

export interface ApiBlock {
  id: string;
  type: ApiBlockType;
  label: string | null;
  content: string;
  position: number;
  author_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiCollaborator {
  id: string;
  user_id: string;
  role: ApiCollaboratorRole;
  contribution_percent: number | null;
}

export interface ApiSongSummary {
  id: string;
  title: string;
  status: ApiSongStatus;
  visibility: ApiVisibility;
  owner_id: string;
  folder_id: string | null;
  musical_key: string | null;
  bpm: number | null;
  time_signature: string | null;
  tags: string[];
  contributions_confirmed: boolean;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiSongDetail extends ApiSongSummary {
  description: string | null;
  blocks: ApiBlock[];
  collaborators: ApiCollaborator[];
}

export interface ApiTrashItem extends ApiSongSummary {
  days_remaining: number;
}

export interface ApiFolder {
  id: string;
  name: string;
  parent_id: string | null;
  owner_id: string;
  created_at: string;
  updated_at: string;
}

export interface ApiProject {
  id: string;
  name: string;
  description: string | null;
  type: "SINGLE" | "EP" | "ALBUM" | "OTHER";
  status: "PLANEJAMENTO" | "PRODUCAO" | "MIXAGEM" | "LANCADO";
  style: "ACUSTICO" | "BANDA" | "AO_VIVO" | null;
  release_date: string | null;
  cover_url: string | null;
  estimated_cost: number | null;
  funding_target: number | null;
  funding_current: number;
  owner_id: string;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface ApiProjectDetail extends ApiProject {
  songs: { song_id: string; track_number: number | null }[];
}
