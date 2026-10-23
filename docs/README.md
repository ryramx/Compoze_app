# Documentação do Compoze

| Documento | Para quê |
| --- | --- |
| [produto/visao-geral.md](produto/visao-geral.md) | O que é o Compoze, para quem, funcionalidades e regras de negócio |
| [frontend/arquitetura.md](frontend/arquitetura.md) | Como o frontend está organizado: camadas, estado, rotas, modo demo |
| [frontend/design-system.md](frontend/design-system.md) | Linguagem visual "Caderno": tipografia, cores, componentes e o porquê |
| [mobile/android.md](mobile/android.md) | App Android: como gerar, assinar e publicar o APK |
| [backend/plano.md](backend/plano.md) | Stack recomendada, arquitetura, modelo de dados e fases do backend |
| [backend/desenvolvimento.md](backend/desenvolvimento.md) | Rodar, testar e mudar o backend e o banco no dia a dia |
| [backend/deploy.md](backend/deploy.md) | Staging no Render: o que o Blueprint cria e como publicar |
| [backend/contrato-da-api.md](backend/contrato-da-api.md) | Rotas que o frontend já consome, com formatos e regras |
| [decisoes/](decisoes/) | Registros de decisão (ADRs), um por escolha relevante |
| [../CHANGELOG.md](../CHANGELOG.md) | O que mudou, por versão |

## Como documentamos

- Toda decisão que alguém poderia questionar daqui a seis meses vira um ADR em
  `decisoes/`, numerado, com contexto, decisão, alternativas e consequências.
  ADRs não são editados depois de aceitos; uma decisão nova substitui a antiga.
- Regras de negócio têm código (`RN05`, `RN08`…) e são citadas no código onde
  são aplicadas, para que dê para achar de onde uma regra vem.
- O `CHANGELOG.md` registra o que mudou para quem usa, não commit a commit.
- Comentários no código explicam o porquê. O quê, o código já diz.
