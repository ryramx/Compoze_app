import * as D from "@radix-ui/react-dialog";
import { ArrowLeft, X } from "lucide-react";
import { useEffect, useState } from "react";
import { useLocation } from "react-router";
import { Botao } from "@/components/ui/Botao";
import { cn } from "@/lib/cn";
import { TELAS_DO_MENU, topico, topicoDaRota, useAjuda } from "@/lib/ajuda";

/**
 * Painel de ajuda: uma folha que entra pela direita com a ajuda da tela
 * aberta. Embaixo, as outras telas, para quem quer ler sem sair de onde está.
 */
export function PainelDeAjuda() {
  const aberto = useAjuda((s) => s.painel);
  const fechar = useAjuda((s) => s.fechar);
  const abrirTour = useAjuda((s) => s.abrirTour);
  const { pathname } = useLocation();
  const daTela = topicoDaRota(pathname);
  // Outra tela escolhida dentro do painel; null = a tela aberta.
  const [escolhido, setEscolhido] = useState<string | null>(null);

  useEffect(() => {
    if (!aberto) setEscolhido(null);
  }, [aberto]);

  const atual = escolhido ? topico(escolhido) : daTela;
  const outras = TELAS_DO_MENU.filter((id) => id !== atual.id);

  return (
    <D.Root open={aberto} onOpenChange={(v) => !v && fechar()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-papel/60 backdrop-blur-[1px] data-[state=open]:animate-[aparecer_.15s_ease-out]" />
        <D.Content
          className="fixed inset-y-0 right-0 z-50 flex w-full max-w-[420px] flex-col border-l border-linha-forte bg-folha shadow-folha focus:outline-none data-[state=open]:animate-[deslizar_.22s_cubic-bezier(.2,.8,.2,1)]"
          aria-describedby={undefined}
        >
          <div className="flex items-center justify-between border-b border-linha px-6 pt-[calc(env(safe-area-inset-top)+1.1rem)] pb-3">
            {escolhido ? (
              <button onClick={() => setEscolhido(null)} className="-ml-1 inline-flex items-center gap-1.5 text-[13px] text-tinta-2 hover:text-tinta">
                <ArrowLeft className="size-3.5" /> Esta tela
              </button>
            ) : (
              <span className="rotulo">Ajuda</span>
            )}
            <D.Close className="-mr-2 grid size-8 place-items-center rounded-sm text-tinta-3 hover:bg-papel-2 hover:text-tinta" aria-label="Fechar ajuda">
              <X className="size-4" />
            </D.Close>
          </div>

          <div className="flex-1 overflow-y-auto px-6 pt-6 pb-8">
            <D.Title className="font-serif text-[2rem] leading-tight">{atual.titulo}</D.Title>
            <p className="mt-2 font-serif text-[1.15rem] leading-snug text-tinta-2 italic">{atual.resumo}</p>

            <dl className="mt-7 border-t border-linha">
              {atual.itens.map((i) => (
                <div key={i.titulo} className="border-b border-linha py-3.5">
                  <dt className="text-[14px] font-medium">{i.titulo}</dt>
                  <dd className="mt-0.5 text-[14px] leading-relaxed text-tinta-2">{i.texto}</dd>
                </div>
              ))}
            </dl>

            <div className="mt-10">
              <div className="rotulo mb-2">Outras telas</div>
              <ul className="flex flex-wrap gap-x-4 gap-y-1.5">
                {outras.map((id) => (
                  <li key={id}>
                    <button onClick={() => setEscolhido(id)} className={cn("link-sublinhado text-[13.5px] text-tinta-2")}>
                      {topico(id).titulo}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="border-t border-linha bg-papel-2/40 px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)]">
            <Botao variante="texto" className="-ml-3" onClick={abrirTour}>
              Rever os primeiros passos
            </Botao>
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
