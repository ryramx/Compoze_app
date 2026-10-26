import * as D from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, CircleHelp } from "lucide-react";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router";
import { Estagio } from "@/components/compoze/Estagio";
import { Marca } from "@/components/compoze/Marca";
import { Botao } from "@/components/ui/Botao";
import { marcarPrimeirosPassos, useAjuda } from "@/lib/ajuda";
import { cn } from "@/lib/cn";
import { ESTAGIOS } from "@/lib/rotulos";
import { useAuth } from "@/store/authStore";
import { useCompoze } from "@/store/compozeStore";

/*
 * Figuras de cada folha. Como na tela de entrada, o produto se explica com
 * pedaços dele mesmo — cifra, verso, marginália —, não com ilustração.
 */

function FiguraCaderno() {
  return (
    <figure className="font-serif" aria-hidden>
      <div className="rotulo mb-3 flex items-center gap-3">
        <span>Refrão</span>
        <span className="h-px flex-1 bg-linha-forte" />
      </div>
      <div className="numeral text-[12px] whitespace-pre text-lapis">C{"         "}G{"          "}Am</div>
      <p className="text-[1.25rem] leading-snug">Deixa a porta encostada,</p>
      <p className="text-[1.25rem] leading-snug">que eu volto pra terminar</p>
    </figure>
  );
}

function FiguraBlocos() {
  const linhas: [string, string, ReactNode][] = [
    ["§", "Seção", <span className="rotulo text-tinta-2">Verso 1</span>],
    ["♯", "Cifra", <span className="numeral text-[12px] text-lapis">Am F C G</span>],
    ["¶", "Verso", <span className="font-serif text-[1.05rem]">Café esfriou na xícara</span>],
    ["※", "Nota", <span className="font-serif text-[1rem] text-lapis italic">testar no ensaio</span>],
  ];
  return (
    <ul className="border-t border-linha" aria-hidden>
      {linhas.map(([marca, nome, exemplo]) => (
        <li key={nome} className="grid grid-cols-[1.5rem_4.5rem_minmax(0,1fr)] items-baseline border-b border-linha py-2">
          <span className="numeral text-tinta-3">{marca}</span>
          <span className="text-[13px] text-tinta-2">{nome}</span>
          <span className="truncate">{exemplo}</span>
        </li>
      ))}
    </ul>
  );
}

function FiguraParceria() {
  return (
    <figure aria-hidden>
      <div className="space-y-2 font-serif text-[1.15rem] leading-snug">
        <div className="border-l-2 border-autor-1 pl-3">
          <p>Janela aberta pra rua</p>
          <span className="font-sans text-[11.5px] text-autor-1">Lara Mendes</span>
        </div>
        <div className="border-l-2 border-autor-3 pl-3">
          <p>e o vento carrega o que ouvi</p>
          <span className="font-sans text-[11.5px] text-autor-3">Maya Costa</span>
        </div>
      </div>
      <div className="mt-5 flex items-baseline gap-3 border-t border-linha pt-3 text-[13px] text-tinta-2">
        <span className="rotulo">Coautoria</span>
        <span className="numeral">60%</span>
        <span>+</span>
        <span className="numeral">40%</span>
        <span>=</span>
        <span className="numeral text-lapis">100%</span>
      </div>
    </figure>
  );
}

function FiguraEstagios() {
  return (
    <ol className="grid grid-cols-2 gap-x-6 gap-y-2.5 sm:grid-cols-3" aria-hidden>
      {ESTAGIOS.map((e) => (
        <li key={e.valor}>
          <Estagio status={e.valor} />
        </li>
      ))}
    </ol>
  );
}

function FiguraLista({ itens }: { itens: [string, string][] }) {
  return (
    <dl className="border-t border-linha" aria-hidden>
      {itens.map(([nome, texto]) => (
        <div key={nome} className="flex items-baseline gap-4 border-b border-linha py-2">
          <dt className="w-24 shrink-0 font-serif text-[1.05rem]">{nome}</dt>
          <dd className="text-[13px] text-tinta-2">{texto}</dd>
        </div>
      ))}
    </dl>
  );
}

interface Folha {
  rotulo: string;
  titulo: string;
  texto: ReactNode;
  figura: ReactNode;
}

const FOLHAS: Folha[] = [
  {
    rotulo: "Boas-vindas",
    titulo: "Um caderno para compor junto.",
    texto:
      "O Compoze guarda as suas canções do primeiro verso até a gravação: letra e cifra na mesma folha, parceiros escrevendo ao mesmo tempo e, no fim, quem escreveu o quê.",
    figura: <FiguraCaderno />,
  },
  {
    rotulo: "A folha",
    titulo: "A canção se escreve em blocos.",
    texto:
      "No editor, a barra de baixo insere cada pedaço. Tudo se salva sozinho, inclusive sem internet: o que você escrever offline sobe quando a rede voltar. Em Memos, grave a melodia antes que ela fuja.",
    figura: <FiguraBlocos />,
  },
  {
    rotulo: "Parceria",
    titulo: "Cada trecho tem o nome de quem escreveu.",
    texto:
      "Convide alguém pelo @ ou mande um link. O trecho de cada pessoa ganha a cor dela, e na Ficha vocês acertam a divisão de coautoria, que fecha em 100% antes de registrar a obra.",
    figura: <FiguraParceria />,
  },
  {
    rotulo: "Estágios",
    titulo: "Toda canção anda de Ideia a Gravada.",
    texto:
      "Os traços mostram onde cada obra está. Mude o estágio na Ficha; a Mesa conta quantas há em cada um e mostra a canção em que você parou.",
    figura: <FiguraEstagios />,
  },
  {
    rotulo: "Organizar",
    titulo: "Um lugar para cada coisa, se você quiser.",
    texto: "Pastas e projetos são opcionais. Uma canção pode estar numa pasta, num projeto, nos dois ou em nenhum.",
    figura: (
      <FiguraLista
        itens={[
          ["Canções", "Todas as obras. Busque até por um verso."],
          ["Pastas", "Gavetas, com subpastas."],
          ["Projetos", "Single, EP ou álbum, com faixas, meta e apoio por PIX."],
          ["Lixeira", "O que você exclui fica 30 dias."],
        ]}
      />
    ),
  },
  {
    rotulo: "Gente",
    titulo: "Quem escreve com você está por perto.",
    texto: "Siga quem você admira, conte no que está trabalhando e converse a dois. Nada da sua canção aparece se ela for privada.",
    figura: (
      <FiguraLista
        itens={[
          ["Mural", "Publicações de quem você segue."],
          ["Perfil", "Suas obras, seguidores e parcerias."],
          ["Conversas", "Mensagens que chegam na hora."],
          ["Mapa", "Quem compõe perto, se quiser aparecer."],
        ]}
      />
    ),
  },
  {
    rotulo: "No bolso",
    titulo: "Dúvida em alguma tela? Toque em Ajuda.",
    texto: (
      <>
        O botão <CircleHelp className="mx-0.5 inline size-[1em] -translate-y-px text-lapis" aria-label="Ajuda" /> fica no
        topo, no celular, e no menu ao lado, no computador. Ele explica a tela em que você está. Em Ajustes, ligue os avisos para
        saber de mensagem e convite com o Compoze fechado.
      </>
    ),
    figura: (
      <div className="flex items-end justify-between gap-6" aria-hidden>
        <Marca className="text-[1.6rem]" />
        <span className="font-serif text-[1rem] text-tinta-3 italic">funciona sem internet</span>
      </div>
    ),
  },
];

/**
 * Primeiros passos (ADR 0020): sete folhas, abertas sozinhas uma vez por conta
 * neste aparelho. Fechar de qualquer jeito — Pular, Esc, fora da folha — conta
 * como visto. Reabre pela Ajuda ou por Ajustes.
 */
export function PrimeirosPassos() {
  const aberto = useAjuda((s) => s.tour);
  const fechar = useAjuda((s) => s.fechar);
  const usuarioId = useAuth((s) => s.user?.id);
  const semCancoes = useCompoze((s) => s.hidratado && s.songs.every((m) => m.deletedAt));
  const criarMusica = useCompoze((s) => s.createSong);
  const navegar = useNavigate();
  const [i, setI] = useState(0);
  const toque = useRef<number | null>(null);

  useEffect(() => {
    if (aberto) setI(0);
  }, [aberto]);

  const ultima = i === FOLHAS.length - 1;
  const folha = FOLHAS[i];

  function concluir() {
    if (usuarioId) marcarPrimeirosPassos(usuarioId);
    fechar();
  }

  async function escreverAPrimeira() {
    concluir();
    const id = await criarMusica({ title: "Sem título" });
    navegar(`/songs/${id}/edit`);
  }

  const avancar = () => setI((n) => Math.min(n + 1, FOLHAS.length - 1));
  const voltar = () => setI((n) => Math.max(n - 1, 0));

  return (
    <D.Root open={aberto} onOpenChange={(v) => !v && concluir()}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-papel/80 backdrop-blur-[2px] data-[state=open]:animate-[aparecer_.2s_ease-out]" />
        <D.Content
          className={cn(
            "fixed z-50 flex flex-col border-linha-forte bg-folha shadow-folha focus:outline-none",
            // Celular: folha inteira. Do tablet para cima: uma página no meio.
            "inset-0 sm:inset-auto sm:top-1/2 sm:left-1/2 sm:max-h-[90dvh] sm:w-[calc(100vw-2rem)] sm:max-w-[34rem] sm:-translate-x-1/2 sm:-translate-y-1/2 sm:border",
            "sm:data-[state=open]:animate-[subir_.25s_cubic-bezier(.2,.8,.2,1)]",
          )}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight") avancar();
            if (e.key === "ArrowLeft") voltar();
          }}
          onTouchStart={(e) => (toque.current = e.touches[0].clientX)}
          onTouchEnd={(e) => {
            if (toque.current === null) return;
            const dx = e.changedTouches[0].clientX - toque.current;
            toque.current = null;
            if (dx < -50) avancar();
            if (dx > 50) voltar();
          }}
        >
          <div className="flex items-center justify-between px-6 pt-[calc(env(safe-area-inset-top)+1.1rem)] sm:px-8 sm:pt-6">
            <span className="numeral text-[11px] tracking-wider text-tinta-3" aria-live="polite">
              {String(i + 1).padStart(2, "0")} / {String(FOLHAS.length).padStart(2, "0")}
            </span>
            {!ultima && (
              <button onClick={concluir} className="text-[13px] text-tinta-3 hover:text-tinta">
                Pular
              </button>
            )}
          </div>

          {/* Pauta de progresso: um fio por folha, o atual em vermelho. */}
          <div className="mt-3 flex gap-1 px-6 sm:px-8" aria-hidden>
            {FOLHAS.map((_, n) => (
              <span key={n} className={cn("h-[2px] flex-1 transition-colors", n === i ? "bg-lapis" : n < i ? "bg-tinta-2" : "bg-linha")} />
            ))}
          </div>

          <div key={i} className="flex flex-1 animate-[folhear_.25s_ease-out] flex-col overflow-y-auto px-6 pt-8 pb-6 sm:px-8">
            <div className="rotulo mb-3">{folha.rotulo}</div>
            <D.Title className="font-serif text-[2rem] leading-[1.1] sm:text-[2.2rem]">{folha.titulo}</D.Title>
            <D.Description asChild>
              <p className="mt-4 text-[15px] leading-relaxed text-tinta-2">{folha.texto}</p>
            </D.Description>
            <div className="pt-8">
              <div className="border border-linha bg-papel/60 px-5 py-5">{folha.figura}</div>
            </div>
          </div>

          <div className="flex items-center justify-between gap-2 border-t border-linha px-6 pt-3 pb-[calc(env(safe-area-inset-bottom)+0.75rem)] sm:px-8">
            <Botao variante="texto" className={cn("-ml-3", i === 0 && "invisible")} onClick={voltar} aria-label="Folha anterior">
              <ArrowLeft /> Voltar
            </Botao>
            {!ultima ? (
              <Botao variante="tinta" onClick={avancar}>
                Próxima <ArrowRight />
              </Botao>
            ) : semCancoes ? (
              <div className="flex items-center gap-2">
                <Botao variante="texto" onClick={concluir}>
                  Agora não
                </Botao>
                <Botao variante="tinta" onClick={() => void escreverAPrimeira()}>
                  Escrever a primeira
                </Botao>
              </div>
            ) : (
              <Botao variante="tinta" onClick={concluir}>
                Começar
              </Botao>
            )}
          </div>
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
