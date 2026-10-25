import { useEffect, useMemo, useRef } from "react";
import { Navigate, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { lerCompartilhado } from "@/lib/compartilhar";
import { useCompoze } from "@/store/compozeStore";

/**
 * Destino do "Compartilhar para o Compoze" (Fase 3b). Cria a canção com o
 * texto recebido e abre no editor. Funciona offline, como qualquer canção
 * nova (ADR 0008). Sai com `replace`: voltar não cria outra.
 */
export default function Compartilhar() {
  const [busca] = useSearchParams();
  const criar = useCompoze((s) => s.createSong);
  const navegar = useNavigate();
  // O StrictMode roda o efeito duas vezes em desenvolvimento.
  const criada = useRef(false);

  const ideia = useMemo(
    () => lerCompartilhado({ title: busca.get("title"), text: busca.get("text"), url: busca.get("url") }),
    [busca],
  );

  useEffect(() => {
    if (!ideia || criada.current) return;
    criada.current = true;
    void criar({ title: ideia.titulo, estrofes: ideia.estrofes }).then((id) => {
      toast("Guardado como ideia.");
      navegar(`/songs/${id}/edit`, { replace: true });
    });
  }, [ideia, criar, navegar]);

  if (!ideia) return <Navigate to="/" replace />;
  return (
    <p className="py-24 text-center font-serif text-tinta-2 italic" role="status">
      Guardando a ideia…
    </p>
  );
}
