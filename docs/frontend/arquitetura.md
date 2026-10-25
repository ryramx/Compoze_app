# Arquitetura do frontend

`apps/web` — React 19 + Vite 7 + TypeScript (strict) + Tailwind CSS 4.

## Camadas

```
pages/            Telas. Leem do store e chamam ações; não conhecem HTTP.
components/
  ui/             Primitivos sem domínio: Botao, Campo, Dialogo, Menu, Dica.
  compoze/        Peças do domínio: Monograma, Estagio, Capa, BuscaGlobal…
  editor/         Bloco e Ficha técnica do editor de canções.
  layout/         Casca do app (trilho de navegação, abas no celular).
store/            Zustand. compozeStore guarda o conjunto de trabalho;
                  authStore guarda a sessão.
services/api/     Uma função por rota. Recebe e devolve tipos de domínio.
  dto.ts          Tipos exatamente como a API os envia (snake_case), derivados
                  dos schemas de @compoze/contracts (só tipos, sem zod no bundle).
  adapters.ts     Único lugar que traduz DTO ⇄ domínio.
services/mock/    Funções puras sobre listas (filtros, lixeira) e as partes
                  sociais que ainda não têm backend.
lib/api.ts        Transporte: fetch, token, erros (ApiError), modo demo.
demo/             Servidor de demonstração (ADR 0003).
types/            Tipos de domínio usados pelas telas.
```

A regra é que o formato da API não vaze para as telas. Se a API mudar um nome
de campo, o schema em `packages/contracts` muda, o `tsc` do front aponta o que
quebrou em `adapters.ts` e nos serviços, e nenhuma tela muda.

## Estado

O `compozeStore` carrega, ao entrar, tudo o que a pessoa tem: canções (com
blocos), lixeira, pastas, projetos e as pessoas citadas. As telas leem dele de
forma síncrona, o que importa porque `getUser` aparece em quase todo
componente.

Escritas são **otimistas e adiadas**: o estado local muda na hora e a gravação
vai ao servidor 600 ms depois da última tecla, por chave (`song:id`,
`folder:id`…). Uma falha recarrega do servidor.

O conteúdo das canções (blocos) não passa por aí: é do documento Yjs de cada
canção (ADR 0007), editado pelo `useDocumentoDaCancao`. O store só recebe uma
cópia dos blocos (`definirBlocos`) para Mesa, listas e busca ficarem em dia.

Uma requisição que volta `401` renova o access token pelo refresh e repete uma
vez (`definirRenovador` em `lib/api.ts`, registrado pelo `authService`).

TanStack Query é usado onde o dado não pertence ao conjunto de trabalho (ex.:
pessoas no mapa).

A carga inicial pede as canções completas (`expand=blocks,collaborators`) e os
projetos já com as faixas, numa ida cada.

## Rotas

| Rota | Tela |
| --- | --- |
| `/login`, `/cadastro` | Entrada (públicas) |
| `/` | Mesa |
| `/songs` (`?estagio=`, `?q=`) | Índice de canções |
| `/songs/:id/edit` | Editor |
| `/folders` (`?pasta=`) | Pastas |
| `/projects`, `/projects/:id` | Projetos |
| `/feed`, `/messages`, `/map` | Gente |
| `/profile`, `/profile/:username` | Perfil |
| `/trash`, `/settings` | Lixeira, Ajustes |

`RequireAuth` restaura a sessão pelo refresh token e espera a carga inicial
antes de renderizar qualquer tela protegida. Sem rede, restaura com a última
pessoa conhecida. As telas, exceto a Mesa, são carregadas sob demanda
(`React.lazy`) e baixadas em segundo plano logo depois de abrir, para que
continuem abrindo se a rede cair.

## Offline (ADR 0008)

| Peça | O que faz |
| --- | --- |
| `lib/fila.ts` | Fila de escritas no `localStorage`, por pessoa. O store põe ali toda escrita de canção (registro), pasta, projeto e perfil, e a tela muda antes. Envia em ordem, com `Idempotency-Key`, e tenta de novo sem rede |
| `lib/copiaLocal.ts` | Cópia do caderno no IndexedDB. Abre o app na hora, com ou sem rede |
| `lib/folhaInicial.ts` | Semeia "Verso 1" no documento local de uma canção nova (`folha_pautada: false` no `POST /songs`) |
| `lib/rede.ts` | `useOnline()` e o texto padrão de ação que precisa de rede |

Na carga (`hydrate`): primeiro a cópia, depois esvazia a fila e só então relê o
servidor. Se a fila não esvazia, a tela fica com a cópia (`semRede`) e relê
quando o navegador avisa que a rede voltou. Recusa definitiva de um item da
fila vira aviso e releitura (`AppLayout`). O pé do menu mostra se está sem
internet e quantas mudanças ainda estão só no aparelho.

**Abrir sem esperar o servidor.** Quem já entrou no aparelho abre o app na
hora, com a última sessão e a cópia do caderno, e a sessão é conferida em
segundo plano (`restaurarSessao` no `authStore`). Se o servidor recusar a
sessão, o app sai. Isso cobre a API dormindo no Render grátis, que leva até
um minuto para acordar: nesse tempo o app funciona como offline, e o pé do
menu avisa "Conectando ao servidor" se a leitura passar de 3 s.

Ficam desligados offline, com a explicação no botão: convidar e remover
coautor, aceitar convite e fechar a divisão de coautoria.

## Convites (ADR 0010)

| Peça | Papel |
| --- | --- |
| `services/api/inviteService.ts` | Rotas de convite; `enderecoDoLink` monta `/convite/{token}` na origem do app |
| `components/editor/Convidar.tsx` | Diálogo da dona: busca por nome ou @ (`GET /users?q=`), link para quem não tem conta, convites abertos |
| `components/compoze/ConvitesRecebidos.tsx` | Convites pela conta no alto da Mesa, com Aceitar e Recusar. Relê ao abrir a Mesa |
| `pages/app/Convite.tsx` | Página do link. Sem sessão, o `RequireAuth` manda ao login com `from`, e login e cadastro devolvem para cá |

Aceitar põe a canção no caderno na hora (`receberMusica` no store), sem
esperar a próxima leitura.

## PWA (Fase 2c)

`vite-plugin-pwa` (Workbox, `generateSW`) gera o `sw.js` e o manifesto no
build; a configuração está em `vite.config.ts`.

- O service worker guarda o app inteiro: JS, CSS, ícones e as fontes latinas.
  Toda rota abre o `index.html` guardado. Os dados não passam por ele: ficam
  no IndexedDB e na fila (ADR 0008), e a API é outra origem.
- Versão nova não entra sozinha. `lib/pwa.ts` mostra "Há uma versão nova do
  Compoze" com o botão Atualizar, que fica até a pessoa escolher.
- Na primeira instalação aparece "Pronto: o Compoze agora abre mesmo sem
  internet".
- Depois do login, o app pede armazenamento persistente
  (`navigator.storage.persist()`), para o navegador não apagar o caderno
  quando faltar espaço.
- Ícones em `public/`: `pwa-192.png`, `pwa-512.png`, `pwa-maskable-512.png`
  (com margem para os recortes do Android) e `apple-touch-icon.png`. Eles
  foram gerados a partir do `favicon.svg`.
- No `pnpm dev` não há service worker. Para testar a PWA, use
  `pnpm build && pnpm preview`.

No app Android (Capacitor, ADR 0011) não há service worker: o app já está no
APK. Ver [`docs/mobile/android.md`](../mobile/android.md).

O manifesto tem `share_target` (Fase 3b): instalada no Android, a PWA aparece
no menu "Compartilhar" e o texto chega em `/compartilhar?title=&text=&url=`
(`pages/app/Compartilhar.tsx`, que cria a canção com `lib/compartilhar.ts`).
Sem sessão, o `RequireAuth` guarda o caminho com a busca e devolve depois do
login.

Instalar: no Chrome e no Edge, o ícone de instalar na barra de endereço (no
Android, "Adicionar à tela inicial"). No iPhone, Safari → Compartilhar →
"Adicionar à Tela de Início". No iOS, só o app instalado fica livre da regra
que apaga dados de sites sem uso há 7 dias.

## Editor

- Cada bloco é um `textarea` que cresce com o conteúdo. Enter cria um verso
  abaixo; Backspace num bloco vazio o remove e volta ao anterior.
- Inserção pelo cursor: abaixo do bloco em foco; cifra pedida sobre um verso
  entra acima dele.
- Os blocos vivem no documento Yjs da canção (ADR 0007), salvo no IndexedDB do
  aparelho e sincronizado em tempo real pelo Hocuspocus. Offline continua
  escrevendo; a barra diz se está sincronizando, salvo, offline (salvo no
  aparelho) ou, na demonstração, salvo no aparelho.
- Quem mais está com a canção aberta aparece na barra ("aqui agora") e na
  margem do bloco em que está ("Fulana escrevendo").
- Desfazer/refazer (Ctrl+Z na folha) é do `Y.UndoManager`: desfaz só o que
  esta pessoa fez, inclusive inserir e remover blocos. Título e ficha usam o
  desfazer do próprio campo.
- No modo demonstração não há servidor: a primeira abertura semeia o documento
  com os blocos de exemplo, e cada mudança é projetada de volta no servidor de
  demonstração (`projetarDocumento`). "Restaurar dados de exemplo" e sair da
  conta apagam as cópias locais.
- Histórico de versões (menu "Mais ações", ADR 0009). Dá para guardar a
  versão de agora com um nome, ler as antigas, conferir o hash no aparelho
  (`versionService.conferir`) e restaurar o texto de uma delas. Restaurar troca
  os blocos do documento numa transação (`substituirBlocos`), entra no Ctrl+Z
  e antes guarda o texto de agora como versão.
- Clicar em "Registrada" na ficha abre "Registrar a obra". O diálogo mostra o
  que falta (ser a dona, divisão fechada, internet) e chama
  `POST /songs/{id}/register`.
- "Alinhar" troca a letra para fonte monoespaçada, para que acorde e sílaba
  coincidam. A preferência fica no navegador.
- A autoria aparece como marginália: fio na cor de quem escreveu e o nome na
  margem no começo de cada trecho.

## Testes

Vitest + Testing Library (`pnpm test`). Cobrem adapters, transporte, store,
fila offline, guarda de rota e o servidor de demonstração. A fusão de edições do documento é
testada em `packages/documento`, e a edição em tempo real com dois editores,
em `apps/api/test/colaboracao.test.ts`.

## Memos de voz (Fase 3c, ADR 0012)

| Peça | O que faz |
| --- | --- |
| `components/editor/Memos.tsx` | Diálogo do botão "Memos" no editor: gravar (`MediaRecorder`, até 10 min), tocar, renomear, apagar |
| `lib/memos.ts` | Memos no aparelho (IndexedDB, banco `compoze-memos`): grava pendente, sobe com `enviarPendentes` (ao gravar, ao abrir o app, ao voltar a rede, ao abrir o diálogo), junta a lista do servidor com os pendentes |
| `services/api/memoService.ts` | Rotas `/songs/{id}/memos`; o áudio vai cru (`api.subir`) e volta como `Blob` (`api.baixar`) |

O formato de gravação é o primeiro que o aparelho aceita entre Opus (WebM,
Ogg) e AAC (`audio/mp4`, o do Safari). Na demonstração, o áudio fica no
IndexedDB e os dados no banco da demo.

## Gente: seguir e mural (Fase 4a, ADR 0013)

Mural e seguidores não passam pelo store do caderno: exigem rede e não têm
cópia no aparelho. As telas leem da API com React Query.

| Peça | O que faz |
| --- | --- |
| `services/api/genteService.ts` | Perfil, seguir, mural, publicações, curtidas, comentários |
| `pages/app/Feed.tsx` | Mural (`useInfiniteQuery`, chave `["mural","meu"]`), caixa de publicar com canção citada, sugestões |
| `pages/app/Profile.tsx` | Seguidores e "segue você" de `/profiles/{username}`; mural da pessoa (`["mural","autora",id]`) |
| `components/gente/Publicacao.tsx` | Uma publicação: curtir (muda na hora e volta se falhar), comentários, apagar |
| `components/gente/BotaoDeSeguir.tsx` | Seguir/Seguindo, atualiza o perfil em cache e relê o mural |
| `components/gente/cache.ts` | `trocarNoMural`: muda uma publicação em todas as páginas de mural em cache |

A Mesa mostra as três mais novas (`["mural","roda"]`).

## Conversas (Fase 4b, ADR 0014)

| Peça | O que faz |
| --- | --- |
| `pages/app/Messages.tsx` | `/messages` e `/messages/:id`; `?com=<id>` abre a conversa com a pessoa (o "Conversar" do perfil) |
| `components/gente/conversas.ts` | `useConversas` (chave `["conversas"]`), `useNaoLidas` (contador do menu), `guardarMensagem` |
| `components/gente/AoVivo.tsx` | Montado no `AppLayout`: mantém o fluxo ao vivo e põe cada mensagem no cache; fora da conversa, avisa |
| `lib/aoVivo.ts` | Lê `GET /events` com `fetch` (token no cabeçalho), reconecta com espera crescente. Na demo, o servidor da demo chama `emitir` |
| `services/api/conversaService.ts` | Rotas `/conversations` |

## Foto de perfil e capa (Fase 4c, ADR 0015)

| Peça | O que faz |
| --- | --- |
| `components/compoze/EscolherImagem.tsx` | "Trocar / tirar" com o seletor de arquivo do sistema (no celular, oferece a câmera). Usado em Ajustes → Perfil e no detalhe do projeto |
| `lib/imagens.ts` | `reduzirImagem` (lado maior 512 px no perfil, 1200 px na capa, WebP ou JPEG) e `enderecoDaImagem`, que transforma o `/images/{id}` da API em endereço completo |
| Store: `trocarFoto`, `trocarCapa` | Reduzem, sobem e atualizam o store com a resposta. Pedem rede; não passam pela fila |
| `services/api/adapters.ts` | `avatar` e `cover` já saem com o endereço completo, para `Monograma` e `Capa` não saberem de onde vem a imagem |

Na demonstração, a imagem reduzida vira `data:` no próprio registro.

## Avisos por push (Fase 3d, ADR 0016)

| Peça | O que faz |
| --- | --- |
| `public/avisos-sw.js` | Importado pelo service worker do Workbox (`workbox.importScripts`). Mostra o aviso no `push` e, no toque, foca a janela aberta ou abre uma na `url` do aviso |
| `lib/avisos.ts` | `ligarAvisos` (permissão, `subscribe` com a chave da API, `PUT` da inscrição), `desligarAvisos`, `renovarAvisos` (a cada abertura, no `AppLayout`) e `esquecerAvisos` (no `logout`) |
| Ajustes → Avisos | Liga e desliga por aparelho; explica o bloqueio do navegador e o caso do iPhone (só instalado na tela de início) |

Fora do app Android e do modo demo. Para testar, `vite build` + `vite preview`:
no `pnpm dev` não há service worker.
