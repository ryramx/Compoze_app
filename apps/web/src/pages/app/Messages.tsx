import { useInfiniteQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Plus, Send } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Cabecalho } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { guardarMensagem, useConversas } from "@/components/gente/conversas";
import { NovaConversa } from "@/components/gente/NovaConversa";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { useOnline } from "@/lib/rede";
import { uuidv7 } from "@/lib/uuidv7";
import { usuarioDaApi } from "@/services/api/adapters";
import type { ApiConversation } from "@/services/api/dto";
import * as conversas from "@/services/api/conversaService";
import { useCompoze } from "@/store/compozeStore";

const MENSAGEM_MAX = 4000;

function Conversa({ conversa }: { conversa: ApiConversation }) {
  const qc = useQueryClient();
  const online = useOnline();
  const eu = useCompoze((s) => s.currentUserId);
  const [texto, setTexto] = useState("");
  const fimRef = useRef<HTMLDivElement>(null);
  const pessoa = usuarioDaApi(conversa.other);

  const lista = useInfiniteQuery({
    queryKey: ["mensagens", conversa.id],
    queryFn: ({ pageParam }) => conversas.mensagens(conversa.id, pageParam),
    initialPageParam: undefined as string | undefined,
    getNextPageParam: (p) => p.next_cursor ?? undefined,
    enabled: online,
  });
  // A API manda da mais nova à mais antiga; a tela lê de cima para baixo.
  const msgs = (lista.data?.pages.flatMap((p) => p.items) ?? []).slice().reverse();
  const ultima = msgs.at(-1)?.id;

  // Aberta e com mensagem nova da outra pessoa: lida.
  useEffect(() => {
    if (!online || conversa.unread_count === 0) return;
    void conversas.marcarLida(conversa.id).then(() => qc.invalidateQueries({ queryKey: ["conversas"] }));
  }, [conversa.id, conversa.unread_count, ultima, online, qc]);

  // Em chaves: no Chrome novo, scrollIntoView devolve uma Promise, e efeito
  // que devolve algo além de função quebra a desmontagem.
  useEffect(() => {
    fimRef.current?.scrollIntoView({ block: "end" });
  }, [ultima]);

  const enviar = useMutation({
    mutationFn: (content: string) => conversas.enviar(conversa.id, { id: uuidv7(), content }),
    onSuccess: (m) => {
      guardarMensagem(qc, m);
      void qc.invalidateQueries({ queryKey: ["conversas"] });
    },
    onError: (e, content) => {
      setTexto(content);
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "A mensagem não saiu. Conversas precisam de internet.");
    },
  });

  return (
    <section className="flex min-h-[60vh] flex-col">
      <header className="flex items-center gap-3 border-b border-linha px-5 py-3">
        <Link to="/messages" className="text-tinta-3 md:hidden" aria-label="Voltar para as conversas">
          <ArrowLeft className="size-4" />
        </Link>
        <Monograma usuario={pessoa} tamanho="xs" />
        <Link to={`/profile/${conversa.other.username}`} className="font-serif text-[1.15rem] hover:text-lapis">
          {conversa.other.name}
        </Link>
      </header>
      <div className="max-h-[65vh] flex-1 space-y-4 overflow-y-auto px-5 py-6">
        {lista.hasNextPage && (
          <div className="text-center">
            <Botao tamanho="sm" variante="texto" onClick={() => void lista.fetchNextPage()} disabled={lista.isFetchingNextPage}>
              Mensagens anteriores
            </Botao>
          </div>
        )}
        {lista.isPending && <p className="text-center font-serif text-tinta-3 italic">Abrindo…</p>}
        {!lista.isPending && msgs.length === 0 && (
          <p className="text-center font-serif text-tinta-3 italic">Comece a conversa com {pessoa.name.split(" ")[0]}.</p>
        )}
        {msgs.map((m) => {
          const minha = m.author_id === eu;
          return (
            <div key={m.id} className={cn("flex", minha ? "justify-end" : "justify-start")}>
              <div className={cn("max-w-[78%]", minha && "text-right")}>
                <p
                  className={cn(
                    "inline-block px-4 py-2.5 text-left text-[14.5px] leading-snug whitespace-pre-line",
                    minha ? "bg-tinta text-papel" : "border border-linha bg-folha",
                  )}
                >
                  {m.content}
                </p>
                <div className="mt-1 text-[11px] text-tinta-3">{quando(m.created_at)}</div>
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
          const t = texto.trim();
          if (!t) return;
          setTexto("");
          enviar.mutate(t);
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={MENSAGEM_MAX}
          disabled={!online}
          placeholder={online ? `Escreva para ${pessoa.name.split(" ")[0]}…` : "Conversas precisam de internet."}
          className="flex-1 bg-transparent py-2 focus:outline-none"
          aria-label="Mensagem"
        />
        <button type="submit" disabled={!online || !texto.trim()} className="grid size-9 place-items-center text-lapis disabled:text-tinta-3" aria-label="Enviar">
          <Send className="size-4" />
        </button>
      </form>
    </section>
  );
}

/** Conversas a dois, com mensagens ao vivo (Fase 4b, ADR 0014). */
export default function Messages() {
  const { id } = useParams();
  const [busca] = useSearchParams();
  const navegar = useNavigate();
  const qc = useQueryClient();
  const online = useOnline();
  const { data: lista, isPending, isError, refetch } = useConversas();
  const atual = lista?.find((c) => c.id === id);
  const [nova, setNova] = useState(false);

  // /messages?com=<id da pessoa>: o "Conversar" do perfil abre (ou cria) a conversa.
  const com = busca.get("com");
  useEffect(() => {
    if (!com || !online) return;
    conversas
      .abrir(com)
      .then((c) => {
        qc.setQueryData<ApiConversation[]>(["conversas"], (l) => (l?.some((x) => x.id === c.id) ? l : [c, ...(l ?? [])]));
        navegar(`/messages/${c.id}`, { replace: true });
      })
      .catch(() => toast.error("Não foi possível abrir a conversa."));
  }, [com, online, navegar, qc]);

  // No computador, abre a mais recente.
  useEffect(() => {
    if (!id && !com && lista?.[0] && window.matchMedia("(min-width: 768px)").matches) navegar(`/messages/${lista[0].id}`, { replace: true });
  }, [id, com, lista, navegar]);

  return (
    <Pagina>
      <Cabecalho
        secao="Gente"
        titulo="Conversas"
        acoes={
          <Botao variante="tinta" onClick={() => setNova(true)}>
            <Plus /> Nova conversa
          </Botao>
        }
      />
      <NovaConversa aberta={nova} aoMudar={setNova} />

      <div className="mt-8 grid min-h-[60vh] border-y border-linha md:grid-cols-[300px_minmax(0,1fr)]">
        <ul className={cn("border-linha md:border-r", atual && "hidden md:block")}>
          {!online && !lista && <li className="px-4 py-6 font-serif text-tinta-3 italic">Conversas precisam de internet.</li>}
          {online && isPending && <li className="px-4 py-6 font-serif text-tinta-3 italic">Abrindo…</li>}
          {isError && (
            <li className="px-4 py-6">
              <Botao tamanho="sm" onClick={() => void refetch()}>
                Tentar de novo
              </Botao>
            </li>
          )}
          {lista?.length === 0 && (
            <li className="px-4 py-6 font-serif text-tinta-3 italic">Nenhuma conversa ainda. Toque em Nova conversa para começar.</li>
          )}
          {lista?.map((c) => {
            const ultima = c.last_message;
            return (
              <li key={c.id}>
                <Link
                  to={`/messages/${c.id}`}
                  className={cn(
                    "flex w-full items-start gap-3 border-b border-linha px-4 py-4 text-left transition-colors",
                    c.id === id ? "bg-papel-2" : "hover:bg-papel-2/50",
                  )}
                >
                  <Monograma usuario={usuarioDaApi(c.other)} />
                  <span className="min-w-0 flex-1">
                    <span className="flex items-baseline justify-between gap-2">
                      <span className={cn("truncate text-[14px]", c.unread_count > 0 ? "font-semibold" : "font-medium")}>{c.other.name}</span>
                      <span className="shrink-0 text-[11.5px] text-tinta-3">{ultima && quando(ultima.created_at)}</span>
                    </span>
                    <span className="mt-0.5 flex items-center gap-2">
                      <span className={cn("min-w-0 flex-1 truncate text-[13px]", c.unread_count > 0 ? "text-tinta" : "text-tinta-3")}>
                        {ultima ? `${ultima.author_id === c.other.id ? "" : "Você: "}${ultima.content}` : "Sem mensagens"}
                      </span>
                      {c.unread_count > 0 && (
                        <span className="numeral grid h-4.5 min-w-4.5 place-items-center bg-lapis px-1 text-[10.5px] text-papel" aria-label={`${c.unread_count} não lidas`}>
                          {c.unread_count}
                        </span>
                      )}
                    </span>
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>

        {atual ? (
          <Conversa key={atual.id} conversa={atual} />
        ) : (
          <div className="hidden place-items-center p-10 font-serif text-tinta-3 italic md:grid">Escolha uma conversa.</div>
        )}
      </div>
    </Pagina>
  );
}
