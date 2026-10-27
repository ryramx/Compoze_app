import { z } from "zod";
import { UsuarioPublico } from "./users";
import { DataHora } from "./comum";

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

/**
 * Novidades da Mesa (ADR 0023): o que aconteceu com a pessoa, como numa
 * rede social. Não há tabela própria: cada item sai das tabelas de origem
 * (mensagens, comentários, curtidas, seguidores, convites, apoios), então
 * apagar a curtida ou o comentário tira a novidade junto.
 */
export const TipoDeNovidade = z.enum([
  /** Mensagem de alguém numa conversa (uma linha por conversa, a mais nova). */
  "MESSAGE",
  "COMMENT",
  "LIKE",
  "FOLLOW",
  /** Convite pela conta esperando resposta. */
  "INVITE",
  /** Alguém aceitou um convite que eu mandei. */
  "INVITE_ACCEPTED",
  /** Alguém diz que mandou um PIX para o meu projeto. */
  "SUPPORT",
  /** A dona do projeto confirmou que recebeu o meu PIX. */
  "SUPPORT_CONFIRMED",
]);
export type TipoDeNovidade = z.infer<typeof TipoDeNovidade>;

export const Novidade = z.object({
  /** Estável entre leituras: tipo e id de origem. */
  id: z.string(),
  kind: TipoDeNovidade,
  at: DataHora,
  unread: z.boolean(),
  /** Quem fez. Nula se a conta foi apagada. */
  actor: UsuarioPublico.nullable(),
  /** Do que se trata: título da canção, nome do projeto, começo da publicação. */
  subject: z.string().nullable(),
  /** Trecho do que foi dito: a mensagem, o comentário. */
  excerpt: z.string().nullable(),
  /** Valor do apoio, em reais. */
  amount: z.number().int().nullable(),
  /** Mensagens não lidas na conversa. */
  count: z.number().int().nullable(),
  /** Caminho do app para abrir ao tocar. */
  url: z.string(),
});
export type Novidade = z.infer<typeof Novidade>;

export const ConsultaDeNovidades = z.object({
  /** `at` do último item visto, para a página seguinte. */
  before: DataHora.optional(),
  limit: z.coerce.number().int().min(1).max(50).default(30),
});
export type ConsultaDeNovidades = z.infer<typeof ConsultaDeNovidades>;

export const PaginaDeNovidades = z.object({
  items: z.array(Novidade),
  /** Quantas novidades não lidas há ao todo (não só nesta página). */
  unread_count: z.number().int(),
  next_cursor: z.string().nullable(),
});
export type PaginaDeNovidades = z.infer<typeof PaginaDeNovidades>;
