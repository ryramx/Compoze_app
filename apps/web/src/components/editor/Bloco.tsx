import { X } from "lucide-react";
import { useEffect, useLayoutEffect, useRef, type KeyboardEvent } from "react";
import { corDoAutor } from "@/lib/autoria";
import { cn } from "@/lib/cn";
import type { SongBlock, User } from "@/types";

export interface BlocoProps {
  bloco: SongBlock;
  autor?: User;
  meu: boolean;
  /** Mostrar o nome do autor na margem (só no primeiro bloco de uma sequência do mesmo autor). */
  assinarNaMargem: boolean;
  letraEmMono: boolean;
  focar: boolean;
  aoFocar: () => void;
  aoFocarTratado: () => void;
  aoMudarTexto: (texto: string) => void;
  aoMudarRotulo: (rotulo: string) => void;
  aoRemover: () => void;
  /** Enter: nova linha de letra abaixo. */
  aoEnter: () => void;
  /** Backspace num bloco vazio: remove e volta para o anterior. */
  aoApagarVazio: () => void;
}

const PLACEHOLDER: Record<SongBlock["type"], string> = {
  section: "Nome da seção",
  "chord-line": "Am      F      C      G",
  "lyric-line": "Escreva um verso…",
  note: "Uma anotação para quem escreve com você",
};

/**
 * Um bloco do editor. A coautoria aparece como marginália: um fio na cor de
 * quem escreveu e, no começo de cada trecho de outra pessoa, o nome dela na
 * margem — como as anotações a lápis num manuscrito.
 */
export function Bloco({
  bloco,
  autor,
  meu,
  assinarNaMargem,
  letraEmMono,
  focar,
  aoFocar,
  aoFocarTratado,
  aoMudarTexto,
  aoMudarRotulo,
  aoRemover,
  aoEnter,
  aoApagarVazio,
}: BlocoProps) {
  const ref = useRef<HTMLTextAreaElement & HTMLInputElement>(null);
  const cor = corDoAutor(autor?.authorColor);

  useEffect(() => {
    if (!focar) return;
    const el = ref.current;
    if (el) {
      el.focus();
      const fim = el.value.length;
      el.setSelectionRange(fim, fim);
    }
    aoFocarTratado();
  }, [focar, aoFocarTratado]);

  // Altura acompanha o conteúdo: versos longos quebram sem barra de rolagem.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el || bloco.type === "section") return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [bloco.text, bloco.type, letraEmMono]);

  function teclas(e: KeyboardEvent) {
    const valor = bloco.type === "section" ? (bloco.label ?? "") : bloco.text;
    if (e.key === "Enter" && !e.shiftKey && bloco.type !== "chord-line") {
      e.preventDefault();
      aoEnter();
    } else if (e.key === "Enter" && bloco.type === "chord-line" && !e.shiftKey) {
      // Cifra é uma linha só; Enter segue para a letra que ela acompanha.
      e.preventDefault();
      aoEnter();
    } else if (e.key === "Backspace" && valor === "") {
      e.preventDefault();
      aoApagarVazio();
    }
  }

  const remover = (
    <button
      onMouseDown={(e) => e.preventDefault()}
      onClick={aoRemover}
      className="grid size-7 place-items-center rounded-sm text-tinta-3 opacity-0 transition-opacity group-focus-within:opacity-100 group-hover:opacity-60 hover:!opacity-100 hover:bg-papel-2 hover:text-lapis"
      aria-label="Remover bloco"
      tabIndex={-1}
    >
      <X className="size-3.5" />
    </button>
  );

  const margem = (
    <div className="hidden pt-1.5 pr-4 text-right text-[11px] leading-tight md:block">
      {!meu && assinarNaMargem && autor && (
        <span style={{ color: cor }} className="font-medium">
          {autor.name.split(" ")[0]}
        </span>
      )}
    </div>
  );

  if (bloco.type === "section") {
    return (
      <div className="group grid grid-cols-[minmax(0,1fr)_1.75rem] items-center pt-8 pb-1 first:pt-2 md:grid-cols-[6.5rem_minmax(0,1fr)_1.75rem]">
        {margem}
        <div className="flex items-center gap-3 border-l-2 border-transparent pl-3">
          <input
            ref={ref}
            value={bloco.label ?? ""}
            onChange={(e) => aoMudarRotulo(e.target.value)}
            onFocus={aoFocar}
            onKeyDown={teclas}
            placeholder={PLACEHOLDER.section}
            aria-label="Nome da seção"
            className="w-auto min-w-0 bg-transparent text-[11px] font-semibold tracking-[0.2em] text-tinta-2 uppercase placeholder:text-tinta-3/70 focus:text-lapis focus:outline-none"
            size={Math.max(8, (bloco.label ?? "").length + 1)}
          />
          <span className="h-px flex-1 bg-linha" />
        </div>
        {remover}
      </div>
    );
  }

  return (
    <div className="group grid grid-cols-[minmax(0,1fr)_1.75rem] items-start md:grid-cols-[6.5rem_minmax(0,1fr)_1.75rem]">
      {margem}
      <div
        className="relative border-l-2 border-transparent pl-3"
        style={meu ? undefined : { borderColor: `color-mix(in srgb, ${cor} 70%, transparent)` }}
      >
        <textarea
          ref={ref}
          value={bloco.text}
          rows={1}
          onChange={(e) => aoMudarTexto(e.target.value)}
          onFocus={aoFocar}
          onKeyDown={teclas}
          placeholder={PLACEHOLDER[bloco.type]}
          aria-label={bloco.type === "chord-line" ? "Cifra" : bloco.type === "note" ? "Anotação" : "Verso"}
          spellCheck={bloco.type !== "chord-line"}
          className={cn(
            "block w-full resize-none overflow-hidden bg-transparent placeholder:text-tinta-3/50 focus:outline-none",
            bloco.type === "chord-line" && "numeral mt-3 overflow-x-auto text-[13.5px] leading-6 font-medium whitespace-pre text-lapis",
            bloco.type === "lyric-line" &&
              (letraEmMono ? "numeral text-[15px] leading-7" : "font-serif text-[1.3rem] leading-[1.55]"),
            bloco.type === "note" &&
              "my-2 border border-dashed border-linha-forte bg-papel-2/50 px-3 py-2 font-sans text-[14px] leading-relaxed text-tinta-2 italic",
          )}
        />
      </div>
      {remover}
    </div>
  );
}
