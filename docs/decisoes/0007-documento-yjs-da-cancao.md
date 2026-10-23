# 0007 · O conteúdo da canção é um documento Yjs

- Status: aceita
- Data: 2026-10-22
- Relacionadas: [0005](0005-mobile-e-offline.md) (offline), [0004](0004-stack-do-backend.md) (stack)

## Contexto

Até a Fase 1, cada bloco (seção, verso, cifra, nota) era uma linha em
`song_blocks`, e o editor gravava cada tecla com `PATCH /songs/{id}/blocks/{id}`.
Duas pessoas no mesmo verso se sobrescreviam: vencia quem gravasse por último,
e o texto da outra sumia. Offline, nem isso: a edição se perdia.

O ADR 0005 já tinha decidido a direção (CRDT com Yjs, sincronizado pelo
Hocuspocus). Este registro fixa como isso foi feito na Fase 2a.

## Decisão

**1. Um documento Yjs por canção, com formato compartilhado.**
`packages/documento` define o formato e é a única porta de entrada para ele,
usada pelo editor e pela API:

```
Y.Doc "song:<id>"
└── "blocos": Y.Array<Y.Map>   id, type, label, content (Y.Text), author_id
```

- `content` é `Y.Text`: duas pessoas no mesmo verso têm as edições fundidas.
  O editor entrega o valor inteiro do campo a cada tecla; `editarTexto` aplica
  só o trecho que mudou, para não apagar o que a outra pessoa digitou.
- `label` e `type` são valores simples: última escrita vence. São curtos e
  raramente editados ao mesmo tempo.
- Ids de bloco são UUID v7 gerados por quem cria, inclusive offline.

**2. O documento é a fonte; `song_blocks` é projeção.**
O servidor grava o estado em `song_documents.ydoc` e, na mesma transação,
refaz `song_blocks` a partir dele. Busca, listagens, `expand=blocks` e o
contrato REST continuam lendo linhas, sem saber de Yjs. Na primeira abertura
de uma canção antiga, o documento é semeado com os blocos que já existiam; só
o servidor semeia, para que dois aparelhos não criem cada um a sua cópia.

**3. Hocuspocus dentro do processo da API, em `/collab`.**
Uma porta e um serviço a menos para operar no plano grátis do Render. As rotas
REST de blocos editam o mesmo documento em memória (`openDirectConnection`),
então uma mudança feita pela API aparece na hora para quem está com a canção
aberta. Se o volume pedir, o Hocuspocus sai para um serviço próprio sem mudar
o formato nem o cliente.

- Autenticação: o mesmo access token (JWT) do REST, enviado ao conectar.
  Quem não é da canção não entra; `VIEWER` e canção na lixeira entram só para
  leitura (o servidor descarta o que chegar deles).
- Gravação: 2 s depois da última mudança, no máximo a cada 10 s, e na hora
  quando o último editor fecha ou a API desliga.
- A projeção só aceita como autor de bloco quem é coautor da canção; um id
  qualquer vira "sem autora".
- Mandar para a lixeira, restaurar ou apagar de vez fecha os editores abertos,
  que reconectam com a permissão nova.

**4. No aparelho: IndexedDB primeiro, servidor quando houver rede.**
O editor (`useDocumentoDaCancao`) abre o documento do IndexedDB
(`y-indexeddb`) e liga o Hocuspocus por cima. Sem rede, escreve no aparelho;
quando a rede volta, as mudanças sobem e se fundem com as dos outros. A barra
do editor mostra onde está o texto: sincronizando, salvo, offline (salvo no
aparelho), ou salvo no aparelho na demonstração.

**5. Desfazer é do Yjs.** `Y.UndoManager` desfaz só o que esta pessoa fez,
inclusive inserir e remover blocos, e nunca a edição de quem escreve junto.
Substitui o histórico por retrato do ADR 0002, que não desfazia inserções. O
Ctrl+Z da folha é do documento; título e ficha técnica usam o desfazer do
próprio campo.

**6. Presença.** Cada editor publica quem é e em que bloco está (awareness do
Yjs). A barra mostra quem está aqui agora, e a margem do bloco mostra
"Fulana escrevendo".

## Limites conhecidos

- Uma canção nunca aberta num aparelho precisa de rede uma vez; depois abre
  offline. Abrir o app sem rede (o app em si, não a canção) é a PWA, Fase 2c.
- A autoria continua por bloco (quem criou). Autoria por trecho, com os dados
  que o Yjs já guarda de cada inserção, fica para o histórico de versões.
- Um coautor pode escrever um bloco em nome de outro coautor; a projeção só
  barra quem não é da canção.
- Título, status e ficha técnica continuam no REST; a fila offline deles é a
  Fase 2b.

## Alternativas

- **Manter blocos no REST com `ETag`/`If-Match`.** Detecta conflito, mas não
  resolve: alguém ainda teria de escolher qual verso perde. Não funciona
  offline.
- **Hocuspocus como serviço separado já agora.** Mais limpo de escalar, mas
  dobra o que operar e o que pagar, e o REST teria de falar com ele pela rede
  para editar blocos.
- **Projeção assíncrona (job).** Tiraria a gravação do caminho do editor, mas
  deixaria busca e listagens atrasadas por um tempo variável. A transação
  síncrona é barata no tamanho de uma canção.
