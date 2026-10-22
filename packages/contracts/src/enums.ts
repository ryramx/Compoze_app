import { z } from "zod";

// Valores exatamente como trafegam (MAIÚSCULAS). O banco cria seus enums a
// partir destas mesmas listas (packages/db), então API e Postgres não divergem.

export const STATUS_DA_CANCAO = [
  "IDEIA",
  "ESCRITA",
  "REVISAO",
  "FINALIZADA",
  "REGISTRADA",
  "GRAVADA",
  "ARQUIVADA",
  "CANCELADA",
] as const;
export const VISIBILIDADES = ["PUBLIC", "PRIVATE", "UNLISTED"] as const;
export const TIPOS_DE_BLOCO = ["SECTION", "LYRIC", "CHORD", "NOTE"] as const;
export const PAPEIS_DE_COLABORADOR = ["OWNER", "COMPOSER", "LYRICIST", "MUSICIAN", "PRODUCER", "VIEWER"] as const;
export const TIPOS_DE_PROJETO = ["SINGLE", "EP", "ALBUM", "OTHER"] as const;
export const FASES_DE_PROJETO = ["PLANEJAMENTO", "PRODUCAO", "MIXAGEM", "LANCADO"] as const;
export const ESTILOS_DE_PROJETO = ["ACUSTICO", "BANDA", "AO_VIVO"] as const;

export const StatusDaCancao = z.enum(STATUS_DA_CANCAO);
export const Visibilidade = z.enum(VISIBILIDADES);
export const TipoDeBloco = z.enum(TIPOS_DE_BLOCO);
export const PapelDeColaborador = z.enum(PAPEIS_DE_COLABORADOR);
export const TipoDeProjeto = z.enum(TIPOS_DE_PROJETO);
export const FaseDeProjeto = z.enum(FASES_DE_PROJETO);
export const EstiloDeProjeto = z.enum(ESTILOS_DE_PROJETO);

export type StatusDaCancao = z.infer<typeof StatusDaCancao>;
export type Visibilidade = z.infer<typeof Visibilidade>;
export type TipoDeBloco = z.infer<typeof TipoDeBloco>;
export type PapelDeColaborador = z.infer<typeof PapelDeColaborador>;
export type TipoDeProjeto = z.infer<typeof TipoDeProjeto>;
export type FaseDeProjeto = z.infer<typeof FaseDeProjeto>;
export type EstiloDeProjeto = z.infer<typeof EstiloDeProjeto>;
