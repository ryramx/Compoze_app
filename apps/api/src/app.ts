import type { Conexao } from "@compoze/db";
import cors from "@fastify/cors";
import helmet from "@fastify/helmet";
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
import { rotasDeSaude } from "./modules/health/rotas";
import { registrarErros } from "./plugins/erros";
import { VERSAO } from "./versao";

declare module "fastify" {
  interface FastifyInstance {
    banco: Conexao;
    config: Config;
  }
}

export interface Dependencias {
  config: Config;
  banco: Conexao;
  logger?: FastifyServerOptions["logger"];
}

/**
 * Monta a API sem abrir porta: o servidor chama `listen`, os testes usam
 * `inject`. Cada módulo de `modules/` registra suas rotas aqui.
 */
export async function construirApp({ config, banco, logger }: Dependencias) {
  const app = Fastify({
    logger: logger ?? { level: config.LOG_LEVEL },
    // Ids de requisição em UUID, para casar com os logs do front.
    genReqId: () => crypto.randomUUID(),
  }).withTypeProvider<ZodTypeProvider>();

  app.setValidatorCompiler(validatorCompiler);
  app.setSerializerCompiler(serializerCompiler);
  app.decorate("banco", banco);
  app.decorate("config", config);

  registrarErros(app);

  await app.register(helmet, {
    // A documentação em /docs precisa dos scripts inline do Swagger UI.
    contentSecurityPolicy: false,
  });
  await app.register(cors, { origin: config.CORS_ORIGINS, credentials: true });

  await app.register(swagger, {
    openapi: {
      info: {
        title: "Compoze API",
        version: VERSAO,
        description: "Contrato em docs/backend/contrato-da-api.md; schemas em packages/contracts.",
      },
    },
    transform: jsonSchemaTransform,
  });
  await app.register(swaggerUi, { routePrefix: "/docs" });

  await app.register(rotasDeSaude);

  return app;
}

export type App = Awaited<ReturnType<typeof construirApp>>;
