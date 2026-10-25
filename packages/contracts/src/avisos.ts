import { z } from "zod";

/**
 * Avisos fora do app, por push (ADR 0016). O navegador inscreve o aparelho
 * com a chave pública do servidor e manda a inscrição para a API.
 */

export const ChaveDoPush = z.object({ key: z.string() });
export type ChaveDoPush = z.infer<typeof ChaveDoPush>;

/** O que `PushManager.subscribe()` devolve, em JSON. */
export const InscricaoPush = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});
export type InscricaoPush = z.infer<typeof InscricaoPush>;

export const CancelarInscricao = z.object({ endpoint: z.string().max(2000) });

/** O que chega ao service worker no evento `push`. */
export const Aviso = z.object({
  title: z.string(),
  body: z.string(),
  /** Caminho do app para abrir ao tocar no aviso. */
  url: z.string(),
  /** Avisos com a mesma tag se substituem (uma conversa, um aviso). */
  tag: z.string(),
});
export type Aviso = z.infer<typeof Aviso>;
