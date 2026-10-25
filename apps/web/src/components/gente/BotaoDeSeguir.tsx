import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { useOnline } from "@/lib/rede";
import type { ApiProfile } from "@/services/api/dto";
import * as gente from "@/services/api/genteService";

/**
 * Seguir ou deixar de seguir (ADR 0013). Muda na hora e atualiza o perfil em
 * cache; o mural relê, porque quem eu sigo muda o que aparece nele.
 */
export function BotaoDeSeguir({
  pessoaId,
  username,
  sigo,
  aoMudar,
}: {
  pessoaId: string;
  username: string;
  sigo: boolean;
  aoMudar?: (sigo: boolean) => void;
}) {
  const qc = useQueryClient();
  const online = useOnline();
  const [agora, setAgora] = useState(sigo);
  const [ocupado, setOcupado] = useState(false);
  useEffect(() => setAgora(sigo), [sigo]);

  async function alternar() {
    const novo = !agora;
    setAgora(novo);
    setOcupado(true);
    try {
      await (novo ? gente.seguir(pessoaId) : gente.deixarDeSeguir(pessoaId));
      qc.setQueryData<ApiProfile>(["perfil", username], (p) =>
        p ? { ...p, followed_by_me: novo, followers_count: p.followers_count + (novo ? 1 : -1) } : p,
      );
      void qc.invalidateQueries({ queryKey: ["mural", "meu"] });
      aoMudar?.(novo);
    } catch (e) {
      setAgora(!novo);
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Seguir precisa de internet.");
    } finally {
      setOcupado(false);
    }
  }

  return (
    <Botao tamanho="sm" variante={agora ? "contorno" : "tinta"} onClick={() => void alternar()} disabled={!online || ocupado} aria-pressed={agora}>
      {agora ? "Seguindo" : "Seguir"}
    </Botao>
  );
}
