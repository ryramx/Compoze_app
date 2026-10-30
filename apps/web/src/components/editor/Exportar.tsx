import { useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { cn } from "@/lib/cn";
import { OPCOES_PADRAO, type FormatoDeExportacao, type OpcoesDeExportacao } from "@/lib/exportar";
import { salvarArquivo } from "@/lib/salvarArquivo";

const FORMATOS: { valor: FormatoDeExportacao; nome: string; ext: string; para: string }[] = [
  { valor: "pdf", nome: "PDF", ext: ".pdf", para: "Para imprimir, levar ao ensaio ou mandar para alguém." },
  { valor: "markdown", nome: "Markdown", ext: ".md", para: "Texto puro, para Notion, Obsidian ou GitHub. Volta para o Compoze sem perder nada." },
  { valor: "word", nome: "Word", ext: ".docx", para: "Para editar no Word, no Google Docs ou no LibreOffice." },
  { valor: "html", nome: "HTML", ext: ".html", para: "Uma página que abre em qualquer navegador, sem internet, ou vai para um site." },
];

const OPCOES: { chave: keyof OpcoesDeExportacao; rotulo: string }[] = [
  { chave: "cifras", rotulo: "Cifras" },
  { chave: "notas", rotulo: "Notas para quem escreve junto" },
  { chave: "ficha", rotulo: "Ficha: tom, andamento, estágio e coautoria" },
];

const CHAVE = "compoze.exportar";

function lembrado(): { formato: FormatoDeExportacao; opcoes: OpcoesDeExportacao } {
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? "null") as { formato?: FormatoDeExportacao; opcoes?: Partial<OpcoesDeExportacao> } | null;
    return { formato: v?.formato ?? "pdf", opcoes: { ...OPCOES_PADRAO, ...v?.opcoes } };
  } catch {
    return { formato: "pdf", opcoes: OPCOES_PADRAO };
  }
}

export interface ArquivoExportado {
  nome: string;
  tipo: string;
  bytes: Uint8Array;
  /** Canções que ficaram de fora de um lote. */
  faltaram?: string[];
}

/**
 * "Exportar" (ADR 0024 e 0025). No editor, a canção aberta; em Canções, as
 * selecionadas, num .zip. Sai como está agora, em qualquer estágio, gerado no
 * aparelho. A última escolha fica lembrada no navegador.
 */
export function Exportar({
  aberto,
  aoMudar,
  gerar,
  titulo = "Exportar a canção",
  descricao = "Sai como está agora, pronta ou não. Funciona sem internet.",
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  gerar: (
    formato: FormatoDeExportacao,
    opcoes: OpcoesDeExportacao,
    aoAvancar: (prontas: number, total: number) => void,
  ) => Promise<ArquivoExportado>;
  titulo?: string;
  descricao?: string;
}) {
  const [inicial] = useState(lembrado);
  const [formato, setFormato] = useState(inicial.formato);
  const [opcoes, setOpcoes] = useState(inicial.opcoes);
  const [gerando, setGerando] = useState(false);
  const [progresso, setProgresso] = useState<{ prontas: number; total: number } | null>(null);

  async function gerarArquivo() {
    setGerando(true);
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ formato, opcoes }));
    } catch {
      // Lembrar a escolha é só conveniência.
    }
    try {
      const arquivo = await gerar(formato, opcoes, (prontas, total) => setProgresso({ prontas, total }));
      const como = await salvarArquivo(arquivo.nome, arquivo.tipo, arquivo.bytes);
      if (arquivo.faltaram?.length) {
        toast(
          `${arquivo.faltaram.length === 1 ? "Ficou de fora" : `Ficaram de fora ${arquivo.faltaram.length}`}: ${arquivo.faltaram.join(", ")}. Sem internet, só entram as canções já abertas neste aparelho.`,
        );
      } else if (como === "baixado") toast(`Baixado: ${arquivo.nome}`);
      aoMudar(false);
    } catch (e) {
      toast(e instanceof Error && e.message ? e.message : "Não deu para gerar o arquivo. Tente de novo.");
    } finally {
      setGerando(false);
      setProgresso(null);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo={titulo}
      descricao={descricao}
      rodape={
        <Botao variante="tinta" onClick={() => void gerarArquivo()} disabled={gerando}>
          {gerando
            ? progresso && progresso.total > 1
              ? `Gerando ${progresso.prontas} de ${progresso.total}…`
              : "Gerando…"
            : `Exportar ${FORMATOS.find((f) => f.valor === formato)!.nome}`}
        </Botao>
      }
    >
      <fieldset>
        <legend className="rotulo mb-2">Formato</legend>
        <div className="divide-y divide-linha border-y border-linha">
          {FORMATOS.map((f) => (
            <label key={f.valor} className="flex cursor-pointer items-start gap-3 py-3">
              <input
                type="radio"
                name="formato"
                value={f.valor}
                checked={formato === f.valor}
                onChange={() => setFormato(f.valor)}
                className="mt-1.5 accent-[var(--lapis)]"
              />
              <span className="flex-1">
                <span className={cn("font-serif text-lg", formato === f.valor ? "text-tinta" : "text-tinta-2")}>{f.nome}</span>
                <span className="numeral ml-2 text-[11.5px] text-tinta-3">{f.ext}</span>
                <span className="block text-[13px] text-tinta-2">{f.para}</span>
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      <fieldset className="mt-5">
        <legend className="rotulo mb-2">Incluir</legend>
        <div className="space-y-2">
          {OPCOES.map((o) => (
            <label key={o.chave} className="flex cursor-pointer items-center gap-2.5 text-[14px] text-tinta-2">
              <input
                type="checkbox"
                checked={opcoes[o.chave]}
                onChange={(e) => setOpcoes({ ...opcoes, [o.chave]: e.target.checked })}
                className="accent-[var(--lapis)]"
              />
              {o.rotulo}
            </label>
          ))}
        </div>
      </fieldset>
    </Dialogo>
  );
}
