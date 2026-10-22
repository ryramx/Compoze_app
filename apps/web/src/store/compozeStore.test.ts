import { beforeEach, describe, expect, it, vi } from "vitest";

import type { Song } from "@/types";

// Os serviços de API são mockados: estes testes verificam o comportamento do
// store — o que ele mostra na tela e o que manda gravar —, não o backend, que
// tem a própria suíte contra o PostgreSQL real.
vi.mock("@/services/api/songService", () => ({
  list: vi.fn(async () => []),
  listTrash: vi.fn(async () => []),
  getById: vi.fn(async (id: string) => ({ ...musicaBase, id })),
  create: vi.fn(async ({ title }: { title: string }) => ({ ...musicaBase, id: "novo", title })),
  update: vi.fn(async () => musicaBase),
  softDelete: vi.fn(async () => undefined),
  restore: vi.fn(async () => musicaBase),
  permanentDelete: vi.fn(async () => undefined),
  addBlock: vi.fn(async () => undefined),
  updateBlock: vi.fn(async () => undefined),
  removeBlock: vi.fn(async () => undefined),
  inviteCollaborator: vi.fn(async () => undefined),
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
  });
});

describe("criação", () => {
  it("createSong adiciona a música devolvida pela API", async () => {
    const id = await useCompoze.getState().createSong({ title: "Minha nova ideia" });
    expect(id).toBe("novo");
    expect(useCompoze.getState().getSong("novo")?.title).toBe("Minha nova ideia");
  });

  it("createFolder devolve o id da pasta criada", async () => {
    expect(await useCompoze.getState().createFolder("Ideias")).toBe("f-novo");
  });
});

describe("lixeira", () => {
  it("deleteSong marca deletedAt em vez de remover", () => {
    useCompoze.getState().deleteSong("s1");
    const musica = useCompoze.getState().getSong("s1");
    expect(musica).toBeDefined();
    expect(musica!.deletedAt).toBeTruthy();
    expect(songApi.softDelete).toHaveBeenCalledWith("s1");
  });

  it("restoreSong limpa deletedAt e preserva a pasta original", () => {
    const antes = useCompoze.getState().getSong("s1")!;
    useCompoze.getState().deleteSong("s1");
    useCompoze.getState().restoreSong("s1");

    const depois = useCompoze.getState().getSong("s1")!;
    expect(depois.deletedAt).toBeUndefined();
    expect(depois.folderId).toBe(antes.folderId);
  });

  it("permanentlyDeleteSong remove da lista", () => {
    useCompoze.getState().permanentlyDeleteSong("s1");
    expect(useCompoze.getState().getSong("s1")).toBeUndefined();
    expect(songApi.permanentDelete).toHaveBeenCalledWith("s1");
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

  it("digitar várias vezes gera uma gravação só", async () => {
    vi.useFakeTimers();
    for (const t of ["a", "ab", "abc"]) {
      useCompoze.getState().updateSong("s1", { title: t });
    }
    expect(songApi.update).not.toHaveBeenCalled();

    await vi.advanceTimersByTimeAsync(1000);
    expect(songApi.update).toHaveBeenCalledTimes(1);
    expect(songApi.update).toHaveBeenCalledWith("s1", { title: "abc" });
    vi.useRealTimers();
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
    expect(songApi.setContributions).toHaveBeenCalledWith(
      "s1",
      [{ userId: "u2", percentage: 75 }],
      false,
    );
    vi.useRealTimers();
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
  it("erro de rede não deixa a tela em carregamento eterno", async () => {
    vi.mocked(songApi.list).mockRejectedValueOnce(new Error("sem rede"));

    await useCompoze.getState().hydrate("u1");

    expect(useCompoze.getState().carregando).toBe(false);
    expect(useCompoze.getState().erro).toBeTruthy();
  });
});
