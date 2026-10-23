# Visão geral do produto

## O que é

O Compoze é um caderno de composição compartilhado. Quem compõe escreve a
canção em blocos (seção, cifra, verso, nota), convida parceiros para escrever
junto e acerta, dentro da própria obra, quanto da autoria é de cada um. As
canções seguem um fluxo de estágios até a gravação, podem ser organizadas em
pastas e reunidas em projetos (single, EP, álbum) com meta de financiamento e
data de lançamento. Em volta disso existe uma camada social: mural, conversas,
seguidores e um mapa de quem compõe por perto.

## Para quem

Compositoras e compositores independentes, letristas, duplas e bandas que
escrevem a várias mãos e precisam saber, ao registrar uma obra, quem escreveu o
quê e com qual percentual.

## Funcionalidades

| Área | Situação | Onde |
| --- | --- | --- |
| Conta (cadastro, login, sessão) | Pronto no front, contrato definido | `/login`, `/cadastro` |
| Mesa (resumo, continuar de onde parou, esteira por estágio) | Pronto | `/` |
| Canções: índice, fichas, busca por título/tag/verso, filtro por estágio | Pronto | `/songs` |
| Editor em blocos com autoria por trecho, desfazer/refazer, ocultar cifras, alinhar cifra e letra | Pronto | `/songs/:id/edit` |
| Ficha técnica: estágio, tom, compasso, andamento, pasta, visibilidade, tags | Pronto | editor |
| Coautoria: percentuais, fechar divisão (RN05) | Pronto | editor |
| Convites pela conta (busca por nome ou @, aceitar ou recusar) e por link (ADR 0010) | Pronto; e-mail espera domínio | editor, Mesa, `/convite/:token` |
| Pastas com subpastas | Pronto | `/folders` |
| Projetos: faixas, fase, financiamento, custo, lançamento | Pronto | `/projects` |
| Lixeira com retenção de 30 dias (RN07/RN08) | Pronto | `/trash` |
| Perfil e parcerias | Pronto | `/profile` |
| Mapa de quem compõe (RN11) | Pronto no front, rota nova no contrato | `/map` |
| Busca global (⌘K) | Pronto | qualquer tela |
| Mural, conversas, seguidores | Prévia com dados de exemplo (Fases 2 e 3) | `/feed`, `/messages` |
| Edição simultânea em tempo real | Planejado (Fase 2 do backend) | — |
| App instalável e uso offline | Planejado: PWA na Fase 2, lojas na Fase 3 (ADR 0005) | — |

## Regras de negócio

Os códigos vêm do PRD original e são citados no código onde a regra é aplicada.

- **RN05 — Divisão de coautoria.** Cada coautor tem um percentual. Enquanto a
  divisão está em negociação a soma pode ser qualquer valor; ao *fechar* a
  divisão, ela precisa somar exatamente 100%. Mudar um percentual depois reabre
  a divisão.
- **RN07 — Exclusão reversível.** Excluir uma canção a manda para a lixeira,
  preservando pasta e projeto, para que restaurar a devolva ao mesmo lugar.
- **RN08 — Retenção da lixeira.** Itens ficam 30 dias na lixeira e depois são
  apagados de vez por um processo do servidor. O cliente só mostra o prazo.
- **RN11 — Privacidade de localização.** Coordenadas só aparecem no mapa para
  quem escolheu aparecer, e nunca no perfil público.
- **Autoria por bloco.** Todo bloco guarda quem o escreveu. É a base da prova
  de coautoria e do destaque por cor no editor.
- **Pastas são opcionais.** Uma canção sem pasta é um estado válido. Excluir
  uma pasta não apaga nada: subpastas sobem um nível e canções ficam sem pasta.
- **Projetos não são donos das canções.** Excluir um projeto não exclui suas
  faixas; retirar uma faixa não a apaga.

## Estágios de uma obra

Ideia → Escrita → Revisão → Finalizada → Registrada → Gravada.

A API conhece ainda `ARQUIVADA` e `CANCELADA`, que a interface trata como fora
do fluxo ativo.
