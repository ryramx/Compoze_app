import { conectar } from "@compoze/db";
import { migrar } from "@compoze/db/migrar";

import { construirApp } from "./app";
import { lerConfig } from "./config";
import { agendarExpurgo } from "./modules/lixeira/expurgo";

const config = lerConfig();
const banco = conectar(config.DATABASE_URL);

// Migrações rodam na subida: o deploy fica num passo só e o banco nunca
// fica atrás do código.
await migrar(config.DATABASE_URL);

const app = await construirApp({
  config,
  banco,
  logger:
    config.NODE_ENV === "development"
      ? { level: config.LOG_LEVEL, transport: { target: "pino-pretty", options: { translateTime: "HH:MM:ss" } } }
      : { level: config.LOG_LEVEL },
});

const jobs = config.JOBS ? await agendarExpurgo(config.DATABASE_URL, banco.db, app.log) : null;
// Com a fila no ar, e-mail vira job do pg-boss (tenta de novo se o Resend falhar).
if (jobs) await app.carteiro.usarFila(jobs);
app.log.info({ email: app.carteiro.habilitado }, app.carteiro.habilitado ? "e-mail ligado (Resend)" : "e-mail desligado: convites só por link");

for (const sinal of ["SIGINT", "SIGTERM"] as const) {
  process.once(sinal, async () => {
    app.log.info({ sinal }, "encerrando");
    await app.close();
    await jobs?.stop();
    await banco.fechar();
    process.exit(0);
  });
}

await app.listen({ host: config.HOST, port: config.PORT });
