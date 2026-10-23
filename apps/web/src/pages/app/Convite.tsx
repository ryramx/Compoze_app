import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { PRECISA_DE_REDE, useOnline } from "@/lib/rede";
import { rotuloDoPapel } from "@/lib/rotulos";
import type { ApiReceivedInvite } from "@/services/api/dto";
import * as convites from "@/services/api/inviteService";
import { useCompoze } from "@/store/compozeStore";

/**
 * Página do link de convite (ADR 0010). Quem chega sem sessão passa pelo
 * login ou cadastro e volta para cá; aqui vê quem convidou e aceita.
 */
export default function Convite() {
  const { token = "" } = useParams();
  const online = useOnline();
  const receber = useCompoze((s) => s.receberMusica);
  const navegar = useNavigate();
  const [convite, setConvite] = useState<ApiReceivedInvite | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [aceitando, setAceitando] = useState(false);

  useEffect(() => {
    if (!online) return;
    let vivo = true;
    setErro(null);
    convites
      .verLink(token)
      .then((c) => vivo && setConvite(c))
      .catch((e) => {
        if (!vivo) return;
        if (e instanceof ApiError && e.status === 404) setErro("Este convite não existe. Confira se o link veio inteiro.");
        else setErro(e instanceof ApiError && e.status !== 0 ? e.message : "Não foi possível abrir o convite.");
      });
    return () => {
      vivo = false;
    };
  }, [token, online]);

  async function aceitar() {
    setAceitando(true);
    try {
      const musica = await convites.aceitarLink(token);
      await receber(musica);
      if (!convite?.already_member) toast(`Agora você escreve “${musica.title}”.`);
      navegar(`/songs/${musica.id}/edit`, { replace: true });
    } catch (e) {
      setErro(e instanceof ApiError && e.status !== 0 ? e.message : "Não foi possível aceitar agora. Tente de novo.");
    } finally {
      setAceitando(false);
    }
  }

  return (
    <Pagina estreita>
      <div className="rotulo mb-4">Convite</div>
      {!online ? (
        <p className="font-serif text-xl text-tinta-2 italic">{PRECISA_DE_REDE}</p>
      ) : erro ? (
        <>
          <h1 className="titulo-pagina max-w-2xl">{erro}</h1>
          <Link to="/" className="link-sublinhado mt-6 inline-block text-tinta-2">
            Ir para a Mesa
          </Link>
        </>
      ) : !convite ? (
        <p className="font-serif text-tinta-2 italic">Abrindo o convite…</p>
      ) : (
        <>
          <h1 className="titulo-pagina max-w-2xl">
            {convite.invited_by?.name ?? "Alguém"} te chamou para escrever <em className="text-tinta-2">“{convite.song_title}”</em>.
          </h1>
          <p className="mt-4 max-w-xl font-serif text-[1.2rem] leading-snug text-tinta-2">
            {convite.already_member
              ? "Você já escreve nesta canção."
              : convite.role === "VIEWER"
                ? "O convite é para ler a canção, sem editar."
                : `Sua parte: ${rotuloDoPapel(convite.role).toLowerCase()}. Na divisão, você começa com 0% até vocês acertarem.`}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Botao variante="tinta" tamanho="lg" disabled={aceitando} onClick={() => void aceitar()}>
              {convite.already_member ? "Abrir a canção" : aceitando ? "Entrando…" : "Aceitar e abrir a canção"}
            </Botao>
            {!convite.already_member && (
              <Botao variante="texto" tamanho="lg" onClick={() => navegar("/", { replace: true })}>
                Agora não
              </Botao>
            )}
          </div>
        </>
      )}
    </Pagina>
  );
}
