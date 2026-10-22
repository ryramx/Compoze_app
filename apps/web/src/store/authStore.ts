import { create } from "zustand";

import * as authService from "@/services/api/authService";
import type { DadosCadastro } from "@/services/api/authService";
import { useCompoze } from "@/store/compozeStore";
import type { User } from "@/types";

type Estado = {
  /** Usuário autenticado, ou null. */
  user: User | null;
  /**
   * `true` apenas enquanto a tentativa de restaurar a sessão está em curso.
   * As rotas protegidas precisam distinguir "ainda não sei" de "não está
   * logado" — sem isso, quem recarrega a página é chutado para o login por um
   * instante antes da sessão voltar.
   */
  carregando: boolean;
};

type Acoes = {
  restaurarSessao: () => Promise<void>;
  login: (email: string, senha: string) => Promise<void>;
  register: (dados: DadosCadastro) => Promise<void>;
  logout: () => void;
  atualizarUsuario: (user: User) => void;
};

export const useAuth = create<Estado & Acoes>((set) => ({
  user: null,
  carregando: true,

  restaurarSessao: async () => {
    set({ carregando: true });
    const user = await authService.restaurarSessao();
    set({ user, carregando: false });
  },

  login: async (email, senha) => {
    set({ user: await authService.login(email, senha), carregando: false });
  },

  register: async (dados) => {
    set({ user: await authService.register(dados), carregando: false });
  },

  logout: () => {
    authService.logout();
    // Limpa também os dados carregados: sem isto, entrar com outra conta em
    // seguida mostraria as músicas da anterior até a nova carga terminar.
    useCompoze.getState().limpar();
    set({ user: null, carregando: false });
  },

  atualizarUsuario: (user) => set({ user }),
}));
