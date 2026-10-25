/**
 * Avisos com o Compoze fechado, por Web Push (Fase 3d, ADR 0016): mensagem
 * nova e convite para canção. Funciona no navegador e na PWA instalada. No
 * app Android o WebView não tem push; lá vai entrar o Firebase.
 *
 * O aviso só chega com o service worker no ar, então não funciona no
 * `pnpm dev` (só com build + preview, como a PWA).
 */

import { api, MODO_DEMO } from "@/lib/api";
import { NATIVO } from "@/lib/nativo";

export type EstadoDosAvisos = "sem-suporte" | "bloqueado" | "ligado" | "desligado";

export function suportaAvisos(): boolean {
  return (
    !NATIVO &&
    !MODO_DEMO &&
    typeof window !== "undefined" &&
    "serviceWorker" in navigator &&
    "PushManager" in window &&
    "Notification" in window
  );
}

/** A chave VAPID vem em base64url; o `subscribe` quer bytes. */
export function bytesDaChave(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const texto = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

async function inscricaoAtual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

export async function estadoDosAvisos(): Promise<EstadoDosAvisos> {
  if (!suportaAvisos()) return "sem-suporte";
  if (Notification.permission === "denied") return "bloqueado";
  return (await inscricaoAtual()) && Notification.permission === "granted" ? "ligado" : "desligado";
}

/** Pede permissão, inscreve o aparelho e manda a inscrição para a API. */
export async function ligarAvisos(): Promise<EstadoDosAvisos> {
  if (!suportaAvisos()) return "sem-suporte";
  const permissao = await Notification.requestPermission();
  if (permissao !== "granted") return permissao === "denied" ? "bloqueado" : "desligado";
  const registro = await navigator.serviceWorker.ready;
  const { key } = await api.get<{ key: string }>("/push/public-key");
  // Navegador sem serviço de push (o Brave, por padrão) deixa o subscribe
  // pendurado para sempre; com o prazo, a tela avisa em vez de travar.
  const prazo = new Promise<never>((_, falha) => setTimeout(() => falha(new Error("sem serviço de push")), 20_000));
  const inscricao =
    (await registro.pushManager.getSubscription()) ??
    (await Promise.race([registro.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytesDaChave(key) }), prazo]));
  await api.put("/push/subscriptions", inscricao.toJSON());
  return "ligado";
}

/** Desinscreve aqui e avisa a API. Sem rede, o servidor descobre no próximo envio (410). */
export async function desligarAvisos(): Promise<void> {
  const inscricao = suportaAvisos() ? await inscricaoAtual() : null;
  if (!inscricao) return;
  const { endpoint } = inscricao;
  await inscricao.unsubscribe();
  await api.delete("/push/subscriptions", { endpoint }).catch(() => undefined);
}

/**
 * Ao abrir o app: o aparelho já inscrito manda a inscrição de novo. O
 * navegador pode tê-la trocado, e o banco do staging pode ter sido recriado.
 */
export function renovarAvisos(): void {
  if (!suportaAvisos() || Notification.permission !== "granted") return;
  void (async () => {
    const inscricao = await inscricaoAtual();
    if (inscricao) await api.put("/push/subscriptions", inscricao.toJSON());
  })().catch(() => undefined);
}

/** Ao sair da conta: quem entrar depois neste aparelho não recebe os avisos de quem saiu. */
export function esquecerAvisos(): void {
  if (!suportaAvisos()) return;
  void inscricaoAtual()
    .then((i) => i?.unsubscribe())
    .catch(() => undefined);
}
