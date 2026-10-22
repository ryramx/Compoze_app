import { forwardRef, type ButtonHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

type Variante = "tinta" | "contorno" | "texto" | "perigo" | "lapis";
type Tamanho = "sm" | "md" | "lg" | "icone";

const variantes: Record<Variante, string> = {
  // Ação principal: tinta sólida sobre o papel. Uma por tela, no máximo duas.
  tinta: "bg-tinta text-papel hover:bg-tinta/85 disabled:bg-tinta/40",
  contorno: "border border-linha-forte text-tinta hover:border-tinta hover:bg-papel-2/60",
  texto: "text-tinta-2 hover:text-tinta hover:bg-papel-2/70",
  perigo: "text-lapis hover:bg-lapis-tinta border border-transparent hover:border-lapis/30",
  lapis: "bg-lapis text-white hover:bg-lapis/90",
};

const tamanhos: Record<Tamanho, string> = {
  sm: "h-8 px-3 text-[13px] gap-1.5",
  md: "h-9 px-4 text-sm gap-2",
  lg: "h-11 px-5 text-[15px] gap-2",
  icone: "h-8 w-8 justify-center",
};

export interface BotaoProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variante?: Variante;
  tamanho?: Tamanho;
}

/**
 * Botão de canto quase reto (2px). O canto arredondado em pílula é a marca mais
 * reconhecível de interface gerada; aqui o botão é um retângulo de tipografia.
 */
export const Botao = forwardRef<HTMLButtonElement, BotaoProps>(function Botao(
  { variante = "contorno", tamanho = "md", className, type = "button", ...props },
  ref,
) {
  return (
    <button
      ref={ref}
      type={type}
      className={cn(
        "inline-flex shrink-0 items-center rounded-sm font-medium whitespace-nowrap transition-colors duration-150 disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0",
        variantes[variante],
        tamanhos[tamanho],
        className,
      )}
      {...props}
    />
  );
});
