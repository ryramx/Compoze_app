# 0008 · Escritas offline: fila no aparelho sobre as rotas REST

- Status: aceita
- Data: 2026-10-23
- Relacionadas: [0005](0005-mobile-e-offline.md) (substitui o item das rotas
  `/sync/*` e do Dexie, por ora), [0007](0007-documento-yjs-da-cancao.md)
  (a letra, que já era offline)

## Contexto

Depois da Fase 2a, a letra de uma canção já funcionava sem rede (documento Yjs
no IndexedDB). O resto não: criar canção, mudar título, tom ou pasta, criar
pasta ou projeto e mexer no perfil chamavam a API na hora. Sem rede, a tela
mudava e o servidor nunca ficava sabendo. Pior: a mudança voltava ao recarregar.

O ADR 0005 previa um banco local (Dexie) espelhado por `GET /sync/changes` e
uma fila enviada por `POST /sync/push`. Ao começar a fazer, ficou claro que
isso é maior do que o problema de hoje: o caderno de uma pessoa tem dezenas de
canções e pastas, não milhares, e as rotas REST do contrato já cobrem cada
escrita.

## Decisão

**1. Fila de escritas no aparelho (`apps/web/src/lib/fila.ts`).**
Toda escrita de dado estruturado passa pela fila, e a tela muda antes. Isso
vale para canção (registro, ficha, lixeira), coautoria em rascunho, pasta,
projeto e perfil.
- Cada item é uma chamada REST comum (método, caminho, corpo), guardada no
  `localStorage` por pessoa. Ela sobrevive a recarregar a página.
- A fila envia em ordem (FIFO). Criar a pasta vem antes de criar a canção nela.
- Falha passageira (sem rede, 5xx, 408, 429, 401 até renovar) para a fila e
  tenta de novo: 2 s, 4 s, 8 s, até 1 min. Quando a rede volta, a fila tenta
  na hora.
- Recusa definitiva (outro 4xx) descarta o item. A pessoa vê um aviso
  ("Não deu para salvar a pasta X: motivo") e o caderno é relido do servidor.
- Ao sair da conta, a fila é descartada. A próxima pessoa no aparelho pode ser
  outra.

**2. `Idempotency-Key` na API (`apps/api/src/plugins/idempotencia.ts`).**
Cada item da fila leva o próprio id como chave. Reenviar depois de uma queda
não repete a escrita: a API guarda a resposta por 24 h
(`idempotency_keys`, chave `(user_id, key)`) e devolve a mesma, com
`Idempotent-Replayed: true`.
- Mesma chave em outra rota ou método devolve `422`.
- Se a primeira tentativa ainda está rodando, a API devolve `409`. A fila
  trata como passageiro e tenta de novo.
- Respostas 5xx não ficam guardadas, para que a nova tentativa execute de
  verdade.
- O expurgo diário apaga as chaves vencidas.

**3. Ids nascem no aparelho.** Canção, pasta e projeto criados offline já têm
o UUID v7 definitivo, e a API aceita o id do cliente. Assim a tela abre a
canção nova na hora e a referencia no projeto antes de o servidor saber dela.

**4. Folha pautada semeada no aparelho.** Até aqui o servidor criava "Verso 1"
e uma linha vazia em toda canção nova. Offline, o editor abriria vazio.
`POST /songs` agora aceita `folha_pautada: false`, e o próprio aparelho semeia
a folha no documento Yjs local. Só um dos lados semeia, então não há bloco
duplicado. O editor só conecta ao Hocuspocus quando o `POST` da canção sai da
fila, porque o servidor recusaria o documento de uma canção que não conhece.

**5. Cópia do caderno no aparelho (`lib/copiaLocal.ts`).** O store guarda as
canções (com lixeira), pastas, projetos e pessoas citadas no IndexedDB
(`idb-keyval`). Ele salva 1 s depois de cada mudança. Ao abrir, a cópia aparece
na hora. Depois a fila é esvaziada e só então o caderno é relido do servidor.
Ler antes desfaria na tela o que foi feito offline. Sem rede, o app segue com
a cópia e relê quando a rede volta.

**6. Sessão offline.** A sessão é restaurada da última pessoa conhecida quando
não há rede. Erro de rede na renovação do token não desloga; só a recusa do
servidor desloga.

**7. O que pede rede continua pedindo.** Fechar a divisão de coautoria,
convidar e remover coautor ficam desligados offline, com a explicação no
botão (ADR 0005). Fechar a divisão também espera a fila esvaziar antes.

**8. Onde a pessoa vê.** O pé do menu mostra "Sem internet" e quantas mudanças
estão só no aparelho, ou "Enviando N mudanças…". Quando está tudo no servidor,
a linha some.

## Alternativa adiada: `/sync/changes` e `/sync/push`

A troca é perder o delta. Na reconexão, o app relê o caderno inteiro, quatro
requisições. Isso é barato com o tamanho de hoje. O delta por cursor volta à
mesa se a releitura ficar lenta (centenas de canções, ou o SQLite do Capacitor
na Fase 3). As colunas `version` e `updated_at` que ele usaria já existem.

## Limites conhecidos

- Conflito em campo simples: vence a última escrita a chegar, sem registro do
  que foi sobrescrito. A detecção por `version` do ADR 0005 fica para quando
  houver caso real.
- Abrir o app sem rede depende de as telas já estarem baixadas. O app baixa
  todas logo depois de abrir com rede, mas recarregar a página offline só
  funciona com o service worker (PWA, Fase 2c).
- Uma canção criada em outro aparelho e nunca aberta neste precisa de rede uma
  vez para a letra (ADR 0007).
