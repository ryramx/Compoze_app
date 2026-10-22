import { cn } from "@/lib/cn";
import { TIPOS_DE_PROJETO } from "@/lib/rotulos";
import type { Project } from "@/types";

// Tons de capa: papéis tingidos, não gradientes. Escolhidos pelo id para que o
// mesmo projeto tenha sempre a mesma capa.
const TONS = [
  { fundo: "#d9cfbd", tinta: "#2a2620" },
  { fundo: "#2b2a27", tinta: "#efe7d6" },
  { fundo: "#b4412b", tinta: "#fbf1e9" },
  { fundo: "#c9d0c3", tinta: "#1f2a22" },
  { fundo: "#e8dfcc", tinta: "#4a2c22" },
  { fundo: "#34465f", tinta: "#ece6d9" },
];

function tom(id: string) {
  let h = 0;
  for (const c of id) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  return TONS[h % TONS.length];
}

/**
 * Capa tipográfica. Projeto sem arte própria ganha uma capa feita de nome,
 * pauta e ano — em vez da foto de banco de imagens que todo app usa.
 */
export function Capa({ projeto, className }: { projeto: Project; className?: string }) {
  if (projeto.cover) {
    return <img src={projeto.cover} alt="" className={cn("aspect-square w-full object-cover", className)} />;
  }
  const t = tom(projeto.id);
  const ano = projeto.releaseDate ? new Date(projeto.releaseDate).getFullYear() : "";
  // Tudo em cqw: a capa é a mesma composição em 64px na lista e em 480px no detalhe.
  return (
    <div className={cn("aspect-square w-full [container-type:inline-size]", className)} aria-hidden>
      <div
        className="relative flex size-full flex-col justify-between overflow-hidden p-[8cqw]"
        style={{ backgroundColor: t.fundo, color: t.tinta }}
      >
        <div className="flex items-start justify-between font-mono text-[5.5cqw] leading-none tracking-[0.12em] uppercase opacity-80">
          <span>{TIPOS_DE_PROJETO[projeto.type]}</span>
          <span>{ano}</span>
        </div>
        <svg className="absolute inset-x-[8cqw] top-[44%] h-[18cqw] w-[84cqw] opacity-25" preserveAspectRatio="none" viewBox="0 0 100 40">
          {[0, 1, 2, 3, 4].map((i) => (
            <line key={i} x1="0" x2="100" y1={i * 10 + 0.5} y2={i * 10 + 0.5} stroke="currentColor" strokeWidth="0.6" vectorEffect="non-scaling-stroke" />
          ))}
        </svg>
        <div
          className="relative font-serif text-[13cqw] leading-[0.92] tracking-tight"
          style={{ fontVariationSettings: '"opsz" 72' }}
        >
          {projeto.name}
        </div>
      </div>
    </div>
  );
}
