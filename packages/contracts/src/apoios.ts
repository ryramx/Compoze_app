import { z } from "zod";

import { DataHora, Id } from "./comum";
import { UsuarioPublico } from "./users";

/**
 * Apoio a projeto por PIX (Fase 4d, ADR 0018): a dona cadastra a chave, quem
 * apoia recebe um QR Code com o valor, paga pelo banco e avisa; a dona
 * confere no extrato e confirma. Só os confirmados contam no arrecadado.
 */

export const TipoDeChavePix = z.enum(["CPF", "CNPJ", "PHONE", "EMAIL", "EVP"]);
export type TipoDeChavePix = z.infer<typeof TipoDeChavePix>;

const soDigitos = (s: string) => s.replace(/\D/g, "");

/**
 * A chave no formato que o PIX espera: CPF e CNPJ só com dígitos, celular
 * com +55, e-mail em minúsculas, chave aleatória em minúsculas com hífens.
 * Devolve null se não for uma chave válida daquele tipo.
 */
export function normalizarChavePix(tipo: TipoDeChavePix, bruta: string): string | null {
  const t = bruta.trim();
  switch (tipo) {
    case "CPF": {
      const d = soDigitos(t);
      return d.length === 11 ? d : null;
    }
    case "CNPJ": {
      const d = soDigitos(t);
      return d.length === 14 ? d : null;
    }
    case "PHONE": {
      let d = soDigitos(t);
      if (d.length === 13 && d.startsWith("55")) d = d.slice(2);
      // DDD + 8 ou 9 dígitos.
      return d.length === 10 || d.length === 11 ? `+55${d}` : null;
    }
    case "EMAIL": {
      const e = t.toLowerCase();
      return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(e) && e.length <= 77 ? e : null;
    }
    case "EVP": {
      const e = t.toLowerCase();
      return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/.test(e) ? e : null;
    }
  }
}

export const PixDoProjeto = z.object({
  key_type: TipoDeChavePix,
  key: z.string(),
  receiver_name: z.string(),
  city: z.string(),
  open: z.boolean(),
});
export type PixDoProjeto = z.infer<typeof PixDoProjeto>;

export const NovoPixDoProjeto = z
  .object({
    key_type: TipoDeChavePix,
    key: z.string().max(100),
    receiver_name: z.string().trim().min(1).max(25),
    city: z.string().trim().min(1).max(15),
    open: z.boolean().default(true),
  })
  .refine((p) => normalizarChavePix(p.key_type, p.key) !== null, { message: "Chave PIX inválida para esse tipo.", path: ["key"] });
export type NovoPixDoProjeto = z.input<typeof NovoPixDoProjeto>;

export const StatusDoApoio = z.enum(["PENDENTE", "CONFIRMADO", "RECUSADO"]);

export const Apoio = z.object({
  id: Id,
  project_id: Id,
  supporter_id: Id.nullable(),
  amount: z.number().int(),
  txid: z.string(),
  status: StatusDoApoio,
  paid_claimed_at: DataHora.nullable(),
  decided_at: DataHora.nullable(),
  created_at: DataHora,
});
export type Apoio = z.infer<typeof Apoio>;

/** Valor de um apoio, em reais inteiros. */
export const APOIO_MAX = 100_000;
export const NovoApoio = z.object({ id: Id.optional(), amount: z.number().int().min(1).max(APOIO_MAX) });

/** Um apoio recém-criado e o "PIX copia e cola" para pagar. */
export const ApoioComPix = z.object({ contribution: Apoio, pix_code: z.string() });
export type ApoioComPix = z.infer<typeof ApoioComPix>;

/** O que quem vai apoiar vê do projeto: nada da ficha interna, nem a chave. */
export const ProjetoParaApoiar = z.object({
  id: Id,
  name: z.string(),
  description: z.string().nullable(),
  cover_url: z.string().nullable(),
  type: z.string(),
  owner: UsuarioPublico,
  funding_target: z.number().int().nullable(),
  funding_current: z.number().int(),
  receiver_name: z.string(),
  supporters: z.number().int(),
});
export type ProjetoParaApoiar = z.infer<typeof ProjetoParaApoiar>;

/** Para a dona: o apoio com quem apoiou. */
export const ApoioRecebido = Apoio.extend({ supporter: UsuarioPublico.nullable() });
export type ApoioRecebido = z.infer<typeof ApoioRecebido>;
