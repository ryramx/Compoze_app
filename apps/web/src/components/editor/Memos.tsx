import { Mic, Pause, Play, Square, Trash2 } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { toast } from "sonner";
import { Confirmar } from "@/components/compoze/Confirmar";
import { Botao } from "@/components/ui/Botao";
import { Dialogo } from "@/components/ui/Dialogo";
import { ApiError } from "@/lib/api";
import { cn } from "@/lib/cn";
import { quando } from "@/lib/datas";
import * as memos from "@/lib/memos";
import { useOnline } from "@/lib/rede";
import { useCompoze } from "@/store/compozeStore";
import type { Song } from "@/types";

// Cabe folgado nos 8 MB do servidor em Opus; no AAC do iPhone, também.
const GRAVACAO_MAX_MS = 10 * 60 * 1000;

type Gravando = { inicio: number; gravador: MediaRecorder; fluxo: MediaStream };

/**
 * Memos de voz da canção (Fase 3c, ADR 0012): a melodia que veio antes da
 * letra. Grava no aparelho, offline também, e sobe quando há rede.
 */
export function Memos({
  musica,
  aberto,
  aoMudar,
  podeEscrever,
}: {
  musica: Song;
  aberto: boolean;
  aoMudar: (v: boolean) => void;
  podeEscrever: boolean;
}) {
  const online = useOnline();
  const eu = useCompoze((s) => s.currentUserId);
  const getUser = useCompoze((s) => s.getUser);
  const [lista, setLista] = useState<memos.Memo[] | null>(null);
  const [gravando, setGravando] = useState<Gravando | null>(null);
  const [agora, setAgora] = useState(0);
  const [tocando, setTocando] = useState<string | null>(null);
  const [apagando, setApagando] = useState<memos.Memo | null>(null);
  const audio = useRef<HTMLAudioElement | null>(null);
  const endereco = useRef<string | null>(null);
  const formato = memos.formatoDeGravacao();

  const reler = useCallback(async () => {
    const { memos: l } = await memos.listar(musica.id, online);
    setLista(l);
  }, [musica.id, online]);

  useEffect(() => {
    if (!aberto) return;
    void reler();
    void memos.enviarPendentes();
    return memos.aoMudar(() => void reler());
  }, [aberto, reler]);

  // Relógio da gravação, e o teto de duração.
  useEffect(() => {
    if (!gravando) return;
    const t = setInterval(() => {
      const passou = Date.now() - gravando.inicio;
      setAgora(passou);
      if (passou >= GRAVACAO_MAX_MS) gravando.gravador.stop();
    }, 250);
    return () => clearInterval(t);
  }, [gravando]);

  // Fechar o painel para o que estiver tocando ou gravando.
  useEffect(() => {
    if (aberto) return;
    audio.current?.pause();
    setTocando(null);
    gravando?.gravador.stop();
  }, [aberto, gravando]);

  useEffect(
    () => () => {
      if (endereco.current) URL.revokeObjectURL(endereco.current);
    },
    [],
  );

  async function gravar() {
    if (!formato) return;
    let fluxo: MediaStream;
    try {
      fluxo = await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch {
      toast.error("Sem acesso ao microfone. Libere nas permissões do navegador ou do app.");
      return;
    }
    const gravador = new MediaRecorder(fluxo, { mimeType: formato, audioBitsPerSecond: 64_000 });
    const pedacos: Blob[] = [];
    const inicio = Date.now();
    gravador.ondataavailable = (e) => e.data.size > 0 && pedacos.push(e.data);
    gravador.onstop = () => {
      for (const faixa of fluxo.getTracks()) faixa.stop();
      setGravando(null);
      const som = new Blob(pedacos, { type: gravador.mimeType || formato });
      const ms = Date.now() - inicio;
      if (som.size === 0 || ms < 500) return;
      void memos.guardar(musica.id, eu, som, ms).then(() => toast(online ? "Memo guardado." : "Memo guardado no aparelho. Sobe quando houver internet."));
    };
    gravador.start(1000);
    setAgora(0);
    setGravando({ inicio, gravador, fluxo });
  }

  async function tocar(m: memos.Memo) {
    if (tocando === m.id) {
      audio.current?.pause();
      setTocando(null);
      return;
    }
    try {
      const som = await memos.audioDe(m);
      if (endereco.current) URL.revokeObjectURL(endereco.current);
      endereco.current = URL.createObjectURL(som);
      audio.current ??= new Audio();
      audio.current.src = endereco.current;
      audio.current.onended = () => setTocando(null);
      await audio.current.play();
      setTocando(m.id);
    } catch (e) {
      toast.error(e instanceof ApiError && e.status === 0 ? "Este memo ainda não está no aparelho; precisa de internet." : "Não foi possível tocar o memo.");
    }
  }

  async function renomear(m: memos.Memo, titulo: string) {
    if (titulo === m.title) return;
    try {
      await memos.renomear(m, titulo);
    } catch (e) {
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Renomear precisa de internet.");
      void reler();
    }
  }

  async function apagar(m: memos.Memo) {
    try {
      await memos.apagar(m);
      toast("Memo apagado.");
    } catch (e) {
      toast.error(e instanceof ApiError && e.status !== 0 ? e.message : "Apagar precisa de internet.");
    }
  }

  const souDona = musica.creatorId === eu;
  const mexe = (m: memos.Memo) => podeEscrever && (m.autorId === eu || souDona);

  return (
    <Dialogo
      aberto={aberto}
      aoMudar={aoMudar}
      largura="lg"
      titulo="Memos de voz"
      descricao="A melodia, o riff, o jeito de cantar. Quem escreve a canção ouve."
    >
      {podeEscrever && (
        <div className="mb-5 flex items-center gap-4 border-b border-linha pb-5">
          {!formato ? (
            <p className="text-sm text-tinta-2">Este navegador não grava áudio.</p>
          ) : gravando ? (
            <>
              <Botao variante="lapis" onClick={() => gravando.gravador.stop()}>
                <Square /> Parar
              </Botao>
              <span className="numeral flex items-center gap-2 text-tinta-2" role="timer" aria-live="off">
                <span className="inline-block size-2 animate-pulse rounded-full bg-lapis" />
                {memos.duracao(agora)}
                <span className="text-tinta-3">/ {memos.duracao(GRAVACAO_MAX_MS)}</span>
              </span>
            </>
          ) : (
            <>
              <Botao variante="tinta" onClick={() => void gravar()}>
                <Mic /> Gravar
              </Botao>
              <span className="text-[13px] text-tinta-3">Até 10 minutos. Funciona sem internet.</span>
            </>
          )}
        </div>
      )}

      {lista === null ? (
        <p className="py-6 text-center font-serif text-tinta-2 italic">Abrindo…</p>
      ) : lista.length === 0 ? (
        <p className="py-6 text-center font-serif text-tinta-2 italic">Nenhum memo ainda.</p>
      ) : (
        <ul className="divide-y divide-linha">
          {lista.map((m) => (
            <li key={m.id} className="flex items-center gap-3 py-3">
              <button
                onClick={() => void tocar(m)}
                className={cn(
                  "grid size-9 shrink-0 place-items-center rounded-full border transition-colors",
                  tocando === m.id ? "border-lapis text-lapis" : "border-linha-forte text-tinta hover:border-tinta",
                )}
                aria-label={tocando === m.id ? "Pausar" : "Tocar"}
              >
                {tocando === m.id ? <Pause className="size-4" /> : <Play className="size-4" />}
              </button>
              <div className="min-w-0 flex-1">
                {mexe(m) ? (
                  <input
                    defaultValue={m.title}
                    placeholder="Sem nome"
                    maxLength={120}
                    onBlur={(e) => void renomear(m, e.target.value.trim())}
                    onKeyDown={(e) => e.key === "Enter" && e.currentTarget.blur()}
                    className="w-full truncate bg-transparent font-serif text-[1.05rem] placeholder:text-tinta-3 placeholder:italic focus:outline-none"
                    aria-label="Nome do memo"
                  />
                ) : (
                  <span className={cn("block truncate font-serif text-[1.05rem]", !m.title && "text-tinta-3 italic")}>
                    {m.title || "Sem nome"}
                  </span>
                )}
                <span className="block text-[12.5px] text-tinta-3">
                  <span className="numeral">{memos.duracao(m.durationMs)}</span>
                  {" · "}
                  {(m.autorId && getUser(m.autorId)?.name) ?? "alguém"} · {quando(m.criadoEm)}
                  {m.pendente && " · no aparelho, ainda não subiu"}
                  {m.erro && <span className="text-lapis"> · não subiu: {m.erro}</span>}
                </span>
              </div>
              {mexe(m) && (
                <Botao variante="texto" tamanho="icone" aria-label="Apagar memo" onClick={() => setApagando(m)}>
                  <Trash2 />
                </Botao>
              )}
            </li>
          ))}
        </ul>
      )}

      <Confirmar
        aberto={apagando !== null}
        aoMudar={(v) => !v && setApagando(null)}
        titulo="Apagar este memo?"
        descricao="O áudio sai de vez, para todos os coautores. Memo não passa pela lixeira."
        acao="Apagar"
        aoConfirmar={() => apagando && void apagar(apagando)}
      />
    </Dialogo>
  );
}
