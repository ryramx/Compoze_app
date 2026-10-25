import { z } from "zod";

/**
 * Avisos fora do app, por push (ADR 0016). O navegador inscreve o aparelho
 * com a chave pública do servidor e manda a inscrição para a API.
 */

export const ChaveDoPush = z.object({
  key: z.string(),
  /** O servidor tem a conta do Firebase: o app Android pode se inscrever. */
  fcm: z.boolean(),
});
export type ChaveDoPush = z.infer<typeof ChaveDoPush>;

/** Navegador e PWA: o que `PushManager.subscribe()` devolve, em JSON. */
export const InscricaoWebPush = z.object({
  endpoint: z.url({ protocol: /^https$/ }).max(2000),
  keys: z.object({ p256dh: z.string().min(1).max(200), auth: z.string().min(1).max(100) }),
});

/** App Android: o token que o Firebase dá ao aparelho. */
export const InscricaoFcm = z.object({ fcm_token: z.string().min(1).max(4096) });

export const InscricaoPush = z.union([InscricaoWebPush, InscricaoFcm]);
export type InscricaoPush = z.infer<typeof InscricaoPush>;

/** `endpoint` do navegador ou o token do Firebase. */
export const CancelarInscricao = z.object({ endpoint: z.string().max(4096) });

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
