// Fronteira de serviço para a entidade Song. Funções puras: recebem a fatia
// de estado atual (vinda do store) e devolvem o novo valor — nunca guardam
// cópia própria dos dados. O Zustand (compozeStore) é a única fonte de
// estado; este módulo só encapsula as regras de acesso/mutação para que,
// no futuro, possa ser trocado por um apiSongService sem tocar a UI.
import type { Song, SongBlock, Project } from "@/types";

const uid = () => Math.random().toString(36).slice(2, 10);

export const TRASH_RETENTION_DAYS = 30;

export function isTrashed(song: Song): boolean {
  return !!song.deletedAt;
}

export function getById(songs: Song[], id: string): Song | undefined {
  return songs.find((s) => s.id === id);
}

export function listActive(songs: Song[]): Song[] {
  return songs.filter((s) => !isTrashed(s));
}

export function listTrashed(songs: Song[]): Song[] {
  return songs.filter(isTrashed);
}

export function daysRemaining(song: Song, now: Date = new Date()): number {
  if (!song.deletedAt) return TRASH_RETENTION_DAYS;
  const elapsedMs = now.getTime() - new Date(song.deletedAt).getTime();
  const elapsedDays = Math.floor(elapsedMs / (1000 * 60 * 60 * 24));
  return TRASH_RETENTION_DAYS - elapsedDays;
}

export interface CreateSongInput {
  title: string;
  folderId?: string;
  projectId?: string;
  authorId: string;
}

export function create(
  songs: Song[],
  input: CreateSongInput,
): { songs: Song[]; newId: string } {
  const id = "s_" + uid();
  const now = new Date().toISOString();
  const song: Song = {
    id,
    title: input.title || "Nova canção",
    status: "ideia",
    creatorId: input.authorId,
    collaborators: [{ userId: input.authorId, percentage: 100 }],
    createdAt: now,
    updatedAt: now,
    folderId: input.folderId,
    projectId: input.projectId,
    blocks: [
      { id: uid(), type: "section", label: "Verso 1", text: "", authorId: input.authorId },
      { id: uid(), type: "chord-line", text: "C   G   Am   F", authorId: input.authorId },
      { id: uid(), type: "lyric-line", text: "", authorId: input.authorId },
    ],
  };
  return { songs: [song, ...songs], newId: id };
}

export function update(songs: Song[], id: string, patch: Partial<Song>): Song[] {
  return songs.map((s) =>
    s.id === id ? { ...s, ...patch, updatedAt: new Date().toISOString() } : s,
  );
}

export function updateBlock(
  songs: Song[],
  songId: string,
  blockId: string,
  patch: Partial<SongBlock>,
): Song[] {
  return songs.map((s) =>
    s.id === songId
      ? {
          ...s,
          updatedAt: new Date().toISOString(),
          blocks: s.blocks.map((b) => (b.id === blockId ? { ...b, ...patch } : b)),
        }
      : s,
  );
}

export function addBlock(songs: Song[], songId: string, block: Omit<SongBlock, "id">): Song[] {
  return songs.map((s) =>
    s.id === songId
      ? { ...s, updatedAt: new Date().toISOString(), blocks: [...s.blocks, { ...block, id: uid() }] }
      : s,
  );
}

export function insertBlock(
  songs: Song[],
  songId: string,
  block: Omit<SongBlock, "id">,
  options?: { afterId?: string; beforeId?: string },
): { songs: Song[]; newId: string } {
  const newId = uid();
  const nextSongs = songs.map((s) => {
    if (s.id !== songId) return s;
    const newBlock = { ...block, id: newId } as SongBlock;
    let blocks = s.blocks;
    if (options?.afterId) {
      const idx = s.blocks.findIndex((b) => b.id === options.afterId);
      if (idx === -1) blocks = [...s.blocks, newBlock];
      else blocks = [...s.blocks.slice(0, idx + 1), newBlock, ...s.blocks.slice(idx + 1)];
    } else if (options?.beforeId) {
      const idx = s.blocks.findIndex((b) => b.id === options.beforeId);
      if (idx === -1) blocks = [...s.blocks, newBlock];
      else blocks = [...s.blocks.slice(0, idx), newBlock, ...s.blocks.slice(idx)];
    } else {
      blocks = [...s.blocks, newBlock];
    }
    return { ...s, updatedAt: new Date().toISOString(), blocks };
  });
  return { songs: nextSongs, newId };
}

export function removeBlock(songs: Song[], songId: string, blockId: string): Song[] {
  return songs.map((s) =>
    s.id === songId ? { ...s, blocks: s.blocks.filter((b) => b.id !== blockId) } : s,
  );
}

export function inviteCollaborator(
  songs: Song[],
  songId: string,
  userId: string,
  percentage = 0,
): Song[] {
  const song = songs.find((s) => s.id === songId);
  if (!song || song.collaborators.some((c) => c.userId === userId)) return songs;
  return songs.map((s) =>
    s.id === songId ? { ...s, collaborators: [...s.collaborators, { userId, percentage }] } : s,
  );
}

export function setContribution(
  songs: Song[],
  songId: string,
  userId: string,
  percentage: number,
): Song[] {
  return songs.map((s) =>
    s.id === songId
      ? {
          ...s,
          collaborators: s.collaborators.map((c) =>
            c.userId === userId ? { ...c, percentage } : c,
          ),
        }
      : s,
  );
}

export function toggleHidden(songs: Song[], songId: string): Song[] {
  return songs.map((s) => (s.id === songId ? { ...s, hidden: !s.hidden } : s));
}

// ---------- Soft delete / Lixeira (RN07/RN08) ----------

export function softDelete(songs: Song[], id: string): Song[] {
  const now = new Date().toISOString();
  return songs.map((s) => (s.id === id ? { ...s, deletedAt: now } : s));
}

export function restore(songs: Song[], id: string): Song[] {
  return songs.map((s) => {
    if (s.id !== id) return s;
    const { deletedAt, ...rest } = s;
    return rest as Song;
  });
}

export function permanentDelete(
  songs: Song[],
  projects: Project[],
  id: string,
): { songs: Song[]; projects: Project[] } {
  return {
    songs: songs.filter((s) => s.id !== id),
    projects: projects.map((p) =>
      p.songIds.includes(id) ? { ...p, songIds: p.songIds.filter((sid) => sid !== id) } : p,
    ),
  };
}

// Simula o "processo automatizado" de exclusão definitiva previsto no PRD
// (seção 16 / RN08) sem depender de um servidor: varre a lixeira e expurga
// definitivamente qualquer item além do prazo de retenção.
export function purgeExpired(
  songs: Song[],
  projects: Project[],
  now: Date = new Date(),
): { songs: Song[]; projects: Project[] } {
  const expiredIds = songs
    .filter((s) => isTrashed(s) && daysRemaining(s, now) <= 0)
    .map((s) => s.id);
  if (expiredIds.length === 0) return { songs, projects };
  const expiredSet = new Set(expiredIds);
  return {
    songs: songs.filter((s) => !expiredSet.has(s.id)),
    projects: projects.map((p) =>
      p.songIds.some((sid) => expiredSet.has(sid))
        ? { ...p, songIds: p.songIds.filter((sid) => !expiredSet.has(sid)) }
        : p,
    ),
  };
}
