import { useQuery } from "@tanstack/react-query";
import { Link, useParams } from "react-router";
import { Vazio } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { BotaoDeSeguir } from "@/components/gente/BotaoDeSeguir";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { useOnline } from "@/lib/rede";
import { usuarioDaApi } from "@/services/api/adapters";
import * as gente from "@/services/api/genteService";
import { useCompoze } from "@/store/compozeStore";

type Lado = "seguidores" | "seguindo";

const ABAS: { lado: Lado; rotulo: string }[] = [
  { lado: "seguidores", rotulo: "Seguidores" },
  { lado: "seguindo", rotulo: "Seguindo" },
];

/**
 * Seguidores e quem a pessoa segue (ADR 0013), abertos pelos números do
 * perfil. Cada linha tem "Mensagem" (abre ou cria a conversa a dois, ADR 0014)
 * e o botão de seguir, que vira "Seguir de volta" para quem já me segue.
 */
export default function Seguidores({ lado }: { lado: Lado }) {
  const { username = "" } = useParams();
  const euId = useCompoze((s) => s.currentUserId);
  const online = useOnline();

  const perfil = useQuery({ queryKey: ["perfil", username], queryFn: () => gente.perfil(username), enabled: online && !!username });
  const dona = perfil.data;
  const lista = useQuery({
    queryKey: ["lista-de-gente", lado, dona?.id],
    queryFn: () => (lado === "seguidores" ? gente.seguidores(dona!.id) : gente.seguindo(dona!.id)),
    enabled: online && !!dona?.id,
  });
  const souEu = dona?.id === euId;
  const contagem = { seguidores: dona?.followers_count, seguindo: dona?.following_count };

  return (
    <Pagina estreita>
      <header className="animate-[entrar_.35s_ease-out]">
        <Link to={souEu ? "/profile" : `/profile/${username}`} className="rotulo hover:text-tinta">
          ← @{username}
        </Link>
        <h1 className="titulo-pagina mt-3">{dona?.name ?? " "}</h1>
      </header>

      <div className="mt-6 flex gap-8 border-b border-linha text-[13.5px]" role="tablist">
        {ABAS.map((a) => {
          const ativo = a.lado === lado;
          return (
            <Link
              key={a.lado}
              to={`/profile/${username}/${a.lado}`}
              replace
              role="tab"
              aria-selected={ativo}
              className={cn(
                "-mb-px flex items-baseline gap-1.5 border-b-2 pb-2.5 transition-colors",
                ativo ? "border-lapis text-tinta" : "border-transparent text-tinta-3 hover:text-tinta-2",
              )}
            >
              {a.rotulo}
              <span className="numeral text-[11px] text-tinta-3">{contagem[a.lado] ?? "—"}</span>
            </Link>
          );
        })}
      </div>

      <div className="mt-2">
        {!online ? (
          <p className="py-8 font-serif text-tinta-3 italic">A lista precisa de internet.</p>
        ) : perfil.isError ? (
          <p className="py-8 font-serif text-tinta-3 italic">Ninguém com esse nome por aqui.</p>
        ) : !lista.data ? (
          <p className="py-8 font-serif text-tinta-3 italic">{lista.isError ? "Não foi possível abrir a lista." : "Abrindo…"}</p>
        ) : lista.data.length === 0 ? (
          <div className="mt-6">
            <Vazio
              frase={
                lado === "seguidores"
                  ? souEu
                    ? "Ninguém segue você ainda."
                    : "Ninguém segue esta pessoa ainda."
                  : souEu
                    ? "Você ainda não segue ninguém."
                    : "Esta pessoa ainda não segue ninguém."
              }
            />
          </div>
        ) : (
          <ul>
            {lista.data.map((p) => {
              const u = usuarioDaApi(p);
              const eu = p.id === euId;
              return (
                <li key={p.id} className="flex items-center gap-3 border-b border-linha py-3.5">
                  <Link to={eu ? "/profile" : `/profile/${p.username}`} className="group flex min-w-0 flex-1 items-center gap-3">
                    <Monograma usuario={u} tamanho="md" />
                    <span className="min-w-0">
                      <span className="line-clamp-2 text-[14.5px] leading-snug font-medium break-words group-hover:text-lapis">{p.name}</span>
                      <span className="block truncate text-[12.5px] text-tinta-3">
                        @{p.username}
                        {p.follows_me && !eu && " · segue você"}
                      </span>
                    </span>
                  </Link>
                  {!eu && (
                    <div className="flex shrink-0 gap-1">
                      <Link to={`/messages?com=${p.id}`}>
                        <Botao tamanho="sm" className="px-2.5 sm:px-3">
                          Mensagem
                        </Botao>
                      </Link>
                      <BotaoDeSeguir
                        pessoaId={p.id}
                        username={p.username}
                        sigo={p.followed_by_me}
                        meSegue={p.follows_me}
                        rotuloQuandoSigo="Deixar de seguir"
                        className="px-2.5 sm:px-3"
                      />
                    </div>
                  )}
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </Pagina>
  );
}
