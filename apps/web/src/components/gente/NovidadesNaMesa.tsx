import { Link } from "react-router";
import { TituloDeSecao } from "@/components/compoze/Cabecalho";
import { ListaDeNovidades } from "@/components/gente/Novidades";
import { useMarcarVistasAoSair, useNovidades } from "@/components/gente/novidades";
import { useOnline } from "@/lib/rede";

const NA_MESA = 5;

/**
 * Novidades no alto da Mesa (ADR 0023): mensagens, comentários, curtidas,
 * seguidores, convites aceitos e apoios, as mais novas primeiro. Convite
 * esperando resposta fica de fora porque já aparece logo acima, com os botões.
 */
export function NovidadesNaMesa() {
  const online = useOnline();
  const { data, isPending } = useNovidades();
  const itens = data?.items.filter((n) => n.kind !== "INVITE").slice(0, NA_MESA);
  useMarcarVistasAoSair(itens);
  const novas = data?.unread_count ?? 0;

  return (
    <section aria-labelledby="novidades" className="mt-8">
      <TituloDeSecao
        acao={
          <Link to="/novidades" className="link-sublinhado text-[13px] text-tinta-2">
            Ver todas
          </Link>
        }
      >
        <span id="novidades">Novidades</span>
        {novas > 0 && <span className="ml-2 text-lapis normal-case">{novas === 1 ? "· 1 nova" : `· ${novas} novas`}</span>}
      </TituloDeSecao>
      {!online ? (
        <p className="py-3 font-serif text-[15px] text-tinta-3 italic">As novidades precisam de internet.</p>
      ) : isPending ? (
        <p className="py-3 text-[13px] text-tinta-3 italic">Abrindo…</p>
      ) : !itens?.length ? (
        <p className="py-3 font-serif text-[15px] text-tinta-3 italic">
          Nada de novo. Quando alguém escrever para você, comentar, curtir ou seguir, aparece aqui.
        </p>
      ) : (
        <ListaDeNovidades itens={itens} />
      )}
    </section>
  );
}
