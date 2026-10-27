import { api } from "@/lib/api";
import type { ApiNotificationPage } from "@/services/api/dto";

/** Novidades da Mesa (ADR 0023). Exigem rede, como o resto da parte social. */

export function listar(opcoes: { antes?: string; limite?: number } = {}) {
  const q = new URLSearchParams({ limit: String(opcoes.limite ?? 30) });
  if (opcoes.antes) q.set("before", opcoes.antes);
  return api.get<ApiNotificationPage>(`/notifications?${q}`);
}

export const marcarVistas = () => api.put<void>("/notifications/seen");
