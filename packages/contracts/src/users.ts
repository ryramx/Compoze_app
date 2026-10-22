import { z } from "zod";

import { DataHora, Id } from "./comum";

const lista = z.array(z.string().trim().min(1).max(80)).max(30);

export const UsuarioPublico = z.object({
  id: Id,
  name: z.string(),
  username: z.string(),
  bio: z.string().nullable(),
  avatar_url: z.string().nullable(),
  city: z.string().nullable(),
  state: z.string().nullable(),
  country: z.string().nullable(),
  instruments: z.array(z.string()),
  specialties: z.array(z.string()),
  genres: z.array(z.string()),
  external_links: z.array(z.string()),
  created_at: DataHora,
});
export type UsuarioPublico = z.infer<typeof UsuarioPublico>;

export const UsuarioEu = UsuarioPublico.extend({
  email: z.string(),
  show_on_map: z.boolean(),
  latitude: z.number().nullable(),
  longitude: z.number().nullable(),
});
export type UsuarioEu = z.infer<typeof UsuarioEu>;

export const UsuarioNoMapa = UsuarioPublico.extend({ latitude: z.number(), longitude: z.number() });

const textoOpcional = (max: number) => z.string().trim().max(max).nullable().optional();

export const AtualizarEu = z
  .object({
    name: z.string().trim().min(1).max(120).optional(),
    bio: textoOpcional(2000),
    avatar_url: z.url().max(2000).nullable().optional(),
    city: textoOpcional(120),
    state: textoOpcional(120),
    country: textoOpcional(120),
    latitude: z.number().min(-90).max(90).nullable().optional(),
    longitude: z.number().min(-180).max(180).nullable().optional(),
    show_on_map: z.boolean().optional(),
    instruments: lista.optional(),
    specialties: lista.optional(),
    genres: lista.optional(),
    external_links: z.array(z.url().max(2000)).max(20).optional(),
  })
  .refine((v) => (v.latitude === undefined) === (v.longitude === undefined), {
    message: "Latitude e longitude vão juntas.",
    path: ["latitude"],
  });
export type AtualizarEu = z.infer<typeof AtualizarEu>;
