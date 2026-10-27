# Changelog

Formato baseado em [Keep a Changelog](https://keepachangelog.com/pt-BR/1.1.0/).

## [Não lançado]

### Adicionado
- Novidades na Mesa, como numa rede social: mensagens recebidas, comentários
  e curtidas nas suas publicações, gente nova seguindo você, convites
  recebidos e aceitos, e apoios por PIX. As novas levam o traço do lápis e
  contam no menu ("Novidades") e num sino na barra do celular; "Ver todas"
  abre a tela `/novidades`. Rota `GET /notifications` e
  `PUT /notifications/seen`; tela `/posts/:id` para abrir uma publicação com
  os comentários. Comentário na sua publicação agora também chega por push
  (ADR 0023).
- Janela de recorte ao escolher foto de perfil, capa do perfil ou capa de
  projeto: arrastar posiciona, o controle, a roda do mouse ou dois dedos
  aproximam. A foto sai num círculo; a capa do perfil, em 3:1 (ADR 0022).

### Corrigido
- A capa do perfil trocada no próprio perfil não aparecia até recarregar a
  página (a consulta do perfil não era invalidada).

### Melhorado (ajustes do primeiro teste, ADR 0021)
- Mesa: a Esteira ganhou um cartão em papel kraft, com um traço do lápis nos
  estágios que têm obra, para não sumir no papel. "Na roda" fica num quadro
  bege claro em vez de solto no branco.
- Canções: a vista em fichas mostra duas por linha já no celular, com fichas
  mais compactas (três ou quatro por linha no computador).
- Projetos: grade de duas colunas no celular, com "Abrir e editar" em cada
  projeto.
- Mural: cada publicação fica no seu cartão, em folha mais clara que o papel
  (no mural, no perfil e na Mesa).

### Documentação
- Documentação completa em `docs/`: uma página por tela em `docs/telas/`
  (com imagens), catálogo de funcionalidades, arquitetura do sistema, linha
  do tempo do projeto, funcionalidades futuras (lojas, assinaturas, Mercado
  Pago) e glossário. `docs/README.md` diz por onde começar.

### Corrigido
- Avisos por push mostram a nota do Compoze no lugar de um quadrado branco.
  No navegador e na PWA, o selo da barra de status (`badge`) passou a ser
  uma nota branca sobre transparente (`aviso-badge.png`); no APK, o servidor
  manda o ícone e a cor do aviso em cada envio, além do que já estava no
  manifest.
- Avisos no celular: com o Compoze em segundo plano, a mensagem nova não
  virava aviso, porque o navegador mantinha a conexão ao vivo aberta e o
  servidor achava que a pessoa estava olhando. Agora o app fecha a conexão ao
  sair da tela e reabre ao voltar. Seguidor novo também passa a avisar.
- Entrar e criar conta com a API dormindo (Render grátis) não parece mais
  travado: a tela acorda a API ao abrir e, se o envio demorar, explica que o
  servidor está acordando e que leva até um minuto.
- A busca do topo (Buscar / ⌘K) acha qualquer pessoa do Compoze pelo nome ou
  pelo @, sem acento. Antes ela só via quem já estava no seu caderno
  (coautores e contatos), e "Nada encontrado" aparecia para todo o resto.

### Removido
- `POST /songs/{id}/collaborators`: ninguém entra numa canção sem aceitar um
  convite (ADR 0010).

### Adicionado
- Botão "Nova conversa" na tela Conversas: procura qualquer pessoa do Compoze
  pelo nome ou pelo @ (com o campo vazio, mostra quem você segue) e abre a
  conversa com ela, sem precisar passar pelo perfil.
- Número da faixa à mão (ADR 0021): ao adicionar uma faixa dá para escrever o
  número (a 7, por exemplo) ou deixar vazio para seguir a ordem. Tocar no
  número de uma faixa muda o número; se outra faixa já tinha, as duas trocam.
  O número também aparece e muda na ficha da canção, no editor, que ganhou
  "Pôr num projeto".
  - API: `PATCH /projects/{id}/songs/{song_id}`; `POST` com número ocupado
    dá `409`.
- Editar projeto: nome, formato, descrição, data de lançamento, meta e custo
  estimado, que antes só se definiam na criação.
- Entradas e custos do projeto (ADR 0021): lançar o que entrou (show, edital,
  dinheiro da banda) e os custos de produção item a item (cachês, estúdio,
  locação de espaço), com categoria e data. Entrada soma no arrecadado, junto
  com os apoios por PIX; o resumo mostra entrou, custos e saldo, e a ficha do
  projeto passa a mostrar o custo lançado ao lado do estimado.
  - API: `/projects/{id}/entries` (GET, POST, PATCH, DELETE); tabela
    `project_entries`, migração 0015.
- Capa do perfil (ADR 0021): foto larga no topo do perfil, trocada no próprio
  perfil ou em Ajustes › Perfil. Sem foto, papel kraft com a pauta.
  - API: `PUT/DELETE /users/me/cover`; `cover_url` no perfil.
- Primeiros passos e ajuda (ADR 0020): no primeiro acesso, sete folhas
  explicam para que serve o Compoze e como usar a folha, a parceria e a
  coautoria, os estágios, pastas e projetos, o mural, as conversas e o mapa.
  Abre uma vez por conta em cada aparelho e pode ser pulado.
  - Botão de ajuda em todas as telas (ícone no topo, no celular; "Ajuda desta
    tela" no menu, no computador; tecla `?`): explica a tela aberta e leva à
    ajuda das outras.
  - Rever os primeiros passos em Ajustes → Ajuda, no painel de ajuda ou pela
    busca (⌘K).
- Lista de seguidores e de quem a pessoa segue (ADR 0013): os números
  "Seguidores" e "Seguindo" do perfil abrem a lista de pessoas, como no
  Instagram, com abas para trocar entre as duas. Cada pessoa tem
  "Mensagem" (abre ou cria a conversa a dois) e o botão de seguir, que mostra
  "Seguir", "Seguir de volta" (quem já segue você) ou "Deixar de seguir".
  - Rotas `/profile/{username}/seguidores` e `/profile/{username}/seguindo`.
  - API: `/users/{id}/followers` e `/users/{id}/following` passam a trazer
    `followed_by_me` e `follows_me` de cada pessoa.
  - O botão de seguir do perfil também mostra "Seguir de volta".
- Ao abrir, o app já pede permissão para mandar avisos (navegador, app
  instalado e APK). Quem desligou em Ajustes não é perguntado de novo. No
  Safari e no Firefox, que só perguntam depois de um toque, aparece uma nota
  com o botão "Ligar avisos".
- Ajustes → Senha (ADR 0019): escolher uma senha nova, sem precisar da atual.
  Este aparelho continua dentro; nos outros, é preciso entrar de novo.
  API: `POST /auth/password`.
- Fase 4d, apoio por PIX (ADR 0018): no detalhe do projeto, a dona cadastra
  a chave PIX e copia o link de apoio. Quem abre o link escolhe o valor e
  paga pelo QR ou pelo copia e cola, direto para a chave dela, sem taxa.
  - "Já paguei" avisa a dona; ela confere no extrato e marca "Chegou" ou
    "Não chegou". Só o que chegou soma no arrecadado, e quem apoiou é avisado.
  - API: `/projects/{id}/pix`, `/projects/{id}/contributions…` e
    `/support/{id}…`; tabelas `project_pix` e `project_contributions`
    (migração 0014).
  - O arrecadado do projeto passa a mostrar o valor exato, não o calculado
    do percentual arredondado.
- Convites por e-mail pelo Gmail, sem domínio (ADR 0017): com `SMTP_USER` e
  `SMTP_PASS` (senha de app) no Render, o e-mail do convite sai pelo SMTP.
  O Resend continua valendo quando houver domínio. Passos em
  docs/backend/deploy.md.
- Fase 3d, avisos por push (ADR 0016): Ajustes → Avisos liga, neste
  aparelho, o aviso do sistema para mensagem nova e convite para canção, mesmo
  com o Compoze fechado. Navegador e PWA; no iPhone, só instalado na tela de
  início. Sem conta externa: o servidor gera as próprias chaves VAPID.
  - API: `GET /push/public-key`, `PUT/DELETE /push/subscriptions`; tabelas
    `push_subscriptions` e `server_keys` (migração 0013).
  - App Android: push pelo Firebase, pronto no código. Liga com os segredos
    `GOOGLE_SERVICES_JSON` (GitHub) e `FIREBASE_SERVICE_ACCOUNT` (Render);
    passos em docs/mobile/android.md. Tocar no aviso abre a conversa.
- Fase 4c, imagens (ADR 0015): foto de perfil (Ajustes → Perfil) e capa de
  projeto (no detalhe do projeto), com "tirar" para voltar ao monograma e à
  capa tipográfica.
  - O aparelho reduz a imagem antes de subir (512 px no perfil, 1200 px na
    capa); uma foto de 5 MB chega ao servidor com poucos KB.
  - API: `PUT/DELETE /users/me/avatar`, `PUT/DELETE /projects/{id}/cover` e
    `GET /images/{id}` sem login; tabela `images` (migração 0012). O tipo é
    conferido pelos bytes. Imagens sem dono saem no expurgo diário.
- Fase 4b, conversas (ADR 0014): a tela de Conversas deixa de ser prévia.
  - "Conversar" no perfil abre (ou cria) a conversa com a pessoa.
  - A mensagem chega na hora, nos dois lados e em todos os aparelhos. Fora
    da conversa, aparece um aviso com "Abrir"; o menu mostra quantas não
    foram lidas.
  - API: `/conversations`, `/conversations/{id}/messages`, `.../read` e o
    fluxo ao vivo `GET /events` (Server-Sent Events); tabelas
    `conversations`, `conversation_members`, `messages` (migração 0011).
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
