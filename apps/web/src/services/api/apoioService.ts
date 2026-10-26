import type { Apoio, ApoioComPix, ApoioRecebido, NovoPixDoProjeto, PixDoProjeto, ProjetoParaApoiar } from "@compoze/contracts/apoios";

import { api } from "@/lib/api";
import { uuidv7 } from "@/lib/uuidv7";

/** Apoio por PIX (Fase 4d, ADR 0018). Pede rede, como o lado social. */

export const pix = (projetoId: string) => api.get<PixDoProjeto | null>(`/projects/${projetoId}/pix`);
export const definirPix = (projetoId: string, d: NovoPixDoProjeto) => api.put<PixDoProjeto>(`/projects/${projetoId}/pix`, d);
export const removerPix = (projetoId: string) => api.delete<void>(`/projects/${projetoId}/pix`);
export const recebidos = (projetoId: string) => api.get<ApoioRecebido[]>(`/projects/${projetoId}/contributions`);
export const confirmar = (projetoId: string, apoioId: string) =>
  api.post<ApoioRecebido>(`/projects/${projetoId}/contributions/${apoioId}/confirm`);
export const recusar = (projetoId: string, apoioId: string) =>
  api.post<ApoioRecebido>(`/projects/${projetoId}/contributions/${apoioId}/refuse`);

export const paraApoiar = (projetoId: string) => api.get<ProjetoParaApoiar>(`/support/${projetoId}`);
export const meus = (projetoId: string) => api.get<Apoio[]>(`/support/${projetoId}/contributions`);
/** O id sai daqui: tocar duas vezes em "Gerar PIX" não cria dois apoios. */
export const apoiar = (projetoId: string, valor: number, id = uuidv7()) =>
  api.post<ApoioComPix>(`/support/${projetoId}/contributions`, { id, amount: valor });
export const avisarPago = (projetoId: string, apoioId: string) =>
  api.post<Apoio>(`/support/${projetoId}/contributions/${apoioId}/paid`);
