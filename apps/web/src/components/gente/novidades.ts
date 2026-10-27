import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useOnline } from "@/lib/rede";
import type { ApiNotification } from "@/services/api/dto";
import * as novidades from "@/services/api/novidadeService";

/**
 * Novidades (ADR 0023), compartilhadas pela Mesa, pela tela de Novidades e
 * pelo contador do menu. Relê a cada minuto com o app aberto; mensagem que
 * chega ao vivo já pede releitura (`AoVivo.tsx`).
 */
export function useNovidades() {
  const online = useOnline();
  return useQuery({
    queryKey: ["novidades"],
    queryFn: () => novidades.listar({ limite: 30 }),
    enabled: online,
    staleTime: 30_000,
    refetchInterval: 60_000,
  });
}

export function useNovidadesNaoLidas(): number {
  return useNovidades().data?.unread_count ?? 0;
}

/**
 * Ao sair da tela, o que ela mostrou como novo passa a visto. Enquanto a
 * pessoa está olhando, o destaque fica: some só na próxima visita.
 */
export function useMarcarVistasAoSair(itens: ApiNotification[] | undefined) {
  const qc = useQueryClient();
  const temNovas = useRef(false);
  // Mensagem não lida não conta: ela se lê na conversa, não aqui.
  temNovas.current = itens?.some((n) => n.unread && n.kind !== "MESSAGE") ?? false;
  useEffect(
    () => () => {
      if (!temNovas.current) return;
      void novidades
        .marcarVistas()
        .then(() => qc.invalidateQueries({ queryKey: ["novidades"] }))
        .catch(() => undefined);
    },
    [qc],
  );
}
