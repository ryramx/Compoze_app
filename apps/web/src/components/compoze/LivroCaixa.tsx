import { CATEGORIAS_DE_CUSTO, CATEGORIAS_DE_ENTRADA, LANCAMENTO_MAX, type TipoDeLancamento } from "@compoze/contracts/lancamentos";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { Plus, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { toast } from "sonner";
import { TituloDeSecao } from "@/components/compoze/Cabecalho";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada } from "@/components/ui/Campo";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { PRECISA_DE_REDE, useOnline } from "@/lib/rede";
import { reais } from "@/lib/rotulos";
import type { ApiEntry } from "@/services/api/dto";
import * as lancamentos from "@/services/api/lancamentoService";
import { useCompoze } from "@/store/compozeStore";
import type { Project } from "@/types";

const motivo = (e: unknown) => (e instanceof ApiError && e.status !== 0 ? e.message : PRECISA_DE_REDE);

/** "2026-10-20" → "20 out". Ao meio-dia, para o fuso não puxar para o dia anterior. */
const dia = (iso: string) => format(new Date(`${iso}T12:00:00`), "d MMM", { locale: ptBR });

const soma = (l: ApiEntry[]) => l.reduce((t, x) => t + x.amount, 0);

/**
 * Livro-caixa do projeto (ADR 0021): o que entrou e o que vai sair. Entrada
 * soma no arrecadado do projeto, junto com os apoios por PIX confirmados;
 * custo itemizado (cachê, estúdio, locação) aparece contra o custo estimado.
 */
export function LivroCaixa({ projeto }: { projeto: Project }) {
  const online = useOnline();
  const cliente = useQueryClient();
  const recarregar = useCompoze((s) => s.loadProject);
  const chave = ["lancamentos", projeto.id];
  const { data: lista = [], isPending } = useQuery({ queryKey: chave, queryFn: () => lancamentos.listar(projeto.id), enabled: online });
  const [abrindo, setAbrindo] = useState<{ tipo: TipoDeLancamento; atual?: ApiEntry } | null>(null);

  const depois = async () => {
    await cliente.invalidateQueries({ queryKey: chave });
    // Entrada muda o arrecadado no servidor.
    await recarregar(projeto.id).catch(() => undefined);
  };
  const terminar = async (gravou: boolean) => {
    setAbrindo(null);
    if (gravou) await depois();
  };
  const apagar = useMutation({
    mutationFn: (l: ApiEntry) => lancamentos.apagar(projeto.id, l.id),
    onSuccess: async (_, l) => {
      await depois();
      toast(`“${l.description}” saiu da conta.`);
    },
    onError: (e) => toast.error(motivo(e)),
  });

  const entradas = lista.filter((l) => l.kind === "ENTRADA");
  const custos = lista.filter((l) => l.kind === "CUSTO");
  const arrecadado = projeto.fundingRaised ?? 0;
  // O que o arrecadado tem além das entradas lançadas: os apoios por PIX confirmados.
  const porPix = Math.max(0, arrecadado - soma(entradas));
  const gasto = soma(custos);
  const saldo = arrecadado - gasto;

  return (
    <section className="mt-16" aria-labelledby="livro-caixa">
      <TituloDeSecao>
        <span id="livro-caixa">Entradas e custos</span>
      </TituloDeSecao>

      {!online ? (
        <p className="font-serif text-tinta-3 italic">Entradas e custos precisam de internet.</p>
      ) : (
        <>
          {/* Resumo: três números, como o rodapé de uma planilha de produção. */}
          <dl className="grid grid-cols-3 gap-px border border-linha bg-linha">
            {[
              { rotulo: "Entrou", valor: reais(arrecadado), nota: projeto.fundingGoal ? `de ${reais(projeto.fundingGoal)}` : "sem meta" },
              { rotulo: "Custos", valor: reais(gasto), nota: projeto.estimatedCost ? `estimado ${reais(projeto.estimatedCost)}` : "sem estimativa" },
              { rotulo: "Saldo", valor: reais(saldo), nota: saldo < 0 ? "falta cobrir" : "sobra", alerta: saldo < 0 },
            ].map((d) => (
              <div key={d.rotulo} className="bg-papel p-3 sm:p-4">
                <dt className="rotulo">{d.rotulo}</dt>
                <dd className={cn("numeral mt-2 text-[1.05rem] leading-none sm:text-[1.3rem]", d.alerta && "text-lapis")}>{d.valor}</dd>
                <dd className="mt-1.5 text-[11.5px] text-tinta-3">{d.nota}</dd>
              </div>
            ))}
          </dl>

          <div className="mt-8 grid gap-10 md:grid-cols-2">
            {(["ENTRADA", "CUSTO"] as const).map((tipo) => {
              const itens = tipo === "ENTRADA" ? entradas : custos;
              return (
                <div key={tipo}>
                  <div className="flex items-baseline justify-between border-b border-linha-forte pb-2">
                    <h3 className="rotulo text-tinta-2">{tipo === "ENTRADA" ? "Entradas" : "Custos de produção"}</h3>
                    <Botao variante="texto" tamanho="sm" onClick={() => setAbrindo({ tipo })}>
                      <Plus /> {tipo === "ENTRADA" ? "Lançar entrada" : "Lançar custo"}
                    </Botao>
                  </div>

                  {abrindo?.tipo === tipo && !abrindo.atual && (
                    <Formulario projetoId={projeto.id} tipo={tipo} aoTerminar={terminar} />
                  )}

                  <ul>
                    {itens.map((l) =>
                      abrindo?.atual?.id === l.id ? (
                        <li key={l.id}>
                          <Formulario projetoId={projeto.id} tipo={tipo} atual={l} aoTerminar={terminar} />
                        </li>
                      ) : (
                        <li key={l.id} className="group flex items-baseline gap-3 border-b border-linha py-3">
                          <button
                            onClick={() => setAbrindo({ tipo, atual: l })}
                            className="min-w-0 flex-1 text-left"
                            aria-label={`Corrigir ${l.description}`}
                          >
                            <span className="block truncate text-[14.5px] group-hover:text-lapis">{l.description}</span>
                            <span className="block text-[12px] text-tinta-3">
                              {[l.category, l.occurred_on && dia(l.occurred_on)].filter(Boolean).join(" · ") || "—"}
                            </span>
                          </button>
                          <span className="numeral text-[14px]">{reais(l.amount)}</span>
                          <button
                            onClick={() => apagar.mutate(l)}
                            className="grid size-7 place-items-center self-center text-tinta-3 opacity-60 group-hover:opacity-100 hover:text-lapis focus:opacity-100"
                            aria-label={`Apagar ${l.description}`}
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </li>
                      ),
                    )}
                    {tipo === "ENTRADA" && porPix > 0 && (
                      <li className="flex items-baseline gap-3 border-b border-linha py-3">
                        <span className="min-w-0 flex-1">
                          <span className="block text-[14.5px]">Apoios recebidos</span>
                          <span className="block text-[12px] text-tinta-3">confirmados no apoio por PIX</span>
                        </span>
                        <span className="numeral text-[14px]">{reais(porPix)}</span>
                        <span className="size-7" />
                      </li>
                    )}
                    {!isPending && itens.length === 0 && !(tipo === "ENTRADA" && porPix > 0) && abrindo?.tipo !== tipo && (
                      <li className="py-3 font-serif text-[15px] text-tinta-3 italic">
                        {tipo === "ENTRADA" ? "Nada entrou ainda. Show, edital, dinheiro da banda: lance aqui." : "Nenhum custo lançado. Cachês, estúdio, locação de espaço."}
                      </li>
                    )}
                  </ul>
                  {itens.length > 0 && (
                    <div className="flex justify-between pt-2.5 text-[12.5px] text-tinta-2">
                      <span>Total</span>
                      <span className="numeral pr-10">{reais(soma(itens) + (tipo === "ENTRADA" ? porPix : 0))}</span>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </>
      )}
    </section>
  );
}

function Formulario({
  projetoId,
  tipo,
  atual,
  aoTerminar,
}: {
  projetoId: string;
  tipo: TipoDeLancamento;
  atual?: ApiEntry;
  aoTerminar: (gravou: boolean) => void | Promise<unknown>;
}) {
  const [descricao, setDescricao] = useState(atual?.description ?? "");
  const [categoria, setCategoria] = useState(atual?.category ?? "");
  const [valor, setValor] = useState(atual ? String(atual.amount) : "");
  const [data, setData] = useState(atual?.occurred_on ?? "");
  const sugestoes = tipo === "ENTRADA" ? CATEGORIAS_DE_ENTRADA : CATEGORIAS_DE_CUSTO;
  const idDaLista = `categorias-${tipo}`;
  const n = Number(valor);
  const valido = descricao.trim().length > 0 && Number.isInteger(n) && n >= 1 && n <= LANCAMENTO_MAX;

  const gravar = useMutation({
    mutationFn: () => {
      const corpo = { description: descricao.trim(), category: categoria.trim() || null, amount: n, occurred_on: data || null };
      return atual ? lancamentos.corrigir(projetoId, atual.id, corpo) : lancamentos.lancar(projetoId, { kind: tipo, ...corpo });
    },
    onSuccess: () => aoTerminar(true),
    onError: (e) => toast.error(motivo(e)),
  });

  function enviar(e: FormEvent) {
    e.preventDefault();
    if (valido) gravar.mutate();
  }

  return (
    <form onSubmit={enviar} className="space-y-4 border-b border-linha bg-folha px-4 py-4">
      <Campo rotulo={tipo === "ENTRADA" ? "De onde veio" : "O que é"}>
        {(id) => (
          <Entrada
            id={id}
            autoFocus
            value={descricao}
            maxLength={160}
            onChange={(e) => setDescricao(e.target.value)}
            placeholder={tipo === "ENTRADA" ? "Ex.: show no Bar do Zé" : "Ex.: cachê do baterista"}
          />
        )}
      </Campo>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-3">
        <Campo rotulo="Valor (R$)">
          {(id) => (
            <Entrada id={id} type="number" min={1} max={LANCAMENTO_MAX} step={1} inputMode="numeric" value={valor} onChange={(e) => setValor(e.target.value)} placeholder="500" className="numeral" />
          )}
        </Campo>
        <Campo rotulo="Categoria">
          {(id) => (
            <>
              <Entrada id={id} list={idDaLista} value={categoria} maxLength={60} onChange={(e) => setCategoria(e.target.value)} placeholder={sugestoes[0]} />
              <datalist id={idDaLista}>
                {sugestoes.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </>
          )}
        </Campo>
        <Campo rotulo="Data" className="col-span-2 sm:col-span-1">
          {(id) => <Entrada id={id} type="date" value={data} onChange={(e) => setData(e.target.value)} />}
        </Campo>
      </div>
      <div className="flex justify-end gap-2">
        <Botao variante="texto" tamanho="sm" onClick={() => void aoTerminar(false)}>
          Cancelar
        </Botao>
        <Botao type="submit" variante="tinta" tamanho="sm" disabled={!valido || gravar.isPending}>
          {gravar.isPending ? "Gravando…" : atual ? "Salvar" : "Lançar"}
        </Botao>
      </div>
    </form>
  );
}
