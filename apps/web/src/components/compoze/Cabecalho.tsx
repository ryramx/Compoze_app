import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/**
 * Cabeçalho de página: sobrescrito com a seção, título em serifa, régua.
 */
export function Cabecalho({
  secao,
  titulo,
  descricao,
  acoes,
  className,
}: {
  secao?: string;
  titulo: ReactNode;
  descricao?: ReactNode;
  acoes?: ReactNode;
  className?: string;
}) {
  return (
    <header className={cn("animate-[entrar_.35s_ease-out] border-b border-linha pb-6", className)}>
      {secao && (
        <div className="rotulo mb-4">{secao}</div>
      )}
      <div className="flex flex-wrap items-end justify-between gap-x-8 gap-y-4">
        <div className="min-w-0 max-w-3xl">
          <h1 className="titulo-pagina">{titulo}</h1>
          {descricao && <p className="mt-3 max-w-2xl text-[15px] text-tinta-2">{descricao}</p>}
        </div>
        {acoes && <div className="flex flex-wrap items-center gap-2">{acoes}</div>}
      </div>
    </header>
  );
}

export function TituloDeSecao({ children, acao, className }: { children: ReactNode; acao?: ReactNode; className?: string }) {
  return (
    <div className={cn("mb-3 flex items-baseline justify-between gap-4 border-b border-linha pb-2", className)}>
      <h2 className="rotulo text-tinta-2">{children}</h2>
      {acao}
    </div>
  );
}

export function Vazio({ frase, children }: { frase: string; children?: ReactNode }) {
  return (
    <div className="flex flex-col items-start gap-4 border-y border-dashed border-linha-forte py-12 pl-1">
      <p className="max-w-md font-serif text-xl text-tinta-2 italic">{frase}</p>
      {children}
    </div>
  );
}
