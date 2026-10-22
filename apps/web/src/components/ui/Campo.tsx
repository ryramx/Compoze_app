import { forwardRef, useId, type InputHTMLAttributes, type ReactNode, type SelectHTMLAttributes, type TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const base =
  "w-full bg-transparent border-0 border-b border-linha-forte px-0 py-2 text-[15px] text-tinta placeholder:text-tinta-3/80 transition-colors focus:border-tinta focus:outline-none disabled:opacity-60";

/** Campo de linha: só a régua de baixo, como numa ficha preenchida à mão. */
export const Entrada = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Entrada({ className, ...props }, ref) {
    return <input ref={ref} className={cn(base, className)} {...props} />;
  },
);

export const AreaDeTexto = forwardRef<HTMLTextAreaElement, TextareaHTMLAttributes<HTMLTextAreaElement>>(
  function AreaDeTexto({ className, ...props }, ref) {
    return <textarea ref={ref} className={cn(base, "resize-none leading-relaxed", className)} {...props} />;
  },
);

export const Seletor = forwardRef<HTMLSelectElement, SelectHTMLAttributes<HTMLSelectElement>>(
  function Seletor({ className, children, ...props }, ref) {
    return (
      <select
        ref={ref}
        className={cn(
          base,
          "cursor-pointer appearance-none bg-[length:10px] bg-[right_2px_center] bg-no-repeat pr-5",
          "bg-[url(\"data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 10 6'><path d='M1 1l4 4 4-4' fill='none' stroke='%238a8578' stroke-width='1.3'/></svg>\")]",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    );
  },
);

/** Rótulo + controle + mensagem. O id é gerado para ligar o rótulo ao campo. */
export function Campo({
  rotulo,
  dica,
  erro,
  children,
  className,
}: {
  rotulo: string;
  dica?: ReactNode;
  erro?: string | null;
  children: (id: string) => ReactNode;
  className?: string;
}) {
  const id = useId();
  return (
    <div className={cn("space-y-1", className)}>
      <label htmlFor={id} className="rotulo block">
        {rotulo}
      </label>
      {children(id)}
      {erro ? (
        <p className="text-[13px] text-lapis">{erro}</p>
      ) : dica ? (
        <p className="text-[13px] text-tinta-3">{dica}</p>
      ) : null}
    </div>
  );
}
