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

/** Erro do Postgres, solto ou embrulhado pelo Drizzle (`cause`). */
function erroDoPostgres(e: unknown): { code: string; message: string } | null {
  for (let atual = e as { code?: unknown; message?: string; cause?: unknown } | undefined, i = 0; atual && i < 3; i++) {
    if (typeof atual.code === "string" && /^[0-9A-Z]{5}$/.test(atual.code)) {
      return { code: atual.code, message: atual.message ?? "" };
    }
    atual = atual.cause as typeof atual;
  }
  return null;
}

/**
 * Restrições do banco que chegam até aqui viram respostas do contrato: são a
 * última linha de defesa, quando a checagem do serviço não pegou antes (ou
 * perdeu uma corrida).
 */
function respostaDoPostgres(code: string, message: string): { status: number; detail: string } | null {
  switch (code) {
    case "23505":
      return { status: 409, detail: "Já existe um registro com esses dados." };
    case "23503":
      return { status: 422, detail: "Referência a um registro que não existe." };
    case "23514":
      // Os gatilhos do Compoze já falam português (ex.: pasta dentro de si mesma).
      return { status: 422, detail: /[À-ú]|pasta|canção/i.test(message) ? message : "Valor fora do permitido." };
    case "22P02":
      return { status: 422, detail: "Valor em formato inválido." };
    default:
      return null;
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

    const pg = erroDoPostgres(erro);
    const traduzido = pg && respostaDoPostgres(pg.code, pg.message);
    if (traduzido) return reply.status(traduzido.status).send({ detail: traduzido.detail } satisfies Erro);

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
