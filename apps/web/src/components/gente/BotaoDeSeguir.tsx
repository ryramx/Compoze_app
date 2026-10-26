import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { useOnline } from "@/lib/rede";
import type { ApiPersonInList, ApiProfile } from "@/services/api/dto";
import * as gente from "@/services/api/genteService";

/**
 * Seguir ou deixar de seguir (ADR 0013). Muda na hora e atualiza o perfil e
 * as listas de seguidores em cache; o mural relê, porque quem eu sigo muda o
 * que aparece nele. Quem já me segue e eu não sigo ganha "Seguir de volta".
 */
export function BotaoDeSeguir({
  pessoaId,
  username,
  sigo,
  meSegue = false,
  rotuloQuandoSigo = "Seguindo",
  tamanho = "sm",
  className,
  aoMudar,
}: {
  pessoaId: string;
  username: string;
  sigo: boolean;
  meSegue?: boolean;
  /** No perfil, "Seguindo"; na lista de pessoas, "Deixar de seguir". */
  rotuloQuandoSigo?: string;
  tamanho?: "sm" | "md";
  className?: string;
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
      // Nas listas abertas a pessoa fica onde está (como no Instagram), só o
      // botão muda; o meu "Seguindo" conta de novo pelo perfil.
      qc.setQueriesData<ApiPersonInList[]>({ queryKey: ["lista-de-gente"] }, (l) =>
        l?.map((x) => (x.id === pessoaId ? { ...x, followed_by_me: novo } : x)),
      );
      void qc.invalidateQueries({ queryKey: ["perfil"], predicate: (q) => q.queryKey[1] !== username });
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
    <Botao
      tamanho={tamanho}
      variante={agora ? "contorno" : "tinta"}
      className={className}
      onClick={() => void alternar()}
      disabled={!online || ocupado}
      aria-pressed={agora}
    >
      {agora ? rotuloQuandoSigo : meSegue ? "Seguir de volta" : "Seguir"}
    </Botao>
  );
}
