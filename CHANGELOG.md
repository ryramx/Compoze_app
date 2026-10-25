# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Removido
- `POST /songs/{id}/collaborators`: ninguém entra numa canção sem aceitar um
  convite (ADR 0010).

### Adicionado
- Fase 4a, gente (ADR 0013): o Mural deixa de ser prévia.
  - Seguir e deixar de seguir pelo perfil; o perfil mostra seguidores, quem a
    pessoa segue e se ela segue você.
  - Publicar no mural, citando uma canção que não seja privada. Curtir,
    comentar, apagar a própria publicação.
  - O mural mostra você e quem você segue, em páginas; o perfil mostra o mural
    da pessoa. Sugestões de quem seguir: quem escreve com você.
  - A Mesa mostra as três publicações mais novas em "Na roda".
  - API: `/profiles`, `/users/{id}/follow`, `/feed`, `/posts`; tabelas
    `follows`, `posts`, `post_likes`, `post_comments` (migração 0010).
- Fase 3c, memos de voz (ADR 0012): botão "Memos" no editor. Grava a
  melodia ou o riff (até 10 minutos), dá nome, toca, apaga. Funciona sem
  internet: o áudio fica no aparelho e sobe quando a rede volta. Os coautores
  ouvem; quem só vê a canção também.
  - API: `/songs/{id}/memos` (PUT com o áudio cru, id do aparelho), tabelas
    `song_memos` e `song_memo_audio` (migração 0009).
  - App Android pede o microfone na primeira gravação.
- Fase 3b, app Android:
  - "Compartilhar para o Compoze": texto de outro app (bloco de notas,
    mensagem, link) vira uma canção nova no estágio "ideia", aberta no
    editor. Funciona offline. Na PWA instalada, pelo `share_target`.
  - O app avisa quando sai versão nova do APK e oferece baixar. Em Ajustes →
    Aplicativo, a versão instalada e "Procurar atualização".
- App Android (Fase 3, ADR 0011): o Compoze vira um APK, publicado nos
  Releases do GitHub, sem passar pela loja. Link fixo para a versão mais nova:
  `releases/latest/download/Compoze.apk`.
  - O botão voltar do Android volta uma tela; na primeira, o app vai para o
    fundo.
  - Ícone e tela de abertura no estilo do Caderno, clara e escura.
  - Links de convite e de canção copiados no app apontam para o site.
  - CI: o workflow "Android" gera o APK em cada PR e, ao rodar com uma versão,
    assina, cria a tag e publica o Release.
  - API de staging: `https://localhost` (o app) entra no `CORS_ORIGINS`.
- O app abre na hora para quem já entrou no aparelho, sem esperar a API
  acordar (no Render grátis, até um minuto). Enquanto isso ele funciona como
  offline e avisa "Conectando ao servidor".
- Fase 2d, convites (ADR 0010):
  - "Convidar" busca qualquer pessoa do Compoze por nome ou @. A pessoa vê o
    convite no alto da Mesa e aceita ou recusa; só entra na canção se aceitar.
  - Link de convite para quem ainda não tem conta. Vale uma vez e por 7 dias.
    Quem abre o link sem conta cria uma e volta direto para o convite.
  - A dona vê os convites abertos e pode cancelar cada um.
  - E-mail do convite pelo Resend, pronto mas desligado até haver domínio.
  - API: `/songs/{id}/invites`, `/invites` e `GET /users?q=`.
- Fase 2d, versões e registro (ADR 0009):
  - Histórico de versões no editor. Dá para guardar a versão de agora com um
    nome, ler as antigas, conferir o hash e restaurar o texto (Ctrl+Z desfaz).
  - Mudar de estágio guarda uma versão sozinho.
  - "Registrar a obra": só a dona, com a divisão de coautoria fechada. O
    registro grava um retrato imutável com SHA-256 encadeado ao da versão
    anterior.
  - API: `/songs/{id}/versions` e `/songs/{id}/register`; o estágio
    "Registrada" passa a valer só pelo registro.
- Fase 2c, PWA: o Compoze instala na tela inicial (celular e computador) e
  abre sem internet, inclusive recarregando a página. Quando sai versão nova,
  o app avisa e a pessoa escolhe a hora de atualizar. Depois do login, ele
  pede ao navegador para não apagar os dados do aparelho.
- Fase 2b, offline (ADR 0008): criar e editar canções, pastas, projetos e o
  perfil sem internet.
  - As escritas vão para uma fila no aparelho e sobem em ordem quando a rede
    volta. Criar canção offline já abre a folha pautada.
  - O caderno fica copiado no aparelho e abre na hora, com ou sem rede.
  - O menu mostra "Sem internet" e quantas mudanças ainda não subiram.
  - Convidar, remover coautor e fechar a divisão ficam desligados offline, com
    o motivo.
  - API: cabeçalho `Idempotency-Key` em toda escrita autenticada (reenviar não
    repete), e `folha_pautada` em `POST /songs`.
- Fase 2a, escrita junto (ADR 0007): cada canção é um documento Yjs.
  - Duas pessoas editam o mesmo verso ao mesmo tempo, ou uma delas offline,
    sem perder texto.
  - O editor mostra quem está aqui agora e em que bloco.
  - O texto fica salvo no aparelho (IndexedDB) e sincroniza quando a rede volta.
  - Desfazer cobre inserir e remover blocos e nunca desfaz a edição de outra
    pessoa.
  - API: Hocuspocus em `/collab`, no mesmo processo. `song_blocks` passa a ser
    projeção do documento, e as rotas REST de blocos editam o documento.
  - `packages/documento` define o formato, compartilhado entre front e API.
- Sessão longa: requisição que volta 401 renova o token e repete uma vez.
- Monorepo `Compoze_app` com `apps/web` e `docs/` (ADR 0001).
- Frontend reescrito com o design system "Caderno": papel, tinta e lápis
  vermelho; Newsreader, Hanken Grotesk e IBM Plex Mono; tema claro e escuro
  (ADR 0002).
- Modo demonstração: `VITE_API_URL=demo` roda o app sem backend (ADR 0003).
- Mesa com resumo em frase, "continue de onde parou" com trecho da letra e
  esteira por estágio.
- Índice de canções em tabela ou fichas, busca por título, tag e verso, filtro
  e ordem na URL.
- Editor: ficha técnica na margem, marginália de autoria, alinhar cifra e
  letra, Backspace em bloco vazio, fechar divisão de coautoria (RN05), escolher
  pasta e visibilidade.
- Projetos: capa tipográfica, mudar fase, adicionar/retirar faixas, excluir.
- Pastas: árvore lateral, renomear, excluir, link direto.
- Mapa com rota própria `/map/people` (RN11).
- Busca global (⌘K) em canções, versos, projetos, pastas e pessoas.
- Documentação: visão do produto, arquitetura e design system do front,
  contrato da API, plano do backend, ADRs.
- CI do frontend (lint, typecheck, testes, build).
- ADR 0005: app instalável (PWA, depois Capacitor nas lojas) e uso offline
  local-first; plano do backend reorganizado em quatro fases.
- Stack do backend aceita (ADR 0004).
- Plano do backend fixa PostgreSQL 18 (versão do ambiente local), com `uuidv7()` nativo.
- Backend, Fase 0: Turborepo; `packages/contracts` (Zod); `packages/db` com o
  schema v1 completo, colunas de sincronização e gatilhos (versão e relógio do
  servidor, pasta sem ciclo, versão registrada imutável); `apps/api` com
  Fastify 5, `GET /health`, OpenAPI em `/docs` e erros no formato `{detail}`;
  Docker Compose com PostgreSQL 18 + PostGIS; testes contra Postgres real
  (Testcontainers) e job de CI da API.

- Staging: API e front no Render (`render.yaml`), banco PostgreSQL 18 no
  Neon (grátis), deploy automático após a CI passar.

- Backend, Fase 1 (MVP do contrato): cadastro, login e refresh rotacionado
  com detecção de reuso e limite de tentativas (ADR 0006); perfil, pessoas e
  mapa (RN11); canções com busca sem acento, blocos, coautoria e divisão
  (RN05), lixeira (RN07) e expurgo diário (RN08); pastas sem ciclo; projetos
  e faixas. Criações aceitam id gerado no aparelho.
- `GET /songs?expand=blocks,collaborators` e `GET /projects` com faixas: o
  front carrega tudo em quatro requisições, em vez de uma por canção e por
  projeto.

### Alterado
- `apps/web` passa a usar os tipos de `@compoze/contracts` (respostas e corpos
  de requisição) em `services/api/dto.ts`; mudança no contrato quebra o
  `typecheck` do front. Bloco sem autora (conta apagada) agora é tipado como
  `authorId: null`.
- Menu lateral e "Ir para" da busca mostram ícones em vez dos números
  `01`–`09`; os cabeçalhos de página também perderam o número.

### Corrigido
- Staging: o front agora é publicado de novo quando muda algo em `packages/`
  (ele usa os tipos do contrato e o formato do documento).
- Mudar dois campos da ficha em seguida (título e tom, por exemplo) gravava só
  o último: as mudanças adiadas agora se acumulam.
- Sem rede, a renovação do token não desloga mais a pessoa.
- Build no Render: `corepack enable` falha lá (diretório global só leitura);
  o pnpm passa a vir pelo `npx`, na versão fixada.
- Abrir o app em duas abas (ou no StrictMode) não derruba mais a sessão: a
  renovação do token é compartilhada.

### Removido
- Cursores de colaboradores simulados.
- Modal de pré-visualização de canção (o editor abre direto).
- Fotos de banco de imagens em perfis, projetos e mural.
- Dependências não usadas do protótipo (shadcn completo, recharts,
  framer-motion, react-hook-form, lovable-tagger).
