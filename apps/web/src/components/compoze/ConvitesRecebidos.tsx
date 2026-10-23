import { useEffect, useState } from "react";
import { useNavigate } from "react-router";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { quando } from "@/lib/datas";
import { PRECISA_DE_REDE, useOnline } from "@/lib/rede";
import { rotuloDoPapel } from "@/lib/rotulos";
import { useCompoze } from "@/store/compozeStore";

/**
 * Convites pela conta esperando resposta (ADR 0010), no alto da Mesa. Some
 * quando não há nenhum. Relê ao abrir a Mesa.
 */
export function ConvitesRecebidos() {
  const lista = useCompoze((s) => s.convitesRecebidos);
  const aceitar = useCompoze((s) => s.aceitarConvite);
  const recusar = useCompoze((s) => s.recusarConvite);
  const online = useOnline();
  const navegar = useNavigate();
  const carregar = useCompoze((s) => s.carregarConvites);
  const [ocupado, setOcupado] = useState<string | null>(null);

  // Convite que chegou depois de abrir o app aparece ao voltar para a Mesa.
  useEffect(() => {
    if (online) void carregar().catch(() => undefined);
  }, [online, carregar]);

  if (lista.length === 0) return null;

  async function responder(id: string, sim: boolean) {
    setOcupado(id);
    try {
      if (sim) {
        const musica = await aceitar(id);
        toast(`Agora você escreve “${musica.title}”.`);
        navegar(`/songs/${musica.id}/edit`);
      } else {
        await recusar(id);
      }
    } catch (e) {
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Não foi possível responder agora.");
    } finally {
      setOcupado(null);
    }
  }

  return (
    <section aria-label="Convites" className="border-b border-linha py-6">
      <h2 className="rotulo mb-3 text-tinta-2">{lista.length === 1 ? "Um convite" : `${lista.length} convites`}</h2>
      <ul className="divide-y divide-linha">
        {lista.map((c) => (
          <li key={c.id} className="flex flex-wrap items-center gap-x-4 gap-y-2 py-3">
            <p className="min-w-0 flex-1 font-serif text-[1.1rem] leading-snug">
              {c.invited_by?.name ?? "Alguém"} te chamou para escrever <em>“{c.song_title}”</em>
              <span className="ml-2 font-sans text-[12.5px] text-tinta-3">
                {rotuloDoPapel(c.role)} · {quando(c.created_at)}
              </span>
            </p>
            <div className="flex gap-2">
              <Botao
                tamanho="sm"
                variante="texto"
                disabled={!online || ocupado === c.id}
                title={online ? undefined : PRECISA_DE_REDE}
                onClick={() => void responder(c.id, false)}
              >
                Recusar
              </Botao>
              <Botao
                tamanho="sm"
                variante="tinta"
                disabled={!online || ocupado === c.id}
                title={online ? undefined : PRECISA_DE_REDE}
                onClick={() => void responder(c.id, true)}
              >
                Aceitar
              </Botao>
            </div>
          </li>
        ))}
      </ul>
    </section>
  );
}
