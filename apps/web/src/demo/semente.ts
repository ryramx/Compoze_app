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
  ApiInvite,
  ApiProject,
  ApiSongDetail,
  ApiUserMe,
  ApiVersion,
  ApiEntry,
  ApiVoiceMemo,
} from "@/services/api/dto";

export interface BancoDemo {
  usuarios: ApiUserMe[];
  senhas: Record<string, string>;
  musicas: ApiSongDetail[];
  pastas: ApiFolder[];
  projetos: ApiProject[];
  faixas: { project_id: string; song_id: string; track_number: number | null }[];
  /** Versões das canções (ADR 0009). Opcional: dados salvos antes delas não têm. */
  versoes?: ApiVersion[];
  /** Convites (ADR 0010). O token fica guardado em claro: é só demonstração. */
  convites?: ConviteDemo[];
  /** Memos de voz (ADR 0012): só os dados; o áudio fica no IndexedDB. */
  memos?: ApiVoiceMemo[];
  /** Gente (ADR 0013). Opcionais: dados salvos antes delas ganham os de exemplo. */
  seguindo?: SeguirDemo[];
  posts?: PostDemo[];
  comentarios?: ComentarioDemo[];
  /** Conversas (ADR 0014). */
  conversas?: ConversaDemo[];
  /** Entradas e custos dos projetos (ADR 0021). */
  lancamentos?: ApiEntry[];
  /** Novidades da Mesa (ADR 0023): até quando cada pessoa já viu. */
  novidadesVistas?: Record<string, string>;
}

export interface ConversaDemo {
  id: string;
  membros: string[];
  lida: Record<string, string | null>;
  criada: string;
  mensagens: { id: string; author_id: string; content: string; created_at: string }[];
}

/** Conversas de exemplo (Fase 4b), as mesmas do protótipo. */
export function conversasDeExemplo(): ConversaDemo[] {
  const delta = deslocamento();
  return mock.conversations.map((c) => {
    const mensagens = c.messages.map((m) => ({ id: `${c.id}_${m.id}`, author_id: m.fromId, content: m.content, created_at: adiantar(m.timestamp, delta) }));
    // Só a última conversa fica com mensagem por ler, para o contador aparecer.
    const lida = c.id === "c1" ? null : (mensagens.at(-1)?.created_at ?? null);
    return { id: c.id, membros: [mock.CURRENT_USER_ID, c.withUserId], lida: { [mock.CURRENT_USER_ID]: lida, [c.withUserId]: mensagens.at(-1)?.created_at ?? null }, criada: mensagens[0]?.created_at ?? adiantar("2026-04-01T00:00:00Z", delta), mensagens };
  });
}

export interface SeguirDemo {
  follower_id: string;
  followed_id: string;
  created_at: string;
}
export interface PostDemo {
  id: string;
  author_id: string;
  content: string;
  song_id: string | null;
  created_at: string;
  curtidas: string[];
}
export interface ComentarioDemo {
  id: string;
  post_id: string;
  author_id: string;
  content: string;
  created_at: string;
}

/** Quem segue quem, publicações e comentários de exemplo (Fase 4a). */
export function genteDeExemplo(): Required<Pick<BancoDemo, "seguindo" | "posts" | "comentarios">> {
  const delta = deslocamento();
  const quando = (iso: string) => adiantar(iso, delta);
  const outros = mock.users.map((u) => u.id).filter((id) => id !== mock.CURRENT_USER_ID);
  const seguindo: SeguirDemo[] = [
    ...mock.follows.map((f) => ({ follower_id: f.followerId, followed_id: f.followingId, created_at: quando("2026-03-01T12:00:00Z") })),
    // Quem segue a Lara, para o perfil dela não nascer vazio.
    ...outros.slice(0, 3).map((id) => ({ follower_id: id, followed_id: mock.CURRENT_USER_ID, created_at: quando("2026-03-02T12:00:00Z") })),
  ];
  const posts: PostDemo[] = mock.feed.map((f, i) => ({
    id: `post_${f.id}`,
    author_id: f.userId,
    content: f.content ?? "",
    song_id: f.songId ?? null,
    created_at: quando(f.timestamp),
    curtidas: [...mock.users.map((u) => u.id)].filter((id) => id !== f.userId).slice(0, (i % 3) + 1),
  }));
  const comentarios: ComentarioDemo[] = [
    { id: "com_1", post_id: "post_fi1", author_id: "u2", content: "Que ponte bonita nessa.", created_at: quando("2026-04-20T11:00:00Z") },
    { id: "com_2", post_id: "post_fi3", author_id: "u5", content: "Topo! Me chama.", created_at: quando("2026-04-19T14:00:00Z") },
  ];
  return { seguindo, posts, comentarios };
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
    cover_url: null,
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

  // Custos itemizados do EP, para a tela de projeto não abrir vazia.
  const custo = (id: string, description: string, category: string, amount: number): ApiEntry => ({
    id,
    project_id: "p1",
    kind: "CUSTO",
    description,
    category,
    amount,
    occurred_on: null,
    created_at: criadoEm,
    updated_at: criadoEm,
  });
  const lancamentos = [
    custo("l1", "Cachê do violoncelo (3 faixas)", "Cachê", 1800),
    custo("l2", "Diárias de estúdio", "Estúdio", 6400),
    custo("l3", "Mixagem e masterização", "Mixagem", 4200),
  ];

  return { usuarios, senhas, musicas, pastas, projetos, faixas, lancamentos, ...genteDeExemplo(), conversas: conversasDeExemplo() };
}

export type ConviteDemo = ApiInvite & {
  token: string | null;
  accepted_at: string | null;
  declined_at: string | null;
  revoked_at: string | null;
};
