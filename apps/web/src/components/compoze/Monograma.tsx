import { corDoAutor, iniciais } from "@/lib/autoria";
import { cn } from "@/lib/cn";
import type { User } from "@/types";

const tamanhos = {
  xs: "size-6 text-[10px]",
  sm: "size-8 text-[12px]",
  md: "size-10 text-sm",
  lg: "size-16 text-xl",
  xl: "size-28 text-4xl",
};


/**
 * Identidade da pessoa: iniciais em serifa itálica sobre a cor de autor. A
 * mesma cor marca os trechos que a pessoa escreveu no editor, então o
 * monograma funciona como legenda da coautoria.
 */
export function Monograma({
  usuario,
  tamanho = "sm",
  className,
}: {
  usuario?: Pick<User, "name" | "avatar" | "authorColor">;
  tamanho?: keyof typeof tamanhos;
  className?: string;
}) {
  const cor = corDoAutor(usuario?.authorColor);
  return (
    <span
      title={usuario?.name}
      className={cn(
        "relative inline-grid shrink-0 place-items-center overflow-hidden rounded-full font-serif italic select-none",
        tamanhos[tamanho],
        className,
      )}
      style={{
        color: cor,
        backgroundColor: `color-mix(in srgb, ${cor} 13%, var(--folha))`,
        boxShadow: `inset 0 0 0 1px color-mix(in srgb, ${cor} 35%, transparent)`,
      }}
    >
      {usuario?.avatar ? (
        <img src={usuario.avatar} alt="" className="absolute inset-0 size-full object-cover" />
      ) : (
        <span className="-mt-px">{iniciais(usuario?.name)}</span>
      )}
    </span>
  );
}

export function PilhaDeMonogramas({
  usuarios,
  max = 4,
  tamanho = "xs",
}: {
  usuarios: (User | undefined)[];
  max?: number;
  tamanho?: keyof typeof tamanhos;
}) {
  const visiveis = usuarios.filter(Boolean).slice(0, max) as User[];
  const resto = usuarios.filter(Boolean).length - visiveis.length;
  return (
    <span className="inline-flex items-center">
      {visiveis.map((u, i) => (
        <Monograma key={u.id} usuario={u} tamanho={tamanho} className={cn(i > 0 && "-ml-1.5", "ring-2 ring-papel")} />
      ))}
      {resto > 0 && <span className="numeral ml-1.5 text-[11px] text-tinta-3">+{resto}</span>}
    </span>
  );
}
