import { FileUp } from "lucide-react";
import { useRef, useState, type DragEvent } from "react";
import { Botao } from "@/components/ui/Botao";
import { AreaDeTexto, Campo, Entrada } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { ACEITOS, ArquivoRecusado, lerArquivoDeLetra } from "@/lib/arquivoDeLetra";
import { cn } from "@/lib/cn";
import { lerCancao, resumoDaImportacao, tituloDoArquivo, type CancaoImportada } from "@/lib/importar";

/**
 * "Importar" (ADR 0024): um PDF, Word, Markdown ou texto com cifra vira
 * canção do Compoze. A pessoa vê a prévia antes: o que virou seção, cifra,
 * verso e nota, e a ficha que veio junto.
 *
 * `destino` diz para onde vai: uma canção nova (Canções) ou a canção aberta
 * no editor (acrescentar no fim ou substituir a folha). Em Canções dá para
 * escolher vários arquivos de uma vez: cada arquivo vira uma canção nova
 * (ADR 0026).
 */
export type DestinoDaImportacao =
  | {
      tipo: "nova";
      aoCriar: (c: CancaoImportada) => Promise<void> | void;
      aoCriarVarias: (cs: CancaoImportada[]) => Promise<void> | void;
    }
  | { tipo: "cancao"; folhaVazia: boolean; aoAplicar: (c: CancaoImportada, modo: "acrescentar" | "substituir") => void };

/** Arquivos de uma vez: o mesmo teto da exportação em lote. */
export const MAXIMO_DE_ARQUIVOS = 50;

interface ItemDoLote {
  arquivo: string;
  estado: "esperando" | "pronto" | "erro";
  cancao?: CancaoImportada;
  erro?: string;
  incluir: boolean;
}

type Etapa =
  | { nome: "escolher" }
  | { nome: "lendo" }
  | { nome: "previa"; cancao: CancaoImportada; aviso?: string }
  | { nome: "lote"; itens: ItemDoLote[]; sobraram: number };

const ERRO_DE_LEITURA = "Não deu para ler este arquivo. Ele pode estar corrompido ou protegido por senha.";

/** Lê um arquivo até virar canção; recusa o que não tem letra. */
async function cancaoDoArquivo(arquivo: File): Promise<{ cancao: CancaoImportada; aviso?: string }> {
  const { texto, formato, aviso } = await lerArquivoDeLetra(arquivo);
  const cancao = lerCancao(texto, formato, tituloDoArquivo(arquivo.name));
  if (cancao.blocos.length === 0) throw new ArquivoRecusado("Não achamos letra nem cifra neste arquivo.");
  return { cancao, aviso };
}

export function Importar({
  aberto,
  aoMudar,
  destino,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  destino: DestinoDaImportacao;
}) {
  const [etapa, setEtapa] = useState<Etapa>({ nome: "escolher" });
  const [erro, setErro] = useState<string | null>(null);
  const [colando, setColando] = useState(false);
  const [colado, setColado] = useState("");
  const [titulo, setTitulo] = useState("");
  const [arrastando, setArrastando] = useState(false);
  const [criando, setCriando] = useState(false);
  const [vendo, setVendo] = useState<number | null>(null);
  const varios = destino.tipo === "nova";
  const entrada = useRef<HTMLInputElement>(null);
  // Cada leitura de lote tem um número; "Escolher outros" ou fechar a janela
  // no meio troca o número, e a leitura antiga para de mexer na tela.
  const leitura = useRef(0);

  function recomecar() {
    leitura.current++;
    setVendo(null);
    setEtapa({ nome: "escolher" });
    setErro(null);
    setColado("");
    setColando(false);
  }

  function mudar(v: boolean) {
    if (!v) recomecar();
    aoMudar(v);
  }

  function mostrar(cancao: CancaoImportada, aviso?: string) {
    if (cancao.blocos.length === 0) {
      setEtapa({ nome: "escolher" });
      setErro("Não achamos letra nem cifra neste arquivo.");
      return;
    }
    setTitulo(cancao.titulo);
    setEtapa({ nome: "previa", cancao, aviso });
  }

  async function ler(arquivo: File) {
    setErro(null);
    setEtapa({ nome: "lendo" });
    try {
      const { cancao, aviso } = await cancaoDoArquivo(arquivo);
      mostrar(cancao, aviso);
    } catch (e) {
      setEtapa({ nome: "escolher" });
      setErro(e instanceof ArquivoRecusado ? e.message : ERRO_DE_LEITURA);
    }
  }

  /**
   * Vários arquivos: lê um por vez (um PDF pesa no celular), mostrando cada
   * um assim que fica pronto. Um arquivo só segue o caminho de sempre, com a
   * prévia inteira e o título editável.
   */
  async function lerVarios(lista: File[]) {
    if (lista.length === 0) return;
    if (lista.length === 1 || !varios) return ler(lista[0]!);
    setErro(null);
    const minha = ++leitura.current;
    const arquivos = lista.slice(0, MAXIMO_DE_ARQUIVOS);
    const itens: ItemDoLote[] = arquivos.map((a) => ({ arquivo: a.name, estado: "esperando", incluir: true }));
    const sobraram = lista.length - arquivos.length;
    setEtapa({ nome: "lote", itens: [...itens], sobraram });
    for (let i = 0; i < arquivos.length; i++) {
      try {
        const { cancao } = await cancaoDoArquivo(arquivos[i]!);
        if (leitura.current !== minha) return;
        itens[i] = { ...itens[i]!, estado: "pronto", cancao };
      } catch (e) {
        itens[i] = { ...itens[i]!, estado: "erro", incluir: false, erro: e instanceof ArquivoRecusado ? e.message : ERRO_DE_LEITURA };
      }
      if (leitura.current !== minha) return;
      setEtapa({ nome: "lote", itens: [...itens], sobraram });
    }
  }

  function alternarItem(i: number) {
    if (etapa.nome !== "lote") return;
    const itens = etapa.itens.map((it, j) => (j === i && it.estado === "pronto" ? { ...it, incluir: !it.incluir } : it));
    setEtapa({ ...etapa, itens });
  }

  async function criarVarias() {
    if (etapa.nome !== "lote" || destino.tipo !== "nova") return;
    const cancoes = etapa.itens.filter((it) => it.incluir && it.cancao).map((it) => it.cancao!);
    if (cancoes.length === 0) return;
    setCriando(true);
    try {
      await destino.aoCriarVarias(cancoes);
    } finally {
      setCriando(false);
    }
    mudar(false);
  }

  function lerColado() {
    const texto = colado.trim();
    if (!texto) return;
    // Colado de um site ou do bloco de notas: Markdown só se tiver cara de Markdown.
    const formato = /^(#{1,6}\s|```|>\s)/m.test(texto) ? "markdown" : "texto";
    mostrar(lerCancao(texto, formato));
  }

  function soltar(e: DragEvent) {
    e.preventDefault();
    setArrastando(false);
    void lerVarios([...e.dataTransfer.files]);
  }

  async function confirmar(modo: "acrescentar" | "substituir" = "substituir") {
    if (etapa.nome !== "previa") return;
    const cancao = { ...etapa.cancao, titulo: titulo.trim() || etapa.cancao.titulo };
    if (destino.tipo === "nova") {
      setCriando(true);
      try {
        await destino.aoCriar(cancao);
      } finally {
        setCriando(false);
      }
    } else {
      destino.aoAplicar(cancao, modo);
    }
    mudar(false);
  }

  const noLote = etapa.nome === "lote" ? etapa : null;
  const lendoLote = noLote?.itens.some((it) => it.estado === "esperando") ?? false;
  const escolhidasNoLote = noLote?.itens.filter((it) => it.incluir && it.cancao).length ?? 0;

  const rodape = noLote ? (
    <>
      <Botao variante="texto" onClick={recomecar} className="mr-auto">
        Escolher outros
      </Botao>
      <Botao variante="tinta" onClick={() => void criarVarias()} disabled={lendoLote || criando || escolhidasNoLote === 0}>
        {criando
          ? "Criando…"
          : lendoLote
            ? "Lendo…"
            : `Criar ${escolhidasNoLote} ${escolhidasNoLote === 1 ? "canção" : "canções"}`}
      </Botao>
    </>
  ) : etapa.nome !== "previa" ? undefined : (
      <>
        <Botao variante="texto" onClick={recomecar} className="mr-auto">
          Escolher outro
        </Botao>
        {destino.tipo === "nova" ? (
          <Botao variante="tinta" onClick={() => void confirmar()} disabled={criando}>
            {criando ? "Criando…" : "Criar canção"}
          </Botao>
        ) : destino.folhaVazia ? (
          <Botao variante="tinta" onClick={() => void confirmar("substituir")}>
            Pôr na folha
          </Botao>
        ) : (
          <>
            <Botao variante="contorno" onClick={() => void confirmar("acrescentar")}>
              Acrescentar no fim
            </Botao>
            <Botao variante="tinta" onClick={() => void confirmar("substituir")}>
              Substituir a folha
            </Botao>
          </>
        )}
      </>
    );

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={mudar}
      largura="lg"
      titulo={noLote ? `Importar ${noLote.itens.length} arquivos` : varios ? "Importar canções" : "Importar para esta canção"}
      descricao={
        noLote
          ? "Cada arquivo vira uma canção nova, como ideia. Desmarque o que não quiser."
          : `De um PDF, Word, Markdown, HTML ou texto${varios ? `, um ou vários arquivos (até ${MAXIMO_DE_ARQUIVOS})` : ""}. A letra, as cifras e as anotações vêm junto; você confere antes.`
      }
      rodape={rodape}
    >
      {(etapa.nome === "escolher" || etapa.nome === "lendo") && (
        <div className="space-y-4">
          {!colando ? (
            <div
              onDragOver={(e) => {
                e.preventDefault();
                setArrastando(true);
              }}
              onDragLeave={() => setArrastando(false)}
              onDrop={soltar}
              className={cn(
                "flex flex-col items-center gap-3 border border-dashed px-6 py-10 text-center transition-colors",
                arrastando ? "border-lapis bg-lapis-tinta" : "border-linha-forte bg-papel-2/40",
              )}
            >
              <FileUp className="size-6 text-tinta-3" strokeWidth={1.5} />
              {etapa.nome === "lendo" ? (
                <p className="font-serif text-lg text-tinta-2 italic" role="status">
                  Lendo o arquivo…
                </p>
              ) : (
                <>
                  <p className="font-serif text-lg">{varios ? "Arraste os arquivos para cá" : "Arraste o arquivo para cá"}</p>
                  <Botao variante="contorno" onClick={() => entrada.current?.click()}>
                    {varios ? "Escolher arquivos" : "Escolher arquivo"}
                  </Botao>
                  <p className="numeral text-[11.5px] tracking-wide text-tinta-3">PDF · Word · Markdown · HTML · Texto · ChordPro</p>
                </>
              )}
              <input
                ref={entrada}
                type="file"
                accept={ACEITOS}
                multiple={varios}
                className="hidden"
                onChange={(e) => {
                  const arquivos = [...(e.target.files ?? [])];
                  e.target.value = "";
                  void lerVarios(arquivos);
                }}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <AreaDeTexto
                value={colado}
                onChange={(e) => setColado(e.target.value)}
                rows={10}
                autoFocus
                aria-label="Texto da canção"
                placeholder={"[Intro] G  D  Em  C\n\nG                D\nCole aqui a letra com as cifras"}
                className="numeral text-[13.5px] leading-6 whitespace-pre"
              />
              <div className="flex justify-end">
                <Botao variante="tinta" onClick={lerColado} disabled={!colado.trim()}>
                  Ler o texto
                </Botao>
              </div>
            </div>
          )}

          {erro && (
            <p className="text-[13.5px] text-lapis" role="alert">
              {erro}
            </p>
          )}

          <button onClick={() => setColando(!colando)} className="link-sublinhado text-[13px] text-tinta-2">
            {colando ? "Prefiro escolher um arquivo" : "Prefere colar o texto? (de um site de cifras, do bloco de notas)"}
          </button>
        </div>
      )}

      {noLote && (
        <div className="space-y-3">
          <p className="text-[13px] text-tinta-2" role="status">
            {resumoDoLote(noLote.itens)}
          </p>
          {noLote.sobraram > 0 && (
            <p className="border-l-2 border-lapis bg-lapis-tinta px-3 py-2 text-[13px] text-tinta-2">
              Vieram só os primeiros {MAXIMO_DE_ARQUIVOS}. Importe os outros {noLote.sobraram} depois.
            </p>
          )}
          <ul className="max-h-[50vh] divide-y divide-linha overflow-y-auto border-y border-linha" aria-label="Arquivos">
            {noLote.itens.map((it, i) => (
              <li key={i} className="py-2.5">
                <div className="flex items-start gap-3">
                  <input
                    type="checkbox"
                    checked={it.incluir}
                    disabled={it.estado !== "pronto"}
                    onChange={() => alternarItem(i)}
                    aria-label={`Importar ${it.cancao?.titulo ?? it.arquivo}`}
                    className="mt-1.5 accent-[var(--lapis)]"
                  />
                  <div className="min-w-0 flex-1">
                    <p className={cn("truncate font-serif text-[1.05rem]", it.estado === "erro" ? "text-tinta-3" : "text-tinta")}>
                      {it.cancao?.titulo ?? it.arquivo}
                    </p>
                    <p className="truncate text-[12.5px] text-tinta-3">
                      <span className="numeral">{it.arquivo}</span>
                      {it.estado === "esperando" && <span className="italic"> · lendo…</span>}
                      {it.cancao && <> · {resumoDaImportacao(it.cancao)}</>}
                    </p>
                    {it.erro && <p className="text-[12.5px] text-lapis">{it.erro}</p>}
                  </div>
                  {it.cancao && (
                    <button onClick={() => setVendo(vendo === i ? null : i)} className="link-sublinhado shrink-0 text-[12.5px] text-tinta-2">
                      {vendo === i ? "Fechar" : "Ver"}
                    </button>
                  )}
                </div>
                {vendo === i && it.cancao && (
                  <div className="mt-2.5">
                    <Previa cancao={it.cancao} />
                  </div>
                )}
              </li>
            ))}
          </ul>
        </div>
      )}

      {etapa.nome === "previa" && (
        <div className="space-y-4">
          {destino.tipo === "nova" && (
            <Campo rotulo="Título">{(id) => <Entrada id={id} value={titulo} onChange={(e) => setTitulo(e.target.value)} />}</Campo>
          )}
          <p className="text-[13px] text-tinta-2">
            {resumoDaImportacao(etapa.cancao)}
            {(etapa.cancao.tom || etapa.cancao.bpm || etapa.cancao.compasso) && (
              <span className="numeral ml-2 text-tinta-3">
                {[etapa.cancao.tom && `Tom ${etapa.cancao.tom}`, etapa.cancao.compasso, etapa.cancao.bpm && `${etapa.cancao.bpm} bpm`]
                  .filter(Boolean)
                  .join(" · ")}
              </span>
            )}
          </p>
          {etapa.aviso && <p className="border-l-2 border-lapis bg-lapis-tinta px-3 py-2 text-[13px] text-tinta-2">{etapa.aviso}</p>}
          <Previa cancao={etapa.cancao} />
          {destino.tipo === "cancao" && !destino.folhaVazia && (
            <p className="text-[12.5px] text-tinta-3">Substituir troca a folha inteira; Ctrl+Z ou o histórico de versões trazem de volta.</p>
          )}
        </div>
      )}
    </Dialogo>
  );
}

/** A folha como vai ficar, no mesmo desenho do editor, em miniatura. */
function Previa({ cancao }: { cancao: CancaoImportada }) {
  const alinhar = cancao.blocos.some((b) => b.type === "chord-line");
  return (
    <div className="max-h-[42vh] overflow-auto border border-linha bg-papel px-5 py-4" aria-label="Prévia da canção importada">
      {cancao.blocos.map((b, i) =>
        b.type === "section" ? (
          <div key={i} className="flex items-center gap-3 pt-5 pb-1 first:pt-0">
            <span className="text-[10.5px] font-semibold tracking-[0.2em] text-tinta-2 uppercase">{b.label || "Seção"}</span>
            <span className="h-px flex-1 bg-linha" />
          </div>
        ) : b.type === "chord-line" ? (
          <pre key={i} className="numeral mt-2 text-[12.5px] leading-5 font-medium text-lapis">
            {b.text}
          </pre>
        ) : b.type === "lyric-line" ? (
          <pre key={i} className={cn(alinhar ? "numeral text-[13.5px] leading-6" : "font-serif text-[1.05rem] leading-[1.55] whitespace-pre-wrap")}>
            {b.text}
          </pre>
        ) : (
          <p key={i} className="my-2 border border-dashed border-linha-forte bg-papel-2/50 px-3 py-1.5 text-[13px] whitespace-pre-wrap text-tinta-2 italic">
            {b.text}
          </p>
        ),
      )}
    </div>
  );
}

/** "12 arquivos · 11 viram canção · 1 com problema". */
function resumoDoLote(itens: ItemDoLote[]): string {
  const lendo = itens.filter((it) => it.estado === "esperando").length;
  const prontos = itens.filter((it) => it.estado === "pronto").length;
  const erros = itens.filter((it) => it.estado === "erro").length;
  const partes = [`${itens.length} arquivos`];
  if (lendo > 0) partes.push(`lendo ${itens.length - lendo + 1} de ${itens.length}`);
  if (prontos > 0) partes.push(`${prontos} ${prontos === 1 ? "vira canção" : "viram canção"}`);
  if (erros > 0) partes.push(`${erros} com problema`);
  return partes.join(" · ");
}

