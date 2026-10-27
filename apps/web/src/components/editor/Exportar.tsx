import { useState } from "react";
import { toast } from "sonner";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { cn } from "@/lib/cn";
import { exportar, OPCOES_PADRAO, type CancaoParaExportar, type FormatoDeExportacao, type OpcoesDeExportacao } from "@/lib/exportar";
import { salvarArquivo } from "@/lib/salvarArquivo";

const FORMATOS: { valor: FormatoDeExportacao; nome: string; ext: string; para: string }[] = [
  { valor: "pdf", nome: "PDF", ext: ".pdf", para: "Para imprimir, levar ao ensaio ou mandar para alguém." },
  { valor: "markdown", nome: "Markdown", ext: ".md", para: "Texto puro, para Notion, Obsidian ou GitHub. Volta para o Compoze sem perder nada." },
  { valor: "word", nome: "Word", ext: ".docx", para: "Para editar no Word, no Google Docs ou no LibreOffice." },
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

/**
 * "Exportar" no editor (ADR 0024). Sai a canção como está agora, em qualquer
 * estágio, gerada no aparelho (funciona offline). A última escolha fica
 * lembrada no navegador.
 */
export function Exportar({
  aberto,
  aoMudar,
  cancao,
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  cancao: () => CancaoParaExportar;
}) {
  const [inicial] = useState(lembrado);
  const [formato, setFormato] = useState(inicial.formato);
  const [opcoes, setOpcoes] = useState(inicial.opcoes);
  const [gerando, setGerando] = useState(false);

  async function gerar() {
    setGerando(true);
    try {
      localStorage.setItem(CHAVE, JSON.stringify({ formato, opcoes }));
    } catch {
      // Lembrar a escolha é só conveniência.
    }
    try {
      const arquivo = await exportar(formato, cancao(), opcoes);
      const como = await salvarArquivo(arquivo.nome, arquivo.tipo, arquivo.bytes);
      if (como === "baixado") toast(`Baixado: ${arquivo.nome}`);
      aoMudar(false);
    } catch {
      toast("Não deu para gerar o arquivo. Tente de novo.");
    } finally {
      setGerando(false);
    }
  }

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      titulo="Exportar a canção"
      descricao="Sai como está agora, pronta ou não. Funciona sem internet."
      rodape={
        <Botao variante="tinta" onClick={() => void gerar()} disabled={gerando}>
          {gerando ? "Gerando…" : `Exportar ${FORMATOS.find((f) => f.valor === formato)!.nome}`}
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
