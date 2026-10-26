import { MODO_DEMO, URL_DA_API } from "@/lib/api";

/**
 * No plano grátis do Render a API dorme depois de uns 15 minutos sem uso e
 * leva perto de um minuto para acordar. As telas de entrar e criar conta
 * chamam isto ao abrir, para ela ir acordando enquanto a pessoa digita.
 */
export function acordarApi(): void {
  if (MODO_DEMO) return;
  void fetch(`${URL_DA_API}/health`).catch(() => undefined);
}
