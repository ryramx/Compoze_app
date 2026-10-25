import { useQuery, type InfiniteData, type QueryClient } from "@tanstack/react-query";
import { useOnline } from "@/lib/rede";
import type { ApiMessage, ApiMessagePage } from "@/services/api/dto";
import * as conversas from "@/services/api/conversaService";

/** Põe a mensagem na conversa em cache, se ainda não estiver lá. */
export function guardarMensagem(qc: QueryClient, m: ApiMessage) {
  qc.setQueryData<InfiniteData<ApiMessagePage>>(["mensagens", m.conversation_id], (d) => {
    if (!d || d.pages.some((p) => p.items.some((x) => x.id === m.id))) return d;
    return { ...d, pages: d.pages.map((p, i) => (i === 0 ? { ...p, items: [m, ...p.items] } : p)) };
  });
}

/** Lista de conversas, compartilhada pela tela e pelo contador do menu. */
export function useConversas() {
  const online = useOnline();
  return useQuery({ queryKey: ["conversas"], queryFn: conversas.listar, enabled: online, staleTime: 60_000 });
}

export function useNaoLidas(): number {
  const { data } = useConversas();
  return data?.reduce((n, c) => n + c.unread_count, 0) ?? 0;
}
