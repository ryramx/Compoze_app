import { api } from "@/lib/api";
import type { ApiVoiceMemo } from "@/services/api/dto";

/** Memos de voz (Fase 3c, ADR 0012). Quem guarda no aparelho é `lib/memos.ts`. */

export const listar = (songId: string) => api.get<ApiVoiceMemo[]>(`/songs/${songId}/memos`);

export function subir(songId: string, memo: { id: string; audio: Blob; durationMs: number; title: string }) {
  const q = new URLSearchParams({ duration_ms: String(Math.round(memo.durationMs)), title: memo.title });
  return api.subir<ApiVoiceMemo>(`/songs/${songId}/memos/${memo.id}?${q}`, memo.audio);
}

export const audio = (songId: string, memoId: string) => api.baixar(`/songs/${songId}/memos/${memoId}/audio`);

export const renomear = (songId: string, memoId: string, title: string) =>
  api.patch<ApiVoiceMemo>(`/songs/${songId}/memos/${memoId}`, { title });

export const apagar = (songId: string, memoId: string) => api.delete<void>(`/songs/${songId}/memos/${memoId}`);
