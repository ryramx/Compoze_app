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
 * no editor (acrescentar no fim ou substituir a folha).
 */
export type DestinoDaImportacao =
  | { tipo: "nova"; aoCriar: (c: CancaoImportada) => Promise<void> | void }
  | { tipo: "cancao"; folhaVazia: boolean; aoAplicar: (c: CancaoImportada, modo: "acrescentar" | "substituir") => void };

type Etapa = { nome: "escolher" } | { nome: "lendo" } | { nome: "previa"; cancao: CancaoImportada; aviso?: string };

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
  const entrada = useRef<HTMLInputElement>(null);

  function recomecar() {
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
      const { texto, formato, aviso } = await lerArquivoDeLetra(arquivo);
      mostrar(lerCancao(texto, formato, tituloDoArquivo(arquivo.name)), aviso);
    } catch (e) {
      setEtapa({ nome: "escolher" });
      setErro(e instanceof ArquivoRecusado ? e.message : "Não deu para ler este arquivo. Ele pode estar corrompido ou protegido por senha.");
    }
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
    const arquivo = e.dataTransfer.files[0];
    if (arquivo) void ler(arquivo);
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

  const rodape =
    etapa.nome !== "previa" ? undefined : (
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
      titulo={destino.tipo === "nova" ? "Importar uma canção" : "Importar para esta canção"}
      descricao="De um PDF, Word, Markdown, HTML ou texto. A letra, as cifras e as anotações vêm junto; você confere antes."
      rodape={rodape}
    >
      {etapa.nome !== "previa" && (
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
                  <p className="font-serif text-lg">Arraste o arquivo para cá</p>
                  <Botao variante="contorno" onClick={() => entrada.current?.click()}>
                    Escolher arquivo
                  </Botao>
                  <p className="numeral text-[11.5px] tracking-wide text-tinta-3">PDF · Word · Markdown · HTML · Texto · ChordPro</p>
                </>
              )}
              <input
                ref={entrada}
                type="file"
                accept={ACEITOS}
                className="hidden"
                onChange={(e) => {
                  const arquivo = e.target.files?.[0];
                  e.target.value = "";
                  if (arquivo) void ler(arquivo);
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
