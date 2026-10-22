import { z } from "zod";

export const USERNAME = /^[a-z0-9_.-]{3,30}$/;

export const Cadastro = z.object({
  name: z.string().trim().min(1, "Diga como quer ser chamado.").max(120),
  username: z
    .string()
    .trim()
    .toLowerCase()
    .regex(USERNAME, "Use de 3 a 30 letras minúsculas, números, ponto, hífen ou sublinhado."),
  email: z.email("E-mail inválido.").trim().max(254),
  password: z.string().min(8, "A senha precisa de pelo menos 8 caracteres.").max(200),
});
export type Cadastro = z.infer<typeof Cadastro>;

export const Login = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
});

export const Renovar = z.object({ refresh_token: z.string().min(1) });

export const ParDeTokens = z.object({
  access_token: z.string(),
  refresh_token: z.string(),
  token_type: z.literal("bearer"),
});
export type ParDeTokens = z.infer<typeof ParDeTokens>;
