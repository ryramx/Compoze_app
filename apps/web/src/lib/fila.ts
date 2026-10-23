import { useSyncExternalStore } from "react";
import { api, ApiError, MODO_DEMO, type Metodo } from "@/lib/api";
import { uuidv7 } from "@/lib/uuidv7";

/**
 * Fila de escritas do aparelho (ADR 0008).
 *
 * Toda escrita de dado estruturado (canção como registro, pasta, projeto,
 * perfil) entra aqui em vez de ir direto à API. A tela já mudou antes, de
 * forma otimista; a fila só garante que a mudança chegue ao servidor, em
 * ordem, mesmo que a pessoa esteja offline ou feche o app no meio.
 *
 * - Persistida no `localStorage`, por pessoa: sobrevive a recarregar.
 * - Enviada em ordem (FIFO): criar a pasta vem antes de criar a canção nela.
 * - Cada pedido leva o próprio id como `Idempotency-Key`: reenviar depois de
 *   uma queda não duplica nada no servidor.
 * - Sem rede (ou servidor fora do ar, 5xx, 429), para e tenta de novo depois.
 *   Recusa definitiva (4xx) descarta o pedido e avisa quem escuta, que relê
 *   do servidor para a tela voltar à verdade.
 */

export interface Pedido {
  id: string;
  metodo: Exclude<Metodo, "GET">;
  caminho: string;
  corpo?: unknown;
  /** Como o pedido aparece num aviso de falha: "a pasta Rascunhos". */
  rotulo: string;
  criadoEm: string;
}

type AoRecusar = (pedido: Pedido, erro: ApiError) => void;

let chave: string | null = null;
let pedidos: Pedido[] = [];
/**
 * A rodada de envio em curso; quem chama `enviar` no meio espera a mesma.
 * Resolve `true` se parou por falha passageira (sem rede, servidor fora).
 */
let rodada: Promise<boolean> | null = null;
let espera: ReturnType<typeof setTimeout> | undefined;
let tentativas = 0;
const ouvintes = new Set<() => void>();
const aoRecusar = new Set<AoRecusar>();
const resolvedores = new Map<string, { ok: (v: unknown) => void; falha: (e: unknown) => void }>();

const online = () => MODO_DEMO || typeof navigator === "undefined" || navigator.onLine;

function gravar(): void {
  if (!chave) return;
  try {
    localStorage.setItem(chave, JSON.stringify(pedidos));
  } catch {
    // Sem storage a fila vale só até recarregar.
  }
  for (const o of ouvintes) o();
}

/** Liga a fila à pessoa da sessão. Pedidos de outra pessoa nunca se misturam. */
export function abrirFila(usuarioId: string | null): void {
  chave = usuarioId ? `compoze.fila.${usuarioId}` : null;
  pedidos = [];
  if (chave) {
    try {
      pedidos = JSON.parse(localStorage.getItem(chave) ?? "[]") as Pedido[];
    } catch {
      pedidos = [];
    }
  }
  for (const o of ouvintes) o();
  void enviar();
}

/** Esquece os pedidos que não subiram (ao sair da conta). */
export function descartarFila(): void {
  if (chave) {
    try {
      localStorage.removeItem(chave);
    } catch {
      // nada a apagar
    }
  }
  pedidos = [];
  chave = null;
  for (const o of ouvintes) o();
}

/**
 * Põe um pedido na fila e tenta enviar. A promessa resolve com a resposta do
 * servidor quando ele sair, se for nesta mesma sessão; quem não precisa da
 * resposta pode ignorá-la.
 */
export function enfileirar<T = unknown>(p: Omit<Pedido, "id" | "criadoEm">): Promise<T> {
  const pedido: Pedido = { ...p, id: uuidv7(), criadoEm: new Date().toISOString() };
  pedidos = [...pedidos, pedido];
  gravar();
  const promessa = new Promise<T>((ok, falha) => {
    resolvedores.set(pedido.id, { ok: ok as (v: unknown) => void, falha });
  });
  // Ninguém é obrigado a esperar: sem isto, uma recusa sem ouvinte viraria
  // "unhandled rejection".
  promessa.catch(() => undefined);
  void enviar();
  return promessa;
}

function tirar(id: string): void {
  pedidos = pedidos.filter((p) => p.id !== id);
  gravar();
}

function tentarDepois(): void {
  clearTimeout(espera);
  tentativas += 1;
  // 2 s, 4 s, 8 s… até 1 min. A volta da rede (evento `online`) não espera.
  espera = setTimeout(() => void enviar(), Math.min(60_000, 1000 * 2 ** tentativas));
}

/** Envia o que estiver na fila, em ordem. Seguro chamar várias vezes. */
export async function enviar(): Promise<void> {
  await esvaziar();
}

/** Envia e diz se a fila esvaziou (`false`: sem rede, sobrou pedido). */
export async function esvaziar(): Promise<boolean> {
  for (;;) {
    if (!online()) return pedidos.length === 0;
    const parou = await (rodada ??= rodar().finally(() => {
      rodada = null;
    }));
    if (pedidos.length === 0) return true;
    if (parou) return false;
    // A rodada acabou antes de o pedido novo entrar: começa outra.
  }
}

async function rodar(): Promise<boolean> {
  while (pedidos.length > 0) {
    const p = pedidos[0]!;
    try {
      const resposta = await api.enviar(p.metodo, p.caminho, p.corpo, p.id);
      tirar(p.id);
      tentativas = 0;
      resolvedores.get(p.id)?.ok(resposta);
      resolvedores.delete(p.id);
    } catch (erro) {
      const e = erro instanceof ApiError ? erro : new ApiError(0, String(erro));
      const transitorio = e.status === 0 || e.status === 401 || e.status === 408 || e.status === 429 || e.status >= 500 ||
        // A primeira tentativa deste mesmo pedido ainda está rodando no servidor.
        (e.status === 409 && /em andamento/i.test(e.message));
      if (transitorio) {
        tentarDepois();
        return true;
      }
      tirar(p.id);
      resolvedores.get(p.id)?.falha(e);
      resolvedores.delete(p.id);
      for (const f of aoRecusar) f(p, e);
    }
  }
  return false;
}

/**
 * Resolve quando não houver mais na fila nenhum pedido que `casa` aceite
 * (enviado ou descartado). O editor usa para só abrir o WebSocket de uma
 * canção criada offline depois que o servidor souber que ela existe.
 */
export function quandoSair(casa: (p: Pedido) => boolean): { pronto: Promise<void>; cancelar: () => void } {
  let ver = () => {};
  const pronto = new Promise<void>((ok) => {
    ver = () => {
      if (pedidos.some(casa)) return;
      ouvintes.delete(ver);
      ok();
    };
    ouvintes.add(ver);
    ver();
  });
  return { pronto, cancelar: () => ouvintes.delete(ver) };
}

export function quandoRecusar(f: AoRecusar): () => void {
  aoRecusar.add(f);
  return () => aoRecusar.delete(f);
}

export const pendentes = () => pedidos.length;

if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    tentativas = 0;
    void enviar();
  });
}

function assinar(f: () => void) {
  ouvintes.add(f);
  return () => ouvintes.delete(f);
}

/** Quantas escritas ainda não chegaram ao servidor. */
export function usePendentes(): number {
  return useSyncExternalStore(assinar, pendentes, () => 0);
}
