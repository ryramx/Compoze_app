/**
 * Dados de exemplo do modo demonstração, no formato da API.
 *
 * Parte de `src/data/mockData.ts` — a mesma fonte que alimenta feed e mensagens,
 * que ainda não têm backend — e converte para os DTOs. As datas são deslocadas
 * para que a atividade mais recente pareça de hoje: um caderno cuja última
 * edição foi há seis meses passa a impressão de app abandonado.
 */

import * as mock from "@/data/mockData";
import { statusParaApi, tipoDeBlocoParaApi } from "@/services/api/adapters";
import type {
  ApiFolder,
  ApiProject,
  ApiSongDetail,
  ApiUserMe,
} from "@/services/api/dto";

export interface BancoDemo {
  usuarios: ApiUserMe[];
  senhas: Record<string, string>;
  musicas: ApiSongDetail[];
  pastas: ApiFolder[];
  projetos: ApiProject[];
  faixas: { project_id: string; song_id: string; track_number: number | null }[];
}

export const SENHA_DEMO = "compoze";
export const emailDemo = (username: string) => `${username}@compoze.demo`;

const TAGS: Record<string, string[]> = {
  s1: ["madrugada", "violão", "mpb"],
  s2: ["lo-fi", "cidade"],
  s3: ["surf", "verão"],
  s4: ["folk"],
  s5: ["samba"],
  s6: ["soul", "ao vivo"],
};

const TIPO_PROJETO = { single: "SINGLE", ep: "EP", album: "ALBUM" } as const;
const ESTILO = { acustico: "ACUSTICO", banda: "BANDA", "ao-vivo": "AO_VIVO" } as const;
const STATUS_PROJETO = {
  planejamento: "PLANEJAMENTO",
  producao: "PRODUCAO",
  mixagem: "MIXAGEM",
  lancado: "LANCADO",
} as const;

/** Quanto adiantar as datas do mock para que a última edição seja de algumas horas atrás. */
function deslocamento(): number {
  const ultima = Math.max(...mock.songs.map((s) => new Date(s.updatedAt).getTime()));
  return Date.now() - 3 * 3_600_000 - ultima;
}

/** Desloca uma data do mock. Exportado para o feed e as mensagens usarem a mesma régua. */
export function adiantar(iso: string, delta = deslocamento()): string {
  return new Date(new Date(iso).getTime() + delta).toISOString();
}

export function semear(): BancoDemo {
  const delta = deslocamento();
  const d = (iso: string) => adiantar(iso, delta);
  const criadoEm = d("2025-08-01T12:00:00Z");

  const usuarios: ApiUserMe[] = mock.users.map((u) => ({
    id: u.id,
    name: u.name,
    username: u.username,
    email: emailDemo(u.username),
    bio: u.bio,
    // Sem foto de banco de imagens: o monograma com a cor de autor é a
    // identidade visual padrão (docs/frontend/design-system.md).
    avatar_url: null,
    city: u.location.city,
    state: null,
    country: u.location.country,
    instruments: [],
    specialties: [],
    genres: [],
    external_links: u.instagram ? [`https://instagram.com/${u.instagram}`] : [],
    show_on_map: true,
    latitude: u.location.lat,
    longitude: u.location.lng,
    created_at: criadoEm,
  }));

  const musicas: ApiSongDetail[] = mock.songs.map((s) => ({
    id: s.id,
    title: s.title,
    status: statusParaApi(s.status),
    visibility: s.hidden ? "PRIVATE" : "PUBLIC",
    owner_id: s.creatorId,
    folder_id: s.folderId ?? null,
    musical_key: s.key ?? null,
    bpm: s.bpm ?? null,
    time_signature: s.timeSignature ?? "4/4",
    tags: TAGS[s.id] ?? s.tags ?? [],
    contributions_confirmed: s.collaborators.reduce((a, c) => a + c.percentage, 0) === 100,
    deleted_at: null,
    created_at: d(s.createdAt),
    updated_at: d(s.updatedAt),
    description: null,
    blocks: s.blocks.map((b, i) => ({
      // Os ids de bloco do mock se repetem entre músicas; aqui precisam ser únicos.
      id: `${s.id}_${b.id}`,
      type: tipoDeBlocoParaApi(b.type),
      label: b.label ?? null,
      content: b.text,
      position: i,
      author_id: b.authorId,
      created_at: d(s.createdAt),
      updated_at: d(s.updatedAt),
    })),
    collaborators: s.collaborators.map((c, i) => ({
      id: `${s.id}_c${i}`,
      user_id: c.userId,
      role: c.userId === s.creatorId ? "OWNER" : "COMPOSER",
      contribution_percent: c.percentage,
    })),
  }));

  // Uma canção na lixeira, para a tela não nascer vazia.
  musicas.push({
    ...musicas[0],
    id: "s_lixeira",
    title: "Rascunho sem nome",
    status: "IDEIA",
    folder_id: null,
    tags: [],
    deleted_at: new Date(Date.now() - 6 * 86_400_000).toISOString(),
    blocks: [],
    collaborators: [{ id: "s_lixeira_c0", user_id: "u1", role: "OWNER", contribution_percent: 100 }],
  });

  const pastas: ApiFolder[] = mock.folders.map((f) => ({
    id: f.id,
    name: f.name,
    parent_id: f.parentId ?? null,
    owner_id: f.ownerId,
    created_at: criadoEm,
    updated_at: criadoEm,
  }));

  const projetos: ApiProject[] = mock.projects.map((p) => ({
    id: p.id,
    name: p.name,
    description: p.description,
    type: TIPO_PROJETO[p.type],
    status: STATUS_PROJETO[p.status],
    style: ESTILO[p.style],
    release_date: d(p.releaseDate).slice(0, 10),
    cover_url: null,
    estimated_cost: p.estimatedCost,
    funding_target: p.fundingGoal,
    funding_current: Math.round((p.fundingGoal * p.fundingProgress) / 100),
    owner_id: p.ownerId,
    deleted_at: null,
    created_at: criadoEm,
    updated_at: criadoEm,
  }));

  const faixas = mock.projects.flatMap((p) =>
    p.songIds.map((songId, i) => ({ project_id: p.id, song_id: songId, track_number: i + 1 })),
  );

  const senhas = Object.fromEntries(usuarios.map((u) => [u.id, SENHA_DEMO]));

  return { usuarios, senhas, musicas, pastas, projetos, faixas };
}
