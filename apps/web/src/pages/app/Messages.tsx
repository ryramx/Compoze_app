import { ArrowLeft, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { AvisoDePrevia } from "@/components/compoze/AvisoDePrevia";
import { Cabecalho } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { useCompoze } from "@/store/compozeStore";

export default function Messages() {
  const conversas = useCompoze((s) => s.conversations);
  const getUser = useCompoze((s) => s.getUser);
  const euId = useCompoze((s) => s.currentUserId);
  const enviar = useCompoze((s) => s.sendMessage);
  const ordenadas = [...conversas].sort(
    (a, b) => +new Date(b.messages.at(-1)?.timestamp ?? 0) - +new Date(a.messages.at(-1)?.timestamp ?? 0),
  );
  const [atualId, setAtualId] = useState<string | null>(null);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const atual = conversas.find((c) => c.withUserId === atualId);
  const pessoa = atual ? getUser(atual.withUserId) : undefined;

  useEffect(() => {
    if (!atualId && ordenadas[0] && window.matchMedia("(min-width: 768px)").matches) setAtualId(ordenadas[0].withUserId);
  }, [atualId, ordenadas]);

  useEffect(() => fimRef.current?.scrollIntoView({ block: "end" }), [atual?.messages.length, atualId]);

  return (
    <Pagina>
      <Cabecalho secao="Gente" titulo="Conversas" />
      <AvisoDePrevia />

      <div className="mt-8 grid min-h-[60vh] border-y border-linha md:grid-cols-[300px_minmax(0,1fr)]">
        <ul className={cn("border-linha md:border-r", atual && "hidden md:block")}>
          {ordenadas.map((c) => {
            const u = getUser(c.withUserId);
            const ultima = c.messages.at(-1);
            return (
              <li key={c.id}>
                <button
                  onClick={() => setAtualId(c.withUserId)}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-linha px-4 py-4 text-left transition-colors",
                    c.withUserId === atualId ? "bg-papel-2" : "hover:bg-papel-2/50",
                  )}
                >
                  <Monograma usuario={u} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className="truncate text-[14px] font-medium">{u?.name}</span>
                      <span className="shrink-0 text-[11.5px] text-tinta-3">{ultima && quando(ultima.timestamp)}</span>
                    </span>
                    <span className="mt-0.5 block truncate text-[13px] text-tinta-3">
                      {ultima?.fromId === euId && "Você: "}
                      {ultima?.content}
                    </span>
                  </span>
                </button>
              </li>
            );
          })}
        </ul>

        {atual ? (
          <section className="flex flex-col">
            <header className="flex items-center gap-3 border-b border-linha px-5 py-3">
              <button onClick={() => setAtualId(null)} className="text-tinta-3 md:hidden" aria-label="Voltar para as conversas">
                <ArrowLeft className="size-4" />
              </button>
              <Monograma usuario={pessoa} tamanho="xs" />
              <span className="font-serif text-[1.15rem]">{pessoa?.name}</span>
            </header>
            <div className="flex-1 space-y-4 overflow-y-auto px-5 py-6">
              {atual.messages.map((m) => {
                const minha = m.fromId === euId;
                return (
                  <div key={m.id} className={cn("flex", minha ? "justify-end" : "justify-start")}>
                    <div className={cn("max-w-[78%]", minha && "text-right")}>
                      <p className={cn("inline-block px-4 py-2.5 text-left text-[14.5px] leading-snug", minha ? "bg-tinta text-papel" : "border border-linha bg-folha")}>
                        {m.content}
                      </p>
                      <div className="mt-1 text-[11px] text-tinta-3">{quando(m.timestamp)}</div>
                    </div>
                  </div>
                );
              })}
              <div ref={fimRef} />
            </div>
            <form
              className="flex items-center gap-3 border-t border-linha px-5 py-3"
              onSubmit={(e) => {
                e.preventDefault();
                if (!texto.trim()) return;
                enviar(atual.withUserId, texto.trim());
                setTexto("");
              }}
            >
              <input
                value={texto}
                onChange={(e) => setTexto(e.target.value)}
                placeholder={`Escreva para ${pessoa?.name.split(" ")[0]}…`}
                className="flex-1 bg-transparent py-2 focus:outline-none"
              />
              <button type="submit" disabled={!texto.trim()} className="grid size-9 place-items-center text-lapis disabled:text-tinta-3" aria-label="Enviar">
                <Send className="size-4" />
              </button>
            </form>
          </section>
        ) : (
          <div className="hidden place-items-center p-10 font-serif text-tinta-3 italic md:grid">Escolha uma conversa.</div>
        )}
      </div>
    </Pagina>
  );
}
