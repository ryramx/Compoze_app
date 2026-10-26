/**
 * Avisos com o Compoze fechado (ADR 0016): mensagem nova e convite para
 * canção. Dois caminhos, a mesma tela:
 *
 * - navegador e PWA: Web Push, com o service worker (`public/avisos-sw.js`).
 *   Só funciona no build (`vite build` + `preview`), não no `pnpm dev`;
 * - app Android: Firebase, pelo `@capacitor/push-notifications`. Só no APK
 *   feito com o `google-services.json` (`VITE_PUSH_NATIVO`): sem ele, chamar o
 *   Firebase derruba o app.
 */

import { PushNotifications } from "@capacitor/push-notifications";

import { api, MODO_DEMO } from "@/lib/api";
import { NATIVO } from "@/lib/nativo";

export type EstadoDosAvisos = "sem-suporte" | "sem-servidor" | "bloqueado" | "ligado" | "desligado";

const PUSH_NATIVO = NATIVO && import.meta.env.VITE_PUSH_NATIVO === "1";

// O canal que o servidor usa nos avisos do Android (CANAL_ANDROID na API).
const CANAL = "avisos";
// Token do Firebase deste aparelho, para renovar e para cancelar ao sair.
const CHAVE_TOKEN = "compoze.avisos.fcm";
// A pessoa desligou os avisos em Ajustes: o app para de pedir ao abrir.
const CHAVE_DESLIGADOS = "compoze.avisos.desligados";

function suportaWebPush(): boolean {
  return (
    !NATIVO && typeof window !== "undefined" && "serviceWorker" in navigator && "PushManager" in window && "Notification" in window
  );
}

export function suportaAvisos(): boolean {
  return !MODO_DEMO && (PUSH_NATIVO || suportaWebPush());
}

/** A chave VAPID vem em base64url; o `subscribe` quer bytes. */
export function bytesDaChave(base64url: string): Uint8Array<ArrayBuffer> {
  const base64 = (base64url + "=".repeat((4 - (base64url.length % 4)) % 4)).replace(/-/g, "+").replace(/_/g, "/");
  const texto = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(texto.length));
  for (let i = 0; i < texto.length; i++) bytes[i] = texto.charCodeAt(i);
  return bytes;
}

const ler = (chave: string) => {
  try {
    return localStorage.getItem(chave);
  } catch {
    return null;
  }
};
const guardar = (chave: string, valor: string | null) => {
  try {
    if (valor === null) localStorage.removeItem(chave);
    else localStorage.setItem(chave, valor);
  } catch {
    // Sem storage, o aparelho só não lembra que já estava inscrito.
  }
};

// ---------------------------------------------------------------- Web Push

async function inscricaoAtual(): Promise<PushSubscription | null> {
  const registro = await navigator.serviceWorker.getRegistration();
  return (await registro?.pushManager.getSubscription()) ?? null;
}

async function ligarWebPush(): Promise<EstadoDosAvisos> {
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

// ------------------------------------------------------------ Firebase (APK)

/** Registra no Firebase e devolve o token do aparelho. */
async function tokenDoFirebase(): Promise<string> {
  await PushNotifications.createChannel({ id: CANAL, name: "Mensagens e convites", importance: 4, visibility: 0 });
  return new Promise<string>((ok, falha) => {
    const ouvintes = [
      PushNotifications.addListener("registration", ({ value }) => {
        void Promise.all(ouvintes).then((os) => os.forEach((o) => void o.remove()));
        ok(value);
      }),
      PushNotifications.addListener("registrationError", ({ error }) => {
        void Promise.all(ouvintes).then((os) => os.forEach((o) => void o.remove()));
        falha(new Error(error));
      }),
    ];
    void PushNotifications.register();
  });
}

async function ligarFirebase(): Promise<EstadoDosAvisos> {
  const { fcm } = await api.get<{ fcm: boolean }>("/push/public-key");
  if (!fcm) return "sem-servidor";
  const { receive } = await PushNotifications.requestPermissions();
  if (receive !== "granted") return receive === "denied" ? "bloqueado" : "desligado";
  const token = await tokenDoFirebase();
  await api.put("/push/subscriptions", { fcm_token: token });
  guardar(CHAVE_TOKEN, token);
  return "ligado";
}

// ------------------------------------------------------------------ comum

export async function estadoDosAvisos(): Promise<EstadoDosAvisos> {
  if (!suportaAvisos()) return "sem-suporte";
  if (PUSH_NATIVO) {
    const { receive } = await PushNotifications.checkPermissions();
    if (receive === "denied") return "bloqueado";
    return receive === "granted" && ler(CHAVE_TOKEN) ? "ligado" : "desligado";
  }
  if (Notification.permission === "denied") return "bloqueado";
  return (await inscricaoAtual()) && Notification.permission === "granted" ? "ligado" : "desligado";
}

/** Pede permissão, inscreve o aparelho e manda a inscrição para a API. */
export async function ligarAvisos(): Promise<EstadoDosAvisos> {
  if (!suportaAvisos()) return "sem-suporte";
  guardar(CHAVE_DESLIGADOS, null);
  return PUSH_NATIVO ? ligarFirebase() : ligarWebPush();
}

/**
 * Ao abrir o app, já logada: liga os avisos sem esperar a pessoa ir a Ajustes.
 * Pede a permissão só se ela nunca foi decidida (quem recusou não é perguntado
 * de novo; quem desligou em Ajustes também não). Com a permissão já dada e o
 * aparelho sem inscrição, inscreve em silêncio.
 *
 * Devolve "precisa-de-toque" quando o navegador só mostra o pedido depois de
 * um toque (Safari, Firefox): a tela oferece um botão.
 */
let pedidoAoAbrir: Promise<"ok" | "precisa-de-toque"> | null = null;

export function ligarAvisosAoAbrir(): Promise<"ok" | "precisa-de-toque"> {
  // Uma vez por abertura do app, mesmo que a tela monte de novo.
  pedidoAoAbrir ??= pedirAoAbrir();
  return pedidoAoAbrir;
}

async function pedirAoAbrir(): Promise<"ok" | "precisa-de-toque"> {
  if (!suportaAvisos() || ler(CHAVE_DESLIGADOS)) return "ok";
  if ((await estadoDosAvisos()) !== "desligado") return "ok";
  if (PUSH_NATIVO) {
    await ligarFirebase();
    return "ok";
  }
  const estado = await ligarWebPush();
  return estado === "desligado" && Notification.permission === "default" ? "precisa-de-toque" : "ok";
}

/** Desinscreve aqui e avisa a API. Sem rede, o servidor descobre no próximo envio. */
export async function desligarAvisos(): Promise<void> {
  if (!suportaAvisos()) return;
  guardar(CHAVE_DESLIGADOS, "1");
  if (PUSH_NATIVO) {
    const token = ler(CHAVE_TOKEN);
    guardar(CHAVE_TOKEN, null);
    await PushNotifications.unregister();
    if (token) await api.delete("/push/subscriptions", { endpoint: token }).catch(() => undefined);
    return;
  }
  const inscricao = await inscricaoAtual();
  if (!inscricao) return;
  const { endpoint } = inscricao;
  await inscricao.unsubscribe();
  await api.delete("/push/subscriptions", { endpoint }).catch(() => undefined);
}

/**
 * Ao abrir o app: o aparelho já inscrito manda a inscrição de novo. O
 * navegador e o Firebase podem tê-la trocado, e o banco do staging pode ter
 * sido recriado.
 */
export function renovarAvisos(): void {
  if (!suportaAvisos()) return;
  void (async () => {
    if (PUSH_NATIVO) {
      if (!ler(CHAVE_TOKEN) || (await PushNotifications.checkPermissions()).receive !== "granted") return;
      const token = await tokenDoFirebase();
      await api.put("/push/subscriptions", { fcm_token: token });
      guardar(CHAVE_TOKEN, token);
      return;
    }
    if (Notification.permission !== "granted") return;
    const inscricao = await inscricaoAtual();
    if (inscricao) await api.put("/push/subscriptions", inscricao.toJSON());
  })().catch(() => undefined);
}

/** Ao sair da conta: quem entrar depois neste aparelho não recebe os avisos de quem saiu. */
export function esquecerAvisos(): void {
  if (!suportaAvisos()) return;
  if (PUSH_NATIVO) {
    const token = ler(CHAVE_TOKEN);
    guardar(CHAVE_TOKEN, null);
    // Sai antes de o logout apagar o token de acesso: `request` lê o token na hora.
    if (token) void api.delete("/push/subscriptions", { endpoint: token }).catch(() => undefined);
    void PushNotifications.unregister().catch(() => undefined);
    return;
  }
  void inscricaoAtual()
    .then((i) => i?.unsubscribe())
    .catch(() => undefined);
}

/** No APK, tocar no aviso abre a conversa ou a Mesa. Devolve a função que para de ouvir. */
export function ouvirToqueNoAviso(abrir: (caminho: string) => void): () => void {
  if (!PUSH_NATIVO) return () => undefined;
  const ouvinte = PushNotifications.addListener("pushNotificationActionPerformed", ({ notification }) => {
    const url = (notification.data as { url?: unknown } | undefined)?.url;
    if (typeof url === "string" && url.startsWith("/")) abrir(url);
  });
  return () => void ouvinte.then((o) => o.remove());
}
