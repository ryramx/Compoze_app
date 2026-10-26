import { z } from "zod";

import { DataHora, Id } from "./comum";

/**
 * Livro-caixa do projeto (ADR 0021): o que entrou (show, cachê, dinheiro da
 * própria banda, apoio fora do PIX) e o que vai sair ou já saiu (cachê de
 * músico, estúdio, locação de espaço). Valores em reais inteiros, como o
 * resto do projeto.
 *
 * Entrada soma no `funding_current` do projeto, junto com os apoios por PIX
 * confirmados (ADR 0018). Custo não mexe no arrecadado: a soma dos custos
 * aparece ao lado do custo estimado.
 */

export const TipoDeLancamento = z.enum(["ENTRADA", "CUSTO"]);
export type TipoDeLancamento = z.infer<typeof TipoDeLancamento>;

/** Sugestões de categoria; o campo aceita qualquer texto curto. */
export const CATEGORIAS_DE_CUSTO = ["Cachê", "Estúdio", "Locação de espaço", "Mixagem", "Masterização", "Divulgação", "Transporte"] as const;
export const CATEGORIAS_DE_ENTRADA = ["Show", "Venda", "Edital", "Dinheiro próprio", "Apoio"] as const;

export const LANCAMENTO_MAX = 1_000_000;

export const Lancamento = z.object({
  id: Id,
  project_id: Id,
  kind: TipoDeLancamento,
  description: z.string(),
  category: z.string().nullable(),
  amount: z.number().int(),
  occurred_on: z.iso.date().nullable(),
  created_at: DataHora,
  updated_at: DataHora,
});
export type Lancamento = z.infer<typeof Lancamento>;

export const NovoLancamento = z.object({
  id: Id.optional(),
  kind: TipoDeLancamento,
  description: z.string().trim().min(1).max(160),
  category: z.string().trim().max(60).nullable().optional(),
  amount: z.number().int().min(1).max(LANCAMENTO_MAX),
  occurred_on: z.iso.date().nullable().optional(),
});
export type NovoLancamento = z.input<typeof NovoLancamento>;

export const AtualizarLancamento = NovoLancamento.omit({ id: true, kind: true }).partial();
export type AtualizarLancamento = z.infer<typeof AtualizarLancamento>;
