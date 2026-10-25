import { api } from "@/lib/api";
import type { ApiConversation, ApiMessage, ApiMessagePage } from "@/services/api/dto";

/** Conversas (Fase 4b, ADR 0014). Exigem rede; o que chega ao vivo vem de `lib/aoVivo.ts`. */

export const listar = () => api.get<ApiConversation[]>("/conversations");
export const obter = (id: string) => api.get<ApiConversation>(`/conversations/${id}`);
export const abrir = (userId: string) => api.post<ApiConversation>("/conversations", { user_id: userId });

export function mensagens(id: string, antes?: string) {
  const q = new URLSearchParams({ limit: "50" });
  if (antes) q.set("before", antes);
  return api.get<ApiMessagePage>(`/conversations/${id}/messages?${q}`);
}

export const enviar = (id: string, m: { id: string; content: string }) => api.post<ApiMessage>(`/conversations/${id}/messages`, m);
export const marcarLida = (id: string) => api.post<void>(`/conversations/${id}/read`);
