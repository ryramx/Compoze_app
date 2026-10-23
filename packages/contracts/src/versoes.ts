import { z } from "zod";

import { DataHora, Id } from "./comum";
import { MotivoDaVersao, PapelDeColaborador, StatusDaCancao, TipoDeBloco } from "./enums";

/**
 * Versões de uma canção (ADR 0009): retratos imutáveis, encadeados por hash.
 *
 * O retrato guarda o que a canção era naquele momento, com os nomes de quem
 * escreveu (não só ids): a prova continua legível mesmo que alguém mude de
 * nome ou apague a conta depois.
 */
export const RetratoDaCancao = z.object({
  formato: z.literal(1),
  song_id: Id,
  title: z.string(),
  status: StatusDaCancao,
  musical_key: z.string().nullable(),
  bpm: z.number().int().nullable(),
  time_signature: z.string().nullable(),
  tags: z.array(z.string()),
  description: z.string().nullable(),
  blocks: z.array(
    z.object({
      id: z.string(),
      type: TipoDeBloco,
      label: z.string().nullable(),
      content: z.string(),
      author_id: Id.nullable(),
    }),
  ),
  collaborators: z.array(
    z.object({
      user_id: Id,
      name: z.string(),
      username: z.string(),
      role: PapelDeColaborador,
      contribution_percent: z.number().nullable(),
    }),
  ),
  contributions_confirmed: z.boolean(),
});
export type RetratoDaCancao = z.infer<typeof RetratoDaCancao>;

export const ResumoDaVersao = z.object({
  id: Id,
  song_id: Id,
  number: z.number().int(),
  reason: MotivoDaVersao,
  label: z.string().nullable(),
  title: z.string(),
  sha256: z.string(),
  previous_sha256: z.string().nullable(),
  created_by: Id.nullable(),
  created_at: DataHora,
});
export type ResumoDaVersao = z.infer<typeof ResumoDaVersao>;

export const Versao = ResumoDaVersao.extend({ snapshot: RetratoDaCancao });
export type Versao = z.infer<typeof Versao>;

export const NovaVersao = z.object({
  label: z.string().trim().min(1).max(80).nullable().optional(),
});
export type NovaVersao = z.input<typeof NovaVersao>;
