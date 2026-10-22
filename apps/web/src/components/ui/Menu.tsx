import * as M from "@radix-ui/react-dropdown-menu";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Menu({ gatilho, children, alinhar = "end" }: { gatilho: ReactNode; children: ReactNode; alinhar?: "start" | "end" }) {
  return (
    <M.Root>
      <M.Trigger asChild>{gatilho}</M.Trigger>
      <M.Portal>
        <M.Content
          align={alinhar}
          sideOffset={6}
          className="z-50 min-w-[12rem] border border-linha-forte bg-folha py-1 shadow-folha data-[state=open]:animate-[aparecer_.12s_ease-out]"
        >
          {children}
        </M.Content>
      </M.Portal>
    </M.Root>
  );
}

export function ItemDeMenu({
  children,
  aoEscolher,
  perigo,
  icone,
}: {
  children: ReactNode;
  aoEscolher: () => void;
  perigo?: boolean;
  icone?: ReactNode;
}) {
  return (
    <M.Item
      onSelect={aoEscolher}
      className={cn(
        "flex cursor-pointer items-center gap-2.5 px-3 py-2 text-sm outline-none select-none data-[highlighted]:bg-papel-2 [&_svg]:size-4 [&_svg]:text-tinta-3",
        perigo && "text-lapis [&_svg]:text-lapis",
      )}
    >
      {icone}
      {children}
    </M.Item>
  );
}

export const SeparadorDeMenu = () => <M.Separator className="my-1 h-px bg-linha" />;
