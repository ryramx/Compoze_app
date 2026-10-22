import { z } from "zod";

import { DataHora, Id } from "./comum";
import { EstiloDeProjeto, FaseDeProjeto, TipoDeProjeto } from "./enums";

export const Projeto = z.object({
  id: Id,
  name: z.string(),
  description: z.string().nullable(),
  type: TipoDeProjeto,
  status: FaseDeProjeto,
  style: EstiloDeProjeto.nullable(),
  release_date: z.iso.date().nullable(),
  cover_url: z.string().nullable(),
  estimated_cost: z.number().int().nullable(),
  funding_target: z.number().int().nullable(),
  funding_current: z.number().int(),
  owner_id: Id,
  deleted_at: DataHora.nullable(),
  created_at: DataHora,
  updated_at: DataHora,
});
export type Projeto = z.infer<typeof Projeto>;

export const DetalheDoProjeto = Projeto.extend({
  songs: z.array(z.object({ song_id: Id, track_number: z.number().int().nullable() })),
});
export type DetalheDoProjeto = z.infer<typeof DetalheDoProjeto>;

const reais = z.number().int().min(0).max(1_000_000_000);

export const NovoProjeto = z.object({
  id: Id.optional(),
  name: z.string().trim().min(1).max(160),
  type: TipoDeProjeto.optional(),
  style: EstiloDeProjeto.nullable().optional(),
  description: z.string().max(5000).nullable().optional(),
  release_date: z.iso.date().nullable().optional(),
  estimated_cost: reais.nullable().optional(),
  funding_target: reais.nullable().optional(),
});

export const AtualizarProjeto = NovoProjeto.omit({ id: true })
  .partial()
  .extend({ status: FaseDeProjeto.optional() });
export type AtualizarProjeto = z.infer<typeof AtualizarProjeto>;

export const NovaFaixa = z.object({
  song_id: Id,
  track_number: z.number().int().min(1).max(999).optional(),
});
