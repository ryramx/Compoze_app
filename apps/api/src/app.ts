import type { Conexao } from "@compoze/db";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
import rateLimit from "@fastify/rate-limit";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyServerOptions } from "fastify";
import {
  jsonSchemaTransform,
  serializerCompiler,
  validatorCompiler,
  type ZodTypeProvider,
} from "fastify-type-provider-zod";

import type { Config } from "./config";
import { criarAoVivo, type AoVivo } from "./lib/aoVivo";
import { criarAvisador, type Avisador, type Entregar } from "./lib/avisador";
import { criarCarteiro, remetenteResend, type Carteiro, type Remetente } from "./lib/correio";
import { rotasDeAutenticacao } from "./modules/auth/rotas";
import { rotasDeAvisos } from "./modules/avisos/rotas";
import { rotasDeConversas } from "./modules/conversas/rotas";
import { rotasDeConvites } from "./modules/convites/rotas";
import { anexarColaboracao, criarColaboracao, type Colaboracao } from "./modules/colab/servidor";
import { rotasDePastas } from "./modules/folders/rotas";
import { rotasDeGente } from "./modules/gente/rotas";
import { rotasDeImagens } from "./modules/imagens/rotas";
import { rotasDeMemos } from "./modules/memos/rotas";
import { rotasDeSaude } from "./modules/health/rotas";
import { rotasDeProjetos } from "./modules/projects/rotas";
import { rotasDeCancoes } from "./modules/songs/rotas";
import { rotasDePessoas } from "./modules/users/rotas";
import { rotasDeVersoes } from "./modules/versoes/rotas";
import { autenticacao } from "./plugins/autenticacao";
import { registrarErros } from "./plugins/erros";
import { idempotencia } from "./plugins/idempotencia";
import { VERSAO } from "./versao";

declare module "fastify" {
  interface FastifyInstance {
    banco: Conexao;
    config: Config;
    /** Hocuspocus: documentos Yjs das canções (ADR 0007). */
    colab: Colaboracao;
    /** E-mail que sai do Compoze (convites por link). */
    carteiro: Carteiro;
    /** Quem está com o app aberto, para entregar mensagens na hora (ADR 0014). */
    aoVivo: AoVivo;
    /** Fluxos `/events` abertos, encerrados antes de o servidor fechar. */
    aoVivoFechar: Set<() => void>;
    /** Avisos por push para quem está com o app fechado (ADR 0016). */
    avisador: Avisador;
  }
}

export interface Dependencias {
  config: Config;
  banco: Conexao;
  logger?: FastifyServerOptions["logger"];
  /** Quem entrega os e-mails. Sem isto, vale o Resend, se houver chave. */
  remetente?: Remetente | null;
  /** Como o push sai. Os testes trocam por um que só anota. */
  entregarPush?: Entregar;
}

/**
 * Monta a API sem abrir porta: o servidor chama `listen`, os testes usam
 * `inject`. Cada módulo de `modules/` registra suas rotas aqui.
 */
export async function construirApp({ config, banco, logger, remetente, entregarPush }: Dependencias) {
  const app = Fastify({
    logger: logger ?? { level: config.LOG_LEVEL },
    // Ids de requisição em UUID, para casar com os logs do front.
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("banco", banco);
  app.decorate("config", config);
  app.decorate("colab", criarColaboracao({ db: banco.db, segredo: config.JWT_SECRET, log: app.log }));
  anexarColaboracao(app, app.colab);
  const quemEntrega =
    remetente !== undefined ? remetente : config.RESEND_API_KEY ? remetenteResend(config.RESEND_API_KEY, config.EMAIL_FROM) : null;
  app.decorate("carteiro", criarCarteiro(quemEntrega, app.log));
  app.decorate("aoVivo", criarAoVivo());
  app.decorate("aoVivoFechar", new Set<() => void>());
  app.decorate("avisador", criarAvisador({ db: banco.db, aoVivo: app.aoVivo, log: app.log, entregar: entregarPush }));
  // Fluxos ao vivo nunca terminam sozinhos; sem isto o close esperaria para sempre.
  app.addHook("preClose", async () => {
    for (const fechar of [...app.aoVivoFechar]) fechar();
  });

  registrarErros(app);

  await app.register(helmet, {
    // A documentação em /docs precisa dos scripts inline do Swagger UI.
    contentSecurityPolicy: false,
  });
  await app.register(cors, {
    origin: config.CORS_ORIGINS,
    credentials: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    // A fila de escritas do aparelho manda a chave em cada reenvio (ADR 0008).
    allowedHeaders: ["Content-Type", "Authorization", "Idempotency-Key"],
    exposedHeaders: ["Idempotent-Replayed"],
  });
  // Limite só onde é ativado por rota (login, cadastro, refresh): contra
  // tentativa de senha em massa, sem atrapalhar quem usa o app.
  await app.register(rateLimit, {
    global: false,
    errorResponseBuilder: (_req, ctx) =>
      Object.assign(new Error(`Muitas tentativas. Tente de novo em ${Math.ceil(ctx.ttl / 1000)} segundos.`), {
        statusCode: 429,
      }),
  });
  await app.register(autenticacao);
  await app.register(idempotencia);

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Compoze API",
        version: VERSAO,
        description: "Contrato em docs/backend/contrato-da-api.md; schemas em packages/contracts.",
      },
      components: { securitySchemes: { bearer: { type: "http", scheme: "bearer", bearerFormat: "JWT" } } },
      security: [{ bearer: [] }],
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(rotasDeSaude);
  await app.register(rotasDeAutenticacao);
  await app.register(rotasDePessoas);
  await app.register(rotasDeCancoes);
  await app.register(rotasDeVersoes);
  await app.register(rotasDeMemos);
  await app.register(rotasDeGente);
  await app.register(rotasDeConversas);
  await app.register(rotasDeConvites);
  await app.register(rotasDePastas);
  await app.register(rotasDeProjetos);
  await app.register(rotasDeImagens);
  await app.register(rotasDeAvisos);

  return app;
}

export type App = Awaited<ReturnType<typeof construirApp>>;
