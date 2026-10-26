import { useInfiniteQuery, useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Estagio } from "@/components/compoze/Estagio";
import { Monograma } from "@/components/compoze/Monograma";
import { EscolherImagem } from "@/components/compoze/EscolherImagem";
import { BotaoDeSeguir } from "@/components/gente/BotaoDeSeguir";
import { CapaDoPerfil } from "@/components/gente/CapaDoPerfil";
import { Publicacao } from "@/components/gente/Publicacao";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { useOnline } from "@/lib/rede";
import { usuarioDaApi } from "@/services/api/adapters";
import * as gente from "@/services/api/genteService";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";

export default function Profile() {
  const { username } = useParams();
  const pessoas = useCompoze((s) => s.users);
  const euId = useCompoze((s) => s.currentUserId);
  const musicas = listActive(useCompoze((s) => s.songs));
  const getUser = useCompoze((s) => s.getUser);
  const online = useOnline();
  const trocarCapa = useCompoze((s) => s.trocarCapaDoPerfil);

  const local = username ? pessoas.find((u) => u.username === username) : pessoas.find((u) => u.id === euId);
  const arroba = username ?? local?.username ?? "";
  // Seguidores e mural vêm da API (ADR 0013); o resto do perfil, do caderno,
  // para abrir offline quem já aparece nas minhas obras.
  const perfil = useQuery({ queryKey: ["perfil", arroba], queryFn: () => gente.perfil(arroba), enabled: online && !!arroba });
  const pessoa = perfil.data ? { ...usuarioDaApi(perfil.data), ...(local ? { authorColor: local.authorColor } : {}) } : local;
  const mural = useInfiniteQuery({
    queryKey: ["mural", "autora", pessoa?.id],
    queryFn: ({ pageParam }) => gente.mural({ autora: pessoa!.id, antes: pageParam }),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (ultima) => ultima.next_cursor ?? undefined,
    enabled: online && !!pessoa?.id,
  });
  const posts = mural.data?.pages.flatMap((p) => p.items) ?? [];

  if (!pessoa) {
    if (perfil.isPending && online) return <Pagina estreita>{null}</Pagina>;
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">Ninguém com esse nome por aqui.</p>
      </Pagina>
    );
  }

  const souEu = pessoa.id === euId;
  // No próprio perfil: tudo de que participo. No de outra pessoa: só o que ela
  // deixou visível e que eu consigo ver (as obras em comum).
  const obras = musicas.filter((m) => m.collaborators.some((c) => c.userId === pessoa.id) && (souEu || !m.hidden));
  const parcerias = [...new Set(obras.flatMap((m) => m.collaborators.map((c) => c.userId)))].filter((id) => id !== pessoa.id);

  return (
    <Pagina>
      <div className="relative animate-[entrar_.35s_ease-out]">
        <CapaDoPerfil imagem={pessoa.cover} />
        {souEu && (
          // Sobre a foto, numa tira de papel, para ler em qualquer imagem.
          <div className="absolute right-2 bottom-2 bg-papel/90 p-1 sm:right-3 sm:bottom-3">
            <EscolherImagem
              temImagem={!!pessoa.cover}
              rotuloTrocar={pessoa.cover ? "Trocar capa" : "Pôr uma capa"}
              rotuloTirar="Tirar"
              trocar={trocarCapa}
            />
          </div>
        )}
      </div>
      <header className="grid animate-[entrar_.35s_ease-out] gap-6 border-b border-linha pb-10 md:grid-cols-[auto_minmax(0,1fr)_auto] md:items-end md:gap-8">
        {/* A foto sobe sobre a capa, com a borda do papel separando as duas. */}
        <span className="relative z-10 -mt-14 ml-4 grid w-fit rounded-full bg-papel p-1 sm:-mt-16 sm:ml-6">
          <Monograma usuario={pessoa} tamanho="xl" />
        </span>
        <div>
          <div className="rotulo mb-3">
            @{pessoa.username}
            {perfil.data?.follows_me && " · segue você"}
            {pessoa.location.city && ` · ${pessoa.location.city}${pessoa.location.country ? `, ${pessoa.location.country}` : ""}`}
          </div>
          <h1 className="titulo-pagina">{pessoa.name}</h1>
          {pessoa.bio && <p className="mt-4 max-w-xl font-serif text-[1.25rem] leading-snug text-tinta-2">{pessoa.bio}</p>}
        </div>
        <div className="flex gap-2">
          {souEu ? (
            <Link to="/settings">
              <Botao>Editar perfil</Botao>
            </Link>
          ) : (
            <>
              <BotaoDeSeguir pessoaId={pessoa.id} username={pessoa.username} sigo={perfil.data?.followed_by_me ?? false} meSegue={perfil.data?.follows_me} />
              <Link to={`/messages?com=${pessoa.id}`}>
                <Botao variante="texto">Conversar</Botao>
              </Link>
            </>
          )}
        </div>
      </header>

      <dl className="grid grid-cols-2 border-b border-linha sm:grid-cols-4">
        {[
          { rotulo: "Obras", valor: obras.length },
          { rotulo: "Parcerias", valor: parcerias.length },
          { rotulo: "Seguidores", valor: perfil.data?.followers_count ?? "—", para: "seguidores" },
          { rotulo: "Seguindo", valor: perfil.data?.following_count ?? "—", para: "seguindo" },
        ].map((d) => (
          <div
            key={d.rotulo}
            className={cn(
              "relative border-r border-linha py-5 pl-1 last:border-r-0 sm:pl-0",
              d.para && perfil.data && "group transition-colors hover:bg-papel-2/60",
            )}
          >
            <dt className="rotulo">{d.rotulo}</dt>
            <dd className="numeral mt-1 text-[1.6rem] group-hover:text-lapis">{d.valor}</dd>
            {/* Seguidores e Seguindo abrem a lista de pessoas (como no Instagram). */}
            {d.para && perfil.data && (
              <Link to={`/profile/${pessoa.username}/${d.para}`} className="absolute inset-0" aria-label={`Ver ${d.rotulo.toLowerCase()}`} />
            )}
          </div>
        ))}
      </dl>

      <div className="mt-12 grid gap-12 lg:grid-cols-[minmax(0,1fr)_280px]">
        <div className="space-y-14">
        <section>
          <TituloDeSecao>{souEu ? "Suas obras" : "Obras"}</TituloDeSecao>
          {obras.length === 0 ? (
            <Vazio frase={souEu ? "Você ainda não tem obras." : "Nenhuma obra visível."} />
          ) : (
            <ul className="-mt-3">
              {obras.map((m) => (
                <li key={m.id}>
                  <Link to={`/songs/${m.id}/edit`} className="group flex items-center gap-4 border-b border-linha py-3.5">
                    <span className="min-w-0 flex-1 truncate font-serif text-[1.15rem] group-hover:text-lapis">{m.title}</span>
                    <Estagio status={m.status} semRotulo />
                    <span className="w-20 text-right text-[12.5px] text-tinta-3">{quando(m.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
          <section>
            <TituloDeSecao>Mural</TituloDeSecao>
            {!online ? (
              <p className="font-serif text-tinta-3 italic">O mural precisa de internet.</p>
            ) : posts.length === 0 ? (
              <p className="font-serif text-tinta-3 italic">{mural.isPending ? "Abrindo…" : "Nada publicado ainda."}</p>
            ) : (
              <>
                <ol className="space-y-3">
                  {posts.map((p) => (
                    <Publicacao key={p.id} post={p} />
                  ))}
                </ol>
                {mural.hasNextPage && (
                  <Botao className="mt-6" onClick={() => void mural.fetchNextPage()} disabled={mural.isFetchingNextPage}>
                    Mais antigas
                  </Botao>
                )}
              </>
            )}
          </section>
        </div>
        <aside>
          <TituloDeSecao>Escreve com</TituloDeSecao>
          {parcerias.length === 0 ? (
            <p className="font-serif text-tinta-3 italic">Ninguém ainda.</p>
          ) : (
            <ul className="space-y-3">
              {parcerias.map((id) => {
                const u = getUser(id);
                return (
                  <li key={id}>
                    <Link to={`/profile/${u?.username}`} className="flex items-center gap-3 text-[14px] hover:text-lapis">
                      <Monograma usuario={u} tamanho="sm" />
                      <span>
                        {u?.name}
                        <span className="block text-[12px] text-tinta-3">{obras.filter((m) => m.collaborators.some((c) => c.userId === id)).length} em comum</span>
                      </span>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </aside>
      </div>
    </Pagina>
  );
}
