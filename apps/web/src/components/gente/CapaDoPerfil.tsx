import { cn } from "@/lib/cn";

/**
 * Capa do perfil (ADR 0021): a faixa larga no topo da página da pessoa. Sem
 * foto, vira papel kraft com a pauta de cinco linhas, o mesmo desenho das
 * capas tipográficas de projeto, em vez de um gradiente qualquer. Sempre 3:1,
 * a proporção da moldura de recorte (ADR 0022).
 */
export function CapaDoPerfil({ imagem, className }: { imagem?: string; className?: string }) {
  return (
    <div className={cn("relative aspect-[3/1] w-full overflow-hidden border border-linha bg-kraft", className)}>
      {imagem ? (
        <img src={imagem} alt="" className="size-full object-cover" />
      ) : (
        <div className="pauta absolute inset-x-[6%] top-[34%] h-[45px] text-kraft-linha" aria-hidden />
      )}
    </div>
  );
}
