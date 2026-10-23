# Contrato da API (v1)

Este é o contrato que o frontend em `apps/web` já consome — por
`src/services/api/*` — e que o servidor de demonstração (`src/demo/servidor.ts`)
implementa. O backend novo deve cumprir este documento; o que estiver em
**Pendências** é melhoria combinada, não obrigação da v1.

## Convenções

- JSON, campos em `snake_case`, enums em MAIÚSCULAS.
- Autenticação por `Authorization: Bearer <access_token>`.
- Erros: status HTTP + corpo `{ "detail": "mensagem legível em português" }`.
  Validação devolve `422` com `detail` (texto ou lista de erros por campo).
- `204` sem corpo em exclusões.
- Datas em ISO 8601 UTC; datas sem hora (`release_date`) em `YYYY-MM-DD`.
- Ids são UUID v7 (gerados pelo `uuidv7()` do Postgres 18, ordenáveis por tempo) e opacos para o cliente.
  Criações (`POST /songs`, `/songs/{id}/blocks`, `/folders`, `/projects`) aceitam `id` opcional gerado
  no aparelho (ADR 0005); id repetido devolve `409`.
- Escritas autenticadas aceitam o cabeçalho `Idempotency-Key` (8 a 200
  caracteres entre letras, números e `_.:-`; o front manda um UUID). Repetir a chave em 24 h devolve a
  resposta guardada da primeira vez, com `Idempotent-Replayed: true`, sem
  executar de novo. A mesma chave em outra rota devolve `422`; enquanto a
  primeira ainda roda, `409` (ADR 0008).
- Outros status: `403` quando a pessoa vê o recurso mas não pode fazer aquilo
  (ex.: coautor tentando apagar), `409` em conflito (canção na lixeira,
  duplicata), `429` em excesso de tentativas de login.

## Autenticação

| Método | Rota | Corpo | Resposta |
| --- | --- | --- | --- |
| POST | `/auth/register` | `{ name, username, email, password }` | `201` `TokenPair` |
| POST | `/auth/login` | `{ email, password }` | `TokenPair` · `401` credenciais |
| POST | `/auth/refresh` | `{ refresh_token }` | `TokenPair` (refresh rotacionado) · `401` |

`TokenPair = { access_token, refresh_token, token_type: "bearer" }`.
Access token de 30 min; refresh de 30 dias, de uso único (rotação com detecção
de reuso). Usuário: `^[a-z0-9_.-]{3,30}$`, único. Senha ≥ 8 caracteres.
Conflito de e-mail ou usuário: `409`.

## Pessoas

| Método | Rota | Resposta |
| --- | --- | --- |
| GET | `/users/me` | `UserMe` |
| PATCH | `/users/me` | `UserMe` — aceita `name, bio, avatar_url, city, state, country, latitude, longitude, show_on_map, instruments, specialties, genres, external_links` |
| GET | `/users?ids=a,b,c` | `UserPublic[]` (até 100 ids; desconhecidos são omitidos) |
| GET | `/users/{username}` | `UserPublic` · `404` |
| GET | `/map/people` | `UserPublic & { latitude, longitude }` de quem tem `show_on_map = true` (RN11) |

`UserPublic = { id, name, username, bio, avatar_url, city, state, country, instruments[], specialties[], genres[], external_links[], created_at }`
`UserMe = UserPublic & { email, show_on_map, latitude, longitude }`

O perfil público nunca inclui coordenadas nem e-mail.

## Canções

| Método | Rota | Resposta / regra |
| --- | --- | --- |
| GET | `/songs?q=&status=&folder_id=&expand=` | `SongSummary[]` ativas em que a pessoa é dona ou coautora. `q` busca em título, tags e texto dos blocos (sem acento, sem caixa). Com `expand=blocks,collaborators`, `SongDetail[]` |
| POST | `/songs` | `{ id?, title, folder_id?, folha_pautada? }` → `201 SongDetail`, já com a pessoa como `OWNER` a 100%. Com `folha_pautada: false` nasce sem blocos (o aparelho semeia "Verso 1" no documento; padrão `true`) |
| GET | `/songs/{id}` | `SongDetail` · `404` também quando a pessoa não tem acesso |
| PATCH | `/songs/{id}` | `title, status, folder_id, musical_key, bpm, time_signature, tags, visibility, description` → `SongDetail`. Mudar `status` guarda uma versão `ESTAGIO`; mudar para `REGISTRADA` devolve `409` (use `/register`) |
| DELETE | `/songs/{id}` | Lixeira (RN07): preenche `deleted_at`, preserva pasta e projetos → `204` |
| GET | `/songs/trash` | `(SongSummary & { days_remaining })[]` da pessoa |
| POST | `/songs/{id}/restore` | `SongDetail` |
| DELETE | `/songs/{id}/permanent` | Apaga de vez → `204` (só a dona) |

`SongSummary = { id, title, status, visibility, owner_id, folder_id, musical_key, bpm, time_signature, tags[], contributions_confirmed, deleted_at, created_at, updated_at }`
`SongDetail = SongSummary & { description, blocks: Block[], collaborators: Collaborator[] }`

`status ∈ IDEIA, ESCRITA, REVISAO, FINALIZADA, REGISTRADA, GRAVADA, ARQUIVADA, CANCELADA`
`visibility ∈ PUBLIC, PRIVATE, UNLISTED`

### Blocos

| Método | Rota | Corpo |
| --- | --- | --- |
| POST | `/songs/{id}/blocks` | `{ type, content, label?, position? }` — sem `position`, entra no fim; com, os seguintes são deslocados |
| PATCH | `/songs/{id}/blocks/{block_id}` | `{ content?, label?, type? }` |
| DELETE | `/songs/{id}/blocks/{block_id}` | `204`, posições recompactadas |

`Block = { id, type: SECTION|LYRIC|CHORD|NOTE, label, content, position, author_id, created_at, updated_at }`.
`author_id` é quem criou o bloco e não muda quando outra pessoa edita;
`null` se a conta de quem escreveu foi apagada.

Desde a Fase 2a o conteúdo mora no documento Yjs da canção (ADR 0007), e estas
rotas editam esse documento: quem estiver com a canção aberta vê a mudança na
hora. `POST` aceita `id` (UUID v7) e devolve `409` se ele já existir.

### Edição em tempo real

`GET /collab` com upgrade para WebSocket, protocolo do Hocuspocus. Um documento
por canção, com nome `song:{id}`; o formato está em `packages/documento`.
Autenticação pelo access token, enviado pelo cliente ao conectar. Quem não é
da canção é recusado; `VIEWER` e canção na lixeira entram só para leitura.

### Coautoria

| Método | Rota | Corpo / regra |
| --- | --- | --- |
| POST | `/songs/{id}/collaborators` | `{ user_id, role }` — entra com `contribution_percent = 0` e reabre a divisão |
| DELETE | `/songs/{id}/collaborators/{user_id}` | Só a dona; não remove a dona |
| PUT | `/songs/{id}/contributions` | `{ contributions: [{ user_id, percentage }], confirm }` |

`Collaborator = { id, user_id, role: OWNER|COMPOSER|LYRICIST|MUSICIAN|PRODUCER|VIEWER, contribution_percent }`

Convidar, remover e acertar a divisão são ações da dona. `POST` de coautor que
já está na canção não duplica (devolve a canção como está).

**RN05:** com `confirm: false` qualquer soma é aceita e `contributions_confirmed`
vira `false`. Com `confirm: true`, a soma de todos os coautores (os enviados
com o valor novo, os demais com o atual) precisa ser exatamente 100, senão
`422` "A divisão soma X%. Precisa fechar em 100%."

### Versões e registro (ADR 0009)

| Método | Rota | Corpo / regra |
| --- | --- | --- |
| GET | `/songs/{id}/versions` | `VersionSummary[]`, da mais nova à mais antiga. Quem vê a canção vê o histórico |
| GET | `/songs/{id}/versions/{number}` | `Version` (com `snapshot`) · `404` |
| POST | `/songs/{id}/versions` | `{ label? }` → `201 Version` (`reason: MANUAL`). Quem escreve na canção; `VIEWER` recebe `403` |
| POST | `/songs/{id}/register` | → `201 { song: SongDetail, version: Version }`. Muda o estágio para `REGISTRADA` e grava a versão `REGISTRO`, juntos. Só a dona (`403`), só com a divisão fechada (`409`) |

`VersionSummary = { id, song_id, number, reason: MANUAL|ESTAGIO|REGISTRO, label, title, sha256, previous_sha256, created_by, created_at }`
`Version = VersionSummary & { snapshot }`, com `snapshot = { formato: 1, song_id, title, status, musical_key, bpm, time_signature, tags, description, blocks: [{ id, type, label, content, author_id }], collaborators: [{ user_id, name, username, role, contribution_percent }], contributions_confirmed }`.

`sha256` é o SHA-256 (hex) do JSON canônico de `{ formato: 1, song_id, number,
reason, label, created_by, created_at, previous_sha256, snapshot }`. JSON
canônico quer dizer chaves em ordem alfabética em todos os níveis, sem espaços
e com strings como `JSON.stringify` as escreve. A função de referência é
`textoDaVersao` em `packages/contracts/src/canonico.ts`. Versões são
imutáveis: o banco recusa UPDATE.

## Pastas

| Método | Rota | Corpo / regra |
| --- | --- | --- |
| GET | `/folders` | Árvore inteira da pessoa em lista plana |
| POST | `/folders` | `{ name, parent_id? }` |
| PATCH | `/folders/{id}` | `{ name?, parent_id? }` — recusa ciclo (`422`) |
| DELETE | `/folders/{id}` | Subpastas sobem um nível, canções ficam sem pasta → `204` |

`Folder = { id, name, parent_id, owner_id, created_at, updated_at }`

## Projetos

| Método | Rota | Corpo / regra |
| --- | --- | --- |
| GET | `/projects` | `ProjectDetail[]` ativos da pessoa (já com as faixas) |
| POST | `/projects` | `{ name, type?, style?, description?, release_date?, estimated_cost?, funding_target? }` |
| GET | `/projects/{id}` | `ProjectDetail` |
| PATCH | `/projects/{id}` | mesmos campos + `status` |
| DELETE | `/projects/{id}` | Lixeira; canções não vão junto → `204` |
| POST | `/projects/{id}/restore` | `ProjectDetail` |
| POST | `/projects/{id}/songs` | `{ song_id, track_number? }` — sem número, entra como última faixa |
| DELETE | `/projects/{id}/songs/{song_id}` | Retira a faixa; a canção fica → `204` |

`Project = { id, name, description, type: SINGLE|EP|ALBUM|OTHER, status: PLANEJAMENTO|PRODUCAO|MIXAGEM|LANCADO, style: ACUSTICO|BANDA|AO_VIVO|null, release_date, cover_url, estimated_cost, funding_target, funding_current, owner_id, deleted_at, created_at, updated_at }`
`ProjectDetail = Project & { songs: [{ song_id, track_number }] }`

Valores monetários em reais, inteiros (centavos não são usados na v1).

## Processos do servidor

- **Expurgo da lixeira (RN08):** job diário apaga canções e projetos com
  `deleted_at` há mais de 30 dias.

## Pendências (melhorias de contrato)

1. ~~`GET /songs?expand=blocks,collaborators`~~ — feito na Fase 1: devolve
   `SongDetail[]`.
2. ~~`GET /projects` com `songs`~~ — feito na Fase 1: devolve `ProjectDetail[]`.
3. Paginação por cursor nas listagens (`?cursor=&limit=`), quando os cadernos
   crescerem.
4. `ETag`/`If-Match` em `PATCH` de canção e bloco para detectar edição
   concorrente até a Fase 2 trazer o tempo real.
5. Sincronização offline (ADR 0005): `POST` de criação aceita `id` do cliente
   (UUID v7); todas as escritas aceitam `Idempotency-Key`; registros ganham
   `version`; novas rotas `GET /sync/changes?since=` e `POST /sync/push` — Fase 2.
6. Rotas sociais (mural, seguidores, conversas, notificações) — Fase 4.
