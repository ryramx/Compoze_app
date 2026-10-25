import { createStore, del, entries, get, set, type UseStore } from "idb-keyval";
import { ApiError } from "@/lib/api";
import { uuidv7 } from "@/lib/uuidv7";
import type { ApiVoiceMemo } from "@/services/api/dto";
import * as servico from "@/services/api/memoService";

/**
 * Memos de voz no aparelho (Fase 3c, ADR 0012).
 *
 * Gravar não espera a rede: o áudio vai para o IndexedDB na hora, marcado
 * como pendente, e sobe quando der (ao gravar, ao voltar a rede, ao abrir o
 * app). O id nasce aqui (UUID v7) e o servidor aceita o mesmo id de novo sem
 * duplicar, então reenviar depois de uma queda é seguro.
 *
 * Os áudios que vieram de outras pessoas ficam guardados depois da primeira
 * vez que tocam: dá para ouvir de novo offline.
 */

export interface MemoLocal {
  id: string;
  songId: string;
  autorId: string | null;
  title: string;
  durationMs: number;
  mimeType: string;
  criadoEm: string;
  /** Ainda não chegou ao servidor. */
  pendente: boolean;
  /** O servidor recusou (formato, tamanho, sem acesso); não tenta mais. */
  erro?: string;
  audio?: Blob;
}

export type Memo = Omit<MemoLocal, "audio">;

let loja: UseStore | null = null;
const banco = () => (loja ??= createStore("compoze-memos", "memos"));

const eventos = new EventTarget();
const avisar = () => eventos.dispatchEvent(new Event("mudou"));

/** Chama `f` quando algum memo muda no aparelho. Devolve quem para de ouvir. */
export function aoMudar(f: () => void): () => void {
  eventos.addEventListener("mudou", f);
  return () => eventos.removeEventListener("mudou", f);
}

const semAudio = ({ audio: _a, ...m }: MemoLocal): Memo => m;

const daApi = (m: ApiVoiceMemo): Memo => ({
  id: m.id,
  songId: m.song_id,
  autorId: m.author_id,
  title: m.title,
  durationMs: m.duration_ms,
  mimeType: m.mime_type,
  criadoEm: m.created_at,
  pendente: false,
});

async function locais(songId?: string): Promise<MemoLocal[]> {
  try {
    const todos = (await entries<string, MemoLocal>(banco())).map(([, m]) => m);
    return songId ? todos.filter((m) => m.songId === songId) : todos;
  } catch {
    return [];
  }
}

/** Grava o memo no aparelho e tenta subir. */
export async function guardar(songId: string, autorId: string, audio: Blob, durationMs: number): Promise<Memo> {
  const memo: MemoLocal = {
    id: uuidv7(),
    songId,
    autorId,
    title: "",
    durationMs,
    mimeType: audio.type,
    criadoEm: new Date().toISOString(),
    pendente: true,
    audio,
  };
  await set(memo.id, memo, banco());
  avisar();
  void enviarPendentes();
  return semAudio(memo);
}

let enviando: Promise<void> | null = null;

/** Sobe o que está pendente, em ordem. Para no primeiro erro de rede. */
export function enviarPendentes(): Promise<void> {
  enviando ??= (async () => {
    try {
      const fila = (await locais()).filter((m) => m.pendente && m.audio).sort((a, b) => a.id.localeCompare(b.id));
      for (const m of fila) {
        try {
          const r = await servico.subir(m.songId, { id: m.id, audio: m.audio!, durationMs: m.durationMs, title: m.title });
          await set(m.id, { ...m, ...daApi(r), audio: m.audio }, banco());
        } catch (e) {
          // Sem rede, servidor dormindo ou sessão vencida: tenta depois. 404
          // também: a canção pode ter nascido offline e ainda estar na fila.
          if (!(e instanceof ApiError) || [0, 401, 404].includes(e.status) || e.status >= 500) break;
          await set(m.id, { ...m, pendente: false, erro: e.message }, banco());
        }
        avisar();
      }
    } finally {
      enviando = null;
    }
  })();
  return enviando;
}

/**
 * Memos da canção: os do servidor (com rede) somados aos que só existem no
 * aparelho. Do mais novo ao mais antigo.
 */
export async function listar(songId: string, online: boolean): Promise<{ memos: Memo[]; doServidor: boolean }> {
  const aqui = await locais(songId);
  let remotos: Memo[] | null = null;
  if (online) {
    try {
      remotos = (await servico.listar(songId)).map(daApi);
    } catch {
      remotos = null;
    }
  }
  const porId = new Map<string, Memo>();
  if (remotos) {
    for (const m of remotos) porId.set(m.id, m);
    // O que foi apagado por outra pessoa sai também do aparelho.
    for (const m of aqui) if (!m.pendente && !m.erro && !porId.has(m.id)) void del(m.id, banco());
    for (const m of aqui) if (m.pendente || m.erro) porId.set(m.id, semAudio(m));
  } else {
    for (const m of aqui) porId.set(m.id, semAudio(m));
  }
  const memos = [...porId.values()].sort((a, b) => b.criadoEm.localeCompare(a.criadoEm));
  return { memos, doServidor: remotos !== null };
}

/** O áudio: do aparelho, ou baixado e guardado para a próxima vez. */
export async function audioDe(memo: Memo): Promise<Blob> {
  const local = await get<MemoLocal>(memo.id, banco()).catch(() => undefined);
  if (local?.audio) return local.audio;
  const audio = await servico.audio(memo.songId, memo.id);
  await set(memo.id, { ...memo, ...local, audio }, banco()).catch(() => undefined);
  return audio;
}

export async function renomear(memo: Memo, title: string): Promise<void> {
  const local = await get<MemoLocal>(memo.id, banco()).catch(() => undefined);
  // Ainda no aparelho: o nome sobe junto com o áudio.
  if (!memo.pendente) await servico.renomear(memo.songId, memo.id, title);
  if (local) await set(memo.id, { ...local, title }, banco());
  avisar();
}

export async function apagar(memo: Memo): Promise<void> {
  if (!memo.pendente && !memo.erro) await servico.apagar(memo.songId, memo.id);
  await del(memo.id, banco()).catch(() => undefined);
  avisar();
}

/** Sobe os pendentes ao abrir o app e sempre que a rede volta. */
export function iniciarMemos(): void {
  if (typeof window === "undefined") return;
  window.addEventListener("online", () => void enviarPendentes());
  void enviarPendentes();
}

/** O formato que o aparelho grava melhor: Opus onde houver, AAC no Safari. */
export function formatoDeGravacao(): string | undefined {
  if (typeof MediaRecorder === "undefined") return undefined;
  return ["audio/webm;codecs=opus", "audio/ogg;codecs=opus", "audio/mp4", "audio/webm"].find((t) =>
    MediaRecorder.isTypeSupported(t),
  );
}

export function duracao(ms: number): string {
  const s = Math.round(ms / 1000);
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}
