# Funcionalidades

Cada funcionalidade do Compoze, numa seção curta: o que faz para quem usa,
como funciona por dentro, onde está o código e qual decisão a explica. As
telas, uma a uma, estão em [../telas/](../telas/README.md); a arquitetura
geral, em [../arquitetura.md](../arquitetura.md).

## Índice

1. [Conta e sessão](#1-conta-e-sessão)
2. [Escrever em blocos](#2-escrever-em-blocos)
3. [Autoria por trecho](#3-autoria-por-trecho)
4. [Escrever junto em tempo real](#4-escrever-junto-em-tempo-real)
5. [Escrever sem internet](#5-escrever-sem-internet)
6. [Coautoria e divisão](#6-coautoria-e-divisão)
7. [Convites](#7-convites)
8. [Versões e registro com hash](#8-versões-e-registro-com-hash)
9. [Memos de voz](#9-memos-de-voz)
10. [Esteira de estágios](#10-esteira-de-estágios)
11. [Organização: pastas, tags, busca](#11-organização-pastas-tags-busca)
12. [Projetos](#12-projetos)
13. [Apoio por PIX](#13-apoio-por-pix)
14. [Lixeira](#14-lixeira)
15. [Gente: seguir, mural, perfil](#15-gente-seguir-mural-perfil)
16. [Conversas ao vivo](#16-conversas-ao-vivo)
17. [Mapa](#17-mapa)
18. [Fotos e capas](#18-fotos-e-capas)
19. [Avisos (push)](#19-avisos-push)
20. [E-mail dos convites](#20-e-mail-dos-convites)
21. [App instalável (PWA)](#21-app-instalável-pwa)
22. [App Android](#22-app-android)
23. [Compartilhar para o Compoze](#23-compartilhar-para-o-compoze)
24. [Modo demonstração](#24-modo-demonstração)
25. [Tema claro e escuro](#25-tema-claro-e-escuro)
26. [Primeiros passos e ajuda](#26-primeiros-passos-e-ajuda)

---

## 1. Conta e sessão

**Para quem usa:** criar conta (nome artístico, `@`, e-mail, senha), entrar,
sair, trocar a senha em Ajustes. Quem já entrou no aparelho abre o app na
hora, mesmo com o servidor dormindo.

**Por dentro:** autenticação própria. Senha com argon2id; token de acesso JWT
de 30 minutos; token de renovação de 30 dias, de uso único, com rotação e
detecção de reuso (um token gasto reapresentado derruba a família inteira);
10 tentativas por minuto por IP. O app guarda a última sessão e a cópia do
caderno e confere a sessão em segundo plano.

**Onde:** `apps/api/src/modules/auth/`, `apps/web/src/store/authStore.ts`,
`services/api/authService.ts`, `lib/api.ts` (renova sozinho no `401`).

**Decisões:** [ADR 0006](../decisoes/0006-autenticacao-propria.md) (própria
em vez de Better Auth), [ADR 0019](../decisoes/0019-senha-nova-sem-a-atual.md)
(senha nova sem a atual). Telas: [entrada](../telas/entrada.md),
[ajustes](../telas/ajustes.md).

## 2. Escrever em blocos

**Para quem usa:** a canção é uma lista de seções, cifras, versos e notas.
Enter cria um verso, Backspace num bloco vazio apaga e volta, a cifra entra
acima do verso. "Cifras" esconde os acordes; "Alinhar" põe a letra em
monoespaçada para acorde e sílaba coincidirem.

**Por dentro:** cada bloco é um `textarea` que cresce com o texto; os blocos
vivem no documento Yjs da canção (próxima seção). Tipos no contrato:
`SECTION`, `CHORD`, `LYRIC`, `NOTE`.

**Onde:** `apps/web/src/pages/app/SongEditor.tsx`,
`components/editor/Bloco.tsx`. Tela: [editor](../telas/editor.md).

## 3. Autoria por trecho

**Para quem usa:** o trecho de cada coautor tem um fio na cor dele e o nome
na margem; os próprios trechos ficam limpos.

**Por dentro:** todo bloco tem `author_id`, gravado por quem o criou. As cinco
cores de autor são dessaturadas e escolhidas pelo id da pessoa
(`lib/autoria.ts`). As versões guardam o autor de cada bloco.

**Por quê:** é a prova de quem escreveu o quê, a razão de o Compoze existir.

## 4. Escrever junto em tempo real

**Para quem usa:** duas ou mais pessoas na mesma canção veem o que a outra
digita na hora, sem conflito, e quem está onde ("aqui agora", "Theo
escrevendo").

**Por dentro:** o conteúdo de cada canção é um **documento Yjs** (CRDT),
formato em `packages/documento`. No aparelho, `y-indexeddb`; na rede,
**Hocuspocus** dentro da própria API, em WebSocket `/collab`. A API projeta o
documento na tabela `song_blocks` (que listas, busca e versões leem), e as
rotas REST de blocos editam o documento. O desfazer é do `Y.UndoManager` e só
desfaz o que a própria pessoa fez. Presença pela "awareness" do Yjs.

**Onde:** `hooks/useDocumentoDaCancao.ts`, `lib/colaboracao.ts`,
`apps/api/src/modules/colab/`. Testes de fusão em `packages/documento` e de
dois editores em `apps/api/test/colaboracao.test.ts`.

**Decisão:** [ADR 0007](../decisoes/0007-documento-yjs-da-cancao.md).

## 5. Escrever sem internet

**Para quem usa:** o app abre e funciona sem rede. Escrever, criar canção,
mudar a ficha, criar pasta, mexer em projeto, editar o perfil, gravar memo:
tudo fica no aparelho e sobe quando a rede volta. O pé do menu diz quantas
mudanças ainda estão só no aparelho.

**Por dentro:**

| Peça | Papel |
| --- | --- |
| Documento Yjs no IndexedDB | O texto da canção; junta as edições offline sem perder nada |
| `lib/copiaLocal.ts` | Cópia do caderno (canções, pastas, projetos, pessoas) no IndexedDB, que abre o app na hora |
| `lib/fila.ts` | Fila de escritas REST no `localStorage`, em ordem, com `Idempotency-Key`, repetida até o servidor responder |
| Ids gerados no aparelho | UUIDv7, para criar coisas offline sem esperar o servidor dar um id |
| `plugins/idempotencia.ts` (API) | Guarda a resposta de cada `Idempotency-Key` por 24 h: um pedido repetido não cria duas canções |
| Service worker (PWA) e APK | O código do app está no aparelho; abre sem rede |

O que depende de outra pessoa ou de dinheiro (convite, divisão, registro,
mural, conversas, PIX) pede rede e diz isso no botão.

**Decisões:** [ADR 0005](../decisoes/0005-mobile-e-offline.md) (local-first),
[ADR 0008](../decisoes/0008-fila-offline-sobre-o-rest.md) (fila sobre o REST,
mais simples do que as rotas `/sync` previstas antes).

## 6. Coautoria e divisão

**Para quem usa:** na ficha da canção, cada coautor tem um percentual. A soma
fica aberta enquanto negociam; **Fechar divisão** exige 100%. Mudar um
percentual reabre.

**Por dentro:** `PUT /songs/{id}/contributions`, com `confirm: true` para
fechar; a regra RN05 está no serviço de
canções e é testada na API. Só a dona acerta e fecha.

**Tela:** [editor](../telas/editor.md#regras-da-coautoria-rn05).

## 7. Convites

**Para quem usa:** a dona convida pela conta (busca por nome ou `@`), e a
pessoa aceita ou recusa na Mesa; ou cria um link de uso único, por 7 dias,
para quem não tem conta. Cada convite tem um papel (Composição, Letra,
Arranjo e instrumentos, Produção, Só leitura).

**Por dentro:** tabela `song_invites` (migração 0008); o link guarda só o
SHA-256 do token. Aceitar devolve a canção completa, que entra no caderno na
hora. Convite pela conta avisa no celular.

**Decisão:** [ADR 0010](../decisoes/0010-convites.md). Telas:
[editor](../telas/editor.md#convidar-para-escrever),
[mesa](../telas/mesa.md), [convite](../telas/convite.md).

## 8. Versões e registro com hash

**Para quem usa:** o histórico guarda retratos da canção (à mão, a cada
mudança de estágio e no registro). Dá para ler, conferir o hash e restaurar.
"Registrar a obra" exige ser a dona e a divisão fechada.

**Por dentro:** tabela `song_versions` (migração 0007): JSON imutável com
título, estágio, blocos (com autor) e coautoria; `sha256` do JSON canônico e
`previous_sha256`, formando uma corrente. A canonicalização está em
`packages/contracts/src/canonico.ts`, usada pela API e pelo aparelho, que
confere o hash sozinho. Restaurar troca os blocos do documento numa transação
(`substituirBlocos`), que entra no desfazer.

**Decisão:** [ADR 0009](../decisoes/0009-versoes-e-registro.md) (inclui o que
ficou para depois: carimbo de tempo externo RFC 3161).

## 9. Memos de voz

**Para quem usa:** gravar a melodia ou o riff na própria canção, até 10
minutos, mesmo sem internet. Todos os coautores ouvem.

**Por dentro:** `MediaRecorder` (Opus ou AAC, 64 kbit/s). No aparelho, banco
IndexedDB `compoze-memos`; sobe com `PUT /songs/{id}/memos/{memo_id}` (id
gerado no aparelho) quando há rede. No servidor, tabelas `song_memos` e
`song_memo_audio` (`bytea`), até 8 MB por memo.

**Decisão:** [ADR 0012](../decisoes/0012-memos-de-voz.md) (Postgres em vez de
R2/S3, porque estes pedem cartão).

## 10. Esteira de estágios

**Para quem usa:** Ideia → Escrita → Revisão → Finalizada → Registrada →
Gravada. A Mesa mostra quantas obras há em cada; Canções filtra por estágio;
o marcador de estágio é uma escadinha com o degrau atual em vermelho.

**Por dentro:** `status` da canção; mudar guarda uma versão `ESTAGIO`.
`REGISTRADA` só pela rota de registro.

## 11. Organização: pastas, tags, busca

**Para quem usa:** pastas com subpastas (opcionais), tags na ficha, canção
privada ou visível no perfil, busca global (⌘K) por título, tag, verso,
projeto, pasta e pessoa.

**Por dentro:** pastas em `folders` com `parent_id` e proteção contra ciclo;
tags numa coluna da própria canção; a busca de canções e pastas é no aparelho; a de pessoas
de fora do caderno usa `GET /users?q=` (sem acento, `unaccent` + trigramas,
migrações 0004 e 0005).

**Telas:** [pastas](../telas/pastas.md), [canções](../telas/cancoes.md),
[casca](../telas/casca.md#busca-k--ctrlk).

## 12. Projetos

**Para quem usa:** single, EP ou álbum, com estilo, descrição, faixas em
ordem, fase (Planejamento, Produção, Mixagem, Lançado), lançamento, meta e
custo estimado, capa própria ou tipográfica.

**Por dentro:** `projects` e `project_songs` (com `track_number`). Projeto não
é dono da canção. Tela: [projetos](../telas/projetos.md).

## 13. Apoio por PIX

**Para quem usa:** a dona cadastra a chave PIX e divulga o link
`/apoiar/<id>`. Quem apoia escolhe o valor e paga pelo QR ou copia e cola,
direto para a dona, sem taxa, e avisa "Já paguei". A dona confere no extrato e
marca "Chegou" ou "Não chegou"; só o que chegou soma.

**Por dentro:** BR Code estático montado na API (`lib/pix.ts`, com CRC16 e
`txid`), tabelas `project_pix` e `project_contributions` (migração 0014),
estados `PENDENTE` → `CONFIRMADO` ou `RECUSADO`. Avisos nos dois sentidos.

**Decisão:** [ADR 0018](../decisoes/0018-apoio-por-pix.md). Telas:
[projetos](../telas/projetos.md#apoio-por-pix-só-a-dona-vê),
[apoiar](../telas/apoiar.md).

## 14. Lixeira

**Para quem usa:** excluir manda para a lixeira por 30 dias; restaurar devolve
ao mesmo lugar; dá para apagar de vez.

**Por dentro:** `deleted_at` na canção; job diário do pg-boss às 3h
(`expurgo-da-lixeira`), que também apaga imagens sem dono e chaves de
idempotência vencidas. Regras RN07 e RN08. Tela:
[lixeira](../telas/lixeira.md).

## 15. Gente: seguir, mural, perfil

**Para quem usa:** seguir pessoas, publicar no mural (citando uma canção não
privada), curtir, comentar, ver perfis, listas de seguidores e seguindo com
"Mensagem" e "Seguir de volta".

**Por dentro:** `follows`, `posts`, `post_likes`, `post_comments` (migração
0010); mural paginado por cursor; React Query no front, sem cópia offline.
Seguir avisa a pessoa.

**Decisão:** [ADR 0013](../decisoes/0013-seguir-e-mural.md). Telas:
[mural](../telas/mural.md), [perfil](../telas/perfil.md).

## 16. Conversas ao vivo

**Para quem usa:** conversa a dois, com mensagem que chega na hora, contador
de não lidas no menu e aviso quando o app está fechado. Começa pelo botão
"Nova conversa" (busca por nome ou @), pelo perfil ou pela lista de seguidores.

**Por dentro:** `conversations` (uma por par), `conversation_members`,
`messages` (migração 0011); `GET /events` em Server-Sent Events com um hub em
memória na API; o app fecha o fluxo em segundo plano para o servidor mandar
push.

**Decisão:** [ADR 0014](../decisoes/0014-conversas-ao-vivo.md). Tela:
[conversas](../telas/conversas.md).

## 17. Mapa

**Para quem usa:** quem compõe perto, por cidade, só quem escolheu aparecer.

**Por dentro:** `users.location` (PostGIS) e `show_on_map`, índice espacial só
sobre quem aparece, `GET /map/people` sem e-mail. Regra RN11. Falta a opção em
Ajustes ([mapa](../telas/mapa.md#limite-atual)).

## 18. Fotos e capas

**Para quem usa:** foto de perfil e capa de projeto, com "tirar" para voltar
ao monograma e à capa tipográfica.

**Por dentro:** o aparelho reduz (512 px no perfil, 1200 px na capa, WebP ou
JPEG); tabela `images` (`bytea`, migração 0012); `GET /images/{id}` público e
imutável, com o tipo conferido pelos bytes; imagens sem dono saem no expurgo.

**Decisão:** [ADR 0015](../decisoes/0015-imagens-no-postgres.md).

## 19. Avisos (push)

**Para quem usa:** aviso do sistema para mensagem nova, convite, seguidor novo
e apoio por PIX, com o app fechado, ligado por aparelho em Ajustes. O app pede
a permissão ao abrir.

**Por dentro:** no navegador e na PWA, **Web Push** com chaves VAPID que a API
gera e guarda em `server_keys`; no APK, **Firebase Cloud Messaging** (HTTP v1,
assinado com `jose`, sem `firebase-admin`). Tabela `push_subscriptions`
(`WEBPUSH` ou `FCM`, migração 0013). O servidor só manda push a quem não tem
um fluxo ao vivo aberto.

**Decisão:** [ADR 0016](../decisoes/0016-avisos-por-push.md). Configuração:
[android.md](../mobile/android.md#avisos-por-push-firebase),
[deploy.md](../backend/deploy.md#avisos-por-push-adr-0016).

## 20. E-mail dos convites

**Para quem usa:** o link de convite também pode ir por e-mail, quando o
envio estiver ligado.

**Por dentro:** fila de e-mail no pg-boss (`lib/correio.ts`), com dois
remetentes: **Resend** (com domínio próprio) ou **SMTP** (Gmail com senha de
app, sem domínio). Sem nenhum dos dois, o campo de e-mail nem aparece.

**Situação:** código pronto; falta pôr `SMTP_USER` e `SMTP_PASS` no Render.
**Decisões:** [ADR 0010](../decisoes/0010-convites.md),
[ADR 0017](../decisoes/0017-email-por-smtp.md). Passos em
[deploy.md](../backend/deploy.md#e-mail-dos-convites).

## 21. App instalável (PWA)

**Para quem usa:** "Instalar" no Chrome e no Edge, "Adicionar à tela inicial"
no Android e no iPhone. Abre sem rede; versão nova pergunta antes de entrar.

**Por dentro:** `vite-plugin-pwa` (Workbox `generateSW`), `share_target` no
manifesto, `navigator.storage.persist()` depois do login, `avisos-sw.js`
importado no service worker. Detalhes em
[frontend/arquitetura.md](../frontend/arquitetura.md#pwa-fase-2c).

## 22. App Android

**Para quem usa:** um APK baixado do GitHub, que abre sem rede, recebe push,
aparece no "Compartilhar" do Android e avisa quando há versão nova.

**Por dentro:** o mesmo `apps/web` empacotado pelo **Capacitor 8**; workflow
`android.yml` gera, assina e publica o APK nos Releases; aviso de versão nova
pela API de Releases do GitHub. Versão atual: v0.2.1.

**Decisão:** [ADR 0011](../decisoes/0011-app-android-fora-da-loja.md). Guia:
[mobile/android.md](../mobile/android.md).

## 23. Compartilhar para o Compoze

**Para quem usa:** de qualquer app do Android, "Compartilhar → Compoze"
transforma o texto numa canção no estágio Ideia. Funciona offline.

**Por dentro:** plugin nativo `CompartilharPlugin.java` no APK e
`share_target` na PWA; os dois levam a `/compartilhar`. Tela:
[compartilhar](../telas/compartilhar.md).

## 24. Modo demonstração

**Para quem usa:** com `VITE_API_URL=demo`, o app inteiro roda sem servidor,
com o caderno de exemplo de "Lara Mendes", guardado só no navegador. Ajustes
tem "Restaurar dados de exemplo".

**Por dentro:** `apps/web/src/demo/servidor.ts` responde às mesmas rotas da
API dentro do navegador (inclusive mural, conversas e eventos ao vivo);
`semente.ts` tem os dados. PIX não funciona na demo.

**Decisão:** [ADR 0003](../decisoes/0003-modo-demo.md).

## 25. Tema claro e escuro

**Para quem usa:** "Papel", "Noite" ou "Sistema", em Ajustes ou no botão do
pé do menu.

**Por dentro:** tokens de cor em CSS (`apps/web/src/index.css`) com duas
paletas; `lib/tema.ts` guarda a escolha. O mapa troca de fundo junto. Ver o
[design system](../frontend/design-system.md).

## 26. Primeiros passos e ajuda

**Para quem usa:** no primeiro acesso, sete folhas explicam para que serve o
Compoze e como usar cada parte. Em qualquer tela, "Ajuda desta tela" (ícone no
topo do celular, item no menu do computador, tecla `?`) explica o que ela faz.

**Por dentro:** texto todo em `lib/ajuda.ts`, com o mapa rota → tópico; o
"já viu" fica no `localStorage`, por conta e aparelho; um teste exige ajuda
para toda tela do menu.

**Decisão:** [ADR 0020](../decisoes/0020-primeiros-passos-e-ajuda.md). Tela:
[ajuda](../telas/ajuda.md).
