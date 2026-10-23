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
