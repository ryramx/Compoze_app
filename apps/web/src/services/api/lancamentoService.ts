import { api } from "@/lib/api";
import { uuidv7 } from "@/lib/uuidv7";
import type { ApiEntry, ApiEntryPatch, ApiNewEntry } from "@/services/api/dto";

/**
 * Entradas e custos do projeto (ADR 0021). Como o apoio por PIX, pede rede:
 * a entrada muda o arrecadado no servidor, e a tela relê o projeto depois.
 */

export const listar = (projetoId: string) => api.get<ApiEntry[]>(`/projects/${projetoId}/entries`);

/** Com id do aparelho: repetir o envio (rede ruim) não lança duas vezes. */
export const lancar = (projetoId: string, corpo: Omit<ApiNewEntry, "id">) =>
  api.post<ApiEntry>(`/projects/${projetoId}/entries`, { id: uuidv7(), ...corpo });

export const corrigir = (projetoId: string, id: string, corpo: ApiEntryPatch) =>
  api.patch<ApiEntry>(`/projects/${projetoId}/entries/${id}`, corpo);

export const apagar = (projetoId: string, id: string) => api.delete(`/projects/${projetoId}/entries/${id}`);
