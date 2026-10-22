import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialogo({
  aberto,
  aoMudar,
  titulo,
  descricao,
  children,
  rodape,
  largura = "md",
}: {
  aberto: boolean;
  aoMudar: (aberto: boolean) => void;
  titulo: string;
  descricao?: ReactNode;
  children?: ReactNode;
  rodape?: ReactNode;
  largura?: "sm" | "md" | "lg";
}) {
  return (
    <D.Root open={aberto} onOpenChange={aoMudar}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-papel/70 backdrop-blur-[2px] data-[state=open]:animate-[aparecer_.15s_ease-out]" />
        <D.Content
          className={cn(
            "fixed top-1/2 left-1/2 z-50 max-h-[88vh] w-[calc(100vw-2rem)] -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-linha-forte bg-folha shadow-folha focus:outline-none",
            "data-[state=open]:animate-[subir_.2s_cubic-bezier(.2,.8,.2,1)]",
            largura === "sm" && "max-w-sm",
            largura === "md" && "max-w-lg",
            largura === "lg" && "max-w-2xl",
          )}
        >
          <div className="flex items-start justify-between gap-4 border-b border-linha px-6 pt-5 pb-4">
            <div>
              <D.Title className="font-serif text-[1.6rem] leading-tight">{titulo}</D.Title>
              {descricao && (
                <D.Description className="mt-1 text-sm text-tinta-2">{descricao}</D.Description>
              )}
            </div>
            <D.Close className="-mr-2 grid size-8 place-items-center rounded-sm text-tinta-3 hover:bg-papel-2 hover:text-tinta" aria-label="Fechar">
              <X className="size-4" />
            </D.Close>
          </div>
          {children && <div className="px-6 py-5">{children}</div>}
          {rodape && (
            <div className="flex flex-wrap items-center justify-end gap-2 border-t border-linha bg-papel-2/40 px-6 py-3">
              {rodape}
            </div>
          )}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
