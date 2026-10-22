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
