import { useQueryClient } from "@tanstack/react-query";
import { useEffect, useRef } from "react";
import { useLocation, useNavigate } from "react-router";
import { toast } from "sonner";
import { conectarAoVivo } from "@/lib/aoVivo";
import type { ApiConversation } from "@/services/api/dto";
import { guardarMensagem } from "./conversas";
import { useCompoze } from "@/store/compozeStore";

/**
 * Mantém o fluxo ao vivo aberto enquanto há sessão (ADR 0014): mensagem nova
 * entra na conversa em cache, atualiza a lista e, fora da conversa, avisa.
 */
export function AoVivo() {
  const qc = useQueryClient();
  const eu = useCompoze((s) => s.currentUserId);
  const navegar = useNavigate();
  const { pathname } = useLocation();
  const onde = useRef(pathname);
  onde.current = pathname;

  useEffect(() => {
    if (!eu) return;
    return conectarAoVivo({
      aoEvento: (e) => {
        if (e.type === "read") {
          void qc.invalidateQueries({ queryKey: ["conversas"] });
          return;
        }
        const m = e.message;
        guardarMensagem(qc, m);
        // Relê a lista antes de avisar: numa conversa nova, é ela que traz o nome.
        void qc.invalidateQueries({ queryKey: ["conversas"] }).then(() => {
          const aberta = onde.current === `/messages/${m.conversation_id}`;
          if (m.author_id === eu || aberta) return;
          const c = qc.getQueryData<ApiConversation[]>(["conversas"])?.find((x) => x.id === m.conversation_id);
          toast(c ? `${c.other.name.split(" ")[0]}: ${m.content}` : "Mensagem nova", {
            action: { label: "Abrir", onClick: () => navegar(`/messages/${m.conversation_id}`) },
          });
        });
      },
      // Pode ter chegado coisa enquanto a conexão estava caída.
      aoReconectar: () => void qc.invalidateQueries({ queryKey: ["conversas"] }).then(() => qc.invalidateQueries({ queryKey: ["mensagens"] })),
    });
  }, [eu, qc, navegar]);

  return null;
}
