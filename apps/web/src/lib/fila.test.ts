import { beforeEach, describe, expect, it, vi } from "vitest";

// Só o envio é mockado; o resto da fila (ordem, storage, retentativa) é real.
const enviarNaApi = vi.fn();
vi.mock("@/lib/api", async (original) => ({
  ...(await original<typeof import("@/lib/api")>()),
  MODO_DEMO: false,
  api: { enviar: (...args: unknown[]) => enviarNaApi(...args) },
}));

const { ApiError } = await import("@/lib/api");
const { abrirFila, descartarFila, enfileirar, esvaziar, pendentes, quandoRecusar } = await import("./fila");

beforeEach(() => {
  vi.useRealTimers();
  enviarNaApi.mockReset();
  localStorage.clear();
  descartarFila();
});

describe("fila do aparelho", () => {
  it("envia em ordem, cada pedido com o próprio id como Idempotency-Key", async () => {
    enviarNaApi.mockResolvedValue({});
    abrirFila("u1");
    void enfileirar({ metodo: "POST", caminho: "/folders", corpo: { id: "f" }, rotulo: "a pasta" });
    void enfileirar({ metodo: "POST", caminho: "/songs", corpo: { folder_id: "f" }, rotulo: "a canção" });

    expect(await esvaziar()).toBe(true);
    expect(enviarNaApi.mock.calls.map((c) => c[1])).toEqual(["/folders", "/songs"]);
    const [chave1, chave2] = enviarNaApi.mock.calls.map((c) => c[3]);
    expect(chave1).toBeTruthy();
    expect(chave1).not.toBe(chave2);
  });

  it("sem rede, guarda o pedido e reenvia com a mesma chave", async () => {
    vi.useFakeTimers();
    enviarNaApi.mockRejectedValueOnce(new ApiError(0, "sem rede")).mockResolvedValueOnce({});
    abrirFila("u1");
    void enfileirar({ metodo: "PATCH", caminho: "/users/me", corpo: { name: "A" }, rotulo: "o perfil" });
    await vi.advanceTimersByTimeAsync(0);

    expect(pendentes()).toBe(1);
    // Sobrevive a recarregar a página.
    expect(JSON.parse(localStorage.getItem("compoze.fila.u1")!)).toHaveLength(1);

    await vi.advanceTimersByTimeAsync(5000);
    expect(pendentes()).toBe(0);
    expect(enviarNaApi.mock.calls[0]![3]).toBe(enviarNaApi.mock.calls[1]![3]);
  });

  it("recusa definitiva descarta o pedido, avisa e segue com o próximo", async () => {
    const recusados: string[] = [];
    const parar = quandoRecusar((p) => recusados.push(p.rotulo));
    enviarNaApi.mockRejectedValueOnce(new ApiError(403, "não pode")).mockResolvedValueOnce({});
    abrirFila("u1");
    const primeiro = enfileirar({ metodo: "DELETE", caminho: "/songs/x", rotulo: "a exclusão" });
    void enfileirar({ metodo: "POST", caminho: "/folders", corpo: {}, rotulo: "a pasta" });

    await expect(primeiro).rejects.toThrow("não pode");
    expect(await esvaziar()).toBe(true);
    expect(recusados).toEqual(["a exclusão"]);
    expect(enviarNaApi).toHaveBeenCalledTimes(2);
    parar();
  });

  it("a fila é de cada pessoa", () => {
    enviarNaApi.mockReturnValue(new Promise(() => undefined));
    abrirFila("u1");
    void enfileirar({ metodo: "POST", caminho: "/folders", corpo: {}, rotulo: "a pasta" });
    abrirFila("u2");
    expect(pendentes()).toBe(0);
  });
});
