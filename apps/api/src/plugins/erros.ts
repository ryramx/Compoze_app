import type { Erro } from "@compoze/contracts";
import type { FastifyError, FastifyInstance } from "fastify";
import { hasZodFastifySchemaValidationErrors, isResponseSerializationError } from "fastify-type-provider-zod";

/** Erro de domínio: status HTTP e mensagem para quem usa o app. */
export class ErroDaApi extends Error {
  constructor(
    readonly status: number,
    mensagem: string,
  ) {
    super(mensagem);
  }
}

/**
 * Todo erro sai no mesmo formato do contrato: `{ detail }`. Validação vira 422
 * com a lista de campos; erro inesperado vira 500 sem vazar detalhe interno.
 */
export function registrarErros(app: FastifyInstance) {
  app.setErrorHandler<FastifyError>((erro, req, reply) => {
    if (hasZodFastifySchemaValidationErrors(erro)) {
      const corpo: Erro = {
        detail: erro.validation.map((v) => ({
          campo: [erro.validationContext, ...v.instancePath.split("/").filter(Boolean)].join("."),
          mensagem: v.message ?? "Valor inválido.",
        })),
      };
      return reply.status(422).send(corpo);
    }

    if (erro instanceof ErroDaApi) {
      return reply.status(erro.status).send({ detail: erro.message } satisfies Erro);
    }

    if (isResponseSerializationError(erro)) {
      req.log.error({ err: erro, issues: erro.cause.issues }, "resposta fora do contrato");
      return reply.status(500).send({ detail: "Erro interno." } satisfies Erro);
    }

    const status = erro.statusCode ?? 500;
    if (status >= 500) {
      req.log.error({ err: erro }, "erro inesperado");
      return reply.status(500).send({ detail: "Erro interno." } satisfies Erro);
    }
    return reply.status(status).send({ detail: erro.message } satisfies Erro);
  });

  app.setNotFoundHandler((req, reply) => {
    reply.status(404).send({ detail: `Rota não encontrada: ${req.method} ${req.url}` } satisfies Erro);
  });
}
