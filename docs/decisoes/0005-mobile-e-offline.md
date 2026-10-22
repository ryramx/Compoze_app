# 0005 · Mobile instalável e uso offline

- Status: aceita (direção); detalhes de implementação revisados a cada fase
- Data: 2026-10-22

## Contexto

O Compoze precisa poder ser baixado no celular e usado sem internet. Para quem
compõe, isso não é detalhe: a ideia vem no ônibus, no estúdio sem sinal, no
avião. Um caderno que não abre offline perde para o bloco de notas do celular.

Hoje o app é uma SPA que depende da API para tudo: sem rede, nem abre. Usar
offline de verdade pede três coisas que não existem ainda:

1. o app abrir sem rede;
2. os dados da pessoa estarem no aparelho;
3. o que foi feito offline chegar ao servidor depois, sem perder nem
   sobrescrever o que outra pessoa escreveu no mesmo tempo.

O terceiro ponto é o difícil, e no Compoze ele é o caso comum: coautoria
significa duas pessoas mexendo na mesma canção, às vezes as duas offline.

## Decisão

### Distribuição: um só código, três formas

| Forma | Como | Quando |
| --- | --- | --- |
| Web | Como hoje | Já |
| **PWA instalável** | `vite-plugin-pwa` (Workbox): manifesto, ícones, service worker que guarda o app inteiro no aparelho | Fase 2 |
| **App nas lojas** (App Store, Play Store) | **Capacitor** empacotando o mesmo `apps/web` | Fase 3 |

Capacitor, e não React Native, porque reaproveita 100% das telas que já
existem. O que só o nativo dá — gravar memo de voz com a tela bloqueada,
armazenamento que o sistema não apaga, compartilhar para o app, notificação
confiável no iOS — vem por plugins do Capacitor.

### Dados: local-first

O aparelho passa a ser a primeira cópia dos dados; o servidor é o ponto de
encontro entre aparelhos e pessoas.

**Conteúdo da canção (blocos, letra, cifra) → Yjs.**
Cada canção é um documento CRDT (Yjs). No aparelho ele é salvo no IndexedDB
(`y-indexeddb`); com rede, sincroniza pelo Hocuspocus. CRDT é feito para
exatamente este caso: duas pessoas editam o mesmo verso offline e, quando as
duas voltam, as edições se fundem sem conflito e sem perda. A autoria por
trecho vem junto, porque cada inserção no Yjs sabe quem a fez.

**Dados estruturados (canção como registro, pastas, projetos, perfil) →
banco local + fila de envio.**
- Leitura: um banco local no aparelho (IndexedDB via Dexie; SQLite nativo no
  Capacitor) espelha o conjunto de trabalho da pessoa. Ele é preenchido e
  atualizado por `GET /sync/changes?since=<cursor>`, que devolve só o que mudou
  desde a última sincronização, incluindo exclusões.
- Escrita: cada ação vira uma operação numa fila local (outbox) e é aplicada no
  banco local na hora. Com rede, a fila é enviada em ordem.
- Ids gerados no aparelho (UUID v7), para que algo criado offline já tenha sua
  identidade definitiva e possa ser referenciado (uma canção nova numa pasta
  nova, as duas criadas no avião).
- Cada operação leva uma `Idempotency-Key`: reenviar depois de uma queda não
  duplica nada.
- Conflito em campo simples (título, tom, pasta): vence a última escrita, campo
  a campo, com a coluna `version` de cada linha para o servidor detectar e
  registrar o que foi sobrescrito.

**O que exige rede, de propósito.** Algumas ações dependem de um juiz único e
ficam indisponíveis offline, com aviso claro na interface:

- fechar a divisão de coautoria (RN05) — o servidor precisa ver a versão final
  de todos;
- convidar ou remover coautor;
- registrar a obra (gera versão com hash);
- mural, conversas, mapa e busca de pessoas.

**Alternativa avaliada: motor de sincronização pronto (PowerSync, Electric,
Zero).** Eles replicam o Postgres para um SQLite no aparelho e cuidariam da
fila e do delta. Ficam como plano B: os dados estruturados do Compoze são
poucos e simples, e o conteúdo pesado (a letra) já é resolvido pelo Yjs. Um
motor externo seria mais um serviço para operar e pagar. Reavaliamos se a
camada própria de sincronização passar de algumas centenas de linhas.

### Sessão offline

- O app abre com a última sessão conhecida, mesmo com o token vencido; as
  escritas esperam na fila até a renovação.
- Se o refresh token expirar, os dados locais continuam legíveis e editáveis; a
  sincronização pede login de novo.
- No Capacitor, tokens vão para o armazenamento seguro do sistema (Keychain /
  Keystore). No navegador, o risco de token em `localStorage` é aceito e
  mitigado com token de acesso curto e refresh rotacionado.

### Limites de armazenamento

- O app pede `navigator.storage.persist()`.
- No iOS, o Safari pode apagar dados de sites não usados há 7 dias. PWA
  instalada na tela inicial fica de fora dessa regra, e o app do Capacitor
  também. A interface vai incentivar instalar, e o servidor é sempre a cópia de
  segurança — nada que já sincronizou se perde.

## Consequências para o backend

Isto muda o plano (`docs/backend/plano.md`):

1. **Desde a Fase 0:** tabelas com `version`, `updated_at` confiável e exclusão
   lógica (lápide) em tudo que sincroniza; chaves primárias aceitam id vindo do
   cliente.
2. **Novas rotas:** `GET /sync/changes` (delta por cursor) e `POST /sync/push`
   (lote de operações idempotentes). As rotas REST do contrato continuam para
   quem está online e para integrações.
3. **Yjs/Hocuspocus deixa de ser "tempo real, Fase 2" e vira o núcleo do
   editor.** `song_documents` guarda o estado Yjs; `song_blocks` passa a ser uma
   projeção dele, para busca e listagens.
4. Testes de sincronização: dois clientes offline editando a mesma canção,
   reconexão em ordem trocada, reenvio de lote.

## Consequências para o frontend

1. Service worker e manifesto (PWA).
2. O store deixa de chamar `services/api` direto e passa a ler e escrever no
   banco local; uma camada de sincronização conversa com o servidor.
3. O editor passa a editar o documento Yjs (blocos como `Y.Map` com `Y.Text`).
4. O indicador "Salvo" vira três estados: salvo no aparelho, sincronizando,
   sincronizado — e "offline" quando for o caso.
5. Ações que exigem rede ficam desabilitadas offline, com o motivo.
6. O modo demonstração continua: ele já guarda tudo no aparelho.
