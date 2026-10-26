import { describe, expect, it, vi } from "vitest";
import { lerEventos } from "./aoVivo";

describe("lerEventos", () => {
  it("lê eventos inteiros, ignora comentários e guarda o pedaço que ainda não chegou", () => {
    const m = { type: "message", message: { id: "1", conversation_id: "c", author_id: "a", content: "oi", created_at: "x" } };
    const texto = `: conectado\n\nevent: message\ndata: ${JSON.stringify(m)}\n\n: pulso\n\nevent: read\ndata: {"type":"re`;
    const { eventos, resto } = lerEventos(texto);
    expect(eventos).toEqual([m]);
    expect(resto).toBe('event: read\ndata: {"type":"re');
  });
});

describe("conectarAoVivo em segundo plano", () => {
  it("fecha o fluxo quando o app some da tela e reabre quando volta", async () => {
    const { conectarAoVivo } = await import("./aoVivo");
    const abertos: AbortSignal[] = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((_url: string, init: RequestInit) => {
        abertos.push(init.signal!);
        // Um fluxo que nunca termina sozinho, só quando abortado.
        const body = new ReadableStream({
          start(c) {
            init.signal!.addEventListener("abort", () => c.error(new DOMException("abortado", "AbortError")));
          },
        });
        return Promise.resolve(new Response(body, { status: 200 }));
      }),
    );
    let escondido = false;
    Object.defineProperty(document, "hidden", { configurable: true, get: () => escondido });
    const mudar = (v: boolean) => {
      escondido = v;
      document.dispatchEvent(new Event("visibilitychange"));
    };

    const parar = conectarAoVivo({ aoEvento: () => undefined });
    await vi.waitFor(() => expect(abertos).toHaveLength(1));

    mudar(true);
    expect(abertos[0]!.aborted).toBe(true);
    await new Promise((r) => setTimeout(r, 50));
    expect(abertos).toHaveLength(1);

    mudar(false);
    await vi.waitFor(() => expect(abertos).toHaveLength(2));
    expect(abertos[1]!.aborted).toBe(false);

    parar();
    expect(abertos[1]!.aborted).toBe(true);
    vi.unstubAllGlobals();
  });
});
