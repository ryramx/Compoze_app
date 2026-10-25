import { useInfiniteQuery, useMutation, useQuery, useQueryClient, type InfiniteData } from "@tanstack/react-query";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { BotaoDeSeguir } from "@/components/gente/BotaoDeSeguir";
import { Publicacao } from "@/components/gente/Publicacao";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { useOnline } from "@/lib/rede";
import { uuidv7 } from "@/lib/uuidv7";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiFeedPage } from "@/services/api/dto";
import * as gente from "@/services/api/genteService";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";

const PUBLICACAO_MAX = 1000;

/** Mural (Fase 4a, ADR 0013): o que eu e quem eu sigo publicamos. */
export default function Feed() {
  const qc = useQueryClient();
  const online = useOnline();
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  // Só dá para citar canção que não seja privada (a API confere de novo).
  const citaveis = listActive(useCompoze((s) => s.songs)).filter((m) => !m.hidden);
  const [texto, setTexto] = useState("");
  const [cancao, setCancao] = useState("");

  const mural = useInfiniteQuery({
    queryKey: ["mural", "meu"],
    queryFn: ({ pageParam }) => gente.mural({ antes: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.next_cursor ?? undefined,
    enabled: online,
  });
  const { data: sugestoes = [] } = useQuery({ queryKey: ["sugestoes"], queryFn: gente.sugestoes, enabled: online });

  const publicar = useMutation({
    mutationFn: () => gente.publicar({ id: uuidv7(), content: texto.trim(), song_id: cancao || null }),
    onSuccess: (post) => {
      qc.setQueryData<InfiniteData<ApiFeedPage>>(["mural", "meu"], (d) =>
        d ? { ...d, pages: d.pages.map((pg, i) => (i === 0 ? { ...pg, items: [post, ...pg.items] } : pg)) } : d,
      );
      void qc.invalidateQueries({ queryKey: ["mural"], predicate: (q) => q.queryKey[1] !== "meu" });
      setTexto("");
      setCancao("");
    },
    onError: (e) => toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Publicar precisa de internet."),
  });

  const posts = mural.data?.pages.flatMap((p) => p.items) ?? [];

  return (
    <Pagina estreita>
      <Cabecalho secao="Gente" titulo="Mural" descricao="O que está saindo do caderno de quem você acompanha." />

      <form
        className="mt-8 flex gap-4 border-b border-linha pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) publicar.mutate();
        }}
      >
        <Monograma usuario={eu} tamanho="md" />
        <div className="min-w-0 flex-1">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            maxLength={PUBLICACAO_MAX}
            disabled={!online}
            placeholder={online ? "No que você está trabalhando?" : "O mural precisa de internet."}
            className="w-full resize-none bg-transparent font-serif text-[1.2rem] leading-snug placeholder:text-tinta-3 focus:outline-none"
            aria-label="Nova publicação"
          />
          <div className="mt-2 flex flex-wrap items-center justify-end gap-3">
            {citaveis.length > 0 && (
              <select
                value={cancao}
                onChange={(e) => setCancao(e.target.value)}
                disabled={!online}
                className="min-w-0 max-w-full truncate border-b border-linha-forte bg-transparent py-1 text-[13px] text-tinta-2 focus:outline-none"
                aria-label="Citar uma canção"
              >
                <option value="">Sem canção</option>
                {citaveis.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.title}
                  </option>
                ))}
              </select>
            )}
            <Botao type="submit" tamanho="sm" variante="tinta" disabled={!online || !texto.trim() || publicar.isPending}>
              Publicar
            </Botao>
          </div>
        </div>
      </form>

      {sugestoes.length > 0 && (
        <section className="border-b border-linha py-6" aria-labelledby="sugestoes">
          <h2 id="sugestoes" className="rotulo mb-4">
            Escrevem com você
          </h2>
          <ul className="space-y-3">
            {sugestoes.slice(0, 4).map((u) => (
              <li key={u.id} className="flex items-center gap-3">
                <Monograma usuario={usuarioDaApi(u)} tamanho="sm" />
                <Link to={`/profile/${u.username}`} className="min-w-0 flex-1 truncate text-[14px] hover:text-lapis">
                  {u.name} <span className="text-tinta-3">@{u.username}</span>
                </Link>
                <BotaoDeSeguir pessoaId={u.id} username={u.username} sigo={false} aoMudar={() => void qc.invalidateQueries({ queryKey: ["sugestoes"] })} />
              </li>
            ))}
          </ul>
        </section>
      )}

      {!online && posts.length === 0 ? (
        <p className="py-16 text-center font-serif text-tinta-2 italic">O mural precisa de internet.</p>
      ) : mural.isPending ? (
        <p className="py-16 text-center font-serif text-tinta-2 italic">Abrindo o mural…</p>
      ) : mural.isError ? (
        <div className="py-16 text-center">
          <p className="font-serif text-tinta-2 italic">Não foi possível abrir o mural.</p>
          <Botao className="mt-4" onClick={() => void mural.refetch()}>
            Tentar de novo
          </Botao>
        </div>
      ) : posts.length === 0 ? (
        <div className="mt-8">
          <Vazio frase="Ninguém publicou ainda. Siga quem escreve com você, ou conte no que está trabalhando." />
        </div>
      ) : (
        <>
          <ol>
            {posts.map((p) => (
              <Publicacao key={p.id} post={p} />
            ))}
          </ol>
          {mural.hasNextPage && (
            <div className="flex justify-center py-8">
              <Botao onClick={() => void mural.fetchNextPage()} disabled={mural.isFetchingNextPage}>
                {mural.isFetchingNextPage ? "Carregando…" : "Mais antigas"}
              </Botao>
            </div>
          )}
        </>
      )}
    </Pagina>
  );
}
