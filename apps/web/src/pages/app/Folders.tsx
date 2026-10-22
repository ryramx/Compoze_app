import { ChevronRight, FolderPlus, MoreHorizontal, Pencil, Trash2 } from "lucide-react";
import { useState, type FormEvent } from "react";
import { Link, useSearchParams } from "react-router";
import { toast } from "sonner";
import { Cabecalho, TituloDeSecao, Vazio } from "@/components/compoze/Cabecalho";
import { Confirmar } from "@/components/compoze/Confirmar";
import { Estagio } from "@/components/compoze/Estagio";
import { Pagina } from "@/components/layout/Pagina";
import { Botao } from "@/components/ui/Botao";
import { Campo, Entrada } from "@/components/ui/Campo";
import { Dialogo } from "@/components/ui/Dialogo";
import { ItemDeMenu, Menu } from "@/components/ui/Menu";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import { listActive } from "@/services/mock/songService";
import { useCompoze } from "@/store/compozeStore";
import type { Folder } from "@/types";

function NomeDePasta({
  aberto,
  aoMudar,
  titulo,
  inicial = "",
  acao,
  aoSalvar,
}: {
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  titulo: string;
  inicial?: string;
  acao: string;
  aoSalvar: (nome: string) => void;
}) {
  const [nome, setNome] = useState(inicial);
  const enviar = (e: FormEvent) => {
    e.preventDefault();
    if (!nome.trim()) return;
    aoSalvar(nome.trim());
    aoMudar(false);
  };
  return (
    <Dialogo aberto={aberto} aoMudar={aoMudar} titulo={titulo} largura="sm">
      <form onSubmit={enviar} className="space-y-6">
        <Campo rotulo="Nome">{(id) => <Entrada id={id} autoFocus value={nome} onChange={(e) => setNome(e.target.value)} placeholder="Ex.: Letras de 2026" />}</Campo>
        <div className="flex justify-end gap-2">
          <Botao variante="texto" onClick={() => aoMudar(false)}>
            Cancelar
          </Botao>
          <Botao type="submit" variante="tinta" disabled={!nome.trim()}>
            {acao}
          </Botao>
        </div>
      </form>
    </Dialogo>
  );
}

export default function Folders() {
  const pastas = useCompoze((s) => s.folders);
  const musicas = listActive(useCompoze((s) => s.songs));
  const criarPasta = useCompoze((s) => s.createFolder);
  const renomearPasta = useCompoze((s) => s.renameFolder);
  const excluirPasta = useCompoze((s) => s.deleteFolder);

  // A pasta aberta fica na URL para a busca global conseguir linkar direto nela.
  const [params, setParams] = useSearchParams();
  const atualId = params.get("pasta") ?? undefined;
  const abrir = (id?: string) => setParams(id ? { pasta: id } : {}, { replace: false });

  const [criando, setCriando] = useState(false);
  const [renomeando, setRenomeando] = useState<Folder | null>(null);
  const [excluindo, setExcluindo] = useState<Folder | null>(null);

  const atual = pastas.find((f) => f.id === atualId);
  const filhas = (pai?: string) => pastas.filter((f) => f.parentId === pai).sort((a, b) => a.name.localeCompare(b.name, "pt-BR"));
  const contar = (id: string) => musicas.filter((m) => m.folderId === id).length;

  const caminho: Folder[] = [];
  for (let f = atual; f; f = pastas.find((x) => x.id === f!.parentId)) caminho.unshift(f);

  const soltas = musicas.filter((m) => !m.folderId);
  const conteudo = atual ? musicas.filter((m) => m.folderId === atual.id) : soltas;

  function Arvore({ pai, nivel }: { pai?: string; nivel: number }) {
    return (
      <>
        {filhas(pai).map((f) => (
          <li key={f.id}>
            <button
              onClick={() => abrir(f.id)}
              className={cn(
                "flex w-full items-baseline gap-2 border-b border-linha py-2.5 pr-2 text-left text-[14.5px] transition-colors",
                f.id === atualId ? "text-tinta" : "text-tinta-2 hover:text-tinta",
              )}
              style={{ paddingLeft: 12 + nivel * 16 }}
            >
              <span className={cn("h-3 w-[2px] shrink-0 self-center", f.id === atualId ? "bg-lapis" : "bg-transparent")} />
              <span className={cn("flex-1 truncate", f.id === atualId && "font-medium")}>{f.name}</span>
              <span className="numeral text-[11px] text-tinta-3">{contar(f.id)}</span>
            </button>
            <ul>
              <Arvore pai={f.id} nivel={nivel + 1} />
            </ul>
          </li>
        ))}
      </>
    );
  }

  return (
    <Pagina>
      <Cabecalho
        indice="03"
        secao="Escrita"
        titulo="Pastas"
        descricao="Organização opcional. Uma canção pode morar numa pasta, num projeto, nos dois ou em nenhum."
        acoes={
          <Botao variante="tinta" onClick={() => setCriando(true)}>
            <FolderPlus /> {atual ? "Nova subpasta" : "Nova pasta"}
          </Botao>
        }
      />

      <div className="mt-8 grid gap-10 md:grid-cols-[260px_minmax(0,1fr)]">
        <nav aria-label="Pastas">
          <TituloDeSecao>Árvore</TituloDeSecao>
          <ul className="-mt-3">
            <li>
              <button
                onClick={() => abrir(undefined)}
                className={cn(
                  "flex w-full items-baseline gap-2 border-b border-linha py-2.5 pr-2 pl-3 text-left text-[14.5px]",
                  !atualId ? "text-tinta" : "text-tinta-2 hover:text-tinta",
                )}
              >
                <span className={cn("h-3 w-[2px] shrink-0 self-center", !atualId ? "bg-lapis" : "bg-transparent")} />
                <span className={cn("flex-1 font-serif italic", !atualId && "font-medium")}>Sem pasta</span>
                <span className="numeral text-[11px] text-tinta-3">{soltas.length}</span>
              </button>
            </li>
            <Arvore nivel={0} />
          </ul>
        </nav>

        <section>
          <div className="mb-6 flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-1 text-[13px] text-tinta-3">
              <button onClick={() => abrir(undefined)} className="hover:text-tinta">
                Caderno
              </button>
              {caminho.map((f) => (
                <span key={f.id} className="flex items-center gap-1">
                  <ChevronRight className="size-3" />
                  <button onClick={() => abrir(f.id)} className={cn(f.id === atualId ? "text-tinta" : "hover:text-tinta")}>
                    {f.name}
                  </button>
                </span>
              ))}
            </div>
            {atual && (
              <Menu
                gatilho={
                  <Botao variante="texto" tamanho="sm">
                    <MoreHorizontal /> Pasta
                  </Botao>
                }
              >
                <ItemDeMenu icone={<Pencil />} aoEscolher={() => setRenomeando(atual)}>
                  Renomear
                </ItemDeMenu>
                <ItemDeMenu perigo icone={<Trash2 />} aoEscolher={() => setExcluindo(atual)}>
                  Excluir pasta
                </ItemDeMenu>
              </Menu>
            )}
          </div>

          <h2 className="mb-6 font-serif text-[2rem] leading-tight">{atual ? atual.name : <em>Canções sem pasta</em>}</h2>

          {atual && filhas(atual.id).length > 0 && (
            <div className="mb-8 flex flex-wrap gap-2">
              {filhas(atual.id).map((f) => (
                <button key={f.id} onClick={() => abrir(f.id)} className="border border-linha px-3 py-1.5 text-[13.5px] text-tinta-2 hover:border-linha-forte hover:text-tinta">
                  {f.name} <span className="numeral ml-1 text-[11px] text-tinta-3">{contar(f.id)}</span>
                </button>
              ))}
            </div>
          )}

          {conteudo.length === 0 ? (
            <Vazio frase={atual ? "Pasta vazia. Escolha a pasta na ficha técnica de uma canção para trazê-la para cá." : "Todas as canções já estão em alguma pasta."} />
          ) : (
            <ul className="border-t border-linha">
              {conteudo.map((m) => (
                <li key={m.id}>
                  <Link to={`/songs/${m.id}/edit`} className="group flex items-center gap-4 border-b border-linha py-3.5 hover:bg-papel-2/50">
                    <span className="min-w-0 flex-1 truncate font-serif text-[1.15rem] group-hover:text-lapis">{m.title}</span>
                    <Estagio status={m.status} className="hidden sm:inline-flex" />
                    <span className="w-20 text-right text-[12.5px] text-tinta-3">{quando(m.updatedAt)}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>

      {criando && (
        <NomeDePasta
          aberto
          aoMudar={setCriando}
          titulo={atual ? `Nova pasta em “${atual.name}”` : "Nova pasta"}
          acao="Criar"
          aoSalvar={(nome) => void criarPasta(nome, atual?.id).then((id) => abrir(id))}
        />
      )}
      {renomeando && (
        <NomeDePasta
          aberto
          aoMudar={(v) => !v && setRenomeando(null)}
          titulo="Renomear pasta"
          inicial={renomeando.name}
          acao="Salvar"
          aoSalvar={(nome) => renomearPasta(renomeando.id, nome)}
        />
      )}
      <Confirmar
        aberto={!!excluindo}
        aoMudar={(v) => !v && setExcluindo(null)}
        titulo="Excluir esta pasta?"
        descricao="Nada do que está dentro é apagado: as subpastas sobem um nível e as canções ficam sem pasta."
        acao="Excluir pasta"
        aoConfirmar={() => {
          if (!excluindo) return;
          excluirPasta(excluindo.id);
          abrir(excluindo.parentId);
          toast(`Pasta “${excluindo.name}” excluída.`);
        }}
      />
    </Pagina>
  );
}
