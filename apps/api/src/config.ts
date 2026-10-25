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
  // Ou por SMTP (ADR 0017): o Gmail da pessoa, com uma senha de app, sem
  // precisar de domínio. Usuário e senha entram só pelo painel do Render.
  SMTP_HOST: z.string().default("smtp.gmail.com"),
  SMTP_PORT: z.coerce.number().int().positive().default(465),
  SMTP_USER: z.string().min(1).optional(),
  SMTP_PASS: z.string().min(1).optional(),
  // Remetente. Sem ele: "Compoze <SMTP_USER>" no SMTP; no Resend sem domínio
  // verificado, o remetente de teste (que só entrega para a própria conta).
  EMAIL_FROM: z.string().optional(),
  // Endereço do front, para montar os links dos e-mails. Sem ele, vale a
  // primeira origem de CORS_ORIGINS.
  WEB_URL: z.url().optional(),
  // Push no app Android (ADR 0016): o JSON da conta de serviço do Firebase,
  // inteiro. Sem ele, o push sai só para navegador e PWA.
  FIREBASE_SERVICE_ACCOUNT: z
    .string()
    .min(1)
    .transform((s, ctx) => {
      try {
        return JSON.parse(s) as unknown;
      } catch {
        ctx.addIssue({ code: "custom", message: "Não é um JSON válido." });
        return z.NEVER;
      }
    })
    .pipe(z.object({ project_id: z.string().min(1), client_email: z.string().min(1), private_key: z.string().min(1) }))
    .optional(),
  LOG_LEVEL: z.enum(["fatal", "error", "warn", "info", "debug", "trace", "silent"]).default("info"),
});

export type Config = Omit<z.infer<typeof Ambiente>, "WEB_URL" | "EMAIL_FROM"> & { WEB_URL: string; EMAIL_FROM: string };

/** Lê e valida as variáveis de ambiente. Falha cedo, com a lista do que falta. */
export function lerConfig(env: NodeJS.ProcessEnv = process.env): Config {
  const r = Ambiente.safeParse(env);
  if (!r.success) {
    const linhas = r.error.issues.map((i) => `  ${i.path.join(".")}: ${i.message}`);
    throw new Error(`Configuração inválida:\n${linhas.join("\n")}`);
  }
  const d = r.data;
  const de = d.EMAIL_FROM ?? (d.SMTP_USER && !d.RESEND_API_KEY ? `Compoze <${d.SMTP_USER}>` : "Compoze <onboarding@resend.dev>");
  return { ...d, EMAIL_FROM: de, WEB_URL: (d.WEB_URL ?? d.CORS_ORIGINS[0] ?? "").replace(/\/$/, "") };
}
