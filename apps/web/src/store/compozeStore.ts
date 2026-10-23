import { create } from "zustand";

import {
  conversations as initialConversations,
  feed as initialFeed,
  follows as initialFollows,
} from "@/data/mockData";
import type {
  Conversation,
  FeedItem,
  Folder,
  Follow,
  Project,
  ProjectStyle,
  ProjectType,
  Song,
  SongBlock,
  User,
} from "@/types";
import { adiantar } from "@/demo/semente";
import { ApiError } from "@/lib/api";
import { lerCopia, salvarCopia } from "@/lib/copiaLocal";
import { abrirFila, enfileirar, esvaziar } from "@/lib/fila";
import { uuidv7 } from "@/lib/uuidv7";
import { patchDeMusicaParaApi } from "@/services/api/adapters";
import * as folderApi from "@/services/api/folderService";
import * as projectApi from "@/services/api/projectService";
import * as songApi from "@/services/api/songService";
import * as userApi from "@/services/api/userService";
import * as feedService from "@/services/mock/feedService";
import * as messageService from "@/services/mock/messageService";
import * as songService from "@/services/mock/songService";
import * as userService from "@/services/mock/userService";

/**
 * Estado da aplicação.
 *
 * Música, pasta, projeto e usuário vêm da API e persistem. Escritas desses
 * dados passam pela fila do aparelho (`lib/fila.ts`, ADR 0008): a tela muda na
 * hora, a fila leva ao servidor quando houver rede. O caderno inteiro fica
 * copiado no aparelho (`lib/copiaLocal.ts`) e abre sem rede.
 *
 * Feed, mensagens e
 * seguidores continuam vindo de `mockData`: são Fase 2 e 3 do PRD e ainda não
 * existem no backend. A separação está explícita nos imports acima — `*Api`
 * versus `*Service` — para que ninguém precise adivinhar o que é real.
 *
 * ## Por que um store, e não `useQuery` em cada tela
 *
 * `getUser` aparece em quase todo componente (avatar de colaborador, autoria de
 * bloco, busca global) e precisa responder de forma síncrona durante a
 * renderização. Um cache compartilhado resolve isso melhor do que uma query por
 * componente. As chamadas HTTP ficam em `src/services/api/`, separadas, então
 * migrar telas específicas para `useQuery` depois continua possível sem
 * reescrever a camada de acesso.
 */
interface CompozeState {
  currentUserId: string;
  users: User[];
  songs: Song[];
  folders: Folder[];
  projects: Project[];

  // Ainda sem backend (PRD Fases 2 e 3).
  conversations: Conversation[];
  feed: FeedItem[];
  follows: Follow[];
  followingIds: string[];

  hidratado: boolean;
  carregando: boolean;
  erro: string | null;
  /** A última tentativa de ler do servidor falhou por falta de rede; a tela mostra a cópia do aparelho. */
  semRede: boolean;

  hydrate: (currentUserId: string) => Promise<void>;
  limpar: () => void;
  /** Busca a música completa, com blocos, que a listagem não traz. */
  loadSong: (id: string) => Promise<void>;

  getUser: (id: string) => User | undefined;
  getSong: (id: string) => Song | undefined;
  getProject: (id: string) => Project | undefined;

  createSong: (input: {
    title: string;
    folderId?: string;
    projectId?: string;
  }) => Promise<string>;
  createProject: (input: {
    name: string;
    type: ProjectType;
    style: ProjectStyle;
    description?: string;
    releaseDate?: string;
    fundingGoal?: number;
    estimatedCost?: number;
  }) => Promise<string>;
  createFolder: (name: string, parentId?: string) => Promise<string>;

  updateSong: (id: string, patch: Partial<Song>) => void;
  /**
   * Atualiza os blocos de uma canção só na memória. Quem escreve é o
   * documento Yjs do editor (ADR 0007); isto mantém Mesa, listas e busca em
   * dia com ele sem esperar a próxima leitura da API.
   */
  definirBlocos: (songId: string, blocks: SongBlock[]) => void;
  inviteCollaborator: (songId: string, userId: string, percentage?: number) => void;
  removeCollaborator: (songId: string, userId: string) => void;
  setContribution: (songId: string, userId: string, percentage: number) => void;
  /** Fecha a divisão de coautoria. Rejeita com ApiError 422 se não somar 100 (RN05). */
  confirmContributions: (songId: string) => Promise<void>;

  renameFolder: (id: string, name: string) => void;
  deleteFolder: (id: string) => void;

  loadProject: (id: string) => Promise<void>;
  updateProject: (id: string, patch: Partial<Project>) => void;
  deleteProject: (id: string) => void;
  addSongToProject: (projectId: string, songId: string) => Promise<void>;
  removeSongFromProject: (projectId: string, songId: string) => void;
  toggleSongHidden: (songId: string) => void;
  deleteSong: (songId: string) => void;
  restoreSong: (songId: string) => void;
  permanentlyDeleteSong: (songId: string) => void;
  /**
   * Mantida por compatibilidade com a tela de Lixeira, mas não apaga nada: a
   * exclusão definitiva é do job do servidor (RN08). Aqui só recarrega.
   */
  purgeExpiredTrash: () => void;

  updateCurrentUser: (patch: Partial<Pick<User, "name" | "bio" | "instagram" | "location">>) => void;
  toggleFollow: (userId: string) => void;
  sendMessage: (toUserId: string, content: string) => void;
  postFeed: (content: string) => void;
}

/**
 * Gravações adiadas, por chave (`song:id`, `folder:id`…).
 *
 * O título, a ficha e os nomes são gravados a cada tecla. Sem isto, cada letra
 * digitada viraria um pedido. O estado local muda na hora — a digitação não
 * trava — e o pedido entra na fila quando a pessoa para de escrever. Patches
 * da mesma chave se acumulam: mudar o título e logo depois o tom grava os dois.
 */
const ATRASO_DE_GRAVACAO = 600;
const adiadas = new Map<string, { patch: object; temporizador: ReturnType<typeof setTimeout> }>();

function agendarGravacao<P extends object>(chave: string, patch: P, gravar: (acumulado: P) => void): void {
  const anterior = adiadas.get(chave);
  if (anterior) clearTimeout(anterior.temporizador);
  const acumulado = { ...(anterior?.patch as P | undefined), ...patch };
  adiadas.set(chave, {
    patch: acumulado,
    temporizador: setTimeout(() => {
      adiadas.delete(chave);
      gravar(acumulado);
    }, ATRASO_DE_GRAVACAO),
  });
}

/** Descarta uma gravação adiada (quem vai gravar tudo de uma vez é outro). */
function cancelarGravacao(chave: string): void {
  const anterior = adiadas.get(chave);
  if (anterior) clearTimeout(anterior.temporizador);
  adiadas.delete(chave);
}

const agora = () => new Date().toISOString();

export const useCompoze = create<CompozeState>((set, get) => ({
  currentUserId: "",
  users: [],
  songs: [],
  folders: [],
  projects: [],

  // Datas do exemplo alinhadas com as da demonstração, para o mural não parecer parado.
  conversations: initialConversations.map((c) => ({
    ...c,
    messages: c.messages.map((m) => ({ ...m, timestamp: adiantar(m.timestamp) })),
  })),
  feed: initialFeed.map((f) => ({ ...f, timestamp: adiantar(f.timestamp) })),
  follows: initialFollows,
  followingIds: [],

  hidratado: false,
  carregando: false,
  erro: null,
  semRede: false,

  // ------------------------------------------------------------- carga inicial

  hydrate: async (currentUserId) => {
    const outraPessoa = get().currentUserId !== currentUserId;
    set({ carregando: true, erro: null, currentUserId });
    abrirFila(currentUserId);

    // Primeiro a cópia do aparelho: a tela abre na hora, com ou sem rede.
    const copia = await lerCopia(currentUserId);
    if (copia && (outraPessoa || !get().hidratado)) {
      set({
        songs: copia.songs,
        folders: copia.folders,
        projects: copia.projects,
        users: copia.users,
        followingIds: userService.getFollowingIds(initialFollows, currentUserId),
        hidratado: true,
      });
    }

    try {
      // O que ficou na fila sobe antes da leitura; senão o servidor devolveria
      // o estado de antes e a tela "desfaria" o que a pessoa fez offline.
      if (!(await esvaziar())) throw new ApiError(0, "Escritas ainda na fila.");

      // Ativas e lixeira juntas: as telas filtram por `deletedAt`, e buscar as
      // duas de uma vez mantém `listActive`/`listTrashed` funcionando como antes.
      const [ativas, lixeira, folders, projects] = await Promise.all([
        songApi.list({ completas: true }),
        songApi.listTrash(),
        folderApi.list(),
        projectApi.list(),
      ]);
      // A Mesa, o índice e a busca mostram versos e coautores: a listagem já
      // vem completa (expand), numa requisição só.
      const songs = [...ativas, ...lixeira];

      // Resolve numa só requisição todas as pessoas citadas nas obras.
      const ids = new Set<string>([currentUserId]);
      for (const s of songs) {
        ids.add(s.creatorId);
        for (const c of s.collaborators) ids.add(c.userId);
      }
      // Quem aparece no feed e nas conversas (ainda de exemplo) também precisa de nome.
      for (const f of get().feed) ids.add(f.userId);
      for (const c of get().conversations) ids.add(c.withUserId);

      set({
        songs,
        folders,
        projects,
        users: await userApi.getMany([...ids]),
        followingIds: userService.getFollowingIds(initialFollows, currentUserId),
        hidratado: true,
        carregando: false,
        semRede: false,
      });
    } catch (e) {
      const semRede = e instanceof ApiError && (e.status === 0 || e.status >= 500);
      if (get().hidratado && semRede) {
        // Offline com cópia: segue com ela, e relê quando a rede voltar.
        set({ carregando: false, semRede: true });
        return;
      }
      set({
        carregando: false,
        erro: "Não foi possível carregar seus dados. Verifique se a API está no ar.",
      });
    }
  },

  limpar: () =>
    set({
      currentUserId: "",
      users: [],
      songs: [],
      folders: [],
      projects: [],
      hidratado: false,
      erro: null,
      semRede: false,
    }),

  loadSong: async (id) => {
    const completa = await songApi.getById(id);
    set({ songs: get().songs.map((s) => (s.id === id ? completa : s)) });

    // Traz quem ainda não estiver em cache (colaborador adicionado noutra sessão).
    const conhecidos = new Set(get().users.map((u) => u.id));
    const faltando = [completa.creatorId, ...completa.collaborators.map((c) => c.userId)].filter(
      (uid) => !conhecidos.has(uid),
    );
    if (faltando.length > 0) {
      set({ users: [...get().users, ...(await userApi.getMany(faltando))] });
    }
  },

  // ------------------------------------------------------------------ leitura

  getUser: (id) => get().users.find((u) => u.id === id),
  getSong: (id) => get().songs.find((s) => s.id === id),
  getProject: (id) => get().projects.find((p) => p.id === id),

  // ------------------------------------------------------------------ criação

  // Criar não espera o servidor: o id nasce no aparelho (UUID v7) e o pedido
  // vai para a fila. Funciona offline; o servidor aceita o id do cliente.

  createSong: async ({ title, folderId, projectId }) => {
    const id = uuidv7();
    const eu = get().currentUserId;
    // A folha pautada nasce no documento do aparelho, antes de o editor abrir.
    const { semearFolhaInicial } = await import("@/lib/folhaInicial");
    await semearFolhaInicial(id, eu);

    const nova: Song = {
      id,
      title,
      status: "ideia",
      creatorId: eu,
      collaborators: [{ userId: eu, percentage: 100 }],
      createdAt: agora(),
      updatedAt: agora(),
      folderId,
      blocks: [],
      timeSignature: "4/4",
      tags: [],
      hidden: true,
      contributionsConfirmed: false,
    };
    set({ songs: [nova, ...get().songs] });
    void enfileirar({
      metodo: "POST",
      caminho: "/songs",
      corpo: { id, title, folder_id: folderId ?? null, folha_pautada: false },
      rotulo: `a canção “${title}”`,
    });

    if (projectId) {
      set({
        projects: get().projects.map((p) => (p.id === projectId ? { ...p, songIds: [...p.songIds, id] } : p)),
      });
      void enfileirar({
        metodo: "POST",
        caminho: `/projects/${projectId}/songs`,
        corpo: { song_id: id },
        rotulo: `a faixa “${title}”`,
      });
    }
    return id;
  },

  createFolder: async (name, parentId) => {
    const id = uuidv7();
    set({ folders: [...get().folders, { id, name, parentId, ownerId: get().currentUserId }] });
    void enfileirar({
      metodo: "POST",
      caminho: "/folders",
      corpo: { id, name, parent_id: parentId ?? null },
      rotulo: `a pasta “${name}”`,
    });
    return id;
  },

  createProject: async (input) => {
    const id = uuidv7();
    const projeto: Project = {
      id,
      name: input.name,
      type: input.type,
      style: input.style,
      description: input.description ?? "",
      cover: "",
      releaseDate: input.releaseDate ?? "",
      estimatedCost: input.estimatedCost ?? 0,
      fundingGoal: input.fundingGoal ?? 0,
      fundingProgress: 0,
      status: "planejamento",
      songIds: [],
      collaboratorIds: [],
      ownerId: get().currentUserId,
    };
    set({ projects: [projeto, ...get().projects] });
    void enfileirar({
      metodo: "POST",
      caminho: "/projects",
      corpo: projectApi.corpoDeNovoProjeto(input, id),
      rotulo: `o projeto “${input.name}”`,
    });
    return id;
  },

  // ------------------------------------------------------------------ música

  updateSong: (id, patch) => {
    // Otimista: a tela reflete a mudança na hora e a gravação é adiada. Vale
    // porque o editor salva a cada tecla no título e nos metadados.
    set({ songs: get().songs.map((s) => (s.id === id ? { ...s, ...patch } : s)) });
    agendarGravacao(`song:${id}`, patch, (tudo) =>
      void enfileirar({
        metodo: "PATCH",
        caminho: `/songs/${id}`,
        corpo: patchDeMusicaParaApi(tudo),
        rotulo: `a canção “${get().getSong(id)?.title ?? ""}”`,
      }),
    );
  },

  toggleSongHidden: (songId) => {
    const musica = get().getSong(songId);
    if (!musica) return;
    get().updateSong(songId, { hidden: !musica.hidden });
  },

  deleteSong: (songId) => {
    set({
      songs: get().songs.map((s) =>
        s.id === songId ? { ...s, deletedAt: new Date().toISOString() } : s,
      ),
    });
    void enfileirar({ metodo: "DELETE", caminho: `/songs/${songId}`, rotulo: "a ida para a lixeira" });
  },

  restoreSong: (songId) => {
    set({
      songs: get().songs.map((s) => (s.id === songId ? { ...s, deletedAt: undefined } : s)),
    });
    void enfileirar({ metodo: "POST", caminho: `/songs/${songId}/restore`, rotulo: "a restauração da canção" });
  },

  permanentlyDeleteSong: (songId) => {
    set({ songs: get().songs.filter((s) => s.id !== songId) });
    void enfileirar({ metodo: "DELETE", caminho: `/songs/${songId}/permanent`, rotulo: "a exclusão da canção" });
  },

  purgeExpiredTrash: () => {
    // O expurgo é do servidor (RN08). Aqui só relemos, para que um item que o
    // job já apagou desapareça da tela.
    if (get().hidratado) void get().hydrate(get().currentUserId);
  },

  // ------------------------------------------------------------------ blocos

  definirBlocos: (songId, blocks) => {
    set({
      songs: get().songs.map((s) => {
        if (s.id !== songId) return s;
        // Abrir a canção também passa por aqui; só mudança de verdade conta
        // como edição.
        const mudou = JSON.stringify(s.blocks) !== JSON.stringify(blocks);
        return mudou ? { ...s, blocks, updatedAt: new Date().toISOString() } : s;
      }),
    });
  },

  // ----------------------------------------------------------- colaboradores

  inviteCollaborator: (songId, userId) => {
    void (async () => {
      await songApi.inviteCollaborator(songId, userId);
      await get().loadSong(songId);
    })();
  },

  removeCollaborator: (songId, userId) => {
    set({
      songs: get().songs.map((s) =>
        s.id === songId
          ? { ...s, collaborators: s.collaborators.filter((c) => c.userId !== userId) }
          : s,
      ),
    });
    void songApi.removeCollaborator(songId, userId).catch(() => void get().loadSong(songId));
  },

  confirmContributions: async (songId) => {
    const musica = get().getSong(songId);
    if (!musica) return;
    // Grava o que estiver pendente junto com a confirmação, numa chamada só.
    cancelarGravacao(`contrib:${songId}`);
    // Confirmar precisa de rede (RN05: o servidor vê a versão final de todos),
    // e o que ainda está na fila precisa chegar antes.
    if (!(await esvaziar())) throw new ApiError(0, "Sem conexão. Confirme a divisão quando a internet voltar.");
    await songApi.setContributions(songId, musica.collaborators, true);
    await get().loadSong(songId);
  },

  setContribution: (songId, userId, percentage) => {
    const musica = get().getSong(songId);
    if (!musica) return;

    const contribuicoes = musica.collaborators.map((c) =>
      c.userId === userId ? { ...c, percentage } : c,
    );
    set({
      songs: get().songs.map((s) =>
        s.id === songId ? { ...s, collaborators: contribuicoes, contributionsConfirmed: false } : s,
      ),
    });

    // Sem confirmar: enquanto a divisão está em negociação, a soma não precisa
    // fechar 100 (RN05). Confirmar é ato separado.
    agendarGravacao(`contrib:${songId}`, {}, () => {
      const atuais = get().getSong(songId)?.collaborators ?? contribuicoes;
      void enfileirar({
        metodo: "PUT",
        caminho: `/songs/${songId}/contributions`,
        corpo: {
          contributions: atuais.map((c) => ({ user_id: c.userId, percentage: c.percentage })),
          confirm: false,
        },
        rotulo: "a divisão de coautoria",
      });
    });
  },

  // ------------------------------------------------------------------ pastas

  renameFolder: (id, name) => {
    set({ folders: get().folders.map((f) => (f.id === id ? { ...f, name } : f)) });
    agendarGravacao(`folder:${id}`, { name }, (tudo) =>
      void enfileirar({ metodo: "PATCH", caminho: `/folders/${id}`, corpo: tudo, rotulo: `a pasta “${name}”` }),
    );
  },

  deleteFolder: (id) => {
    const pasta = get().folders.find((f) => f.id === id);
    // Mesmo efeito do servidor: subpastas sobem um nível, músicas ficam sem pasta.
    set({
      folders: get()
        .folders.filter((f) => f.id !== id)
        .map((f) => (f.parentId === id ? { ...f, parentId: pasta?.parentId } : f)),
      songs: get().songs.map((s) => (s.folderId === id ? { ...s, folderId: undefined } : s)),
    });
    void enfileirar({ metodo: "DELETE", caminho: `/folders/${id}`, rotulo: `a exclusão da pasta “${pasta?.name ?? ""}”` });
  },

  // ---------------------------------------------------------------- projetos

  loadProject: async (id) => {
    const completo = await projectApi.getById(id);
    set({ projects: get().projects.map((p) => (p.id === id ? completo : p)) });
  },

  updateProject: (id, patch) => {
    set({ projects: get().projects.map((p) => (p.id === id ? { ...p, ...patch } : p)) });
    agendarGravacao(`project:${id}`, patch, (tudo) =>
      void enfileirar({
        metodo: "PATCH",
        caminho: `/projects/${id}`,
        corpo: projectApi.patchDeProjeto(tudo),
        rotulo: `o projeto “${get().getProject(id)?.name ?? ""}”`,
      }),
    );
  },

  deleteProject: (id) => {
    set({ projects: get().projects.filter((p) => p.id !== id) });
    void enfileirar({ metodo: "DELETE", caminho: `/projects/${id}`, rotulo: "a ida do projeto para a lixeira" });
  },

  addSongToProject: async (projectId, songId) => {
    set({
      projects: get().projects.map((p) =>
        p.id === projectId && !p.songIds.includes(songId) ? { ...p, songIds: [...p.songIds, songId] } : p,
      ),
    });
    void enfileirar({
      metodo: "POST",
      caminho: `/projects/${projectId}/songs`,
      corpo: { song_id: songId },
      rotulo: "a faixa nova do projeto",
    });
  },

  removeSongFromProject: (projectId, songId) => {
    set({
      projects: get().projects.map((p) =>
        p.id === projectId ? { ...p, songIds: p.songIds.filter((s) => s !== songId) } : p,
      ),
    });
    void enfileirar({ metodo: "DELETE", caminho: `/projects/${projectId}/songs/${songId}`, rotulo: "a retirada da faixa" });
  },

  // ------------------------------------------------------------------ perfil

  updateCurrentUser: (patch) => {
    const id = get().currentUserId;
    set({ users: get().users.map((u) => (u.id === id ? { ...u, ...patch } : u)) });
    agendarGravacao("me", patch, (tudo) =>
      void enfileirar({ metodo: "PATCH", caminho: "/users/me", corpo: userApi.patchDeEu(tudo), rotulo: "o seu perfil" }),
    );
  },

  // ------------------------------------------- ainda sem backend (Fases 2 e 3)

  toggleFollow: (userId) => {
    const follows = userService.toggleFollow(get().follows, get().currentUserId, userId);
    set({ follows, followingIds: userService.getFollowingIds(follows, get().currentUserId) });
  },

  sendMessage: (toUserId, content) =>
    set({
      conversations: messageService.send(
        get().conversations,
        get().currentUserId,
        toUserId,
        content,
      ),
    }),

  postFeed: (content) => set({ feed: feedService.post(get().feed, get().currentUserId, content) }),
}));

// Reexportado para as telas que já o usavam a partir daqui.
export { songService };

// ------------------------------------------------------- cópia no aparelho

// Guarda o caderno no aparelho a cada mudança (com folga de 1 s), para abrir
// sem rede da próxima vez. Só depois da primeira carga: antes disso o store
// está vazio e a cópia boa seria sobrescrita.
let salvarDepois: ReturnType<typeof setTimeout> | undefined;
useCompoze.subscribe((s, antes) => {
  if (!s.hidratado || !s.currentUserId) return;
  if (s.songs === antes.songs && s.folders === antes.folders && s.projects === antes.projects && s.users === antes.users) return;
  clearTimeout(salvarDepois);
  salvarDepois = setTimeout(() => {
    const { currentUserId, songs, folders, projects, users } = useCompoze.getState();
    if (currentUserId) void salvarCopia(currentUserId, { songs, folders, projects, users });
  }, 1000);
});

// Rede de volta: a fila sobe sozinha (lib/fila.ts) e aqui relemos o servidor
// para trazer o que os outros mudaram enquanto isto estava offline.
if (typeof window !== "undefined") {
  window.addEventListener("online", () => {
    const { hidratado, currentUserId, hydrate } = useCompoze.getState();
    if (hidratado && currentUserId) void hydrate(currentUserId);
  });
}
