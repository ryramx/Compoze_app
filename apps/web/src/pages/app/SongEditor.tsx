import { ArrowLeft, Link2, MoreHorizontal, Redo2, SlidersHorizontal, Trash2, Undo2, X } from "lucide-react";
import { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { toast } from "sonner";
import { Confirmar } from "@/components/compoze/Confirmar";
import { PilhaDeMonogramas } from "@/components/compoze/Monograma";
import { Bloco } from "@/components/editor/Bloco";
import { FichaTecnica } from "@/components/editor/FichaTecnica";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Dica } from "@/components/ui/Dica";
import { ItemDeMenu, Menu, SeparadorDeMenu } from "@/components/ui/Menu";
import { useUndoRedo } from "@/hooks/useUndoRedo";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { useCompoze } from "@/store/compozeStore";
import type { SongBlock } from "@/types";

interface Retrato {
  title: string;
  blocks: SongBlock[];
  key?: string;
  bpm?: number;
  timeSignature?: string;
  tags?: string[];
}

type TipoDeBloco = SongBlock["type"];

const INSERIR: { tipo: TipoDeBloco; rotulo: string; marca: string }[] = [
  { tipo: "section", rotulo: "Seção", marca: "§" },
  { tipo: "chord-line", rotulo: "Cifra", marca: "♯" },
  { tipo: "lyric-line", rotulo: "Verso", marca: "¶" },
  { tipo: "note", rotulo: "Nota", marca: "※" },
];

function preferencia(chave: string, padrao: boolean): boolean {
  try {
    const v = localStorage.getItem(chave);
    return v === null ? padrao : v === "1";
  } catch {
    return padrao;
  }
}

function guardar(chave: string, v: boolean) {
  try {
    localStorage.setItem(chave, v ? "1" : "0");
  } catch {
    // Preferência vale só nesta sessão.
  }
}

export default function SongEditor() {
  const { id } = useParams();
  const navegar = useNavigate();
  const musica = useCompoze((s) => (id ? s.getSong(id) : undefined));
  const euId = useCompoze((s) => s.currentUserId);
  const getUser = useCompoze((s) => s.getUser);
  const carregarMusica = useCompoze((s) => s.loadSong);
  const atualizarMusica = useCompoze((s) => s.updateSong);
  const atualizarBloco = useCompoze((s) => s.updateBlock);
  const inserirBloco = useCompoze((s) => s.insertBlock);
  const removerBloco = useCompoze((s) => s.removeBlock);
  const excluirMusica = useCompoze((s) => s.deleteSong);
  const restaurarMusica = useCompoze((s) => s.restoreSong);

  const [focoPendente, setFocoPendente] = useState<string | null>(null);
  const ultimoFocoRef = useRef<string | null>(null);
  const [mostrarCifras, setMostrarCifras] = useState(() => preferencia("compoze.editor.cifras", true));
  const [letraEmMono, setLetraEmMono] = useState(() => preferencia("compoze.editor.mono", false));
  const [fichaAberta, setFichaAberta] = useState(false);
  const [confirmandoExclusao, setConfirmandoExclusao] = useState(false);
  const [salvando, setSalvando] = useState(false);
  const tituloRef = useRef<HTMLTextAreaElement>(null);

  // A listagem não traz os blocos; o editor busca a canção completa ao abrir.
  useEffect(() => {
    if (id) void carregarMusica(id).catch(() => undefined);
  }, [id, carregarMusica]);

  // ------------------------------------------------------- desfazer / refazer
  // O retrato cobre texto e metadados. Inserir ou remover blocos não entra no
  // histórico: desfazer isso exigiria recriar blocos no servidor com ids novos,
  // e a promessa "Ctrl+Z volta o que eu escrevi" é a que importa (ADR 0002).
  const retrato = useMemo<Retrato | undefined>(
    () =>
      musica
        ? { title: musica.title, blocks: musica.blocks, key: musica.key, bpm: musica.bpm, timeSignature: musica.timeSignature, tags: musica.tags }
        : undefined,
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [musica?.title, musica?.blocks, musica?.key, musica?.bpm, musica?.timeSignature, musica?.tags],
  );

  const { undo, redo, canUndo, canRedo } = useUndoRedo<Retrato>(retrato, (r) => {
    if (!musica) return;
    const { blocks, ...meta } = r;
    atualizarMusica(musica.id, meta);
    // Grava cada bloco cujo texto mudou — o PATCH da música não leva blocos.
    for (const b of blocks) {
      const atual = musica.blocks.find((x) => x.id === b.id);
      if (atual && (atual.text !== b.text || atual.label !== b.label)) {
        atualizarBloco(musica.id, b.id, { text: b.text, label: b.label });
      }
    }
  });

  useEffect(() => {
    const aoTeclar = (e: KeyboardEvent) => {
      if (!(e.ctrlKey || e.metaKey)) return;
      const k = e.key.toLowerCase();
      if (k === "z") {
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
      } else if (k === "y") {
        e.preventDefault();
        redo();
      }
    };
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [undo, redo]);

  // Indicador de gravação: as escritas são adiadas no store; aqui só refletimos
  // que houve mudança e, pouco depois, que ela assentou.
  // Ignora as mudanças da abertura (carga da canção completa), que não são edição.
  const abertoEm = useRef(Date.now());
  useEffect(() => {
    if (!retrato || Date.now() - abertoEm.current < 1500) return;
    setSalvando(true);
    const t = setTimeout(() => setSalvando(false), 1100);
    return () => clearTimeout(t);
  }, [retrato]);

  useLayoutEffect(() => {
    const el = tituloRef.current;
    if (!el) return;
    el.style.height = "0px";
    el.style.height = `${el.scrollHeight}px`;
  }, [musica?.title]);

  const focoTratado = useCallback(() => setFocoPendente(null), []);

  const visiveis = useMemo(
    () => (musica?.blocks ?? []).filter((b) => mostrarCifras || b.type !== "chord-line"),
    [musica?.blocks, mostrarCifras],
  );

  if (!musica) {
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">Esta canção não está no seu caderno.</p>
        <Link to="/songs" className="link-sublinhado mt-4 inline-block text-sm">
          Voltar para Canções
        </Link>
      </Pagina>
    );
  }

  if (musica.deletedAt) {
    return (
      <Pagina estreita>
        <p className="font-serif text-xl text-tinta-2 italic">“{musica.title}” está na lixeira. Restaure para continuar escrevendo.</p>
        <div className="mt-6 flex gap-2">
          <Botao variante="tinta" onClick={() => restaurarMusica(musica.id)}>
            Restaurar canção
          </Botao>
          <Botao variante="texto" onClick={() => navegar("/trash")}>
            Ver lixeira
          </Botao>
        </div>
      </Pagina>
    );
  }

  const autora = getUser(musica.creatorId);
  const outros = musica.collaborators.filter((c) => c.userId !== musica.creatorId).map((c) => getUser(c.userId));

  /**
   * Inserção conforme o cursor: abaixo do bloco em foco; cifra pedida sobre um
   * verso entra acima dele, que é onde a cifra fica numa folha. Sem foco, no fim.
   */
  async function inserir(tipo: TipoDeBloco) {
    if (!musica) return;
    const ancora = musica.blocks.find((b) => b.id === ultimoFocoRef.current);
    const opcoes = ancora
      ? tipo === "chord-line" && ancora.type === "lyric-line"
        ? { beforeId: ancora.id }
        : { afterId: ancora.id }
      : undefined;
    if (tipo === "chord-line" && !mostrarCifras) {
      setMostrarCifras(true);
      guardar("compoze.editor.cifras", true);
    }
    const novo = await inserirBloco(
      musica.id,
      { type: tipo, label: tipo === "section" ? "" : undefined, text: "", authorId: euId },
      opcoes,
    );
    ultimoFocoRef.current = novo;
    setFocoPendente(novo);
  }

  async function versoAbaixo(depoisDe: string) {
    if (!musica) return;
    const novo = await inserirBloco(musica.id, { type: "lyric-line", text: "", authorId: euId }, { afterId: depoisDe });
    ultimoFocoRef.current = novo;
    setFocoPendente(novo);
  }

  function apagarVazio(blocoId: string) {
    if (!musica) return;
    const i = visiveis.findIndex((b) => b.id === blocoId);
    const anterior = visiveis[i - 1];
    removerBloco(musica.id, blocoId);
    if (anterior) {
      ultimoFocoRef.current = anterior.id;
      setFocoPendente(anterior.id);
    }
  }

  function copiarLink() {
    void navigator.clipboard?.writeText(`${window.location.origin}/songs/${musica!.id}/edit`);
    toast("Link copiado. Só quem é coautor consegue abrir.");
  }

  function excluir() {
    excluirMusica(musica!.id);
    toast(`“${musica!.title}” foi para a lixeira.`, {
      action: { label: "Desfazer", onClick: () => restaurarMusica(musica!.id) },
    });
    navegar("/songs");
  }

  const alternar = (atual: boolean, set: (v: boolean) => void, chave: string) => () => {
    set(!atual);
    guardar(chave, !atual);
  };

  return (
    <div className="min-h-dvh">
      {/* Barra do documento */}
      <div className="sticky top-14 z-20 border-b border-linha bg-papel/92 backdrop-blur lg:top-0">
        <div className="mx-auto flex h-12 max-w-[1320px] items-center gap-1 px-3 md:px-6">
          <Link to="/songs" className="flex items-center gap-1.5 rounded-sm px-2 py-1.5 text-[13px] text-tinta-2 hover:bg-papel-2 hover:text-tinta">
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Canções</span>
          </Link>
          <span className="mx-1 hidden h-4 w-px bg-linha sm:block" />
          <span className="min-w-0 flex-1 truncate px-1 text-[13px] text-tinta-3">
            <span className={cn("mr-1.5 inline-block size-1.5 rounded-full align-middle transition-colors", salvando ? "bg-lapis" : "bg-ok")} />
            {salvando ? "Salvando…" : `Salvo · editada ${quando(musica.updatedAt)}`}
          </span>

          <Dica texto="Desfazer (Ctrl+Z)">
            <Botao variante="texto" tamanho="icone" onClick={undo} disabled={!canUndo} aria-label="Desfazer">
              <Undo2 />
            </Botao>
          </Dica>
          <Dica texto="Refazer (Ctrl+Shift+Z)">
            <Botao variante="texto" tamanho="icone" onClick={redo} disabled={!canRedo} aria-label="Refazer">
              <Redo2 />
            </Botao>
          </Dica>
          <span className="mx-1 h-4 w-px bg-linha" />
          <Dica texto={mostrarCifras ? "Esconder as cifras para ler só a letra" : "Mostrar as cifras"}>
            <button
              onClick={alternar(mostrarCifras, setMostrarCifras, "compoze.editor.cifras")}
              aria-pressed={mostrarCifras}
              className={cn("hidden rounded-sm px-2.5 py-1.5 text-[13px] sm:block", mostrarCifras ? "text-lapis" : "text-tinta-3 line-through")}
            >
              Cifras
            </button>
          </Dica>
          <Dica texto="Letra em fonte monoespaçada, para alinhar acorde e sílaba">
            <button
              onClick={alternar(letraEmMono, setLetraEmMono, "compoze.editor.mono")}
              aria-pressed={letraEmMono}
              className={cn("hidden rounded-sm px-2.5 py-1.5 text-[13px] sm:block", letraEmMono ? "numeral text-tinta" : "text-tinta-3")}
            >
              Alinhar
            </button>
          </Dica>
          <Botao variante="texto" tamanho="sm" className="xl:hidden" onClick={() => setFichaAberta(true)}>
            <SlidersHorizontal /> <span className="hidden sm:inline">Ficha</span>
          </Botao>
          <Menu
            gatilho={
              <Botao variante="texto" tamanho="icone" aria-label="Mais ações">
                <MoreHorizontal />
              </Botao>
            }
          >
            <ItemDeMenu icone={<Link2 />} aoEscolher={copiarLink}>
              Copiar link
            </ItemDeMenu>
            <div className="sm:hidden">
              <ItemDeMenu aoEscolher={alternar(mostrarCifras, setMostrarCifras, "compoze.editor.cifras")}>
                {mostrarCifras ? "Esconder cifras" : "Mostrar cifras"}
              </ItemDeMenu>
              <ItemDeMenu aoEscolher={alternar(letraEmMono, setLetraEmMono, "compoze.editor.mono")}>
                {letraEmMono ? "Letra em serifa" : "Alinhar cifra e letra"}
              </ItemDeMenu>
            </div>
            <SeparadorDeMenu />
            <ItemDeMenu perigo icone={<Trash2 />} aoEscolher={() => setConfirmandoExclusao(true)}>
              Mover para a lixeira
            </ItemDeMenu>
          </Menu>
        </div>
      </div>

      <div className="mx-auto grid max-w-[1320px] gap-12 px-5 md:px-6 xl:grid-cols-[minmax(0,1fr)_300px]">
        {/* Folha */}
        <article className="mx-auto w-full max-w-[820px] pt-10 pb-40 md:pt-14">
          <div className="md:pl-[6.5rem]">
            <div className="border-l-2 border-transparent pl-3">
              <textarea
                ref={tituloRef}
                value={musica.title}
                rows={1}
                onChange={(e) => atualizarMusica(musica.id, { title: e.target.value.replace(/\n/g, " ") })}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    e.preventDefault();
                    const primeiro = visiveis[0];
                    if (primeiro) setFocoPendente(primeiro.id);
                  }
                }}
                placeholder="Sem título"
                aria-label="Título da canção"
                className="titulo-pagina block w-full resize-none overflow-hidden bg-transparent placeholder:text-tinta-3/60 focus:outline-none"
              />
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-[13.5px] text-tinta-2">
                <PilhaDeMonogramas usuarios={[autora, ...outros]} tamanho="xs" />
                <span>
                  de <span className="text-tinta">{autora?.name}</span>
                  {outros.length > 0 && (
                    <>
                      {" "}com <span className="text-tinta">{outros.map((u) => u?.name.split(" ")[0]).join(", ")}</span>
                    </>
                  )}
                </span>
                {(musica.key || musica.bpm) && (
                  <span className="numeral text-[12px] text-tinta-3">
                    {[musica.key, musica.bpm && `${musica.bpm} bpm`, musica.timeSignature].filter(Boolean).join(" · ")}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="mt-10">
            {visiveis.length === 0 && (
              <p className="pl-3 font-serif text-lg text-tinta-3 italic md:pl-[7.25rem]">Folha em branco. Comece por uma seção ou um verso.</p>
            )}
            {visiveis.map((b, i) => {
              const anterior = visiveis[i - 1];
              return (
                <Bloco
                  key={b.id}
                  bloco={b}
                  autor={getUser(b.authorId)}
                  meu={b.authorId === euId}
                  assinarNaMargem={!anterior || anterior.authorId !== b.authorId || anterior.type === "section"}
                  letraEmMono={letraEmMono}
                  focar={focoPendente === b.id}
                  aoFocar={() => (ultimoFocoRef.current = b.id)}
                  aoFocarTratado={focoTratado}
                  aoMudarTexto={(text) => atualizarBloco(musica.id, b.id, { text })}
                  aoMudarRotulo={(label) => atualizarBloco(musica.id, b.id, { label })}
                  aoRemover={() => removerBloco(musica.id, b.id)}
                  aoEnter={() => void versoAbaixo(b.id)}
                  aoApagarVazio={() => apagarVazio(b.id)}
                />
              );
            })}
          </div>

          {/* Inserir blocos: fica grudado no fim da tela enquanto a folha rola. */}
          <div className="sticky bottom-5 z-10 mt-10 flex justify-center md:pl-[6.5rem]">
            <div className="flex items-center border border-linha-forte bg-folha/95 shadow-folha backdrop-blur" role="toolbar" aria-label="Inserir bloco">
              <span className="rotulo hidden px-3 sm:inline">Inserir</span>
              {INSERIR.map((t) => (
                <button
                  key={t.tipo}
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => void inserir(t.tipo)}
                  className="flex items-center gap-1.5 border-l border-linha px-3.5 py-2.5 text-[13.5px] text-tinta-2 transition-colors hover:bg-papel-2 hover:text-tinta"
                >
                  <span className="font-serif text-[15px] text-lapis">{t.marca}</span>
                  {t.rotulo}
                </button>
              ))}
            </div>
          </div>
        </article>

        {/* Margem direita */}
        <aside className="hidden border-l border-linha py-14 pl-8 xl:block">
          <div className="sticky top-20">
            <FichaTecnica musica={musica} />
          </div>
        </aside>
      </div>

      {/* Ficha no celular e em telas médias */}
      {fichaAberta && (
        <div className="fixed inset-0 z-50 xl:hidden">
          <div className="absolute inset-0 bg-papel/70 backdrop-blur-[2px]" onClick={() => setFichaAberta(false)} />
          <div className="absolute inset-y-0 right-0 w-full max-w-sm animate-[entrar_.2s_ease-out] overflow-y-auto border-l border-linha bg-papel px-6 py-6">
            <div className="mb-6 flex items-center justify-between">
              <span className="font-serif text-2xl">Ficha técnica</span>
              <button onClick={() => setFichaAberta(false)} className="grid size-8 place-items-center text-tinta-3" aria-label="Fechar ficha">
                <X className="size-4" />
              </button>
            </div>
            <FichaTecnica musica={musica} />
          </div>
        </div>
      )}

      <Confirmar
        aberto={confirmandoExclusao}
        aoMudar={setConfirmandoExclusao}
        titulo="Mover para a lixeira?"
        descricao={`“${musica.title}” fica 30 dias na lixeira antes de ser apagada de vez. Dá para restaurar até lá.`}
        acao="Mover para a lixeira"
        aoConfirmar={excluir}
      />
    </div>
  );
}
