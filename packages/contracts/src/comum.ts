import { z } from "zod";

/**
 * Contrato da API do Compoze, compartilhado entre `apps/api` (valida e
 * serializa) e `apps/web` (tipa o cliente). A referência humana é
 * docs/backend/contrato-da-api.md; este pacote é a versão executável dela.
 */

/** Ids são UUID v7: gerados pelo Postgres 18 ou pelo aparelho, offline (ADR 0005). */
export const Id = z.uuid({ version: "v7" });

export const DataHora = z.iso.datetime({ offset: true });

/** Corpo de erro: sempre `detail`, em português, legível por quem usa o app. */
export const Erro = z.object({
  detail: z.union([
    z.string(),
    z.array(z.object({ campo: z.string(), mensagem: z.string() })),
  ]),
});
export type Erro = z.infer<typeof Erro>;

export const Saude = z.object({
  status: z.enum(["ok", "degradado"]),
  versao: z.string(),
  banco: z.object({
    ok: z.boolean(),
    versao: z.string().nullable(),
    latencia_ms: z.number().nullable(),
  }),
});
export type Saude = z.infer<typeof Saude>;
