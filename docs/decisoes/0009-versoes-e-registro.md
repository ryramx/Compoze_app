# 0009 · Versões da canção e registro com hash

- Status: aceita
- Data: 2026-10-23
- Relacionadas: [0007](0007-documento-yjs-da-cancao.md) (a letra é um
  documento Yjs), [0005](0005-mobile-e-offline.md) (o que pede rede)

## Contexto

O estágio "Registrada" existia só como etiqueta: qualquer coautor mudava para
ele, e nada ficava guardado. Para quem compõe junto, registrar é afirmar quem
escreveu o quê e quanto cabe a cada um. Isso precisa de um retrato que não
mude depois. Também faltava um jeito de voltar a uma versão anterior da letra
sem depender do desfazer, que some ao fechar o editor.

A tabela `song_versions` já existia desde a Fase 0, com um gatilho que recusa
UPDATE. Faltava usá-la.

## Decisão

**1. Uma versão é um retrato imutável.** Ela guarda:
- título, estágio, ficha técnica e tags;
- todos os blocos, com quem escreveu cada um;
- a coautoria com nomes e percentuais;
- se a divisão estava fechada.

Os nomes entram no retrato, não só os ids. Assim a prova continua legível se
alguém mudar de nome ou apagar a conta. O texto vem do documento Yjs em
memória, não de `song_blocks`, que pode estar até 10 s atrás.

**2. As versões formam uma corrente de hash.** Cada versão tem um SHA-256 de um
JSON canônico (chaves em ordem alfabética, sem espaços). Esse JSON junta o
retrato, o número, o motivo, o nome, quem guardou, a hora e o hash da versão
anterior. Mudar uma versão antiga quebra o hash dela e de todas as seguintes. A
regra está em `packages/contracts/src/canonico.ts`, sem dependências. A API
calcula, e o app recalcula no aparelho no botão "Conferir hash".

**3. Quando nasce uma versão.**
- `MANUAL`: alguém que escreve na canção guarda pelo histórico, com um nome
  opcional.
- `ESTAGIO`: a canção mudou de estágio. O histórico mostra como ela estava ao
  virar "Finalizada", "Gravada" e assim por diante.
- `REGISTRO`: registrar a obra.

**4. "Registrada" só pelo registro.** `POST /songs/{id}/register` muda o
estágio e grava a versão `REGISTRO` na mesma transação. Só a dona registra, e
só com a divisão de coautoria fechada (RN05), porque o registro afirma quem é
dono de quanto. Mudar para "Registrada" por `PATCH` devolve `409`. Registrar
de novo depois de editar é permitido e cria outra versão de registro.

**5. Restaurar é no editor, não no servidor.** O histórico entrega o texto da
versão, e o editor troca os blocos do documento Yjs numa transação só
(`substituirBlocos`). Antes disso, o texto de agora vira uma versão ("Antes
de restaurar a versão N"), então restaurar nunca perde nada. Ctrl+Z desfaz a
restauração inteira, e quem está com a canção aberta vê a troca na hora.

**6. Pede rede.** Guardar, registrar e ler o histórico dependem do servidor,
que é o juiz único da corrente (ADR 0005). Offline, os botões ficam desligados
com o motivo.

## O que o hash prova, e o que não prova

O hash prova integridade: o texto mostrado é exatamente o que foi guardado
naquela versão, e nenhuma versão anterior foi alterada sem quebrar a corrente.
Ele não prova sozinho a data perante terceiros, porque quem controla o banco
poderia, em tese, refazer a corrente inteira. Para isso falta um carimbo de
tempo externo: publicar o hash do registro num serviço de carimbo (RFC 3161)
ou numa âncora pública. Fica para quando houver demanda. A interface diz que o
registro do Compoze não substitui o registro oficial (Biblioteca Nacional,
associação de direitos).

## Alternativas

- **Versões como snapshots do Yjs (`Y.snapshot`).** Guardariam o histórico
  fino, mas em binário. Não dá para ler sem o Yjs nem conferir com um hash
  simples. Um retrato em JSON é legível por qualquer pessoa e qualquer
  linguagem.
- **Restaurar pelo servidor.** O servidor editaria o documento, como fazem as
  rotas de blocos. Assim a restauração não entraria no desfazer de quem a
  pediu, e o modo de demonstração (sem servidor de documento) não a teria.
