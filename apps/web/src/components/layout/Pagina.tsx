import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

/** Contêiner padrão de página: margens generosas, largura de leitura. */
export function Pagina({ children, className, estreita }: { children: ReactNode; className?: string; estreita?: boolean }) {
  return (
    <div className={cn("mx-auto w-full px-5 pt-8 pb-16 md:px-10 md:pt-12", estreita ? "max-w-3xl" : "max-w-6xl", className)}>
      {children}
    </div>
  );
}
