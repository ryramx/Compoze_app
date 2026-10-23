import { Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { Link } from "react-router";
import { AvisoDePrevia } from "@/components/compoze/AvisoDePrevia";
import { Cabecalho } from "@/components/compoze/Cabecalho";
import { Monograma } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { quando } from "@/lib/datas";
import { useCompoze } from "@/store/compozeStore";
import type { FeedItem } from "@/types";

const VERBO: Record<FeedItem["type"], string> = {
  post: "escreveu",
  "song-released": "finalizou uma canção",
  "project-update": "atualizou um projeto",
  follow: "começou a seguir alguém",
};

export default function Feed() {
  const mural = useCompoze((s) => s.feed);
  const getUser = useCompoze((s) => s.getUser);
  const getSong = useCompoze((s) => s.getSong);
  const getProject = useCompoze((s) => s.getProject);
  const eu = useCompoze((s) => s.users.find((u) => u.id === s.currentUserId));
  const publicar = useCompoze((s) => s.postFeed);
  const [texto, setTexto] = useState("");
  const [curtidos, setCurtidos] = useState<Set<string>>(new Set());

  return (
    <Pagina estreita>
      <Cabecalho secao="Gente" titulo="Mural" descricao="O que está saindo do caderno de quem você acompanha." />
      <AvisoDePrevia />

      <form
        className="mt-8 flex gap-4 border-b border-linha pb-6"
        onSubmit={(e) => {
          e.preventDefault();
          if (!texto.trim()) return;
          publicar(texto.trim());
          setTexto("");
        }}
      >
        <Monograma usuario={eu} tamanho="md" />
        <div className="flex-1">
          <textarea
            value={texto}
            onChange={(e) => setTexto(e.target.value)}
            rows={2}
            placeholder="No que você está trabalhando?"
            className="w-full resize-none bg-transparent font-serif text-[1.2rem] leading-snug placeholder:text-tinta-3 focus:outline-none"
          />
          <div className="mt-2 flex justify-end">
            <Botao type="submit" tamanho="sm" variante="tinta" disabled={!texto.trim()}>
              Publicar
            </Botao>
          </div>
        </div>
      </form>

      <ol>
        {mural.map((f) => {
          const u = getUser(f.userId);
          const musica = f.songId ? getSong(f.songId) : undefined;
          const projeto = f.projectId ? getProject(f.projectId) : undefined;
          const curtido = curtidos.has(f.id);
          return (
            <li key={f.id} className="flex gap-4 border-b border-linha py-7">
              <Link to={`/profile/${u?.username}`}>
                <Monograma usuario={u} tamanho="md" />
              </Link>
              <article className="min-w-0 flex-1">
                <header className="text-[14px]">
                  <Link to={`/profile/${u?.username}`} className="font-medium hover:text-lapis">
                    {u?.name}
                  </Link>{" "}
                  <span className="text-tinta-3">
                    {VERBO[f.type]} · {quando(f.timestamp)}
                  </span>
                </header>
                {f.content && <p className="mt-2 font-serif text-[1.2rem] leading-snug">{f.content}</p>}
                {(musica || projeto) && (
                  <Link
                    to={musica ? `/songs/${musica.id}/edit` : `/projects/${projeto!.id}`}
                    className="mt-4 flex items-baseline justify-between gap-4 border border-linha px-4 py-3 transition-colors hover:border-linha-forte"
                  >
                    <span className="font-serif text-[1.1rem]">{musica?.title ?? projeto?.name}</span>
                    <span className="rotulo">{musica ? "Canção" : "Projeto"}</span>
                  </Link>
                )}
                <footer className="mt-3 flex gap-5 text-[13px] text-tinta-3">
                  <button
                    onClick={() =>
                      setCurtidos((s) => {
                        const n = new Set(s);
                        if (n.has(f.id)) n.delete(f.id);
                        else n.add(f.id);
                        return n;
                      })
                    }
                    className={curtido ? "flex items-center gap-1.5 text-lapis" : "flex items-center gap-1.5 hover:text-tinta"}
                    aria-pressed={curtido}
                  >
                    <Heart className="size-3.5" fill={curtido ? "currentColor" : "none"} />
                    <span className="numeral">{f.likes + (curtido ? 1 : 0)}</span>
                  </button>
                  <span className="flex items-center gap-1.5">
                    <MessageCircle className="size-3.5" />
                    <span className="numeral">{f.comments}</span>
                  </span>
                </footer>
              </article>
            </li>
          );
        })}
      </ol>
    </Pagina>
  );
}
