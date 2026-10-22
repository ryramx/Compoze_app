import { z } from "zod";

import { DataHora, Id } from "./comum";

export const Pasta = z.object({
  id: Id,
  name: z.string(),
  parent_id: Id.nullable(),
  owner_id: Id,
  created_at: DataHora,
  updated_at: DataHora,
});
export type Pasta = z.infer<typeof Pasta>;

export const NovaPasta = z.object({
  id: Id.optional(),
  name: z.string().trim().min(1).max(120),
  parent_id: Id.nullable().optional(),
});

export const AtualizarPasta = z.object({
  name: z.string().trim().min(1).max(120).optional(),
  parent_id: Id.nullable().optional(),
});
