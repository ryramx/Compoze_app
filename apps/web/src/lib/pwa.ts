import { toast } from "sonner";
import { registerSW } from "virtual:pwa-register";
import { NATIVO } from "./nativo";

/**
 * Service worker da PWA (Fase 2c). Guarda o app no aparelho para abrir sem
 * rede e avisa quando há versão nova.
 *
 * A versão nova não entra sozinha: recarregar no meio de uma frase seria pior
 * do que usar a versão de ontem por mais uns minutos. O aviso fica até a
 * pessoa escolher.
 */
export function registrarServiceWorker(): void {
  // No app Android o código já está no aparelho, e a versão nova chega por
  // APK novo (ADR 0011). Um service worker ali só duplicaria o cache.
  if (NATIVO || !("serviceWorker" in navigator)) return;
  const atualizar = registerSW({
    onNeedRefresh() {
      toast("Há uma versão nova do Compoze.", {
        duration: Infinity,
        action: { label: "Atualizar", onClick: () => void atualizar(true) },
      });
    },
    onOfflineReady() {
      toast("Pronto: o Compoze agora abre mesmo sem internet.");
    },
  });
}

/**
 * Pede ao navegador para não apagar os dados do aparelho quando faltar espaço
 * (ADR 0005). Só depois do login: no Firefox isto abre uma pergunta, que não
 * faz sentido na tela de entrada. O Safari ignora; lá vale instalar o app.
 */
export function pedirArmazenamentoPersistente(): void {
  void (async () => {
    try {
      if (!navigator.storage?.persist || (await navigator.storage.persisted())) return;
      await navigator.storage.persist();
    } catch {
      // Sem a API, o app segue; o servidor é a cópia de segurança.
    }
  })();
}
