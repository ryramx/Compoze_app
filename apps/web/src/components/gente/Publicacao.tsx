import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Heart, MessageCircle, Trash2 } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { toast } from "sonner";
import { Monograma } from "@/components/compoze/Monograma";
import { trocarNoMural } from "@/components/gente/cache";
import { Botao } from "@/components/ui/Botao";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { useOnline } from "@/lib/rede";
import { uuidv7 } from "@/lib/uuidv7";
import { rotuloDoEstagio } from "@/lib/rotulos";
import { statusDaApi, usuarioDaApi } from "@/services/api/adapters";
import type { ApiPost } from "@/services/api/dto";
import * as gente from "@/services/api/genteService";
import { useCompoze } from "@/store/compozeStore";

const erroDeRede = (e: unknown, padrao: string) => (e instanceof ApiError && e.status !== 0 ? e.message : padrao);

function Comentarios({ post }: { post: ApiPost }) {
  const qc = useQueryClient();
  const online = useOnline();
  const eu = useCompoze((s) => s.currentUserId);
  const [texto, setTexto] = useState("");
  const { data: lista, isPending } = useQuery({ queryKey: ["comentarios", post.id], queryFn: () => gente.comentarios(post.id) });

  const comentar = useMutation({
    mutationFn: (content: string) => gente.comentar(post.id, { id: uuidv7(), content }),
    onSuccess: (c) => {
      qc.setQueryData(["comentarios", post.id], [...(lista ?? []), c]);
      trocarNoMural(qc, post.id, (p) => ({ ...p, comment_count: p.comment_count + 1 }));
      setTexto("");
    },
    onError: (e) => toast.error(erroDeRede(e, "Comentar precisa de internet.")),
  });

  async function apagar(id: string) {
    try {
      await gente.apagarComentario(post.id, id);
      qc.setQueryData(["comentarios", post.id], (lista ?? []).filter((c) => c.id !== id));
      trocarNoMural(qc, post.id, (p) => ({ ...p, comment_count: Math.max(0, p.comment_count - 1) }));
    } catch (e) {
      toast.error(erroDeRede(e, "Apagar precisa de internet."));
    }
  }

  return (
    <div className="mt-4 border-l border-linha pl-4">
      {isPending ? (
        <p className="text-[13px] text-tinta-3 italic">Abrindo…</p>
      ) : (
        <ul className="space-y-3">
          {lista?.map((c) => (
            <li key={c.id} className="group flex gap-2.5 text-[14px]">
              <Monograma usuario={usuarioDaApi(c.author)} tamanho="xs" />
              <div className="min-w-0 flex-1">
                <Link to={`/profile/${c.author.username}`} className="font-medium hover:text-lapis">
                  {c.author.name}
                </Link>{" "}
                <span className="text-[12.5px] text-tinta-3">· {quando(c.created_at)}</span>
                <p className="text-tinta-2">{c.content}</p>
              </div>
              {(c.author.id === eu || post.author.id === eu) && (
                <button
                  onClick={() => void apagar(c.id)}
                  className="self-start text-tinta-3 opacity-0 group-hover:opacity-100 hover:text-lapis focus:opacity-100"
                  aria-label="Apagar comentário"
                >
                  <Trash2 className="size-3.5" />
                </button>
              )}
            </li>
          ))}
        </ul>
      )}
      <form
        className="mt-3 flex items-end gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (texto.trim()) comentar.mutate(texto.trim());
        }}
      >
        <input
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          maxLength={500}
          placeholder={online ? "Comentar…" : "Sem internet"}
          disabled={!online}
          className="min-w-0 flex-1 border-b border-linha-forte bg-transparent py-1 text-[14px] focus:border-tinta focus:outline-none"
          aria-label="Comentário"
        />
        <Botao type="submit" tamanho="sm" variante="texto" disabled={!online || !texto.trim() || comentar.isPending}>
          Enviar
        </Botao>
      </form>
    </div>
  );
}

/** Uma publicação do mural, com curtir, comentários e apagar (a própria). */
export function Publicacao({ post }: { post: ApiPost }) {
  const qc = useQueryClient();
  const online = useOnline();
  const eu = useCompoze((s) => s.currentUserId);
  const tenhoACancao = useCompoze((s) => (post.song ? s.songs.some((m) => m.id === post.song!.id) : false));
  const [comentando, setComentando] = useState(false);
  const autora = usuarioDaApi(post.author);

  async function curtir() {
    const sim = !post.liked_by_me;
    // Muda na hora; se a API recusar, volta.
    trocarNoMural(qc, post.id, (p) => ({ ...p, liked_by_me: sim, like_count: p.like_count + (sim ? 1 : -1) }));
    try {
      const atual = await gente.curtir(post.id, sim);
      trocarNoMural(qc, post.id, () => atual);
    } catch (e) {
      trocarNoMural(qc, post.id, (p) => ({ ...p, liked_by_me: !sim, like_count: p.like_count + (sim ? -1 : 1) }));
      toast.error(erroDeRede(e, "Curtir precisa de internet."));
    }
  }

  async function apagar() {
    try {
      await gente.apagar(post.id);
      trocarNoMural(qc, post.id, () => null);
      toast("Publicação apagada.");
    } catch (e) {
      toast.error(erroDeRede(e, "Apagar precisa de internet."));
    }
  }

  return (
    // Cada publicação no seu cartão, em folha mais clara que o papel do mural.
    <li className="group flex gap-3 border border-linha bg-folha p-4 transition-colors hover:border-linha-forte sm:gap-4 sm:p-5">
      <Link to={`/profile/${post.author.username}`}>
        <Monograma usuario={autora} tamanho="md" />
      </Link>
      <article className="min-w-0 flex-1">
        <header className="flex items-baseline gap-2 text-[14px]">
          <span className="min-w-0 flex-1">
            <Link to={`/profile/${post.author.username}`} className="font-medium hover:text-lapis">
              {post.author.name}
            </Link>{" "}
            <span className="text-tinta-3">· {quando(post.created_at)}</span>
          </span>
          {post.author.id === eu && (
            <button
              onClick={() => void apagar()}
              className="text-tinta-3 opacity-0 group-hover:opacity-100 hover:text-lapis focus:opacity-100"
              aria-label="Apagar publicação"
            >
              <Trash2 className="size-3.5" />
            </button>
          )}
        </header>
        <p className="mt-2 font-serif text-[1.2rem] leading-snug whitespace-pre-line">{post.content}</p>
        {post.song &&
          (() => {
            const corpo = (
              <>
                <span className="font-serif text-[1.1rem]">{post.song.title}</span>
                <span className="rotulo">{rotuloDoEstagio(statusDaApi(post.song.status))}</span>
              </>
            );
            const classe = "mt-4 flex items-baseline justify-between gap-4 border border-linha bg-papel px-4 py-3";
            // Só abre no editor quem escreve a canção; os outros veem o título.
            return tenhoACancao ? (
              <Link to={`/songs/${post.song.id}/edit`} className={cn(classe, "transition-colors hover:border-linha-forte")}>
                {corpo}
              </Link>
            ) : (
              <div className={classe}>{corpo}</div>
            );
          })()}
        <footer className="mt-3 flex gap-5 text-[13px] text-tinta-3">
          <button
            onClick={() => void curtir()}
            disabled={!online}
            className={post.liked_by_me ? "flex items-center gap-1.5 text-lapis" : "flex items-center gap-1.5 hover:text-tinta"}
            aria-pressed={post.liked_by_me}
            aria-label="Curtir"
          >
            <Heart className="size-3.5" fill={post.liked_by_me ? "currentColor" : "none"} />
            <span className="numeral">{post.like_count}</span>
          </button>
          <button
            onClick={() => setComentando((v) => !v)}
            className={cn("flex items-center gap-1.5 hover:text-tinta", comentando && "text-tinta")}
            aria-expanded={comentando}
            aria-label="Comentários"
          >
            <MessageCircle className="size-3.5" />
            <span className="numeral">{post.comment_count}</span>
          </button>
        </footer>
        {comentando && <Comentarios post={post} />}
      </article>
    </li>
  );
}
