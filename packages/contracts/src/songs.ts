import { z } from "zod";

import { DataHora, Id } from "./comum";
import { PapelDeColaborador, StatusDaCancao, TipoDeBloco, Visibilidade } from "./enums";

export const Bloco = z.object({
  id: Id,
  type: TipoDeBloco,
  label: z.string().nullable(),
  content: z.string(),
  position: z.number().int(),
  author_id: Id.nullable(),
  created_at: DataHora,
  updated_at: DataHora,
});
export type Bloco = z.infer<typeof Bloco>;

export const Colaborador = z.object({
  id: Id,
  user_id: Id,
  role: PapelDeColaborador,
  contribution_percent: z.number().nullable(),
});
export type Colaborador = z.infer<typeof Colaborador>;

export const ResumoDaCancao = z.object({
  id: Id,
  title: z.string(),
  status: StatusDaCancao,
  visibility: Visibilidade,
  owner_id: Id,
  folder_id: Id.nullable(),
  musical_key: z.string().nullable(),
  bpm: z.number().int().nullable(),
  time_signature: z.string().nullable(),
  tags: z.array(z.string()),
  contributions_confirmed: z.boolean(),
  deleted_at: DataHora.nullable(),
  created_at: DataHora,
  updated_at: DataHora,
});
export type ResumoDaCancao = z.infer<typeof ResumoDaCancao>;

export const DetalheDaCancao = ResumoDaCancao.extend({
  description: z.string().nullable(),
  blocks: z.array(Bloco),
  collaborators: z.array(Colaborador),
});
export type DetalheDaCancao = z.infer<typeof DetalheDaCancao>;

export const ItemDaLixeira = ResumoDaCancao.extend({ days_remaining: z.number().int() });
export type ItemDaLixeira = z.infer<typeof ItemDaLixeira>;

export const FiltroDeCancoes = z.object({
  q: z.string().trim().max(200).optional(),
  status: StatusDaCancao.optional(),
  folder_id: Id.optional(),
  // `expand=blocks,collaborators` devolve cada canção completa, numa ida só.
  expand: z
    .string()
    .transform((s) => s.split(",").map((x) => x.trim()))
    .pipe(z.array(z.enum(["blocks", "collaborators"])))
    .optional(),
});

/**
 * `id` opcional: o aparelho pode criar offline com o id definitivo (ADR 0005).
 *
 * `folha_pautada: false` cria a canção sem blocos. O app usa isso porque monta
 * a folha inicial no próprio documento Yjs, inclusive offline (ADR 0008): se o
 * servidor também criasse blocos, os dois apareceriam juntos.
 */
export const NovaCancao = z.object({
  id: Id.optional(),
  title: z.string().trim().min(1).max(200),
  folder_id: Id.nullable().optional(),
  folha_pautada: z.boolean().default(true),
});
export type NovaCancao = z.input<typeof NovaCancao>;

export const AtualizarCancao = z.object({
  title: z.string().trim().min(1).max(200).optional(),
  status: StatusDaCancao.optional(),
  folder_id: Id.nullable().optional(),
  musical_key: z.string().trim().max(12).nullable().optional(),
  bpm: z.number().int().min(20).max(300).nullable().optional(),
  time_signature: z.string().trim().max(8).nullable().optional(),
  tags: z.array(z.string().trim().min(1).max(40)).max(30).optional(),
  visibility: Visibilidade.optional(),
  description: z.string().max(5000).nullable().optional(),
});
export type AtualizarCancao = z.infer<typeof AtualizarCancao>;

export const NovoBloco = z.object({
  id: Id.optional(),
  type: TipoDeBloco,
  content: z.string().max(20_000).default(""),
  label: z.string().trim().max(80).nullable().optional(),
  position: z.number().int().min(0).optional(),
});
export type NovoBloco = z.input<typeof NovoBloco>;

export const AtualizarBloco = z.object({
  content: z.string().max(20_000).optional(),
  label: z.string().trim().max(80).nullable().optional(),
  type: TipoDeBloco.optional(),
});
export type AtualizarBloco = z.input<typeof AtualizarBloco>;

export const DivisaoDeCoautoria = z.object({
  contributions: z
    .array(z.object({ user_id: Id, percentage: z.number().min(0).max(100) }))
    .max(50),
  confirm: z.boolean().default(false),
});
export type DivisaoDeCoautoria = z.input<typeof DivisaoDeCoautoria>;
