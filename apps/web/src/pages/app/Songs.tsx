import { FileUp, MoreHorizontal, Plus, Search, Trash2 } from "lucide-react";
import { useMemo, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Cabecalho, Vazio } from "@/components/compoze/Cabecalho";
import { Estagio } from "@/components/compoze/Estagio";
import { Importar } from "@/components/compoze/Importar";
import { PilhaDeMonogramas } from "@/components/compoze/Monograma";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Seletor } from "@/components/ui/Campo";
import { ItemDeMenu, Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import type { CancaoImportada } from "@/lib/importar";
import { ESTAGIOS, posicaoDoEstagio } from "@/lib/rotulos";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { Song, SongStatus } from "@/types";

type Ordem = "recentes" | "antigas" | "estagio" | "titulo";
type Vista = "indice" | "fichas";

/** Primeira linha de letra com texto. */
const primeiroVerso = (m: Song) => m.blocks.find((b) => b.type === "lyric-line" && b.text.trim())?.text;

export default function Songs() {
  const todas = useCompoze((s) => s.songs);
  const getUser = useCompoze((s) => s.getUser);
  const criarMusica = useCompoze((s) => s.createSong);
  const atualizarMusica = useCompoze((s) => s.updateSong);
  const excluirMusica = useCompoze((s) => s.deleteSong);
  const restaurarMusica = useCompoze((s) => s.restoreSong);
  const navegar = useNavigate();

  // Filtro e busca vivem na URL: a Mesa linka direto para "/songs?estagio=revisao"
  // e voltar do editor devolve a pessoa à mesma lista.
  const [params, setParams] = useSearchParams();
  const estagio = (params.get("estagio") as SongStatus | null) ?? "todas";
  const termo = params.get("q") ?? "";
  const [ordem, setOrdem] = useState<Ordem>("recentes");
  const [vista, setVista] = useState<Vista>("indice");
  const [importando, setImportando] = useState(false);

  const mudarParam = (chave: string, valor: string | null) => {
    const p = new URLSearchParams(params);
    if (valor) p.set(chave, valor);
    else p.delete(chave);
    setParams(p, { replace: true });
  };

  const ativas = listActive(todas);

  const lista = useMemo(() => {
    // Busca por título, tag ou verso: quem organiza por tema procura a tag, e
    // quem lembra de um trecho procura o verso — o título às vezes nem existe.
    const t = termo.trim().toLowerCase();
    const filtradas = ativas
      .filter((m) => estagio === "todas" || m.status === estagio)
      .filter(
        (m) =>
          !t ||
          m.title.toLowerCase().includes(t) ||
          (m.tags ?? []).some((x) => x.toLowerCase().includes(t)) ||
          m.blocks.some((b) => b.text.toLowerCase().includes(t)),
      );
    const ord = [...filtradas];
    if (ordem === "recentes") ord.sort((a, b) => +new Date(b.updatedAt) - +new Date(a.updatedAt));
    if (ordem === "antigas") ord.sort((a, b) => +new Date(a.updatedAt) - +new Date(b.updatedAt));
    if (ordem === "estagio") ord.sort((a, b) => posicaoDoEstagio(a.status) - posicaoDoEstagio(b.status));
    if (ordem === "titulo") ord.sort((a, b) => a.title.localeCompare(b.title, "pt-BR"));
    return ord;
  }, [ativas, estagio, termo, ordem]);

  async function novaCancao() {
    const id = await criarMusica({ title: "Sem título" });
    navegar(`/songs/${id}/edit`);
  }

  /** Canção importada (ADR 0024): nasce como ideia, com a folha e a ficha que vieram. */
  async function importada(c: CancaoImportada) {
    const id = await criarMusica({ title: c.titulo, blocos: c.blocos });
    const ficha: Partial<Song> = {};
    if (c.tom) ficha.key = c.tom;
    if (c.bpm) ficha.bpm = c.bpm;
    if (c.compasso) ficha.timeSignature = c.compasso;
    if (Object.keys(ficha).length > 0) atualizarMusica(id, ficha);
    // Com cifra, o editor abre com a letra alinhada aos acordes.
    if (c.blocos.some((b) => b.type === "chord-line")) {
      try {
        localStorage.setItem("compoze.editor.mono", "1");
        localStorage.setItem("compoze.editor.cifras", "1");
      } catch {
        // Preferência do editor; sem ela, o botão Alinhar resolve.
      }
    }
    toast("Importada como ideia.");
    navegar(`/songs/${id}/edit`);
  }

  function excluir(m: Song) {
    excluirMusica(m.id);
    toast(`“${m.title}” foi para a lixeira.`, {
      action: { label: "Desfazer", onClick: () => restaurarMusica(m.id) },
    });
  }

  return (
    <Pagina>
      <Cabecalho
        secao="Escrita"
        titulo="Canções"
        descricao={`${ativas.length} ${ativas.length === 1 ? "obra" : "obras"} no caderno, da primeira ideia à gravação.`}
        acoes={
          <div className="flex gap-2">
            <Botao variante="contorno" onClick={() => setImportando(true)}>
              <FileUp /> Importar
            </Botao>
            <Botao variante="tinta" onClick={() => void novaCancao()}>
              <Plus /> Nova canção
            </Botao>
          </div>
        }
      />

      {/* Barra de ferramentas */}
      <div className="mt-6 flex flex-col gap-5 md:flex-row md:items-end md:justify-between">
        <label className="relative flex max-w-sm flex-1 items-center gap-2 border-b border-linha-forte pb-1.5 focus-within:border-tinta">
          <Search className="size-4 text-tinta-3" />
          <input
            value={termo}
            onChange={(e) => mudarParam("q", e.target.value || null)}
            placeholder="Título, tag ou um verso que você lembra"
            className="w-full bg-transparent py-1 text-[15px] placeholder:text-tinta-3 focus:outline-none"
            aria-label="Buscar canções"
          />
        </label>
        <div className="flex items-end gap-5">
          <label className="block w-36">
            <span className="rotulo">Ordem</span>
            <Seletor value={ordem} onChange={(e) => setOrdem(e.target.value as Ordem)} className="py-1 text-sm">
              <option value="recentes">Mais recentes</option>
              <option value="antigas">Mais antigas</option>
              <option value="estagio">Por estágio</option>
              <option value="titulo">Por título</option>
            </Seletor>
          </label>
          <div className="flex text-[13px]" role="group" aria-label="Exibição">
            {(["indice", "fichas"] as Vista[]).map((v) => (
              <button
                key={v}
                onClick={() => setVista(v)}
                aria-pressed={vista === v}
                className={cn(
                  "border-b px-2.5 py-1.5 transition-colors",
                  vista === v ? "border-tinta text-tinta" : "border-linha text-tinta-3 hover:text-tinta-2",
                )}
              >
                {v === "indice" ? "Índice" : "Fichas"}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Filtro por estágio */}
      <div className="-mx-5 mt-6 overflow-x-auto px-5 md:mx-0 md:px-0">
        <div className="flex min-w-max gap-6 border-b border-linha text-[13.5px]" role="tablist">
          {[{ valor: "todas" as const, plural: "Todas" }, ...ESTAGIOS].map((e) => {
            const n = e.valor === "todas" ? ativas.length : ativas.filter((m) => m.status === e.valor).length;
            const ativo = estagio === e.valor;
            return (
              <button
                key={e.valor}
                role="tab"
                aria-selected={ativo}
                onClick={() => mudarParam("estagio", e.valor === "todas" ? null : e.valor)}
                className={cn(
                  "-mb-px flex items-baseline gap-1.5 border-b-2 pb-2.5 transition-colors",
                  ativo ? "border-lapis text-tinta" : "border-transparent text-tinta-3 hover:text-tinta-2",
                )}
              >
                {e.plural}
                <span className="numeral text-[11px] text-tinta-3">{n}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="mt-6">
        {lista.length === 0 ? (
          <Vazio frase={termo ? `Nada com “${termo}”. Tente um verso, uma tag ou outro estágio.` : "Nenhuma canção neste estágio ainda."}>
            {!termo && (
              <Botao variante="contorno" onClick={() => void novaCancao()}>
                <Plus /> Nova canção
              </Botao>
            )}
          </Vazio>
        ) : vista === "indice" ? (
          <table className="w-full border-collapse text-left">
            <thead>
              <tr className="rotulo border-b border-linha-forte">
                <th className="w-10 py-2 font-semibold">Nº</th>
                <th className="py-2 font-semibold">Título</th>
                <th className="hidden py-2 font-semibold md:table-cell">Estágio</th>
                <th className="hidden py-2 font-semibold lg:table-cell">Tom</th>
                <th className="hidden py-2 font-semibold lg:table-cell">Andamento</th>
                <th className="hidden py-2 font-semibold sm:table-cell">Autores</th>
                <th className="py-2 text-right font-semibold">Editada</th>
                <th className="w-10" />
              </tr>
            </thead>
            <tbody>
              {lista.map((m, i) => (
                <tr key={m.id} className="group border-b border-linha transition-colors hover:bg-papel-2/50">
                  <td className="numeral py-4 align-top text-[12px] text-tinta-3">{String(i + 1).padStart(2, "0")}</td>
                  {/* max-w-0 + w-full: a coluna ocupa o que sobra e o verso corta com
                      reticências, em vez de alargar a tabela além da tela do celular. */}
                  <td className="w-full max-w-0 py-3 pr-4">
                    <Link to={`/songs/${m.id}/edit`} className="block">
                      <span className="font-serif text-[1.2rem] leading-tight group-hover:text-lapis">{m.title}</span>
                      <span className="mt-0.5 block truncate text-[13px] text-tinta-3 md:max-w-md">
                        {primeiroVerso(m) ?? "Sem letra ainda"}
                        {(m.tags ?? []).length > 0 && <span className="ml-2 text-tinta-3/80">{m.tags!.map((t) => `#${t}`).join(" ")}</span>}
                      </span>
                    </Link>
                    <Estagio status={m.status} className="mt-2 md:hidden" />
                  </td>
                  <td className="hidden py-3 md:table-cell">
                    <Estagio status={m.status} />
                  </td>
                  <td className="numeral hidden py-3 text-[13px] lg:table-cell">{m.key ?? "—"}</td>
                  <td className="numeral hidden py-3 text-[13px] lg:table-cell">
                    {m.bpm ? `${m.bpm}` : "—"}
                    {m.timeSignature && <span className="text-tinta-3"> · {m.timeSignature}</span>}
                  </td>
                  <td className="hidden py-3 sm:table-cell">
                    <PilhaDeMonogramas usuarios={m.collaborators.map((c) => getUser(c.userId))} />
                  </td>
                  <td className="py-3 text-right text-[12.5px] whitespace-nowrap text-tinta-3">{quando(m.updatedAt)}</td>
                  <td className="py-3 text-right">
                    <Menu
                      gatilho={
                        <button className="grid size-8 place-items-center rounded-sm text-tinta-3 opacity-60 group-hover:opacity-100 hover:bg-papel-2 hover:text-tinta" aria-label={`Ações de ${m.title}`}>
                          <MoreHorizontal className="size-4" />
                        </button>
                      }
                    >
                      <ItemDeMenu aoEscolher={() => navegar(`/songs/${m.id}/edit`)}>Abrir</ItemDeMenu>
                      <ItemDeMenu perigo icone={<Trash2 />} aoEscolher={() => excluir(m)}>
                        Mover para a lixeira
                      </ItemDeMenu>
                    </Menu>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        ) : (
          // Duas fichas por linha já no celular: a ficha é um cartão de arquivo,
          // não um banner. No computador cabem três, quatro nas telas largas.
          <ul className="grid grid-cols-2 gap-3 sm:gap-5 lg:grid-cols-3 2xl:grid-cols-4">
            {lista.map((m) => (
              <li key={m.id} className="min-w-0">
                <Link
                  to={`/songs/${m.id}/edit`}
                  className="group flex h-full min-h-44 flex-col border border-linha bg-folha transition-colors hover:border-linha-forte sm:min-h-52"
                >
                  {/* Ficha pautada: linhas finas como num cartão de arquivo. */}
                  <div className="flex items-start justify-between gap-2 border-b-2 border-lapis/60 px-3 pt-3.5 pb-2.5 sm:gap-3 sm:px-5 sm:pt-5 sm:pb-3">
                    <h3 className="line-clamp-2 font-serif text-[1.1rem] leading-tight group-hover:text-lapis sm:text-[1.3rem]">{m.title}</h3>
                    <Estagio status={m.status} semRotulo className="mt-1.5 sm:mt-2" />
                  </div>
                  <div
                    className="flex-1 px-3 pt-1.5 font-serif text-[13.5px] leading-[26px] text-tinta-2 sm:px-5 sm:pt-2 sm:text-[15px]"
                    style={{ backgroundImage: "repeating-linear-gradient(to bottom, transparent 0, transparent 25px, var(--linha) 25px, var(--linha) 26px)" }}
                  >
                    {m.blocks
                      .filter((b) => b.type === "lyric-line" && b.text.trim())
                      .slice(0, 3)
                      .map((b) => (
                        <p key={b.id} className="truncate">
                          {b.text}
                        </p>
                      ))}
                  </div>
                  <div className="flex items-center justify-between gap-2 px-3 py-2.5 text-[11.5px] text-tinta-3 sm:px-5 sm:py-3 sm:text-[12px]">
                    <PilhaDeMonogramas usuarios={m.collaborators.map((c) => getUser(c.userId))} />
                    <span className="truncate">
                      {m.key && <span className="numeral mr-2 hidden sm:inline">{m.key}</span>}
                      {quando(m.updatedAt)}
                    </span>
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </div>

      <Importar aberto={importando} aoMudar={setImportando} destino={{ tipo: "nova", aoCriar: importada }} />
    </Pagina>
  );
}
