# Visão geral do produto

## Para que o Compoze existe

Canção feita a várias mãos costuma nascer espalhada: a letra numa nota do
celular, a cifra num caderno, a melodia num áudio de WhatsApp, a ideia de
ponte numa conversa, e a divisão de autoria "a gente acerta depois". Quando
chega a hora de registrar, gravar ou dividir o que a música rende, ninguém
lembra direito quem escreveu o quê, e o percentual de cada um vira conversa
difícil.

O Compoze junta tudo isso **num caderno compartilhado**:

- a canção é escrita em blocos (seção, cifra, verso, nota), e **cada trecho
  guarda quem o escreveu**;
- os parceiros escrevem **juntos, em tempo real**, ou cada um no seu tempo,
  **inclusive sem internet**;
- a **divisão de coautoria é acertada dentro da própria obra** e precisa
  fechar em 100% antes do registro;
- cada obra segue uma **esteira** da ideia à gravação, com **versões
  imutáveis** e um **hash** que prova como ela estava em cada data;
- em volta, o que ajuda a canção a sair do caderno: **projetos** (single, EP,
  álbum) com meta de financiamento e **apoio por PIX**, e uma camada social
  pequena (mural, conversas, seguidores, mapa) para achar e manter parcerias.

Em uma frase: **o caderno compartilhado de quem compõe. Letra, cifra e
coautoria no mesmo lugar.**

## Para quem

Compositoras e compositores independentes, letristas, duplas e bandas que
escrevem a várias mãos e precisam saber, ao registrar ou gravar uma obra, quem
escreveu o quê e com qual percentual. Também quem compõe sozinho e quer um
caderno que vá junto no celular, funcione sem sinal e guarde a história de
cada canção.

## O que o Compoze não é

- **Não é um editor de partitura nem uma DAW.** A música entra como cifra,
  andamento, tom e memos de voz; a produção acontece em outro lugar.
- **Não é um registro oficial.** O hash prova a integridade dentro do Compoze
  e serve de base para o registro na Biblioteca Nacional ou na associação de
  direitos, mas não o substitui
  ([ADR 0009](../decisoes/0009-versoes-e-registro.md)).
- **Não é uma rede social de alcance.** O mural é de quem a pessoa segue, em
  ordem de data, sem algoritmo.
- **Não intermedeia dinheiro.** O apoio por PIX vai direto para a chave de
  quem fez o projeto ([ADR 0018](../decisoes/0018-apoio-por-pix.md)).

## Princípios que guiaram as decisões

1. **A obra é de quem escreveu.** Autoria por trecho, divisão acertada entre
   as pessoas, ninguém entra numa canção sem aceitar o convite, ninguém vê uma
   canção de que não é coautor.
2. **Escrever nunca espera a rede.** O caderno vive no aparelho e sincroniza
   quando dá ([ADR 0005](../decisoes/0005-mobile-e-offline.md)). O que pede
   rede diz isso no próprio botão.
3. **Nada se perde por engano.** Lixeira de 30 dias, desfazer em tudo,
   restaurar uma versão guarda a de agora antes, excluir pasta ou projeto não
   apaga canção.
4. **Grátis para manter.** Tudo roda em planos gratuitos (Render, Neon,
   Firebase, GitHub Releases), e cada decisão que pediria cartão de crédito
   foi trocada por uma alternativa sem custo, registrada em ADR (imagens e
   áudio no Postgres, PIX direto na chave, e-mail pelo Gmail, APK fora da
   loja).
5. **Uma cara própria.** A linguagem visual "Caderno" (papel, tinta, lápis
   vermelho) foi desenhada para não parecer um app gerado em série
   ([design system](../frontend/design-system.md),
   [ADR 0002](../decisoes/0002-reescrita-do-frontend.md)).

## Funcionalidades e situação

O catálogo completo, com o que cada funcionalidade faz e como foi feita, está
em [funcionalidades.md](funcionalidades.md). As telas, uma a uma, em
[../telas/](../telas/README.md).

| Área | Situação | Onde |
| --- | --- | --- |
| Conta: cadastro, login, sessão que abre sem esperar o servidor, senha nova em Ajustes | Pronto | [entrada](../telas/entrada.md), [ajustes](../telas/ajustes.md) |
| Mesa: resumo do caderno, continuar de onde parou, esteira, convites | Pronto | [mesa](../telas/mesa.md) |
| Canções: índice e fichas, busca por título, tag e verso, filtro por estágio | Pronto | [cancoes](../telas/cancoes.md) |
| Editor em blocos com autoria por trecho, desfazer, ocultar cifras, alinhar | Pronto | [editor](../telas/editor.md) |
| Escrita junto em tempo real, com presença ("aqui agora", "escrevendo") | Pronto (Fase 2a, ADR 0007) | editor |
| Escrever offline, com fila que sobe quando a rede volta | Pronto (Fase 2b, ADR 0008) | todas |
| Ficha técnica, coautoria e divisão que fecha em 100% (RN05) | Pronto | editor |
| Histórico de versões com hash encadeado e registro da obra | Pronto (Fase 2d, ADR 0009) | editor |
| Convites pela conta (aceitar/recusar) e por link de uso único | Pronto (ADR 0010) | editor, Mesa, [convite](../telas/convite.md) |
| Convite por e-mail | Código pronto; liga com a senha de app do Gmail no Render (ADR 0017) | editor |
| Memos de voz gravados offline | Pronto (Fase 3c, ADR 0012) | editor |
| Pastas com subpastas | Pronto | [pastas](../telas/pastas.md) |
| Projetos: faixas, fase, meta, custo, lançamento, capa | Pronto | [projetos](../telas/projetos.md) |
| Apoio a projetos por PIX, direto na chave da dona | Pronto (Fase 4d, ADR 0018) | projetos, [apoiar](../telas/apoiar.md) |
| Lixeira de 30 dias (RN07/RN08) | Pronto | [lixeira](../telas/lixeira.md) |
| Mural, seguir, curtir, comentar | Pronto (Fase 4a, ADR 0013) | [mural](../telas/mural.md), [perfil](../telas/perfil.md) |
| Lista de seguidores e seguindo | Pronto | [perfil](../telas/perfil.md) |
| Conversas a dois, ao vivo, com não lidas | Pronto (Fase 4b, ADR 0014) | [conversas](../telas/conversas.md) |
| Foto de perfil e capa de projeto | Pronto (Fase 4c, ADR 0015) | ajustes, projetos |
| Avisos com o app fechado (navegador, PWA e Android) | Pronto (Fase 3d, ADR 0016) | ajustes |
| Mapa de quem compõe (RN11) | Tela e API prontas; falta a opção de aparecer em Ajustes | [mapa](../telas/mapa.md) |
| Busca global (⌘K) | Pronto | [casca](../telas/casca.md) |
| Primeiros passos no primeiro acesso e ajuda de cada tela | Pronto (ADR 0020) | [ajuda](../telas/ajuda.md) |
| PWA instalável, que abre sem rede | Pronto (Fase 2c) | — |
| App Android (APK nos Releases do GitHub) e "Compartilhar para o Compoze" | Pronto (Fase 3, ADR 0011) | [android](../mobile/android.md), [compartilhar](../telas/compartilhar.md) |
| Modo demonstração, sem servidor | Pronto (ADR 0003) | — |
| Lojas (Play Store, App Store), assinaturas, Mercado Pago | Futuro | [futuro.md](futuro.md) |

## Regras de negócio

Os códigos vêm do PRD original do projeto e são citados no código onde a regra
é aplicada, para dar para achar de onde ela vem (`grep RN05`).

- **RN05 — Divisão de coautoria.** Cada coautor tem um percentual. Enquanto a
  divisão está em negociação a soma pode ser qualquer valor; ao *fechar* a
  divisão, ela precisa somar exatamente 100%. Mudar um percentual depois reabre
  a divisão. Registrar a obra exige a divisão fechada.
- **RN07 — Exclusão reversível.** Excluir uma canção a manda para a lixeira,
  preservando pasta e projeto, para que restaurar a devolva ao mesmo lugar.
- **RN08 — Retenção da lixeira.** Itens ficam 30 dias na lixeira e depois são
  apagados de vez por um processo do servidor. O cliente só mostra o prazo.
- **RN11 — Privacidade de localização.** Coordenadas só aparecem no mapa para
  quem escolheu aparecer, e nunca no perfil público.
- **Autoria por bloco.** Todo bloco guarda quem o escreveu. É a base da prova
  de coautoria e do destaque por cor no editor.
- **Entrar numa canção exige aceite.** Convite pela conta ou por link; nunca
  se adiciona alguém direto ([ADR 0010](../decisoes/0010-convites.md)).
- **Ver uma canção exige ser coautor.** Para os demais, a API responde `404`,
  como se ela não existisse.
- **Pastas são opcionais.** Uma canção sem pasta é um estado válido. Excluir
  uma pasta não apaga nada: subpastas sobem um nível e canções ficam sem pasta.
- **Projetos não são donos das canções.** Excluir um projeto não exclui suas
  faixas; retirar uma faixa não a apaga.
- **Só o apoio confirmado conta.** No PIX, só o que a dona confirmou no
  extrato soma no arrecadado.

## Estágios de uma obra

Ideia → Escrita → Revisão → Finalizada → Registrada → Gravada.

Mudar de estágio guarda uma versão sozinha. **Registrada** só se alcança pelo
"Registrar a obra" (dona, divisão fechada, internet), que guarda a versão de
registro com hash. A API conhece ainda `ARQUIVADA` e `CANCELADA`, que a
interface trata como fora do fluxo ativo.

## Papéis numa canção

| Papel | Pode |
| --- | --- |
| Dona (quem criou) | Tudo: escrever, ficha, pasta, convidar e remover, fechar a divisão, registrar, lixeira |
| Composição, Letra, Arranjo e instrumentos, Produção | Escrever, mudar a ficha (menos a pasta), gravar memos. A divisão é acertada pela dona |
| Só leitura | Ler a canção e ouvir os memos |
