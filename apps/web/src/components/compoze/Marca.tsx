import { cn } from "@/lib/cn";

/**
 * Marca do Compoze: o nome em serifa itálica com uma colcheia estilizada no
 * lugar do pingo — nenhum ícone genérico de nota musical.
 */
export function Marca({ className, compacta }: { className?: string; compacta?: boolean }) {
  return (
    <span className={cn("inline-flex items-baseline gap-1.5 text-tinta", className)}>
      <svg viewBox="0 0 14 20" className="h-[0.95em] w-auto self-center" aria-hidden>
        <path d="M9 1v12.2a3.6 3.6 0 1 1-1.6-3V3.2c2.6.6 4.4 2.4 4.9 5-1-1.3-2-2-3.3-2.2" fill="none" stroke="var(--lapis)" strokeWidth="1.6" strokeLinecap="round" />
      </svg>
      {!compacta && (
        <span className="font-serif text-[1.35em] leading-none tracking-tight italic" style={{ fontVariationSettings: '"opsz" 48' }}>
          Compoze
        </span>
      )}
    </span>
  );
}
