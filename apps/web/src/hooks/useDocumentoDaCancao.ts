import {
  blocosDe,
  lerBlocos,
  nomeDoDocumento,
  semear,
  Y,
  type BlocoDoDocumento,
} from "@compoze/documento";
import { HocuspocusProvider } from "@hocuspocus/provider";
import { useCallback, useEffect, useRef, useState } from "react";
import { IndexeddbPersistence } from "y-indexeddb";
import { MODO_DEMO } from "@/lib/api";
import { nomeLocal, URL_COLAB } from "@/lib/colaboracao";
import { quandoSair } from "@/lib/fila";
import { blocoDoDocumento, tipoDeBlocoParaApi } from "@/services/api/adapters";
import { tokenValido } from "@/services/api/authService";
import type { SongBlock } from "@/types";

/**
 * Onde está o que foi escrito (ADR 0005, item 4 das consequências no front):
 *
 * - `abrindo`: lendo a cópia do aparelho;
 * - `aparelho`: salvo no aparelho (modo demonstração, sem servidor);
 * - `sincronizando`: há mudança daqui que o servidor ainda não confirmou;
 * - `sincronizado`: servidor e aparelho iguais;
 * - `offline`: sem conexão; o que se escreve fica no aparelho e sobe depois;
 * - `recusado`: o servidor não aceitou abrir esta canção (sem acesso).
 */
export type EstadoDoDocumento = "abrindo" | "aparelho" | "sincronizando" | "sincronizado" | "offline" | "recusado";

/** Outra pessoa com a canção aberta agora, e o bloco em que ela está. */
export interface Presenca {
  usuarioId: string;
  blocoId: string | null;
}

/** Origem das transações do editor: só elas entram no desfazer. */
export const ORIGEM_LOCAL = Symbol("editor");

interface Sessao {
  doc: Y.Doc;
  provider: HocuspocusProvider | null;
  desfazer: Y.UndoManager;
}

/**
 * O documento Yjs de uma canção, salvo no aparelho (IndexedDB) e, com rede,
 * sincronizado com quem mais estiver escrevendo (Hocuspocus).
 *
 * `blocosIniciais` só é usado no modo demonstração, que não tem servidor para
 * semear o documento: lá, os blocos da canção de exemplo viram o documento na
 * primeira abertura.
 */
export function useDocumentoDaCancao(
  songId: string | undefined,
  opcoes: {
    usuarioId: string;
    blocosIniciais?: SongBlock[];
    /** Chamado (com atraso) sempre que os blocos mudam, de qualquer origem. */
    aoMudar?: (blocos: SongBlock[], crus: BlocoDoDocumento[]) => void;
  },
) {
  const [sessao, setSessao] = useState<Sessao | null>(null);
  const [blocos, setBlocos] = useState<SongBlock[]>([]);
  const [noAparelho, setNoAparelho] = useState(false);
  const [estado, setEstado] = useState<EstadoDoDocumento>("abrindo");
  const [presentes, setPresentes] = useState<Presenca[]>([]);
  const [pilhas, setPilhas] = useState({ desfazer: false, refazer: false });

  const aoMudarRef = useRef(opcoes.aoMudar);
  aoMudarRef.current = opcoes.aoMudar;
  // Só depois que o documento tem a canção de verdade (cópia do aparelho com
  // conteúdo, resposta do servidor ou semente da demonstração) as mudanças
  // são repassadas. Antes disso ele está vazio por estar carregando, e
  // repassar o vazio apagaria os blocos nas listagens.
  const confiavelRef = useRef(false);
  const [confiavel, setConfiavel] = useState(false);
  const marcarConfiavel = useCallback(() => {
    confiavelRef.current = true;
    setConfiavel(true);
  }, []);
  const usuarioId = opcoes.usuarioId;

  useEffect(() => {
    if (!songId) return;
    const doc = new Y.Doc();
    const local = new IndexeddbPersistence(nomeLocal(songId), doc);
    const desfazer = new Y.UndoManager(blocosDe(doc), { trackedOrigins: new Set([ORIGEM_LOCAL]), captureTimeout: 600 });

    const atualizarPilhas = () =>
      setPilhas({ desfazer: desfazer.undoStack.length > 0, refazer: desfazer.redoStack.length > 0 });
    desfazer.on("stack-item-added", atualizarPilhas);
    desfazer.on("stack-item-popped", atualizarPilhas);

    let espera: ReturnType<typeof setTimeout> | undefined;
    confiavelRef.current = false;
    const ler = () => {
      const crus = lerBlocos(doc);
      setBlocos(crus.map(blocoDoDocumento));
      if (!confiavelRef.current) return;
      clearTimeout(espera);
      espera = setTimeout(() => aoMudarRef.current?.(crus.map(blocoDoDocumento), crus), 400);
    };
    blocosDe(doc).observeDeep(ler);

    void local.whenSynced.then(() => {
      if (blocosDe(doc).length > 0) marcarConfiavel();
      setNoAparelho(true);
      ler();
    });

    let provider: HocuspocusProvider | null = null;
    let pararDeOuvirRede = () => {};
    let cancelarEspera = () => {};
    const conectar = (url: string) => {
      let conexao: "connecting" | "connected" | "disconnected" = "connecting";
      let jaConectou = false;
      const atualizarEstado = () => {
        if (!provider) return;
        // O WebSocket pode levar até meio minuto para perceber que a rede
        // caiu; o navegador sabe antes.
        if (!navigator.onLine) return setEstado("offline");
        // Antes da primeira conexão é "abrindo", não "offline": evita piscar
        // o aviso de sem rede toda vez que a canção abre.
        if (conexao !== "connected") setEstado(jaConectou || conexao === "disconnected" ? "offline" : "sincronizando");
        else if (!provider.isSynced || provider.hasUnsyncedChanges) setEstado("sincronizando");
        else setEstado("sincronizado");
      };
      provider = new HocuspocusProvider({
        url,
        name: nomeDoDocumento(songId),
        document: doc,
        token: tokenValido,
        onStatus: ({ status }) => {
          conexao = status;
          if (status === "connected") jaConectou = true;
          atualizarEstado();
        },
        onSynced: () => {
          marcarConfiavel();
          atualizarEstado();
        },
        onUnsyncedChanges: atualizarEstado,
        onAuthenticationFailed: () => setEstado("recusado"),
        onAwarenessChange: ({ states }) => {
          const meu = provider?.awareness?.clientID;
          const vistos = new Map<string, Presenca>();
          for (const s of states) {
            const p = s as { clientId: number; pessoa?: Presenca };
            if (p.clientId === meu || !p.pessoa || p.pessoa.usuarioId === usuarioId) continue;
            vistos.set(p.pessoa.usuarioId, p.pessoa);
          }
          setPresentes([...vistos.values()]);
        },
      });
      provider.setAwarenessField("pessoa", { usuarioId, blocoId: null } satisfies Presenca);
      window.addEventListener("online", atualizarEstado);
      window.addEventListener("offline", atualizarEstado);
      pararDeOuvirRede = () => {
        window.removeEventListener("online", atualizarEstado);
        window.removeEventListener("offline", atualizarEstado);
      };
      const criado = provider;
      setSessao((s) => (s?.doc === doc ? { ...s, provider: criado } : s));
    };

    if (URL_COLAB) {
      // Canção criada neste aparelho e ainda na fila: o servidor recusaria o
      // documento de uma canção que não conhece. Espera o POST subir.
      const url = URL_COLAB;
      const espera = quandoSair(
        (p) => p.metodo === "POST" && p.caminho === "/songs" && (p.corpo as { id?: string } | undefined)?.id === songId,
      );
      let fechado = false;
      cancelarEspera = () => {
        fechado = true;
        espera.cancelar();
      };
      setEstado(navigator.onLine ? "sincronizando" : "offline");
      void espera.pronto.then(() => {
        if (!fechado) conectar(url);
      });
    } else {
      setEstado("aparelho");
    }

    setSessao({ doc, provider, desfazer });

    return () => {
      clearTimeout(espera);
      // Último aviso aos outros antes de fechar: as mudanças pendentes sobem.
      if (aoMudarRef.current && confiavelRef.current) {
        const crus = lerBlocos(doc);
        aoMudarRef.current(crus.map(blocoDoDocumento), crus);
      }
      blocosDe(doc).unobserveDeep(ler);
      cancelarEspera();
      pararDeOuvirRede();
      desfazer.destroy();
      provider?.destroy();
      void local.destroy();
      doc.destroy();
      setSessao(null);
      setNoAparelho(false);
      setEstado("abrindo");
      setPresentes([]);
      setBlocos([]);
      confiavelRef.current = false;
      setConfiavel(false);
    };
  }, [songId, usuarioId, marcarConfiavel]);

  // Demonstração: sem servidor, a primeira abertura semeia com os blocos de exemplo.
  const { blocosIniciais } = opcoes;
  useEffect(() => {
    if (!MODO_DEMO || !sessao || !noAparelho || !blocosIniciais || confiavelRef.current) return;
    marcarConfiavel();
    if (blocosDe(sessao.doc).length > 0) return;
    semear(
      sessao.doc,
      blocosIniciais.map((b) => ({
        id: b.id,
        type: tipoDeBlocoParaApi(b.type),
        label: b.label ?? null,
        content: b.text,
        author_id: b.authorId,
      })),
    );
  }, [sessao, noAparelho, blocosIniciais, marcarConfiavel]);

  const definirFoco = useCallback(
    (blocoId: string | null) => {
      sessao?.provider?.setAwarenessField("pessoa", { usuarioId, blocoId } satisfies Presenca);
    },
    [sessao, usuarioId],
  );

  return {
    doc: sessao?.doc ?? null,
    blocos,
    /**
     * Dá para escrever: a cópia do aparelho já tem a canção, ou o servidor já
     * mandou a dele. Uma canção nunca aberta neste aparelho precisa de rede
     * uma vez; depois disso abre offline.
     */
    pronto: !!sessao && noAparelho && confiavel,
    estado,
    presentes,
    definirFoco,
    desfazer: () => sessao?.desfazer.undo(),
    refazer: () => sessao?.desfazer.redo(),
    podeDesfazer: pilhas.desfazer,
    podeRefazer: pilhas.refazer,
  };
}
