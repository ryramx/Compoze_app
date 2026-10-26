import { api } from "@/lib/api";
import type { ApiComment, ApiFeedPage, ApiPersonInList, ApiPost, ApiProfile, ApiUserPublic } from "@/services/api/dto";

/**
 * Seguir e mural (Fase 4a, ADR 0013). Exigem rede (ADR 0005): as telas usam
 * `useQuery`, sem fila nem cópia no aparelho.
 */

export const perfil = (username: string) => api.get<ApiProfile>(`/profiles/${encodeURIComponent(username)}`);
export const seguir = (userId: string) => api.put<void>(`/users/${userId}/follow`);
export const deixarDeSeguir = (userId: string) => api.delete<void>(`/users/${userId}/follow`);
export const seguidores = (userId: string) => api.get<ApiPersonInList[]>(`/users/${userId}/followers`);
export const seguindo = (userId: string) => api.get<ApiPersonInList[]>(`/users/${userId}/following`);
export const sugestoes = () => api.get<ApiUserPublic[]>("/suggestions/people");

export function mural(opcoes: { autora?: string; antes?: string; limite?: number } = {}) {
  const q = new URLSearchParams();
  if (opcoes.autora) q.set("author_id", opcoes.autora);
  if (opcoes.antes) q.set("before", opcoes.antes);
  if (opcoes.limite) q.set("limit", String(opcoes.limite));
  return api.get<ApiFeedPage>(`/feed${q.size ? `?${q}` : ""}`);
}

export const publicar = (p: { id: string; content: string; song_id?: string | null }) => api.post<ApiPost>("/posts", p);
export const apagar = (postId: string) => api.delete<void>(`/posts/${postId}`);
export const curtir = (postId: string, sim: boolean) =>
  sim ? api.put<ApiPost>(`/posts/${postId}/like`) : api.delete<ApiPost>(`/posts/${postId}/like`);

export const comentarios = (postId: string) => api.get<ApiComment[]>(`/posts/${postId}/comments`);
export const comentar = (postId: string, c: { id: string; content: string }) => api.post<ApiComment>(`/posts/${postId}/comments`, c);
export const apagarComentario = (postId: string, id: string) => api.delete<void>(`/posts/${postId}/comments/${id}`);
