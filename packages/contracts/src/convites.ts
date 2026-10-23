import { z } from "zod";

import { DataHora, Id } from "./comum";
import { PapelDeColaborador } from "./enums";

/**
 * Convites para escrever numa canção (ADR 0010).
 *
 * `USUARIO`: para uma conta do Compoze, que aceita ou recusa no app.
 * `LINK`: para qualquer pessoa, com ou sem conta; o link vale uma vez.
 */
export const TIPOS_DE_CONVITE = ["USUARIO", "LINK"] as const;
export const TipoDeConvite = z.enum(TIPOS_DE_CONVITE);

const PapelConvidavel = PapelDeColaborador.exclude(["OWNER"]);

export const NovoConvite = z.union([
  z.object({ user_id: Id, role: PapelConvidavel.default("COMPOSER") }),
  z.object({
    link: z.literal(true),
    role: PapelConvidavel.default("COMPOSER"),
    /** Manda o link por e-mail também, se o servidor tiver e-mail ligado. */
    email: z.email().max(254).optional(),
  }),
]);
export type NovoConvite = z.input<typeof NovoConvite>;

/** Convite aberto, como a dona da canção vê. */
export const Convite = z.object({
  id: Id,
  song_id: Id,
  kind: TipoDeConvite,
  role: PapelDeColaborador,
  invited_user_id: Id.nullable(),
  email: z.string().nullable(),
  invited_by: Id.nullable(),
  created_at: DataHora,
  expires_at: DataHora,
});
export type Convite = z.infer<typeof Convite>;

/**
 * Resposta da criação. `token` só existe em convite por link e só aparece
 * aqui: o servidor guarda o hash, então não há como mostrar o link de novo.
 */
export const ConviteCriado = Convite.extend({
  token: z.string().nullable(),
  emailed: z.boolean(),
});
export type ConviteCriado = z.infer<typeof ConviteCriado>;

export const ConvitesDaCancao = z.object({
  /** Se o servidor manda e-mail (há remetente configurado). */
  email_enabled: z.boolean(),
  invites: z.array(Convite),
});
export type ConvitesDaCancao = z.infer<typeof ConvitesDaCancao>;

/** Convite visto por quem foi convidada: o bastante para decidir. */
export const ConviteRecebido = z.object({
  id: Id,
  kind: TipoDeConvite,
  song_id: Id,
  song_title: z.string(),
  role: PapelDeColaborador,
  invited_by: z.object({ id: Id, name: z.string(), username: z.string() }).nullable(),
  created_at: DataHora,
  expires_at: DataHora,
  /** A pessoa já escreve nesta canção (aceitar não muda nada). */
  already_member: z.boolean(),
});
export type ConviteRecebido = z.infer<typeof ConviteRecebido>;

/** `?q=` de `GET /users`: nome ou @. */
export const BuscaDePessoas = z.string().trim().min(1).max(60);
