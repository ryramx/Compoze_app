import { App } from "@capacitor/app";
import { toast } from "sonner";
import { NATIVO } from "./nativo";

/**
 * Aviso de versão nova no app Android (Fase 3b). O APK não se atualiza
 * sozinho (ADR 0011): ele pergunta ao GitHub qual é o último Release e, se
 * for mais novo que o instalado, oferece baixar. Na web quem avisa é o
 * service worker (lib/pwa.ts).
 */

const REPOSITORIO = "ryramx/Compoze_app";
export const LINK_DO_APK = `https://github.com/${REPOSITORIO}/releases/latest/download/Compoze.apk`;
const CHAVE = "compoze:atualizacao-conferida";
// Uma consulta por dia: a API do GitHub sem login aceita 60 por hora por IP.
const INTERVALO_MS = 24 * 60 * 60 * 1000;

/** `true` se a versão `a` (1.2.3, com ou sem "v") é mais nova que `b`. */
export function maisNova(a: string, b: string): boolean {
  const partes = (v: string) => v.replace(/^v/, "").split(".").map((n) => Number.parseInt(n, 10) || 0);
  const [x, y] = [partes(a), partes(b)];
  for (let i = 0; i < Math.max(x.length, y.length); i++) {
    const d = (x[i] ?? 0) - (y[i] ?? 0);
    if (d !== 0) return d > 0;
  }
  return false;
}

/** Última versão publicada nos Releases, ou `null` sem rede. */
export async function ultimaVersao(): Promise<string | null> {
  try {
    const r = await fetch(`https://api.github.com/repos/${REPOSITORIO}/releases/latest`, {
      headers: { Accept: "application/vnd.github+json" },
    });
    if (!r.ok) return null;
    const { tag_name } = (await r.json()) as { tag_name?: string };
    return tag_name?.replace(/^v/, "") ?? null;
  } catch {
    return null;
  }
}

/** Versão instalada do APK; `null` fora do app. */
export async function versaoInstalada(): Promise<string | null> {
  if (!NATIVO) return null;
  return (await App.getInfo()).version;
}

/** Abre o download no navegador do celular; o Android instala por cima. */
export function baixarVersaoNova(): void {
  // Endereço de fora do app: o Capacitor entrega ao navegador do sistema.
  window.location.href = LINK_DO_APK;
}

function avisar(versao: string) {
  toast(`O Compoze ${versao} saiu.`, {
    duration: Infinity,
    action: { label: "Baixar", onClick: baixarVersaoNova },
  });
}

/** Confere uma vez por dia, ao abrir o app. */
export function conferirAtualizacao(): void {
  if (!NATIVO) return;
  void (async () => {
    try {
      const ultima = Number(localStorage.getItem(CHAVE) ?? 0);
      if (Date.now() - ultima < INTERVALO_MS) return;
    } catch {
      // Sem localStorage, confere sempre; é uma requisição só.
    }
    const [nova, instalada] = await Promise.all([ultimaVersao(), versaoInstalada()]);
    if (!nova || !instalada) return;
    try {
      localStorage.setItem(CHAVE, String(Date.now()));
    } catch {
      // idem
    }
    if (maisNova(nova, instalada)) avisar(nova);
  })();
}
