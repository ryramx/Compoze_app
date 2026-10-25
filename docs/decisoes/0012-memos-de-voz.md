# 0012 · Memos de voz guardados no Postgres, por enquanto

- Status: aceita
- Data: 2026-10-25
- Relacionadas: [0005](0005-mobile-e-offline.md) (offline; previa memo de voz
  na Fase 3), [0008](0008-fila-offline-sobre-o-rest.md) (fila no aparelho),
  [0004](0004-stack-do-backend.md) (previa S3/R2 para arquivos)

## Contexto

A melodia costuma vir antes da letra. Quem compõe grava no gravador do
celular, e o áudio fica longe da canção: em outro app, sem nome, sem os
coautores. A Fase 3 previa gravar memo de voz dentro do Compoze.

O plano (ADR 0004) previa arquivos num storage S3 compatível (Cloudflare R2).
O R2 tem cota grátis, mas pede cartão de crédito para abrir a conta, e hoje o
Compoze roda inteiro em planos grátis (Render + Neon) sem cartão nenhum. Ainda
não há uploads de outro tipo (avatar, capa) para dividir o custo de montar
o storage.

## Decisão

**1. O áudio fica no Postgres, numa tabela só dele.** `song_memos` guarda os
dados (quem, quanto tempo, que formato, nome) e `song_memo_audio` guarda os
bytes (`bytea`). Listar memos nunca lê áudio. Quando o storage S3 vier (Fase 4,
uploads), só `song_memo_audio` muda de lugar; a API continua igual, porque o
áudio já desce por uma rota própria (`GET .../audio`).

**2. Teto de 8 MB por memo e 10 minutos de gravação.** O app grava em Opus a
64 kbit/s (uns 5 MB em 10 minutos); no iPhone, onde não há Opus, em AAC.
O Neon grátis tem 0,5 GB: cabem uns cem memos longos, ou muitos curtos, que é o
uso comum (um refrão tem 30 segundos). Quando chegar perto, é a hora do R2.

**3. Gravado no aparelho primeiro, como tudo no Compoze.** O `MediaRecorder`
do navegador (e do WebView do Android, com a permissão `RECORD_AUDIO`) grava;
o áudio vai para o IndexedDB na hora com um id UUID v7 e sobe por
`PUT /songs/{id}/memos/{memo_id}`. O PUT com o mesmo id não duplica, então a
fila dos memos (`lib/memos.ts`) é separada da fila JSON do ADR 0008, que mora
no `localStorage` e não guarda bytes, mas segue a mesma regra: sem rede, espera;
recusa do servidor, para e mostra o motivo.

**4. Quem escreve grava; quem vê, ouve.** Apagar e renomear: quem gravou ou a
dona. Apagar é de vez (memo não passa pela lixeira), porque ocupa espaço e não
faz parte do texto registrado.

**5. O memo não entra na versão nem no hash do registro (ADR 0009).** O
registro prova o texto. Incluir áudio no retrato mudaria o formato do hash e
pesaria cada versão; fica para quando o registro precisar provar melodia.

## Alternativas

- **Cloudflare R2 já.** Melhor a longo prazo (sem custo de saída, URL
  pré-assinada direto do navegador), mas exige cartão e mais uma conta para o
  Ryan manter, para um uso que hoje cabe no banco.
- **Só no aparelho, sem subir.** Simples, mas o coautor não ouve, e trocar de
  celular perde os memos.
- **Gravar pelo plugin nativo (Capacitor).** Gravaria com a tela bloqueada,
  mas é um plugin a mais e só serve no Android; o `MediaRecorder` funciona
  igual no app, na PWA e no navegador.

## Consequências

- Backups do banco ficam maiores; o Neon grátis guarda 0,5 GB.
- Gravação para se a tela bloquear (limite do WebView). Gravar em segundo
  plano fica para quando houver plugin nativo.
- Memos que vieram de outras pessoas ficam guardados no aparelho depois de
  tocar uma vez, para ouvir offline.
