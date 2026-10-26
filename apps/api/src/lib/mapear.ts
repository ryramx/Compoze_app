import type {
  Bloco,
  Colaborador,
  DetalheDoProjeto,
  Pasta,
  Projeto,
  ResumoDaCancao,
  UsuarioEu,
  UsuarioPublico,
} from "@compoze/contracts";
import type { folders, projects, songBlocks, songCollaborators, songs, users } from "@compoze/db";

// Linha do banco (camelCase, Date) → formato do contrato (snake_case, ISO).
// Toda resposta passa por aqui: é o único lugar que conhece as duas formas.

const iso = (d: Date) => d.toISOString();
const isoOuNulo = (d: Date | null) => (d ? d.toISOString() : null);

type LinhaDeUsuario = typeof users.$inferSelect;

export function usuarioPublico(u: Omit<LinhaDeUsuario, "location" | "passwordHash">): UsuarioPublico {
  return {
    id: u.id,
    name: u.name,
    username: u.username,
    bio: u.bio,
    avatar_url: u.avatarUrl,
    cover_url: u.coverUrl,
    city: u.city,
    state: u.state,
    country: u.country,
    instruments: u.instruments,
    specialties: u.specialties,
    genres: u.genres,
    external_links: u.externalLinks,
    created_at: iso(u.createdAt),
  };
}

export function usuarioEu(
  u: Omit<LinhaDeUsuario, "location" | "passwordHash">,
  posicao: { lat: number | null; lng: number | null },
): UsuarioEu {
  return {
    ...usuarioPublico(u),
    email: u.email,
    show_on_map: u.showOnMap,
    latitude: posicao.lat,
    longitude: posicao.lng,
  };
}

export function resumoDaCancao(s: typeof songs.$inferSelect): ResumoDaCancao {
  return {
    id: s.id,
    title: s.title,
    status: s.status,
    visibility: s.visibility,
    owner_id: s.ownerId,
    folder_id: s.folderId,
    musical_key: s.musicalKey,
    bpm: s.bpm,
    time_signature: s.timeSignature,
    tags: s.tags,
    contributions_confirmed: s.contributionsConfirmed,
    deleted_at: isoOuNulo(s.deletedAt),
    created_at: iso(s.createdAt),
    updated_at: iso(s.updatedAt),
  };
}

export function bloco(b: typeof songBlocks.$inferSelect): Bloco {
  return {
    id: b.id,
    type: b.type,
    label: b.label,
    content: b.content,
    position: b.position,
    author_id: b.authorId,
    created_at: iso(b.createdAt),
    updated_at: iso(b.updatedAt),
  };
}

export function colaborador(c: typeof songCollaborators.$inferSelect): Colaborador {
  return { id: c.id, user_id: c.userId, role: c.role, contribution_percent: c.contributionPercent };
}

export function pasta(f: typeof folders.$inferSelect): Pasta {
  return {
    id: f.id,
    name: f.name,
    parent_id: f.parentId,
    owner_id: f.ownerId,
    created_at: iso(f.createdAt),
    updated_at: iso(f.updatedAt),
  };
}

export function projeto(p: typeof projects.$inferSelect): Projeto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    type: p.type,
    status: p.status,
    style: p.style,
    release_date: p.releaseDate,
    cover_url: p.coverUrl,
    estimated_cost: p.estimatedCost,
    funding_target: p.fundingTarget,
    funding_current: p.fundingCurrent,
    owner_id: p.ownerId,
    deleted_at: isoOuNulo(p.deletedAt),
    created_at: iso(p.createdAt),
    updated_at: iso(p.updatedAt),
  };
}

export function detalheDoProjeto(
  p: typeof projects.$inferSelect,
  faixas: { songId: string; trackNumber: number }[],
): DetalheDoProjeto {
  return { ...projeto(p), songs: faixas.map((f) => ({ song_id: f.songId, track_number: f.trackNumber })) };
}
