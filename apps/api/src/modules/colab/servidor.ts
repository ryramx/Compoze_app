import { idDaCancao, nomeDoDocumento } from "@compoze/documento";
import type { Banco } from "@compoze/db";
import { Hocuspocus } from "@hocuspocus/server";
import type { FastifyBaseLogger, FastifyInstance } from "fastify";
import { WebSocketServer } from "ws";

import { verificarAcesso } from "../auth/tokens";
import { acessar } from "../songs/acesso";
import { carregarDocumento, gravarDocumento } from "./documentos";

/** Rota do WebSocket de edição em tempo real. */
export const ROTA_COLAB = "/collab";

export interface Contexto {
  usuarioId: string;
}

export type Colaboracao = Hocuspocus<Contexto>;

/**
 * Servidor Hocuspocus do editor (ADR 0007). Roda dentro do processo da API,
 * na mesma porta: um serviço só para operar, e o REST pode editar o mesmo
 * documento em memória que os editores abertos estão vendo.
 */
export function criarColaboracao(opcoes: { db: Banco; segredo: string; log: FastifyBaseLogger }): Colaboracao {
  const { db, segredo, log } = opcoes;

  return new Hocuspocus<Contexto>({
    name: "compoze",
    quiet: true,
    // Grava 2 s depois da última tecla, e no máximo a cada 10 s de digitação
    // contínua. Ao fechar o último editor, grava na hora.
    debounce: 2000,
    maxDebounce: 10_000,

    async onAuthenticate({ token, documentName, connectionConfig }) {
      const usuarioId = await verificarAcesso(token, segredo);
      if (!usuarioId) throw new Error("Sessão expirada.");
      const songId = idDaCancao(documentName);
      if (!songId) throw new Error("Documento desconhecido.");
      // Sem acesso: `acessar` lança 404, e a conexão é recusada.
      const { cancao, papel } = await acessar(db, songId, usuarioId);
      // Quem só vê, ou canção na lixeira: acompanha, mas não escreve.
      connectionConfig.readOnly = papel === "VIEWER" || cancao.deletedAt !== null;
      return { usuarioId } satisfies Contexto;
    },

    async onLoadDocument({ documentName, document }) {
      const songId = idDaCancao(documentName);
      if (songId) await carregarDocumento(db, songId, document);
      return document;
    },

    async onStoreDocument({ documentName, document }) {
      const songId = idDaCancao(documentName);
      if (!songId) return;
      const gravou = await gravarDocumento(db, songId, document);
      if (!gravou) log.info({ songId }, "documento de canção apagada descartado");
    },
  });
}

/**
 * Liga o Hocuspocus ao servidor HTTP do Fastify: pedidos de upgrade em
 * `/collab` viram conexões do editor; o resto segue para o Fastify.
 */
export function anexarColaboracao(app: FastifyInstance, colab: Colaboracao): void {
  const wss = new WebSocketServer({ noServer: true, maxPayload: 4 * 1024 * 1024 });

  app.server.on("upgrade", (req, socket, head) => {
    const url = new URL(req.url ?? "/", "http://compoze");
    if (url.pathname !== ROTA_COLAB) {
      socket.destroy();
      return;
    }
    wss.handleUpgrade(req, socket, head, (ws) => {
      const headers = new Headers();
      for (const [k, v] of Object.entries(req.headers)) {
        if (typeof v === "string") headers.set(k, v);
      }
      const conexao = colab.handleConnection(ws, new Request(url, { headers }));
      ws.on("message", (dados: Buffer) => conexao.handleMessage(new Uint8Array(dados)));
      ws.on("close", (code, motivo) => conexao.handleClose({ code, reason: motivo.toString() }));
      ws.on("error", (erro) => app.log.warn({ err: erro }, "erro no websocket do editor"));
    });
  });

  // preClose: antes de o servidor HTTP parar de aceitar e esperar as conexões
  // abertas, que no caso dos editores nunca terminariam sozinhas.
  app.addHook("preClose", async () => {
    // Grava o que estiver pendente e só então derruba os editores.
    await Promise.all(
      [...colab.documents.values()]
        .map((d) => `onStoreDocument-${d.name}`)
        .filter((id) => colab.debouncer.isDebounced(id))
        .map((id) => colab.debouncer.executeNow(id)),
    );
    colab.closeConnections();
    for (const ws of wss.clients) ws.terminate();
    wss.close();
  });
}

/** Fecha os editores abertos de uma canção (apagada de vez, por exemplo). */
export function fecharEditores(colab: Colaboracao, songId: string): void {
  colab.closeConnections(nomeDoDocumento(songId));
}
