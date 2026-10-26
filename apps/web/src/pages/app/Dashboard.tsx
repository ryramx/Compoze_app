import { useQuery } from "@tanstack/react-query";
import { ArrowRight, Plus } from "lucide-react";
import { Link, useNavigate } from "react-router";
import { Capa } from "@/components/compoze/Capa";
import { ConvitesRecebidos } from "@/components/compoze/ConvitesRecebidos";
import { TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Estagio } from "@/components/compoze/Estagio";
import { Monograma, PilhaDeMonogramas } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { hojePorExtenso, quando, saudacao } from "@/lib/datas";
import { useOnline } from "@/lib/rede";
import { ESTAGIOS, FASES_DE_PROJETO, TIPOS_DE_PROJETO } from "@/lib/rotulos";
import { usuarioDaApi } from "@/services/api/adapters";
import * as gente from "@/services/api/genteService";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { Song } from "@/types";

/** Primeiras linhas com texto de uma canção — o que aparece no "continue de onde parou". */
function trecho(musica: Song, linhas = 4) {
  return musica.blocks.filter((b) => (b.type === "lyric-line" || b.type === "chord-line") && b.text.trim()).slice(0, linhas);
}

/**
 * Resumo em frase do estado do caderno. Uma linha que diz o que pede atenção
 * vale mais do que quatro cartões de estatística.
 */
function resumo(musicas: Song[], euId: string): string {
  const escrevendo = musicas.filter((m) => m.status === "escrita").length;
  const revisao = musicas.filter((m) => m.status === "revisao").length;
  const divisaoAberta = musicas.filter(
    (m) => m.collaborators.length > 1 && m.collaborators.reduce((a, c) => a + c.percentage, 0) !== 100,
  );
  const comOutros = musicas.filter((m) => m.collaborators.some((c) => c.userId !== euId)).length;

  const partes: string[] = [];
  if (escrevendo) partes.push(`${escrevendo} ${escrevendo === 1 ? "canção em escrita" : "canções em escrita"}`);
  if (revisao) partes.push(`${revisao} esperando revisão`);
  let frase = partes.length ? `Você tem ${partes.join(" e ")}.` : "Nada pela metade por aqui.";
  if (divisaoAberta.length) {
    frase += ` A divisão de “${divisaoAberta[0].title}” ainda não fecha 100%.`;
  } else if (comOutros) {
    frase += ` ${comOutros} ${comOutros === 1 ? "obra é escrita" : "obras são escritas"} a mais de uma mão.`;
  }
  return frase;
}

export default function Dashboard() {
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  const euId = useCompoze((s) => s.currentUserId);
  const musicas = listActive(useCompoze((s) => s.songs));
  const projetos = useCompoze((s) => s.projects);
  const online = useOnline();
  // "Na roda": as três publicações mais novas do mural (ADR 0013).
  const { data: roda } = useQuery({ queryKey: ["mural", "roda"], queryFn: () => gente.mural({ limite: 3 }), enabled: online });
  const mural = roda?.items ?? [];
  const getUser = useCompoze((s) => s.getUser);
  const criarMusica = useCompoze((s) => s.createSong);
  const navegar = useNavigate();

  const recentes = [...musicas].sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
  const [ultima, ...outras] = recentes;

  async function novaCancao() {
    const id = await criarMusica({ title: "Sem título" });
    navegar(`/songs/${id}/edit`);
  }

  return (
    <Pagina>
      <header className="animate-[entrar_.35s_ease-out] border-b border-linha pb-8">
        <div className="rotulo mb-4 first-letter:uppercase">{hojePorExtenso()}</div>
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div className="max-w-3xl">
            <h1 className="titulo-pagina">
              {saudacao()}, <em className="text-tinta-2">{eu?.name.split(" ")[0]}</em>.
            </h1>
            <p className="mt-4 max-w-2xl font-serif text-[1.3rem] leading-snug text-tinta-2">{resumo(musicas, euId)}</p>
          </div>
          <Botao variante="tinta" onClick={() => void novaCancao()}>
            <Plus /> Nova canção
          </Botao>
        </div>
      </header>

      <ConvitesRecebidos />

      {!ultima ? (
        <div className="mt-10">
          <Vazio frase="O caderno está em branco. Toda canção começa com uma linha só.">
            <Botao variante="tinta" onClick={() => void novaCancao()}>
              <Plus /> Escrever a primeira
            </Botao>
          </Vazio>
        </div>
      ) : (
        <div className="mt-10 grid gap-x-14 gap-y-12 lg:grid-cols-[minmax(0,1.35fr)_minmax(0,1fr)]">
          {/* Continue de onde parou */}
          <section aria-labelledby="continuar">
            <TituloDeSecao>
              <span id="continuar">Continue de onde parou</span>
            </TituloDeSecao>
            <Link
              to={`/songs/${ultima.id}/edit`}
              className="group block border border-linha bg-folha p-7 transition-colors hover:border-linha-forte md:p-9"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <h2 className="font-serif text-[2rem] leading-tight">{ultima.title}</h2>
                  <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[13px] text-tinta-3">
                    <span>editada {quando(ultima.updatedAt)}</span>
                    {ultima.key && <span className="numeral">{ultima.key}</span>}
                    {ultima.bpm && <span className="numeral">{ultima.bpm} bpm</span>}
                  </div>
                </div>
                <Estagio status={ultima.status} />
              </div>
              <div className="mt-7 space-y-0.5 border-l border-linha pl-5">
                {trecho(ultima).map((b) =>
                  b.type === "chord-line" ? (
                    <div key={b.id} className="numeral pt-2 text-[13px] whitespace-pre text-lapis/90">
                      {b.text}
                    </div>
                  ) : (
                    <p key={b.id} className="font-serif text-[1.2rem] leading-snug">
                      {b.text}
                    </p>
                  ),
                )}
                {trecho(ultima).length === 0 && <p className="font-serif text-tinta-3 italic">Ainda sem letra.</p>}
              </div>
              <div className="mt-7 flex items-center justify-between">
                <PilhaDeMonogramas usuarios={ultima.collaborators.map((c) => getUser(c.userId))} tamanho="sm" />
                <span className="inline-flex items-center gap-1.5 text-sm text-tinta-2 transition-colors group-hover:text-lapis">
                  Abrir no caderno <ArrowRight className="size-4 transition-transform group-hover:translate-x-0.5" />
                </span>
              </div>
            </Link>

            {outras.length > 0 && (
              <ul className="mt-2">
                {outras.slice(0, 5).map((m) => (
                  <li key={m.id}>
                    <Link
                      to={`/songs/${m.id}/edit`}
                      className="group flex items-center gap-4 border-b border-linha py-3.5 transition-colors hover:bg-papel-2/50"
                    >
                      <span className="min-w-0 flex-1 truncate font-serif text-[1.1rem] group-hover:text-lapis">{m.title}</span>
                      <Estagio status={m.status} semRotulo />
                      <span className="w-20 text-right text-[12.5px] text-tinta-3">{quando(m.updatedAt)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <div className="space-y-12">
            {/* Esteira: quantas obras há em cada estágio */}
            <section aria-labelledby="esteira">
              <TituloDeSecao
                acao={
                  <Link to="/songs" className="link-sublinhado text-[13px] text-tinta-2">
                    Todas as canções
                  </Link>
                }
              >
                <span id="esteira">Esteira</span>
              </TituloDeSecao>
              {/* Cartão kraft: a Esteira é o painel de controle da Mesa e não pode sumir no papel. */}
              <ol className="grid grid-cols-3 gap-px border border-kraft-linha bg-kraft-linha sm:grid-cols-6 lg:grid-cols-3 xl:grid-cols-6">
                {ESTAGIOS.map((e, i) => {
                  const n = musicas.filter((m) => m.status === e.valor).length;
                  return (
                    <li key={e.valor}>
                      <Link
                        to={`/songs?estagio=${e.valor}`}
                        className="group flex h-full flex-col justify-between gap-5 bg-kraft p-3 transition-colors hover:bg-folha"
                      >
                        <span className="flex items-center justify-between">
                          <span className="numeral text-[10px] text-tinta-2/80">{String(i + 1).padStart(2, "0")}</span>
                          {/* O lápis marca onde há obra parada; estágio vazio fica sem marca. */}
                          {n > 0 && <span className="h-[2px] w-3 bg-lapis/70 transition-all group-hover:w-5" aria-hidden />}
                        </span>
                        <span>
                          <span className={cn("numeral block text-[1.65rem] leading-none", n === 0 && "text-tinta-3")}>{n}</span>
                          <span className="mt-1 block text-[12px] text-tinta-2">{e.rotulo}</span>
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ol>
            </section>

            {/* Projetos */}
            <section aria-labelledby="projetos">
              <TituloDeSecao
                acao={
                  <Link to="/projects" className="link-sublinhado text-[13px] text-tinta-2">
                    Ver todos
                  </Link>
                }
              >
                <span id="projetos">Projetos em andamento</span>
              </TituloDeSecao>
              {projetos.length === 0 ? (
                <p className="font-serif text-tinta-3 italic">Nenhum projeto ainda.</p>
              ) : (
                <ul className="space-y-4">
                  {projetos.slice(0, 3).map((p) => (
                    <li key={p.id}>
                      <Link to={`/projects/${p.id}`} className="group flex items-center gap-4">
                        <Capa projeto={p} className="w-16 shrink-0" />
                        <div className="min-w-0 flex-1">
                          <div className="rotulo">
                            {TIPOS_DE_PROJETO[p.type]} · {FASES_DE_PROJETO[p.status]}
                          </div>
                          <div className="truncate font-serif text-[1.2rem] group-hover:text-lapis">{p.name}</div>
                          <div className="mt-1.5 flex items-center gap-3">
                            <span className="h-px flex-1 bg-linha">
                              <span className="block h-px bg-tinta" style={{ width: `${p.fundingProgress}%` }} />
                            </span>
                            <span className="numeral text-[11px] text-tinta-3">{p.fundingProgress}%</span>
                          </div>
                        </div>
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Mural */}
            <section aria-labelledby="mural">
              <TituloDeSecao
                acao={
                  <Link to="/feed" className="link-sublinhado text-[13px] text-tinta-2">
                    Abrir mural
                  </Link>
                }
              >
                <span id="mural">Na roda</span>
              </TituloDeSecao>
              {/* Quadro em bege claro, não branco: é o recado pregado na mesa. */}
              <ul className="space-y-4 border border-linha bg-bege p-4 sm:p-5">
                {mural.length === 0 && (
                  <li className="font-serif text-[15px] text-tinta-3 italic">
                    {online ? "Quieto por aqui. Siga quem escreve com você." : "O mural precisa de internet."}
                  </li>
                )}
                {mural.map((f) => (
                  <li key={f.id} className="flex gap-3 border-b border-linha pb-4 last:border-b-0 last:pb-0">
                    <Monograma usuario={getUser(f.author.id) ?? usuarioDaApi(f.author)} tamanho="sm" />
                    <div className="min-w-0 flex-1 text-[14px]">
                      <div>
                        <span className="font-medium">{f.author.name}</span>{" "}
                        <span className="text-tinta-3">· {quando(f.created_at)}</span>
                      </div>
                      <p className="line-clamp-2 text-tinta-2">{f.content}</p>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          </div>
        </div>
      )}
    </Pagina>
  );
}
