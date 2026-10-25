import { beforeEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api";
import * as servico from "@/services/api/memoService";
import * as memos from "./memos";

// IndexedDB de mentira: um Map, que é o que o idb-keyval é para o memo.
const guardados = new Map<string, unknown>();
vi.mock("idb-keyval", () => ({
  createStore: () => ({}),
  get: async (k: string) => guardados.get(k),
  set: async (k: string, v: unknown) => void guardados.set(k, v),
  del: async (k: string) => void guardados.delete(k),
  entries: async () => [...guardados.entries()],
}));
vi.mock("@/services/api/memoService", () => ({
  listar: vi.fn(),
  subir: vi.fn(),
  audio: vi.fn(),
  renomear: vi.fn(),
  apagar: vi.fn(),
}));

const som = new Blob(["la-la"], { type: "audio/webm;codecs=opus" });
const daApi = (id: string, songId = "s1") => ({
  id,
  song_id: songId,
  author_id: "u1",
  title: "",
  duration_ms: 3000,
  mime_type: "audio/webm",
  size_bytes: 5,
  created_at: "2026-10-25T10:00:00.000Z",
});

beforeEach(() => {
  guardados.clear();
  vi.mocked(servico.subir).mockReset();
  vi.mocked(servico.listar).mockReset();
});

describe("memos no aparelho", () => {
  it("sem rede, o memo fica pendente e sobe quando a rede volta", async () => {
    vi.mocked(servico.subir).mockRejectedValueOnce(new ApiError(0, "sem rede"));
    const memo = await memos.guardar("s1", "u1", som, 3000);
    await memos.enviarPendentes();
    expect((await memos.listar("s1", false)).memos).toEqual([expect.objectContaining({ id: memo.id, pendente: true })]);

    vi.mocked(servico.subir).mockResolvedValueOnce(daApi(memo.id));
    await memos.enviarPendentes();
    expect(servico.subir).toHaveBeenLastCalledWith("s1", { id: memo.id, audio: som, durationMs: 3000, title: "" });
    const [aqui] = (await memos.listar("s1", false)).memos;
    expect(aqui).toMatchObject({ id: memo.id, pendente: false });
    // O áudio continua no aparelho: tocar não precisa de rede.
    expect(await memos.audioDe(aqui!)).toBe(som);
  });

  it("recusa do servidor não fica tentando para sempre", async () => {
    vi.mocked(servico.subir).mockRejectedValue(new ApiError(415, "Formato de áudio não aceito."));
    const memo = await memos.guardar("s1", "u1", som, 3000);
    await memos.enviarPendentes();
    const [aqui] = (await memos.listar("s1", false)).memos;
    expect(aqui).toMatchObject({ id: memo.id, pendente: false, erro: "Formato de áudio não aceito." });
  });

  it("com rede, junta os do servidor com os pendentes e esquece os apagados por outra pessoa", async () => {
    vi.mocked(servico.subir).mockRejectedValue(new ApiError(0, "sem rede"));
    const pendente = await memos.guardar("s1", "u1", som, 1000);
    guardados.set("velho", { ...daApi("velho"), songId: "s1", pendente: false, criadoEm: "2026-10-01T00:00:00.000Z" });
    vi.mocked(servico.listar).mockResolvedValueOnce([daApi("remoto")]);

    const { memos: lista, doServidor } = await memos.listar("s1", true);
    expect(doServidor).toBe(true);
    expect(lista.map((m) => m.id).sort()).toEqual([pendente.id, "remoto"].sort());
    expect(guardados.has("velho")).toBe(false);
  });

  it("formata a duração em minutos e segundos", () => {
    expect(memos.duracao(65_400)).toBe("1:05");
    expect(memos.duracao(0)).toBe("0:00");
  });
});
