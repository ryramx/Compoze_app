import type { ApiLiveEvent } from "@/services/api/dto";
import { getAccessToken, MODO_DEMO, renovarSessao, URL_DA_API } from "./api";

/**
 * Fluxo ao vivo (Fase 4b, ADR 0014): `GET /events`, em Server-Sent Events.
 * Abre com fetch, e não com EventSource, para mandar o token no cabeçalho.
 * Caiu, reconecta com espera crescente (1 s, 2 s, 4 s… até 30 s); quem ouve
 * relê o que pode ter perdido em `aoReconectar`.
 *
 * Na demonstração não há servidor para empurrar nada: o próprio servidor da
 * demo chama `emitir` quando algo muda.
 */

type Ouvintes = {
  aoEvento: (e: ApiLiveEvent) => void;
  aoReconectar?: () => void;
};

const locais = new Set<(e: ApiLiveEvent) => void>();

/** Entrega um evento aos ouvintes deste aparelho (usado pelo modo demo). */
export function emitir(e: ApiLiveEvent): void {
  for (const f of locais) f(e);
}

/** Lê blocos `event:`/`data:` de um texto SSE; devolve os eventos e o resto incompleto. */
export function lerEventos(texto: string): { eventos: ApiLiveEvent[]; resto: string } {
  const blocos = texto.split("\n\n");
  const resto = blocos.pop() ?? "";
  const eventos: ApiLiveEvent[] = [];
  for (const b of blocos) {
    const dados = b
      .split("\n")
      .filter((l) => l.startsWith("data:"))
      .map((l) => l.slice(5).trimStart())
      .join("\n");
    if (!dados) continue;
    try {
      eventos.push(JSON.parse(dados) as ApiLiveEvent);
    } catch {
      // Evento malformado: ignora, o próximo vem inteiro.
    }
  }
  return { eventos, resto };
}

/** Conecta e mantém conectado até a função devolvida ser chamada. */
export function conectarAoVivo({ aoEvento, aoReconectar }: Ouvintes): () => void {
  if (MODO_DEMO) {
    locais.add(aoEvento);
    return () => locais.delete(aoEvento);
  }

  let parado = false;
  let controle: AbortController | null = null;
  let espera = 1000;
  let timer: ReturnType<typeof setTimeout> | undefined;
  let primeira = true;

  const agendar = () => {
    if (parado) return;
    timer = setTimeout(() => void abrir(), espera);
    espera = Math.min(espera * 2, 30_000);
  };

  async function abrir() {
    if (parado) return;
    if (!navigator.onLine) {
      window.addEventListener("online", () => void abrir(), { once: true });
      return;
    }
    controle = new AbortController();
    try {
      const r = await fetch(`${URL_DA_API}/events`, {
        headers: { Authorization: `Bearer ${getAccessToken() ?? ""}`, Accept: "text/event-stream" },
        signal: controle.signal,
      });
      if (r.status === 401 && (await renovarSessao())) return void abrir();
      if (!r.ok || !r.body) return agendar();
      espera = 1000;
      if (!primeira) aoReconectar?.();
      primeira = false;

      const leitor = r.body.pipeThrough(new TextDecoderStream()).getReader();
      let acumulado = "";
      for (;;) {
        const { value, done } = await leitor.read();
        if (done) break;
        const { eventos, resto } = lerEventos(acumulado + value);
        acumulado = resto;
        for (const e of eventos) aoEvento(e);
      }
    } catch {
      // Rede caiu ou a conexão foi abortada.
    }
    agendar();
  }

  void abrir();
  return () => {
    parado = true;
    clearTimeout(timer);
    controle?.abort();
  };
}
