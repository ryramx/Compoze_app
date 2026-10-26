import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Minus, Pencil, Plus, Trash2 } from "lucide-react";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { ApoioPorPix } from "@/components/compoze/ApoioPorPix";
import { TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Capa } from "@/components/compoze/Capa";
import { Confirmar } from "@/components/compoze/Confirmar";
import { EscolherImagem } from "@/components/compoze/EscolherImagem";
import { Estagio } from "@/components/compoze/Estagio";
import { LivroCaixa } from "@/components/compoze/LivroCaixa";
import { NovoProjeto } from "@/components/compoze/NovoProjeto";
import { PilhaDeMonogramas } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Entrada, Seletor } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { MODO_DEMO } from "@/lib/api";
import { dataLonga } from "@/lib/datas";
import { faixaComNumero, numeroDaFaixa, proximaFaixa } from "@/lib/faixas";
import { useOnline } from "@/lib/rede";
import { ESTILOS_DE_PROJETO, FASES_DE_PROJETO, reais, TIPOS_DE_PROJETO } from "@/lib/rotulos";
import * as lancamentos from "@/services/api/lancamentoService";
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
  const numerar = useCompoze((s) => s.setTrackNumber);
  const [escolhendo, setEscolhendo] = useState(false);
  const [excluindo, setExcluindo] = useState(false);
  const [editando, setEditando] = useState(false);
  // Número da faixa ao adicionar: vazio é automático (depois da maior).
  const [numeroNovo, setNumeroNovo] = useState("");
  const online = useOnline();
  // A mesma consulta do livro-caixa: o custo da ficha passa a ser o lançado.
  const { data: contas = [] } = useQuery({
    queryKey: ["lancamentos", id],
    queryFn: () => lancamentos.listar(id!),
    enabled: online && !!id,
  });

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
  const arrecadado = projeto.fundingRaised ?? Math.round((projeto.fundingGoal * projeto.fundingProgress) / 100);
  const pessoas = [...new Set(faixas.flatMap((f) => f.collaborators.map((c) => c.userId)))];
  const prontas = faixas.filter((f) => ["finalizada", "registrada", "gravada"].includes(f.status)).length;
  const patch = (p: Partial<Project>) => atualizar(projeto.id, p);
  const custoLancado = contas.filter((l) => l.kind === "CUSTO").reduce((t, l) => t + l.amount, 0);
  const proxima = proximaFaixa(projeto);

  function adicionarFaixa(songId: string, titulo: string) {
    const n = numeroNovo.trim() ? Number(numeroNovo) : undefined;
    if (n !== undefined && (!Number.isInteger(n) || n < 1 || n > 999)) {
      toast.error("O número da faixa vai de 1 a 999.");
      return;
    }
    const ocupada = n === undefined ? undefined : faixaComNumero(projeto!, n);
    if (ocupada) {
      toast.error(`A faixa ${n} já é “${musicas.find((m) => m.id === ocupada)?.title ?? "outra canção"}”. Escolha outro número.`);
      return;
    }
    void adicionar(projeto!.id, songId, n);
    setNumeroNovo("");
    toast(`“${titulo}” entrou como faixa ${n ?? proxima}.`);
  }

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
              custoLancado > 0
                ? { rotulo: "Custo", valor: reais(custoLancado), nota: projeto.estimatedCost ? `lançado · estimado ${reais(projeto.estimatedCost)}` : "lançado" }
                : { rotulo: "Custo", valor: projeto.estimatedCost ? reais(projeto.estimatedCost) : "—", nota: "estimado" },
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
            <div className="ml-auto flex gap-2">
              <Botao tamanho="sm" onClick={() => setEditando(true)}>
                <Pencil /> Editar projeto
              </Botao>
              <Botao variante="perigo" tamanho="sm" onClick={() => setExcluindo(true)}>
                <Trash2 /> Excluir
              </Botao>
            </div>
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
            {faixas.map((m) => (
              <li key={m.id} className="group flex items-center gap-3 border-b border-linha py-4 sm:gap-5">
                <NumeroDaFaixa
                  numero={numeroDaFaixa(projeto, m.id)}
                  titulo={m.title}
                  aoMudar={(n) => {
                    const outra = faixaComNumero(projeto, n);
                    numerar(projeto.id, m.id, n);
                    if (outra && outra !== m.id) {
                      toast(`“${m.title}” virou a faixa ${n}; “${musicas.find((x) => x.id === outra)?.title ?? "a outra"}” ficou com o número antigo.`);
                    }
                  }}
                />
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

      {/* Na demonstração não há servidor para guardar a chave nem os apoios. */}
      {!MODO_DEMO && <ApoioPorPix projetoId={projeto.id} />}

      <LivroCaixa projeto={projeto} />

      <Dialogo aberto={escolhendo} aoMudar={setEscolhendo} titulo="Adicionar faixa" descricao={`Canções do seu caderno que ainda não estão em “${projeto.name}”.`}>
        <label className="mb-4 flex items-end gap-3 border-b border-linha pb-4">
          <span className="flex-1">
            <span className="rotulo block">Número da faixa</span>
            <span className="text-[12.5px] text-tinta-3">Vazio segue a ordem: entra como faixa {proxima}.</span>
          </span>
          <Entrada
            type="number"
            inputMode="numeric"
            min={1}
            max={999}
            value={numeroNovo}
            onChange={(e) => setNumeroNovo(e.target.value)}
            placeholder={String(proxima)}
            className="numeral w-20 text-center"
            aria-label="Número da faixa"
          />
        </label>
        {fora.length === 0 ? (
          <p className="font-serif text-tinta-2 italic">Todas as suas canções já estão aqui.</p>
        ) : (
          <ul className="divide-y divide-linha">
            {fora.map((m) => (
              <li key={m.id} className="flex items-center gap-4 py-3">
                <span className="min-w-0 flex-1 truncate font-serif text-[1.1rem]">{m.title}</span>
                <Estagio status={m.status} semRotulo />
                <Botao tamanho="sm" onClick={() => adicionarFaixa(m.id, m.title)}>
                  Adicionar
                </Botao>
              </li>
            ))}
          </ul>
        )}
      </Dialogo>

      {editando && <NovoProjeto aberto aoMudar={setEditando} projeto={projeto} />}

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

/**
 * Número da faixa, que vira campo ao tocar (ADR 0021). Enter ou sair do campo
 * grava; Esc desiste. Número ocupado troca as duas faixas.
 */
function NumeroDaFaixa({ numero, titulo, aoMudar }: { numero: number; titulo: string; aoMudar: (n: number) => void }) {
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState(String(numero));
  const desistiu = useRef(false);

  function gravar() {
    setEditando(false);
    if (desistiu.current) return;
    const n = Number(valor);
    if (Number.isInteger(n) && n >= 1 && n <= 999 && n !== numero) aoMudar(n);
  }

  if (!editando) {
    return (
      <button
        onClick={() => {
          setValor(String(numero));
          desistiu.current = false;
          setEditando(true);
        }}
        className="numeral w-10 shrink-0 border-b border-dashed border-transparent text-left text-[1.1rem] text-tinta-3 transition-colors hover:border-linha-forte hover:text-tinta"
        aria-label={`Faixa ${numero} de ${titulo}. Mudar o número`}
        title="Mudar o número da faixa"
      >
        {String(numero).padStart(2, "0")}
      </button>
    );
  }
  return (
    <input
      autoFocus
      type="number"
      inputMode="numeric"
      min={1}
      max={999}
      value={valor}
      onChange={(e) => setValor(e.target.value)}
      onBlur={gravar}
      onKeyDown={(e) => {
        // Enter só tira o foco: quem grava é o onBlur, uma vez só.
        if (e.key === "Enter") e.currentTarget.blur();
        if (e.key === "Escape") {
          desistiu.current = true;
          e.currentTarget.blur();
        }
      }}
      onFocus={(e) => e.target.select()}
      className="numeral w-10 shrink-0 border-b border-tinta bg-transparent text-[1.1rem] focus:outline-none [&::-webkit-inner-spin-button]:appearance-none"
      aria-label={`Número da faixa de ${titulo}`}
    />
  );
}
