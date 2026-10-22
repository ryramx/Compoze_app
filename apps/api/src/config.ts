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
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Config = z.infer<typeof Ambiente>;

/** Lê e valida as variáveis de ambiente. Falha cedo, com a lista do que falta. */
export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = Ambiente.safeParse(env);
  if (!r.success) {
    const linhas = r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${linhas.join("\n")}`);
  }
  return r.data;
}
