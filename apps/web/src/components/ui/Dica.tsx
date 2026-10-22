import * as T from "@radix-ui/react-tooltip";
import type { ReactNode } from "react";

export const ProvedorDeDicas = ({ children }: { children: ReactNode }) => (
  <T.Provider delayDuration={350}>{children}</T.Provider>
);

export function Dica({ texto, children, lado = "bottom" }: { texto: ReactNode; children: ReactNode; lado?: "top" | "bottom" | "left" | "right" }) {
  return (
    <T.Root>
      <T.Trigger asChild>{children}</T.Trigger>
      <T.Portal>
        <T.Content side={lado} sideOffset={6} className="z-50 bg-tinta px-2 py-1 text-[12px] text-papel">
          {texto}
        </T.Content>
      </T.Portal>
    </T.Root>
  );
}
