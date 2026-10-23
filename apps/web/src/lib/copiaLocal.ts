import { del, get, set } from "idb-keyval";
import type { Folder, Project, Song, User } from "@/types";

/**
 * Cópia do caderno no aparelho (ADR 0008): canções (com lixeira), pastas,
 * projetos e as pessoas citadas, como o store as tinha da última vez. Abre o
 * app na hora, mesmo sem rede; com rede, a leitura do servidor substitui.
 */
export interface Copia {
  songs: Song[];
  folders: Folder[];
  projects: Project[];
  users: User[];
  salvaEm: string;
}

const chave = (usuarioId: string) => `compoze:caderno:${usuarioId}`;

export async function lerCopia(usuarioId: string): Promise<Copia | undefined> {
  try {
    return await get<Copia>(chave(usuarioId));
  } catch {
    return undefined;
  }
}

export async function salvarCopia(usuarioId: string, c: Omit<Copia, "salvaEm">): Promise<void> {
  try {
    await set(chave(usuarioId), { ...c, salvaEm: new Date().toISOString() });
  } catch {
    // Sem IndexedDB o app segue, só não abre offline.
  }
}

export async function apagarCopia(usuarioId: string): Promise<void> {
  try {
    await del(chave(usuarioId));
  } catch {
    // nada a apagar
  }
}
