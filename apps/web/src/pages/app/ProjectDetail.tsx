import { ArrowLeft, Minus, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Capa } from "@/components/compoze/Capa";
import { Confirmar } from "@/components/compoze/Confirmar";
import { EscolherImagem } from "@/components/compoze/EscolherImagem";
import { Estagio } from "@/components/compoze/Estagio";
import { PilhaDeMonogramas } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Seletor } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { dataLonga } from "@/lib/datas";
import { ESTILOS_DE_PROJETO, FASES_DE_PROJETO, reais, TIPOS_DE_PROJETO } from "@/lib/rotulos";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { Project } from "@/types";

export default function ProjectDetail() {
  const { id } = useParams();
  const navegar = useNavigate();
  const projeto = useCompoze((s) => (id ? s.getProject(id) : undefined));
  const musicas = listActive(useCompoze((s) => s.songs));
  const getUser = useCompoze((s) => s.getUser);
  const carregar = useCompoze((s) => s.loadProject);
  const atualizar = useCompoze((s) => s.updateProject);
  const trocarCapa = useCompoze((s) => s.trocarCapa);
  const excluir = useCompoze((s) => s.deleteProject);
  const adicionar = useCompoze((s) => s.addSongToProject);
  const retirar = useCompoze((s) => s.removeSongFromProject);
  const [escolhendo, setEscolhendo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);

  useEffect(() => {
    if (id) void carregar(id).catch(() => undefined);
  }, [id, carregar]);

  if (!projeto) {
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">Projeto não encontrado.</p>
        <Link to="/projects" className="link-sublinhado mt-4 inline-block text-sm">
          Voltar para Projetos
        </Link>
      </Pagina>
    );
  }

  const faixas = projeto.songIds.map((sid) => musicas.find((m) => m.id === sid)).filter(Boolean) as typeof musicas;
  const fora = musicas.filter((m) => !projeto.songIds.includes(m.id));
  const arrecadado = Math.round((projeto.fundingGoal * projeto.fundingProgress) / 100);
  const pessoas = [...new Set(faixas.flatMap((f) => f.collaborators.map((c) => c.userId)))];
  const prontas = faixas.filter((f) => ["finalizada", "registrada", "gravada"].includes(f.status)).length;
  const patch = (p: Partial<Project>) => atualizar(projeto.id, p);

  return (
    <Pagina>
      <Link to="/projects" className="mb-8 inline-flex items-center gap-1.5 text-[13px] text-tinta-2 hover:text-tinta">
        <ArrowLeft className="size-4" /> Projetos
      </Link>

      <div className="grid gap-10 md:grid-cols-[minmax(0,380px)_minmax(0,1fr)] lg:gap-16">
        <div>
          <Capa projeto={projeto} className="shadow-folha" />
          <div className="mt-4">
            <EscolherImagem
              temImagem={!!projeto.cover}
              rotuloTrocar={projeto.cover ? "Trocar capa" : "Pôr uma capa"}
              rotuloTirar="Voltar à capa tipográfica"
              trocar={(arquivo) => trocarCapa(projeto.id, arquivo)}
            />
          </div>
        </div>

        <div className="flex flex-col">
          <div className="rotulo flex flex-wrap gap-x-2">
            <span className="text-lapis">{TIPOS_DE_PROJETO[projeto.type]}</span>
            <span>·</span>
            <span>{ESTILOS_DE_PROJETO[projeto.style]}</span>
          </div>
          <h1 className="titulo-pagina mt-3">{projeto.name}</h1>
          {projeto.description && <p className="mt-4 max-w-xl font-serif text-[1.25rem] leading-snug text-tinta-2">{projeto.description}</p>}

          <dl className="mt-auto grid grid-cols-2 gap-px border border-linha bg-linha pt-0 sm:grid-cols-4">
            {[
              { rotulo: "Faixas", valor: String(faixas.length), nota: `${prontas} prontas` },
              { rotulo: "Lançamento", valor: projeto.releaseDate ? format(new Date(projeto.releaseDate), "MMM yy", { locale: ptBR }) : "—", nota: projeto.releaseDate ? dataLonga(projeto.releaseDate) : "sem data" },
              { rotulo: "Arrecadado", valor: projeto.fundingGoal ? `${projeto.fundingProgress}%` : "—", nota: projeto.fundingGoal ? `${reais(arrecadado)} de ${reais(projeto.fundingGoal)}` : "sem meta" },
              { rotulo: "Custo", valor: projeto.estimatedCost ? reais(projeto.estimatedCost) : "—", nota: "estimado" },
            ].map((d) => (
              <div key={d.rotulo} className="bg-papel p-4">
                <dt className="rotulo">{d.rotulo}</dt>
                <dd className="numeral mt-3 text-[1.35rem] leading-none">{d.valor}</dd>
                <dd className="mt-1.5 text-[12px] text-tinta-3">{d.nota}</dd>
              </div>
            ))}
          </dl>
          {projeto.fundingGoal > 0 && (
            <span className="block h-[3px] bg-linha">
              <span className="block h-[3px] bg-lapis" style={{ width: `${projeto.fundingProgress}%` }} />
            </span>
          )}

          <div className="mt-6 flex flex-wrap items-end gap-6">
            <label className="block w-44">
              <span className="rotulo">Fase</span>
              <Seletor value={projeto.status} onChange={(e) => patch({ status: e.target.value as Project["status"] })} className="text-sm">
                {Object.entries(FASES_DE_PROJETO).map(([v, r]) => (
                  <option key={v} value={v}>
                    {r}
                  </option>
                ))}
              </Seletor>
            </label>
            {pessoas.length > 0 && (
              <div>
                <span className="rotulo mb-2 block">Gente envolvida</span>
                <PilhaDeMonogramas usuarios={pessoas.map(getUser)} tamanho="sm" max={6} />
              </div>
            )}
            <Botao variante="perigo" tamanho="sm" className="ml-auto" onClick={() => setExcluindo(true)}>
              <Trash2 /> Excluir projeto
            </Botao>
          </div>
        </div>
      </div>

      {/* Lista de faixas, como no verso de um disco */}
      <section className="mt-16">
        <TituloDeSecao
          acao={
            <Botao variante="texto" tamanho="sm" onClick={() => setEscolhendo(true)}>
              <Plus /> Adicionar faixa
            </Botao>
          }
        >
          Faixas
        </TituloDeSecao>
        {faixas.length === 0 ? (
          <Vazio frase="Nenhuma faixa ainda. Traga canções do seu caderno para este projeto." />
        ) : (
          <ol>
            {faixas.map((m, i) => (
              <li key={m.id} className="group flex items-center gap-5 border-b border-linha py-4">
                <span className="numeral w-8 text-[1.1rem] text-tinta-3">{String(i + 1).padStart(2, "0")}</span>
                <Link to={`/songs/${m.id}/edit`} className="min-w-0 flex-1">
                  <span className="block truncate font-serif text-[1.3rem] leading-tight group-hover:text-lapis">{m.title}</span>
                  <span className="numeral text-[12px] text-tinta-3">{[m.key, m.bpm && `${m.bpm} bpm`].filter(Boolean).join(" · ") || "—"}</span>
                </Link>
                <PilhaDeMonogramas usuarios={m.collaborators.map((c) => getUser(c.userId))} />
                <Estagio status={m.status} className="hidden w-32 sm:inline-flex" />
                <button
                  onClick={() => {
                    retirar(projeto.id, m.id);
                    toast(`“${m.title}” saiu do projeto. A canção continua no caderno.`);
                  }}
                  className="grid size-8 place-items-center text-tinta-3 opacity-0 group-hover:opacity-100 hover:text-lapis focus:opacity-100"
                  aria-label={`Retirar ${m.title} do projeto`}
                >
                  <Minus className="size-4" />
                </button>
              </li>
            ))}
          </ol>
        )}
      </section>

      <Dialogo aberto={escolhendo} aoMudar={setEscolhendo} titulo="Adicionar faixa" descricao={`Canções do seu caderno que ainda não estão em “${projeto.name}”.`}>
        {fora.length === 0 ? (
          <p className="font-serif text-tinta-2 italic">Todas as suas canções já estão aqui.</p>
        ) : (
          <ul className="divide-y divide-linha">
            {fora.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span className="min-w-0 flex-1 truncate font-serif text-[1.1rem]">{m.title}</span>
                <Estagio status={m.status} semRotulo />
                <Botao
                  tamanho="sm"
                  onClick={() => {
                    void adicionar(projeto.id, m.id);
                    toast(`“${m.title}” entrou como faixa ${faixas.length + 1}.`);
                  }}
                >
                  Adicionar
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </Dialogo>

      <Confirmar
        aberto={excluindo}
        aoMudar={setExcluindo}
        titulo="Excluir este projeto?"
        descricao="As canções não vão junto: continuam no caderno, só deixam de ser faixas deste projeto."
        acao="Excluir projeto"
        aoConfirmar={() => {
          excluir(projeto.id);
          toast(`Projeto “${projeto.name}” excluído.`);
          navegar("/projects");
        }}
      />
    </Pagina>
  );
}
