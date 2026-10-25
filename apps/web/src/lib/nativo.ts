import { App } from "@capacitor/app";
import { Capacitor, registerPlugin, type PluginListenerHandle } from "@capacitor/core";

/**
 * App Android (Fase 3, ADR 0011). O mesmo código roda no navegador e dentro
 * do Capacitor; aqui fica o pouco que muda entre os dois.
 */
export const NATIVO = Capacitor.isNativePlatform();

/**
 * Endereço público do Compoze, para links que outras pessoas vão abrir
 * (convite, canção). No app nativo a origem é https://localhost, que não
 * serve para ninguém; o build do APK define `VITE_WEB_URL`.
 */
export const ENDERECO_PUBLICO = (import.meta.env.VITE_WEB_URL || window.location.origin).replace(/\/$/, "");

/** Liga o botão "voltar" do Android ao histórico do app. */
export function iniciarNativo(): void {
  if (!NATIVO) return;
  void App.addListener("backButton", ({ canGoBack }) => {
    // Sem página anterior, vai para o fundo em vez de fechar: abrir de novo
    // fica instantâneo e nada da tela atual se perde.
    if (canGoBack) window.history.back();
    else void App.minimizeApp();
  });
}

interface Recebido {
  texto: string;
  titulo?: string | null;
}

// Plugin do próprio app (android/.../CompartilharPlugin.java): entrega o texto
// que outro app mandou pelo "Compartilhar" do Android.
const Compartilhar = registerPlugin<{
  addListener(evento: "recebido", f: (r: Recebido) => void): Promise<PluginListenerHandle>;
}>("Compartilhar");

/**
 * Chama `aoReceber` a cada texto compartilhado com o app (Fase 3b), inclusive
 * o que abriu o app: o plugin guarda o evento até alguém ouvir. Devolve a
 * função que para de ouvir.
 */
export function ouvirCompartilhamento(aoReceber: (r: Recebido) => void): () => void {
  if (!NATIVO) return () => undefined;
  const ouvinte = Compartilhar.addListener("recebido", aoReceber);
  return () => void ouvinte.then((o) => o.remove());
}
