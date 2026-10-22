import { cn } from "@/lib/cn";
import { ESTAGIOS, posicaoDoEstagio, rotuloDoEstagio } from "@/lib/rotulos";
import type { SongStatus } from "@/types";

/**
 * Marcador de estágio: seis traços, preenchidos até onde a obra chegou.
 * Substitui o "badge colorido" — mostra a posição no fluxo, não só o nome.
 */
export function Estagio({ status, semRotulo, className }: { status: SongStatus; semRotulo?: boolean; className?: string }) {
  const pos = posicaoDoEstagio(status);
  return (
    <span className={cn("inline-flex items-center gap-2", className)} title={rotuloDoEstagio(status)}>
      <span className="flex items-end gap-[3px]" aria-hidden>
        {ESTAGIOS.map((e, i) => (
          <span
            key={e.valor}
            className={cn(
              "w-[3px] rounded-[1px] transition-colors",
              i <= pos ? (i === pos ? "bg-lapis" : "bg-tinta-2") : "bg-linha-forte/70",
            )}
            style={{ height: 6 + i * 1.6 }}
          />
        ))}
      </span>
      {!semRotulo && <span className="text-[13px] text-tinta-2">{rotuloDoEstagio(status)}</span>}
      {semRotulo && <span className="sr-only">{rotuloDoEstagio(status)}</span>}
    </span>
  );
}
