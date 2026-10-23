import { z } from "zod";

const Ambiente = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  HOST: z.string().default("0.0.0.0"),
  PORT: z.coerce.number().int().positive().default(3333),
  DATABASE_URL: z.url({ protocol: /^postgres(ql)?$/ }),
  CORS_ORIGINS: z
    .string()
    .default("http://localhost:5173")
    .transform((s) => s.split(",").map((o) => o.trim()).filter(Boolean)),
  // Assina os access tokens (HS256). Em produção vem do Render (generateValue).
  JWT_SECRET: z.string().min(32, "Use pelo menos 32 caracteres."),
  ACCESS_TOKEN_MINUTOS: z.coerce.number().int().positive().default(30),
  LIMITE_AUTH_POR_MINUTO: z.coerce.number().int().positive().default(10),
  REFRESH_TOKEN_DIAS: z.coerce.number().int().positive().default(30),
  // Liga o job diário de expurgo da lixeira (RN08). Desligado nos testes.
  JOBS: z
    .enum(["on", "off"])
    .default("on")
    .transform((v) => v === "on"),
  // E-mail dos convites (ADR 0010). Sem a chave, o e-mail fica desligado e o
  // convite sai só como link. A chave vem do painel do Render, nunca do repo.
  RESEND_API_KEY: z.string().min(1).optional(),
  // Sem domínio próprio verificado, o Resend só aceita este remetente de teste
  // (e só entrega para o e-mail da própria conta).
  EMAIL_FROM: z.string().default("Compoze <onboarding@resend.dev>"),
  // Endereço do front, para montar os links dos e-mails. Sem ele, vale a
  // primeira origem de CORS_ORIGINS.
  WEB_URL: z.url().optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Config = Omit<z.infer<typeof Ambiente>, "WEB_URL"> & { WEB_URL: string };

/** Lê e valida as variáveis de ambiente. Falha cedo, com a lista do que falta. */
export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = Ambiente.safeParse(env);
  if (!r.success) {
    const linhas = r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${linhas.join("\n")}`);
  }
  return { ...r.data, WEB_URL: (r.data.WEB_URL ?? r.data.CORS_ORIGINS[0] ?? "").replace(/\/$/, "") };
}
