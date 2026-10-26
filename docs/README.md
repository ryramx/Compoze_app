# Documentação do Compoze

O Compoze é o caderno compartilhado de quem compõe: letra, cifra e coautoria no
mesmo lugar, com escrita junto em tempo real e uso sem internet. Esta pasta
explica o projeto inteiro, do porquê ao deploy, para que qualquer pessoa
entenda como ele funciona só lendo o repositório.

## Por onde começar

| Se você quer… | Leia |
| --- | --- |
| Entender o que é o Compoze e por que existe | [produto/visao-geral.md](produto/visao-geral.md) |
| Ver cada tela, o que faz, como foi feita e por quê | [telas/](telas/README.md) |
| Saber tudo o que o app faz, funcionalidade por funcionalidade | [produto/funcionalidades.md](produto/funcionalidades.md) |
| Entender como as peças se juntam | [arquitetura.md](arquitetura.md) |
| Conhecer a história do projeto, fase por fase | [produto/historia.md](produto/historia.md) |
| Saber o que vem depois | [produto/futuro.md](produto/futuro.md) |
| Rodar o projeto no seu computador | [../README.md](../README.md) e [backend/desenvolvimento.md](backend/desenvolvimento.md) |
| Entender uma palavra do app ou do código | [produto/glossario.md](produto/glossario.md) |

## Todos os documentos

### Produto

| Documento | Para quê |
| --- | --- |
| [produto/visao-geral.md](produto/visao-geral.md) | Para que o Compoze existe, para quem, princípios, situação de cada área, regras de negócio, estágios e papéis |
| [produto/funcionalidades.md](produto/funcionalidades.md) | Catálogo das funcionalidades: o que fazem, como funcionam por dentro, onde está o código e qual ADR explica |
| [produto/historia.md](produto/historia.md) | De onde o projeto veio e a linha do tempo das fases, com PRs e decisões |
| [produto/futuro.md](produto/futuro.md) | Funcionalidades futuras: lojas, assinaturas Free/Plus/Pro, Mercado Pago, e-mail, mapa e o que cada uma pede |
| [produto/glossario.md](produto/glossario.md) | As palavras do Compoze e o nome delas no código |

### Telas

[telas/README.md](telas/README.md) tem o mapa. Uma página por tela:
[entrada](telas/entrada.md), [casca do app](telas/casca.md),
[ajuda](telas/ajuda.md), [mesa](telas/mesa.md), [canções](telas/cancoes.md),
[editor](telas/editor.md), [pastas](telas/pastas.md),
[projetos](telas/projetos.md), [apoiar](telas/apoiar.md),
[mural](telas/mural.md), [conversas](telas/conversas.md),
[mapa](telas/mapa.md), [perfil](telas/perfil.md),
[lixeira](telas/lixeira.md), [ajustes](telas/ajustes.md),
[convite](telas/convite.md), [compartilhar](telas/compartilhar.md).

### Técnica

| Documento | Para quê |
| --- | --- |
| [arquitetura.md](arquitetura.md) | Visão do sistema todo: peças, caminho dos dados, segurança, onde roda e quanto custa |
| [frontend/arquitetura.md](frontend/arquitetura.md) | Como o frontend está organizado: camadas, estado, rotas, offline, PWA, cada funcionalidade |
| [frontend/design-system.md](frontend/design-system.md) | Linguagem visual "Caderno": tipografia, cores, componentes e o porquê |
| [backend/plano.md](backend/plano.md) | Stack, arquitetura, modelo de dados e fases do backend |
| [backend/desenvolvimento.md](backend/desenvolvimento.md) | Rodar, testar e mudar o backend e o banco no dia a dia; módulos e permissões |
| [backend/contrato-da-api.md](backend/contrato-da-api.md) | Todas as rotas, com formatos e regras |
| [backend/deploy.md](backend/deploy.md) | Render + Neon (grátis): o que o Blueprint cria, como publicar, push, e-mail |
| [mobile/android.md](mobile/android.md) | App Android: gerar, assinar e publicar o APK; Firebase; como funciona por dentro |
| [decisoes/](decisoes/README.md) | Registros de decisão (ADRs 0001 a 0021), um por escolha relevante |
| [../CHANGELOG.md](../CHANGELOG.md) | O que mudou, por versão |

## Como documentamos

- Toda decisão que alguém poderia questionar daqui a seis meses vira um ADR em
  `decisoes/`, numerado, com contexto, decisão, alternativas e consequências.
  ADRs não são editados depois de aceitos; uma decisão nova substitui a antiga.
- Regras de negócio têm código (`RN05`, `RN08`…) e são citadas no código onde
  são aplicadas, para que dê para achar de onde uma regra vem.
- Tela nova ou mudada: atualize a página dela em `telas/` e a ajuda em
  `apps/web/src/lib/ajuda.ts`.
- O `CHANGELOG.md` registra o que mudou para quem usa, não commit a commit.
- Comentários no código explicam o porquê. O quê, o código já diz.
- Tudo em português do Brasil, como o código.
