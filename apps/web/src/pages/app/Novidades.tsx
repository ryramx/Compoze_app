import { useInfiniteQuery } from "@tanstack/react-query";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { ListaDeNovidades } from "@/components/gente/Novidades";
import { useMarcarVistasAoSair } from "@/components/gente/novidades";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { useOnline } from "@/lib/rede";
import * as novidades from "@/services/api/novidadeService";

/** Todas as novidades (ADR 0023), da mais nova à mais antiga, com "Ver mais". */
export default function Novidades() {
  const online = useOnline();
  const lista = useInfiniteQuery({
    queryKey: ["novidades", "todas"],
    queryFn: ({ pageParam }) => novidades.listar({ antes: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.next_cursor ?? undefined,
    enabled: online,
  });
  const itens = lista.data?.pages.flatMap((p) => p.items);
  useMarcarVistasAoSair(itens);

  return (
    <Pagina estreita>
      <Cabecalho secao="Gente" titulo="Novidades" descricao="O que aconteceu com você e com o que você publicou." />
      <div className="mt-6">
        {!online ? (
          <Vazio frase="As novidades precisam de internet." />
        ) : lista.isPending ? (
          <p className="text-[13px] text-tinta-3 italic">Abrindo…</p>
        ) : !itens?.length ? (
          <Vazio frase="Nada de novo por enquanto. Publique no mural ou chame alguém para escrever com você." />
        ) : (
          <>
            <ListaDeNovidades itens={itens} className="border-b border-linha" />
            {lista.hasNextPage && (
              <div className="mt-6 flex justify-center">
                <Botao variante="texto" disabled={lista.isFetchingNextPage} onClick={() => void lista.fetchNextPage()}>
                  {lista.isFetchingNextPage ? "Abrindo…" : "Ver mais"}
                </Botao>
              </div>
            )}
          </>
        )}
      </div>
    </Pagina>
  );
}
