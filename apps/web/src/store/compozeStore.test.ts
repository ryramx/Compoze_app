import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Song } from "@/types";

// Os serviços de API e a fila são mockados: estes testes verificam o
// comportamento do store — o que ele mostra na tela e o que põe na fila —, não
// o backend, que tem a própria suíte contra o PostgreSQL real.
vi.mock("@/lib/fila", () => ({
  abrirFila: vi.fn(),
  enfileirar: vi.fn(async () => undefined),
  esvaziar: vi.fn(async () => true),
}));

vi.mock("@/lib/copiaLocal", () => ({
  lerCopia: vi.fn(async () => undefined),
  salvarCopia: vi.fn(async () => undefined),
}));

vi.mock("@/lib/folhaInicial", () => ({
  semearFolhaInicial: vi.fn(async () => undefined),
}));

vi.mock("@/services/api/songService", () => ({
  list: vi.fn(async () => []),
  listTrash: vi.fn(async () => []),
  getById: vi.fn(async (id: string) => ({ ...musicaBase, id })),
  create: vi.fn(async ({ title }: { title: string }) => ({ ...musicaBase, id: "novo", title })),
  update: vi.fn(async () => musicaBase),
  softDelete: vi.fn(async () => undefined),
  restore: vi.fn(async () => musicaBase),
  permanentDelete: vi.fn(async () => undefined),
  setContributions: vi.fn(async () => undefined),
}));

vi.mock("@/services/api/folderService", () => ({
  list: vi.fn(async () => []),
  create: vi.fn(async (name: string) => ({ id: "f-novo", name, ownerId: "u1" })),
}));

vi.mock("@/services/api/projectService", () => ({
  list: vi.fn(async () => []),
  create: vi.fn(async ({ name }: { name: string }) => ({ ...projetoBase, name })),
  addSong: vi.fn(async () => projetoBase),
}));

vi.mock("@/services/api/userService", () => ({
  getMany: vi.fn(async () => []),
  updateMe: vi.fn(async () => undefined),
}));

const musicaBase: Song = {
  id: "s1",
  title: "Canção",
  status: "ideia",
  creatorId: "u1",
  collaborators: [{ userId: "u2", percentage: 50 }],
  createdAt: "2026-01-01",
  updatedAt: "2026-01-01",
  folderId: "f1",
  blocks: [],
  hidden: true,
};

const projetoBase = {
  id: "p1",
  name: "Projeto",
  type: "album" as const,
  style: "banda" as const,
  description: "",
  cover: "",
  releaseDate: "",
  estimatedCost: 0,
  fundingGoal: 0,
  fundingProgress: 0,
  status: "planejamento" as const,
  songIds: [],
  collaboratorIds: [],
  ownerId: "u1",
};

const { useCompoze } = await import("./compozeStore");
const songApi = await import("@/services/api/songService");
const fila = await import("@/lib/fila");
const copiaLocal = await import("@/lib/copiaLocal");
const { semearFolhaInicial } = await import("@/lib/folhaInicial");
const { ApiError } = await import("@/lib/api");

/** Os pedidos postos na fila, sem o rótulo (que é texto de aviso). */
const naFila = () =>
  vi.mocked(fila.enfileirar).mock.calls.map(([p]) => ({ metodo: p.metodo, caminho: p.caminho, corpo: p.corpo }));

beforeEach(() => {
  vi.clearAllMocks();
  useCompoze.setState({
    currentUserId: "u1",
    songs: [structuredClone(musicaBase)],
    folders: [],
    projects: [],
    users: [],
    hidratado: true,
    carregando: false,
    erro: null,
    semRede: false,
  });
});

describe("criação", () => {
  it("createSong cria no aparelho, com id local, e põe o pedido na fila", async () => {
    const id = await useCompoze.getState().createSong({ title: "Minha nova ideia", folderId: "f1" });

    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(useCompoze.getState().getSong(id)?.title).toBe("Minha nova ideia");
    // A folha pautada nasce no documento do aparelho; o servidor não semeia outra.
    expect(semearFolhaInicial).toHaveBeenCalledWith(id, "u1", undefined, undefined);
    expect(naFila()).toEqual([
      { metodo: "POST", caminho: "/songs", corpo: { id, title: "Minha nova ideia", folder_id: "f1", folha_pautada: false } },
    ]);
  });

  it("createSong dentro de um projeto já mostra a faixa", async () => {
    useCompoze.setState({ projects: [structuredClone(projetoBase)] });
    const id = await useCompoze.getState().createSong({ title: "Faixa", projectId: "p1" });

    expect(useCompoze.getState().getProject("p1")!.songIds).toEqual([id]);
    expect(naFila()[1]).toEqual({ metodo: "POST", caminho: "/projects/p1/songs", corpo: { song_id: id } });
  });

  it("createFolder devolve o id local e a pasta aparece na hora", async () => {
    const id = await useCompoze.getState().createFolder("Ideias");
    expect(useCompoze.getState().folders.map((f) => f.id)).toEqual([id]);
    expect(naFila()).toEqual([{ metodo: "POST", caminho: "/folders", corpo: { id, name: "Ideias", parent_id: null } }]);
  });
});

describe("lixeira", () => {
  it("deleteSong marca deletedAt em vez de remover", () => {
    useCompoze.getState().deleteSong("s1");
    const musica = useCompoze.getState().getSong("s1");
    expect(musica).toBeDefined();
    expect(musica!.deletedAt).toBeTruthy();
    expect(naFila()).toEqual([{ metodo: "DELETE", caminho: "/songs/s1", corpo: undefined }]);
  });

  it("restoreSong limpa deletedAt e preserva a pasta original", () => {
    const antes = useCompoze.getState().getSong("s1")!;
    useCompoze.getState().deleteSong("s1");
    useCompoze.getState().restoreSong("s1");

    const depois = useCompoze.getState().getSong("s1")!;
    expect(depois.deletedAt).toBeUndefined();
    expect(depois.folderId).toBe(antes.folderId);
    expect(naFila().map((p) => p.caminho)).toEqual(["/songs/s1", "/songs/s1/restore"]);
  });

  it("permanentlyDeleteSong remove da lista", () => {
    useCompoze.getState().permanentlyDeleteSong("s1");
    expect(useCompoze.getState().getSong("s1")).toBeUndefined();
    expect(naFila()).toEqual([{ metodo: "DELETE", caminho: "/songs/s1/permanent", corpo: undefined }]);
  });

  it("purgeExpiredTrash não apaga nada sozinho — quem expurga é o servidor", () => {
    useCompoze.setState({ hidratado: false });
    useCompoze.getState().purgeExpiredTrash();
    expect(useCompoze.getState().getSong("s1")).toBeDefined();
  });
});

describe("gravação adiada", () => {
  it("a tela muda na hora, sem esperar o servidor", () => {
    useCompoze.getState().updateSong("s1", { title: "Novo título" });
    expect(useCompoze.getState().getSong("s1")!.title).toBe("Novo título");
  });

  it("digitar várias vezes gera um pedido só", async () => {
    vi.useFakeTimers();
    for (const t of ["a", "ab", "abc"]) {
      useCompoze.getState().updateSong("s1", { title: t });
    }
    expect(fila.enfileirar).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(naFila()).toEqual([{ metodo: "PATCH", caminho: "/songs/s1", corpo: { title: "abc" } }]);
    vi.useRealTimers();
  });

  it("campos diferentes mudados em seguida vão juntos, sem perder nenhum", async () => {
    vi.useFakeTimers();
    useCompoze.getState().updateSong("s1", { title: "Outro" });
    useCompoze.getState().updateSong("s1", { bpm: 90 });

    await vi.advanceTimersByTimeAsync(1000);
    expect(naFila()).toHaveLength(1);
    expect(naFila()[0]!.corpo).toMatchObject({ title: "Outro", bpm: 90 });
    vi.useRealTimers();
  });
});

describe("blocos vindos do documento", () => {
  it("só conta como edição quando os blocos mudam de verdade", () => {
    const antes = useCompoze.getState().getSong("s1")!;
    useCompoze.getState().definirBlocos("s1", antes.blocks);
    expect(useCompoze.getState().getSong("s1")!.updatedAt).toBe(antes.updatedAt);

    const novos = [{ id: "b-novo", type: "lyric-line" as const, text: "verso", authorId: "u1" }];
    useCompoze.getState().definirBlocos("s1", novos);
    const depois = useCompoze.getState().getSong("s1")!;
    expect(depois.blocks).toEqual(novos);
    expect(depois.updatedAt).not.toBe(antes.updatedAt);
  });
});

describe("coautoria", () => {
  it("setContribution atualiza o percentual do colaborador", () => {
    useCompoze.getState().setContribution("s1", "u2", 75);
    const musica = useCompoze.getState().getSong("s1")!;
    expect(musica.collaborators.find((c) => c.userId === "u2")?.percentage).toBe(75);
  });

  it("não confirma a divisão ao ajustar percentual", async () => {
    vi.useFakeTimers();
    useCompoze.getState().setContribution("s1", "u2", 75);
    await vi.advanceTimersByTimeAsync(1000);

    // RN05 é condicional: ajustar em rascunho não pode exigir soma 100.
    expect(naFila()).toEqual([
      {
        metodo: "PUT",
        caminho: "/songs/s1/contributions",
        corpo: { contributions: [{ user_id: "u2", percentage: 75 }], confirm: false },
      },
    ]);
    vi.useRealTimers();
  });

  it("confirmar sem rede recusa, em vez de fingir que confirmou", async () => {
    vi.mocked(fila.esvaziar).mockResolvedValueOnce(false);
    await expect(useCompoze.getState().confirmContributions("s1")).rejects.toThrow(/internet/);
    expect(songApi.setContributions).not.toHaveBeenCalled();
  });
});

describe("visibilidade", () => {
  it("toggleSongHidden inverte o estado", () => {
    expect(useCompoze.getState().getSong("s1")!.hidden).toBe(true);
    useCompoze.getState().toggleSongHidden("s1");
    expect(useCompoze.getState().getSong("s1")!.hidden).toBe(false);
  });
});

describe("hidratação", () => {
  it("erro de rede sem cópia no aparelho não deixa a tela em carregamento eterno", async () => {
    useCompoze.setState({ hidratado: false, currentUserId: "" });
    vi.mocked(songApi.list).mockRejectedValueOnce(new ApiError(0, "sem rede"));

    await useCompoze.getState().hydrate("u1");

    expect(useCompoze.getState().carregando).toBe(false);
    expect(useCompoze.getState().erro).toBeTruthy();
  });

  it("sem rede, abre com a cópia do aparelho", async () => {
    useCompoze.setState({ hidratado: false, currentUserId: "", songs: [] });
    vi.mocked(copiaLocal.lerCopia).mockResolvedValueOnce({
      songs: [{ ...musicaBase, title: "Guardada" }],
      folders: [],
      projects: [],
      users: [],
      salvaEm: "2026-01-01",
    });
    vi.mocked(fila.esvaziar).mockResolvedValueOnce(false);

    await useCompoze.getState().hydrate("u1");

    const estado = useCompoze.getState();
    expect(estado.erro).toBeNull();
    expect(estado.semRede).toBe(true);
    expect(estado.getSong("s1")?.title).toBe("Guardada");
    expect(fila.abrirFila).toHaveBeenCalledWith("u1");
    // Sem a fila vazia, não lê do servidor (a leitura desfaria o que foi feito offline).
    expect(songApi.list).not.toHaveBeenCalled();
  });
});
