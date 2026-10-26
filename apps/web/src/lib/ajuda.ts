import { create } from "zustand";

/**
 * Ajuda de cada tela e os primeiros passos (ADR 0020).
 *
 * O texto mora aqui, num lugar só, e não espalhado pelas páginas: assim a
 * ajuda de uma tela pode ser lida de qualquer outra ("Outras telas") e muda
 * junto quando a tela muda. Os nomes citados são os rótulos que aparecem na
 * interface — se um botão mudar de nome, mude aqui também.
 */

export interface ItemDeAjuda {
  titulo: string;
  texto: string;
}

export interface TopicoDeAjuda {
  id: string;
  titulo: string;
  /** O que a tela é, numa frase. Abre o painel, em serifa. */
  resumo: string;
  itens: ItemDeAjuda[];
}

export const TOPICOS: TopicoDeAjuda[] = [
  {
    id: "mesa",
    titulo: "Mesa",
    resumo: "A primeira folha do caderno: o que você estava escrevendo, em que pé estão as obras e o que chegou de gente.",
    itens: [
      { titulo: "Nova canção", texto: "Abre uma folha em branco no editor. Toda canção nasce no estágio Ideia." },
      { titulo: "Continue de onde parou", texto: "A canção que você mexeu por último, com um trecho da letra, e as outras recentes logo abaixo." },
      { titulo: "Convites", texto: "Quando alguém chama você para escrever uma canção, o convite aparece no topo da Mesa para aceitar ou recusar." },
      { titulo: "Esteira", texto: "Quantas obras há em cada estágio, de Ideia a Gravada. Toque num estágio para ver só aquelas canções." },
      { titulo: "Na roda", texto: "As publicações mais novas do mural de quem você segue." },
    ],
  },
  {
    id: "cancoes",
    titulo: "Canções",
    resumo: "Todas as canções do seu caderno, as suas e as que você escreve com alguém.",
    itens: [
      { titulo: "Buscar", texto: "Procure pelo título, por uma tag ou por um verso que você lembra, mesmo sem saber o nome da canção." },
      { titulo: "Estágio", texto: "Filtre pelo ponto em que a obra está: Ideia, Escrita, Revisão, Finalizada, Registrada ou Gravada." },
      { titulo: "Índice e Fichas", texto: "O índice é uma lista enxuta; as fichas mostram o começo da letra. A ordem pode ser por data, título ou estágio." },
      { titulo: "Nova canção", texto: "Cria a canção e abre o editor na hora. Funciona também sem internet." },
    ],
  },
  {
    id: "editor",
    titulo: "Editor",
    resumo: "A folha da canção. Cada trecho guarda quem o escreveu, e quem está junto vê as mudanças na hora.",
    itens: [
      { titulo: "Inserir", texto: "A barra de baixo põe um bloco novo: § Seção (Refrão, Verso 1…), ♯ Cifra, ¶ Verso ou ※ Nota, para lembretes que não são letra." },
      { titulo: "Autoria", texto: "O trecho de outra pessoa ganha um fio na cor dela e o nome na margem. É a base da divisão de coautoria." },
      { titulo: "Cifras e Alinhar", texto: "Cifras esconde os acordes para ler só a letra. Alinhar põe a letra em fonte de máquina de escrever, para casar acorde e sílaba." },
      { titulo: "Memos", texto: "Grave a melodia antes que ela fuja, até 10 minutos por memo. Grava sem internet e sobe depois." },
      { titulo: "Ficha", texto: "Estágio, tom, compasso, andamento, pasta, tags e quem pode ver. Lá também ficam a Coautoria, com os percentuais que precisam fechar em 100%, e Registrar a obra." },
      { titulo: "Convidar", texto: "Chame alguém pelo nome ou @ para escrever junto. Quem ainda não tem conta recebe um link." },
      { titulo: "Histórico de versões", texto: "Em ⋯, guarde uma versão com nome e volte a qualquer uma. Cada versão tem um carimbo SHA-256, útil como prova de autoria." },
      { titulo: "Desfazer", texto: "Ctrl+Z desfaz, Ctrl+Shift+Z refaz. Tudo se salva sozinho, sem botão de salvar." },
    ],
  },
  {
    id: "pastas",
    titulo: "Pastas",
    resumo: "Organização opcional. Uma canção pode morar numa pasta, num projeto, nos dois ou em nenhum.",
    itens: [
      { titulo: "Subpastas", texto: "Pastas podem ter pastas dentro, como Letras de 2026 › Parcerias." },
      { titulo: "Mover uma canção", texto: "Escolha a pasta na Ficha da canção, dentro do editor." },
      { titulo: "Excluir uma pasta", texto: "Nada do que está dentro é apagado: as subpastas sobem um nível e as canções ficam sem pasta." },
    ],
  },
  {
    id: "projetos",
    titulo: "Projetos",
    resumo: "Singles, EPs e álbuns: as canções em ordem de faixa, o dinheiro e a data de lançamento.",
    itens: [
      { titulo: "Novo projeto", texto: "Dê um nome, o formato, a meta e a data de lançamento. Tudo pode mudar depois." },
      { titulo: "Faixas", texto: "Traga canções do caderno para o projeto. Tirar uma faixa ou excluir o projeto não apaga a canção." },
      { titulo: "Capa", texto: "Sem imagem, o projeto ganha uma capa tipográfica. Você pode pôr uma foto quando quiser." },
      { titulo: "Apoio por PIX", texto: "Cadastre sua chave PIX e mande o link de apoio. O dinheiro vai direto para você, sem taxa; você confere no extrato e marca o que chegou." },
    ],
  },
  {
    id: "projeto",
    titulo: "Projeto",
    resumo: "Um single, EP ou álbum por dentro: faixas, fase, quem está envolvido e quanto já entrou.",
    itens: [
      { titulo: "Adicionar faixa", texto: "Escolha canções do seu caderno. Elas continuam no caderno; o projeto só as reúne em ordem." },
      { titulo: "Fase", texto: "Em que ponto o lançamento está. Mude conforme o trabalho anda." },
      { titulo: "Apoio por PIX", texto: "Guarde a chave e copie o link de apoio. Quando alguém disser que pagou, confira no extrato e marque Chegou ou Não chegou. Só o que chegou soma no arrecadado." },
      { titulo: "Capa", texto: "Pôr uma capa troca a capa tipográfica por uma imagem; dá para voltar à tipográfica depois." },
    ],
  },
  {
    id: "mural",
    titulo: "Mural",
    resumo: "O que está saindo do caderno de quem você acompanha.",
    itens: [
      { titulo: "Publicar", texto: "Conte no que está trabalhando. Dá para citar uma canção sua, desde que ela não seja privada." },
      { titulo: "Curtir e comentar", texto: "Cada publicação aceita curtida e comentário." },
      { titulo: "Mural vazio?", texto: "Ele mostra quem você segue. Abra o perfil de quem escreve com você e toque em Seguir." },
      { titulo: "Internet", texto: "O mural precisa de rede. As suas canções, não." },
    ],
  },
  {
    id: "conversas",
    titulo: "Conversas",
    resumo: "Conversas a dois, com mensagens que chegam na hora.",
    itens: [
      { titulo: "Começar uma conversa", texto: "Abra o perfil de alguém e toque em Conversar, ou use Mensagem na lista de seguidores." },
      { titulo: "Não lidas", texto: "O número vermelho em Conversas, no menu, conta as mensagens que você ainda não viu." },
      { titulo: "Avisos", texto: "Ligue os avisos em Ajustes para saber de mensagem nova com o Compoze fechado." },
    ],
  },
  {
    id: "mapa",
    titulo: "Mapa",
    resumo: "Quem compõe perto de você.",
    itens: [
      { titulo: "Quem aparece", texto: "Só quem escolheu aparecer no mapa. A localização nunca vai para o perfil público." },
      { titulo: "Conhecer alguém", texto: "Toque num ponto para ver quem é e abrir o perfil." },
    ],
  },
  {
    id: "perfil",
    titulo: "Perfil",
    resumo: "Como você aparece para quem escreve com você, e onde você conhece outras pessoas.",
    itens: [
      { titulo: "Editar perfil", texto: "Leva a Ajustes › Perfil: foto, nome artístico, cidade e um pouco sobre você." },
      { titulo: "Obras", texto: "Aparecem as canções visíveis no perfil. As privadas ficam só entre os coautores." },
      { titulo: "Seguidores e Seguindo", texto: "Toque nos números para ver a lista de pessoas." },
      { titulo: "Perfil de outra pessoa", texto: "Seguir põe as publicações dela no seu mural; Conversar abre uma conversa a dois." },
    ],
  },
  {
    id: "seguidores",
    titulo: "Seguidores",
    resumo: "Quem segue a pessoa e quem ela segue.",
    itens: [
      { titulo: "Abas", texto: "Troque entre Seguidores e Seguindo no topo." },
      { titulo: "Seguir de volta", texto: "Aparece para quem já segue você e você ainda não segue." },
      { titulo: "Mensagem", texto: "Abre a conversa a dois com a pessoa, ou cria uma nova." },
    ],
  },
  {
    id: "lixeira",
    titulo: "Lixeira",
    resumo: "O que você exclui fica aqui por 30 dias, no lugar onde estava.",
    itens: [
      { titulo: "Restaurar", texto: "Devolve a canção para a mesma pasta e o mesmo projeto de antes." },
      { titulo: "Prazo", texto: "Cada canção mostra quantos dias faltam. Depois disso, ela é apagada de vez." },
      { titulo: "Apagar de vez", texto: "Não tem volta. Use só quando tiver certeza." },
    ],
  },
  {
    id: "ajustes",
    titulo: "Ajustes",
    resumo: "Seu perfil, a aparência, os avisos e a sessão.",
    itens: [
      { titulo: "Perfil", texto: "Nome artístico, foto, cidade e o que você escreve. É assim que você aparece nos créditos." },
      { titulo: "Aparência", texto: "Papel de dia, tinta de noite, ou o que o sistema mandar." },
      { titulo: "Avisos", texto: "Mensagem nova e convite para canção chegam no aparelho mesmo com o Compoze fechado. No iPhone, só com o app na tela de início." },
      { titulo: "Senha", texto: "Escolha uma senha nova sem precisar da atual. Os outros aparelhos saem da conta." },
    ],
  },
  {
    id: "convite",
    titulo: "Convite",
    resumo: "Alguém chamou você para escrever uma canção.",
    itens: [
      { titulo: "Aceitar e abrir a canção", texto: "A canção entra no seu caderno e você passa a escrever junto, com a sua cor na folha." },
      { titulo: "Convite pela conta", texto: "Quem convida pelo seu @ manda o convite para a Mesa, onde dá para aceitar ou recusar." },
    ],
  },
  {
    id: "apoiar",
    titulo: "Apoiar",
    resumo: "Apoio a um projeto, pago por PIX direto para quem fez.",
    itens: [
      { titulo: "Valor", texto: "Escolha quanto quer apoiar e pague pelo QR ou pelo copia e cola, no app do seu banco." },
      { titulo: "Já paguei", texto: "Avisa a dona do projeto. Ela confere no extrato e você recebe um aviso quando ela confirmar." },
    ],
  },
  {
    id: "compartilhar",
    titulo: "Compartilhar",
    resumo: "Texto que veio de outro app vira uma canção nova, no estágio Ideia.",
    itens: [
      { titulo: "De onde vem", texto: "No Android, use Compartilhar em outro app (notas, mensagens) e escolha o Compoze." },
    ],
  },
];

const POR_ID = new Map(TOPICOS.map((t) => [t.id, t]));

/** Telas que aparecem em "Outras telas" no painel: as do menu, na ordem do menu. */
export const TELAS_DO_MENU = ["mesa", "cancoes", "editor", "pastas", "projetos", "mural", "conversas", "mapa", "perfil", "lixeira", "ajustes"];

// A ordem importa: a primeira regra que casa vence.
const ROTAS: [RegExp, string][] = [
  [/^\/songs\/[^/]+\/edit/, "editor"],
  [/^\/songs/, "cancoes"],
  [/^\/folders/, "pastas"],
  [/^\/projects\/[^/]+/, "projeto"],
  [/^\/projects/, "projetos"],
  [/^\/feed/, "mural"],
  [/^\/messages/, "conversas"],
  [/^\/map/, "mapa"],
  [/^\/profile\/[^/]+\/(seguidores|seguindo)/, "seguidores"],
  [/^\/profile/, "perfil"],
  [/^\/trash/, "lixeira"],
  [/^\/settings/, "ajustes"],
  [/^\/convite\//, "convite"],
  [/^\/apoiar\//, "apoiar"],
  [/^\/compartilhar/, "compartilhar"],
];

export function topico(id: string): TopicoDeAjuda {
  return POR_ID.get(id) ?? POR_ID.get("mesa")!;
}

/** A ajuda da tela aberta. O que não casar com nada cai na Mesa. */
export function topicoDaRota(caminho: string): TopicoDeAjuda {
  const achada = ROTAS.find(([re]) => re.test(caminho));
  return topico(achada ? achada[1] : "mesa");
}

// ── Primeiros passos ────────────────────────────────────────────────────────

/**
 * Rotas onde o tour não abre sozinho: quem chegou por um link de convite, de
 * apoio ou de compartilhamento veio fazer uma coisa só. O tour espera a
 * próxima tela.
 */
export const ROTAS_SEM_TOUR = /^\/(convite|apoiar|compartilhar)(\/|$)/;

const chave = (usuarioId: string) => `compoze.primeirosPassos.${usuarioId}`;

/**
 * Se a pessoa já viu (ou pulou) os primeiros passos neste aparelho. Guardado
 * por conta, para quem divide o aparelho; sem storage, conta como visto, para
 * o tour não reaparecer a cada tela.
 */
export function jaViuPrimeirosPassos(usuarioId: string): boolean {
  try {
    return localStorage.getItem(chave(usuarioId)) !== null;
  } catch {
    return true;
  }
}

export function marcarPrimeirosPassos(usuarioId: string) {
  try {
    localStorage.setItem(chave(usuarioId), new Date().toISOString());
  } catch {
    // Sem storage: vale só até fechar a aba.
  }
}

/** O que está aberto agora. Qualquer tela pode abrir o tour ou a ajuda. */
export const useAjuda = create<{
  tour: boolean;
  painel: boolean;
  abrirTour: () => void;
  abrirPainel: () => void;
  fechar: () => void;
}>((set) => ({
  tour: false,
  painel: false,
  abrirTour: () => set({ tour: true, painel: false }),
  abrirPainel: () => set({ painel: true, tour: false }),
  fechar: () => set({ tour: false, painel: false }),
}));
