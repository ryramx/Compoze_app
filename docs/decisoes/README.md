# Registros de decisão (ADRs)

Um arquivo por decisão, numerado. Formato: contexto, decisão, alternativas,
consequências. Uma decisão aceita não é reescrita; uma nova a substitui e as
duas apontam uma para a outra.

| Nº | Decisão | Status |
| --- | --- | --- |
| [0001](0001-monorepo.md) | Um repositório para todo o produto | Aceita |
| [0002](0002-reescrita-do-frontend.md) | Reescrever o frontend com linguagem visual própria | Aceita; desfazer substituído pelo 0007 |
| [0003](0003-modo-demo.md) | Servidor de demonstração no navegador | Aceita |
| [0004](0004-stack-do-backend.md) | Stack do backend | Aceita; item de autenticação substituído pelo 0006 |
| [0005](0005-mobile-e-offline.md) | Mobile instalável e uso offline (local-first) | Aceita; rotas `/sync/*` adiadas pelo 0008 |
| [0006](0006-autenticacao-propria.md) | Autenticação própria no contrato v1; Better Auth adiado | Aceita |
| [0007](0007-documento-yjs-da-cancao.md) | O conteúdo da canção é um documento Yjs (Hocuspocus na API) | Aceita; substitui o desfazer do 0002 |
| [0008](0008-fila-offline-sobre-o-rest.md) | Escritas offline: fila no aparelho sobre as rotas REST | Aceita |
| [0009](0009-versoes-e-registro.md) | Versões da canção e registro com hash | Aceita |
| [0010](0010-convites.md) | Convites pela conta, por link e (com domínio) por e-mail | Aceita |
| [0011](0011-app-android-fora-da-loja.md) | App Android pelo Capacitor, distribuído fora da loja | Aceita |
| [0012](0012-memos-de-voz.md) | Memos de voz guardados no Postgres, por enquanto | Aceita |
| [0013](0013-seguir-e-mural.md) | Seguir pessoas e mural | Aceita |
| [0014](0014-conversas-ao-vivo.md) | Conversas a dois, com entrega ao vivo por SSE | Aceita |
| [0015](0015-imagens-no-postgres.md) | Foto de perfil e capa de projeto guardadas no Postgres | Aceita |
| [0016](0016-avisos-por-push.md) | Avisos fora do app por Web Push, com chaves geradas pelo servidor | Aceita |
| [0017](0017-email-por-smtp.md) | E-mail dos convites também por SMTP, para usar o Gmail sem domínio | Aceita |
| [0018](0018-apoio-por-pix.md) | Apoio a projetos por PIX, direto na chave da dona | Aceita |
| [0019](0019-senha-nova-sem-a-atual.md) | Senha nova em Ajustes, sem pedir a atual | Aceita |
| [0020](0020-primeiros-passos-e-ajuda.md) | Primeiros passos no primeiro acesso e ajuda de cada tela | Aceita |
| [0021](0021-ajustes-do-primeiro-teste.md) | Ajustes do primeiro teste: faixas numeradas à mão, entradas e custos do projeto, capa do perfil | Aceita |
| [0022](0022-recorte-de-imagens.md) | Janela de recorte para foto e capas, e capa do perfil sempre em 3:1 | Aceita |
