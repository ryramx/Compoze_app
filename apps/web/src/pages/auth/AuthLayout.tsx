import type { ReactNode } from "react";
import { Marca } from "@/components/compoze/Marca";

/**
 * Página de entrada em duas folhas: à esquerda, um trecho de canção como ele
 * aparece no editor — cifra, verso e a anotação de quem revisa. É o produto
 * explicando a si mesmo, sem ilustração genérica.
 */
export function AuthLayout({ titulo, subtitulo, children, rodape }: { titulo: string; subtitulo: string; children: ReactNode; rodape: ReactNode }) {
  return (
    <div className="grid min-h-dvh lg:grid-cols-[1.05fr_1fr]">
      <aside className="relative hidden flex-col justify-between overflow-hidden border-r border-linha bg-papel-2/50 p-12 lg:flex xl:p-16">
        <Marca className="text-[19px]" />

        <figure className="relative mx-auto w-full max-w-md animate-[entrar_.6s_ease-out]" aria-label="Trecho de canção de exemplo">
          <div className="rotulo mb-6 flex items-center gap-3">
            <span>Verso 1</span>
            <span className="h-px flex-1 bg-linha-forte" />
          </div>
          <div className="space-y-1 font-serif text-[1.45rem] leading-snug">
            <div className="numeral text-[0.8rem] tracking-wide whitespace-pre text-lapis">Am{"        "}F{"            "}C{"          "}G</div>
            <p>Café esfriou na xícara,</p>
            <p>a cidade respira sem mim</p>
            <div className="numeral pt-3 text-[0.8rem] tracking-wide whitespace-pre text-lapis">Am{"        "}F{"            "}C{"          "}G</div>
            <p className="border-l-2 border-autor-3 -ml-[14px] pl-3">
              Janela aberta pra rua,
              <br />e o vento carrega o que ouvi
            </p>
          </div>
          <div className="mt-2 -ml-[14px] pl-3 text-[12px] text-tinta-3">
            contribuição de <span className="text-autor-3">Maya Costa</span>
          </div>

          <div className="absolute top-[38%] -right-6 w-40 rotate-[-2deg] font-serif text-[15px] leading-snug text-lapis italic xl:-right-14">
            <svg viewBox="0 0 60 20" className="mb-1 h-4 w-12 text-lapis" aria-hidden>
              <path d="M58 4C40 2 20 6 3 16m0 0 8-1m-8 1 3-7" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" />
            </svg>
            “respira” ou “acorda”? testar no ensaio
          </div>
        </figure>

        <figcaption className="max-w-sm font-serif text-xl leading-snug text-tinta-2 italic">
          O caderno compartilhado de quem compõe. Letra, cifra e coautoria no mesmo lugar.
        </figcaption>
      </aside>

      <main className="flex flex-col px-6 py-10 sm:px-12">
        <Marca className="text-[17px] lg:hidden" />
        <div className="mx-auto flex w-full max-w-sm flex-1 flex-col justify-center py-12">
          <h1 className="titulo-pagina text-[2.6rem]">{titulo}</h1>
          <p className="mt-3 mb-10 text-tinta-2">{subtitulo}</p>
          {children}
          <p className="mt-10 border-t border-linha pt-5 text-sm text-tinta-2">{rodape}</p>
        </div>
      </main>
    </div>
  );
}
