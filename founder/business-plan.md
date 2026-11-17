# Compoze · Business plan

**Verdict: Not yet**

- ✓ Each folha de divisão (uma canção) earns $14.63 before fixed costs (98% contribution).
- ✓ Year 1 operating profit: $1,014.
- ✗ 20 of 100 simulated buyers buy (20%, the bar is 25%).

| key number | |
| --- | ---: |
| Price | $14.90 a folha de divisão (uma canção) |
| Profit margin at plan | 72% per folha de divisão (uma canção) |
| Break-even | 17 folha de divisão (uma canção)s a day |
| Year 1 operating profit | $1,014 |
| Startup spend | $483 |
| Cash needed before it pays for itself | $1,070 |
| Startup money earned back | month 11 |
| Buyer panel | 20 buy · 80 pass |

## The idea

- What it is: um caderno compartilhado para compor canções a várias mãos (app PWA + APK Android, em português), onde letra, cifra, memos de voz e a divisão de coautoria ficam na mesma obra, com autoria por trecho, escrita em tempo real ou offline, versões imutáveis com hash e uma esteira da ideia à gravação.
- Who it is for: compositoras e compositores independentes brasileiros, letristas, duplas e bandas que escrevem juntos e precisam saber, na hora de registrar ou gravar, quem escreveu o quê e com qual percentual; também quem compõe sozinho e quer um caderno no celular que funcione sem sinal.
- What it sells, at what price: freemium. Free (R$ 0: canções, escrita junto, offline, mural, conversas ilimitados; ~30 min de memos, histórico de 30 dias, 3 registros com hash/mês, 1 projeto). Plus R$ 9,90/mês ou R$ 99/ano (memos e histórico ilimitados, registros ilimitados, vários projetos, exportar PDF/cifra). Pro R$ 24,90/mês ou R$ 249/ano (projetos ilimitados com apoio por PIX, certificado de registro em PDF com a divisão, estatísticas, espaço de banda/equipe). Planos propostos, ainda não implementados. **Depois desta análise o modelo recomendado mudou:** tudo para escrever grátis, folha de divisão R$ 14,90 por canção (fundador R$ 9,90), pacote de 5 por R$ 49,90 e Plus R$ 19,90/mês com folhas ilimitadas (ver pricing.md).
- Where and how: online, Brasil. Web (PWA instalável) e APK Android distribuído pelo GitHub Releases (fora da Play Store por enquanto). Pagamento planejado via Mercado Pago Assinaturas (web/APK) ou PIX anual; Play Store exigiria Google Play Billing (15–30%). Apoio a projetos por PIX vai direto à chave do artista, sem taxa.
- Budget and constraints: fundador solo (Ryan Ramos, desenvolvedor), produto já construído e funcionando em staging; orçamento praticamente zero, tudo roda em planos gratuitos (Render, Neon 0,5 GB, Firebase, GitHub). Sem domínio próprio, sem conta paga na Play Store (US$ 25) nem Apple (US$ 99/ano). Sem base de usuários pagantes ainda. Cobrar exigirá MEI para nota fiscal e planos pagos de infraestrutura quando o volume passar do gratuito.

## Summary

**Veredito: Ainda não (Not yet).** Calculado pelo `compile.py`, não escrito à mão. Das três checagens, duas passam e uma falha: **20 de 100 compradores simulados compram (20%), abaixo da barra de 25%.**

**O que precisa mudar e quem muda:** subir a compra real, e o caminho está claro no painel: focar em quem já paga para resolver divisão (compositor de mercado que cede ou vende música, 80% de compra; "desconfiado com direitos", 60%) e responder a dúvida que travou quase todo mundo: **"a UBC/ABRAMUS/a distribuidora aceita essa folha?"**. Isso é trabalho de `/founder-offer` (resposta das associações, garantia, guia) e de `/founder-launch` (teste real com PIX). A barra não foi baixada para passar.

**O que é:** o Compoze é um caderno compartilhado para compor canções a várias mãos, em português, com autoria por trecho e escrita offline. É para compositores brasileiros que escrevem em parceria e precisam, quando a canção sai, saber quem escreveu o quê e com qual percentual.

**Os três números (preço R$ 14,90 por folha de divisão):**
- Margem: cada folha deixa **R$ 14,63 (98%)**; margem final de **72%** na meta de 60 folhas/mês.
- Equilíbrio: **17 folhas por mês** (custo fixo de R$ 237/mês).
- Ano 1: **R$ 3.934 de receita e R$ 1.014 de lucro**, R$ 1.070 de caixa necessário, gasto inicial pago no mês 11. É pequeno: paga a si mesmo, **não paga o fundador**.

**Onde o painel e o conselho concordaram:** a dor é real e está no momento do lançamento, não no dia a dia; o substituto grátis (caderno + WhatsApp) é o rival de verdade; a prova de que a folha vale fora do app é o ponto fraco. **Onde discordaram:** o conselho pediu foco num nicho pequeno e comunidade; o painel mostrou que o modelo de cobrança importava mais que o nicho: assinatura deu **0%** em duas rodadas, pagar por canção deu **20%**.

**O maior risco:** as associações e distribuidoras não reconhecerem a folha. **O que fazer:** perguntar por escrito à UBC e à ABRAMUS agora, publicar a resposta, e vender a folha como "acordo entre coautores, documento de apoio" com garantia de devolução se for recusada.

**O que o Ryan precisa para começar:** cerca de **R$ 1.070** no pior mês do caixa (ou **R$ 637** se o banco continuar no plano grátis), uma conta de vendedor no Mercado Pago e **duas semanas de teste real** (01–14/12/2026) com 30 a 50 compositores e PIX de verdade. Meta: 5 folhas pagas.

**A coisa a fazer esta semana:** abrir a conta de vendedor no Mercado Pago e mandar o e-mail para a UBC e a ABRAMUS perguntando se aceitam a folha de divisão como documento de apoio.

Os compradores são simulados e os números são projeções; só clientes reais e cotações reais confirmam. Não é conselho financeiro, jurídico ou fiscal.

## What the board said

**Votação: 3 "financiar se" (FUND IF), 0 financiar, 0 passar. Nota média 4,7/10** (Ofertas 4, Monopólio 4, Produto 6).

Memos completos em [board/offers.md](board/offers.md), [board/monopoly.md](board/monopoly.md) e [board/product.md](board/product.md).

### Riscos que mais de um membro levantou (vêm primeiro)

1. **Não há prova de que alguém paga, nem de que alguém fica.** Nenhum usuário de fora, nenhum pagante, nenhuma pesquisa (Ofertas e Monopólio). Para a lente de Ofertas, mercado não medido é o motivo nº 1 de "passar".
2. **O substituto grátis já está instalado.** Bloco de notas + áudio de WhatsApp + "a gente acerta depois" resolve o bastante para a maioria; e o valor do Compoze só aparece quando o parceiro também entra (Monopólio e Produto).
3. **O hash não vale fora do app.** O momento de maior valor (registrar) acontece fora do Compoze, e o produto diz, com honestidade, que não substitui o registro. Isso derruba a "probabilidade percebida" e quebra a experiência no ponto mais importante (Ofertas e Produto).
4. **Distribuição e confiança.** Sem domínio, sem Play Store, APK pelo GitHub (Monopólio e Produto).

Só a lente de Produto levantou: **falta de foco** (mural, seguidores, conversas, PIX, notificações diluem o núcleo para um fundador solo). Só a de Monopólio: **nenhum segredo técnico**, o núcleo é copiável em meses.

### Condições (checklist para o resto do pacote)

- [ ] Validar com compositores reais que um segmento específico tem a dor **e** paga (painel de consumidores agora; teste real em `/founder-launch`).
- [ ] Escolher um nicho pequeno (gênero, cena ou comunidade) para dominar primeiro.
- [ ] Mostrar um canal repetível para os primeiros 100 usuários ativos, sem mídia paga, e o custo de cada um (`/founder-marketing`, `/founder-launch`).
- [ ] Medir convites por usuário: cada obra coescrita traz gente nova? (`/founder-launch`, 30 dias).
- [ ] Montar a oferta em torno do momento do registro, com nome claro; o pago deve carregar o resultado (divisão fechada e documentada), não só armazenamento (`/founder-offer`).
- [ ] Criar prova: primeiros casos reais, ou parceria/aceite de alguma entidade para o certificado.
- [ ] Uma garantia que o fundador consiga bancar (`/founder-offer` + `/founder-cfo`).
- [ ] Desenhar os 5 primeiros minutos do coautor convidado: do link até ver o próprio nome num trecho.
- [ ] Cortar ou esconder o que não serve ao núcleo.

### Onde o conselho discordou

A lente de Produto deu 6: vê um núcleo coerente, software pronto e ofício de design raro em nicho. As lentes de Ofertas e Monopólio deram 4: o produto existe, o negócio ainda não. Ninguém votou "passar": a dor é real e o custo de manter é quase zero, então o risco é pequeno, mas ninguém financiaria antes de prova de demanda.

### A versão mais forte que o conselho enxerga

Não "um caderno social de composição", e sim **o lugar onde a parceria vira papel**: a obra coescrita nasce com autoria por trecho, divisão fechada em 100% e um documento de divisão (split sheet) assinado pelos coautores, pronto para levar à associação, à editora e à distribuidora. A escrita junto fica grátis porque é o que traz os parceiros; o que se paga é o resultado: a divisão documentada e o histórico que prova. Começando por um nicho onde coautoria e dinheiro andam juntos (compositores de mercado e bandas que lançam), não pelo hobbyista. Isso é mais estreito do que o pitch atual, e deixa mural, seguidores e apoio por PIX em segundo plano.

## The competition

Pesquisa feita em 17/11/2026, só com fontes públicas. Cada linha tem link; quando uma fonte não abriu, está dito. Os dados completos estão em `founder/competitors.csv`.

### 1. Quem está no mercado (do mais direto ao menos direto)

| Concorrente | Tipo | Preço comparável | O que faz | Posicionamento (deles) | Nota |
| --- | --- | --- | --- | --- | --- |
| [Songcraft](https://songcraft.io/) | Direto | Pro [US$ 12/mês ou US$ 96/ano](https://songcraft.io/pricing); Free até 5 músicas | Letra, cifra, tabs e gravações com coescrita em tempo real, comentários e chat; Pro tem histórico de versões, coleções de banda, PDF/ChordPro | "Write better songs. Together." | sem avaliações ([Product Hunt](https://www.producthunt.com/products/songcraft/reviews)) |
| [Hookpad](https://www.hooktheory.com/pricing) | Direto | US$ 7,99/mês ou US$ 199 vitalício (+US$ 14,99/mês pela IA Aria) | Composição guiada por teoria (acordes e melodia), sem colaboração citada | "Smart songwriting starts here." | n/d |
| [Songwriter's Pad + Lyrics AI](https://apps.apple.com/us/app/-/id6462515092) | Direto | Gold US$ 12,99/mês ou US$ 79/ano | Caderno de letras solo, rimas, gravador, IA | "AI Lyric Generator Song Studio" | 4,1 (49) |
| [Lyric Notepad](https://apps.apple.com/us/app/lyric-notepad/id1435329761) | Direto | Premium US$ 6,99 a 8,99 (período não informado) | Caderno de letras solo, rimas, sílabas, gravador | "#1 App to Make Poetry & Rap" | 3,6 (622) |
| [LyricStudio](https://tooldirectory.ai/tools/lyricstudio-ai-lyric-writing) | Direto | Freemium, **preço não encontrado** (site oficial não alcançado) | IA para letras, colaboração em tempo real segundo o diretório | n/d | n/d |
| [BandLab](https://help.bandlab.com/hc/en-us/articles/20758981227033-BandLab-Membership-FAQ) | Indireto | Grátis; Membership US$ 14,95/mês ou US$ 99 no 1º ano | DAW social para gravar e colaborar em demos | "AI Music Tools, Editor & DAW" | [4,7 (513 mil)](https://apps.apple.com/app/id968585775) |
| [Soundtrap](https://www.capterra.com/p/209734/Soundtrap/pricing/) | Indireto | US$ 9,99 a 17,99/mês | DAW no navegador com sessões colaborativas | n/d | 4,5 (187, Capterra) |
| [Cifra Club](https://apps.apple.com/BR/app/id921625944) | Indireto (BR) | PRO de R$ 9,90 a R$ 119,90 (períodos não informados) | Cifras de músicas existentes; PRO: sem anúncios, "Criar minha versão" | "Cifras e tabs para você tocar" | 4,8 (51 mil) |
| [Ultimate Guitar](https://help.ultimate-guitar.com/en/articles/6741579-how-much-does-pro-cost) | Indireto | Preço por país, não publicado; usuários citam [£ 29,99/ano](https://community.justinguitar.com/t/ultimate-guitar-price-increase/386865) | Cifras e tabs | n/d | n/d |
| [Notion](https://www.notion.com/pt-br/pricing) | Indireto | Free; Plus US$ 10/membro/mês | Espaço genérico de documentos | n/d | n/d |
| Google Docs | Indireto | R$ 0 | Edição em tempo real e histórico, [sem ferramentas de compositor](https://freebeat.ai/articles/best-lyric-app-for-co-writing-2026) | n/d | n/d |
| [Songtrust](https://songtrust.com/pricing) | Indireto (splits) | US$ 100 por compositor + 15–20% dos royalties | Administração de editora: registra obras e divisões | "Simple, transparent pricing" | n/d |
| [MusicasRegistradas.com](https://www.baguete.com.br/noticias/musicasregistradas-com-assegura-autoria-musical-com-bry) | Indireto (registro BR) | **Preço não encontrado** | Registro com assinatura digital, carimbo do tempo e hash; certificados em minutos (notícia de 28/08/2026) | n/d | n/d |
| [Orphiq](https://orphiq.com/resources/songwriter-credit-disputes) | Indireto (splits) | "Start free", preço não exibido | Registro de colaborações e acordos | "The AI that lets artists stay artists" | n/d |
| [Biblioteca Nacional / EDA](https://www.gov.br/bn/pt-br/atuacao/direitos-autorais-1/documentos-do-eda-2/05-tabela-de-retribuicao.pdf) | Substituto (registro) | R$ 40,00 por obra (pessoa física) | Registro oficial pelo Gov.br, [cerca de 30 dias](https://www.migalhas.com.br/depeso/382026/registro-de-musicas) | n/d | n/d |
| [Associação (UBC, ABRAMUS…) via ECAD](https://www4.ecad.org.br/?p=8151) | Substituto (cadastro) | **Custo não verificado** | Cadastro da obra para receber execução pública | n/d | n/d |
| Caderno + áudio no WhatsApp + memos de voz | Substituto | R$ 0 | Letra num lugar, melodia em outro, divisão "a gente acerta depois" | n/d | n/d |

Verificados e descartados: **Splice** vende samples e plugins, não é caderno de composição, então ficou de fora. Não achei um app chamado "Splits" com página própria; o espaço de split sheets aparece com Songtrust e Orphiq. O Apple Notes com memos de voz entra junto do substituto "caderno + WhatsApp".

### 2. Faixa de preço (plano pago mensal de quem compõe)

Só os preços mensais confirmados de apps de composição ou colaboração: Hookpad US$ 7,99, Soundtrap US$ 9,99, Notion US$ 10, Songcraft US$ 12, Songwriter's Pad US$ 12,99 e BandLab US$ 14,99.

- **Mais barato:** Hookpad, US$ 7,99/mês.
- **Mediana:** US$ 11/mês.
- **Mais caro:** BandLab, US$ 14,99/mês. Se contar o Hookpad com a IA Aria, chega a US$ 22,98.
- **Em reais:** o único preço local é o do Cifra Club PRO, de R$ 9,90 a R$ 119,90, sem período informado.

O Compoze Plus, a R$ 9,90/mês, só deixa de ser o mais barato do grupo se o dólar cair abaixo de R$ 1,24, porque R$ 9,90 ÷ US$ 7,99 dá cerca de R$ 1,24. O Pro, a R$ 24,90, fica próximo do preço em dólar dos concorrentes, convertido pelo câmbio do dia. Nenhum concorrente direto cobra em reais nem aceita PIX, segundo as páginas consultadas.

### 3. Mapa de posicionamento

Eixo X: **feito para o Brasil** (português, preço em R$, PIX, registro local). Eixo Y: **compor junto com autoria clara** (coescrita em tempo real e quem escreveu o quê).

```
 compor junto + autoria
        ▲
        │  Songcraft (coescrita, sem divisão)        [vazio: Compoze]
        │  Songtrust/Orphiq (divisão, sem caderno)
        │  Google Docs, Notion (coescrita genérica)
        │  BandLab, Soundtrap (demo, não letra)
        │                                          MusicasRegistradas, EDA
        │  Hookpad, Songwriter's Pad,              (registro sem caderno)
        │  Lyric Notepad, LyricStudio (solo)       Cifra Club (cifra de terceiros)
        │                                          Caderno + WhatsApp
        └──────────────────────────────────────────────────────► feito para o BR
```

O canto de cima à direita está vazio: nenhum app em português junta coescrita, cifra, memo de voz e divisão de autoria na mesma obra.

### 4. O que os clientes reclamam (por frequência)

1. **Assinatura cara ou paywall no básico (11 menções, 5 produtos).**
   - Hookpad: ["it costs way much than if offers"](https://forum.hooktheory.com/t/why-hookpad-subscribtion-is-that-much-expensive-what-are-the-reasons-that-keep-you-using-this-program/8524) e "prefer offline software I can install once and use forever" (mesmo fórum).
   - BandLab: após a v11.36 (05/11/2026), ["Why did you have to make it so I have to buy the membership to adjust almost every effect?"](https://mwm.ai/articles/app-updates/bandlab-music-maker-beats-v11-36-0-locks-audio-effects-behind-15-paywall-november-2026). A nota média caiu de 4,22 para 3,42, segundo o mesmo artigo.
   - Lyric Notepad: ["the weekly subscription rate is out of the question"](https://apps.apple.com/us/app/lyric-notepad/id1435329761).
   - Soundtrap: ["the free version of the software has too limited functionality"](https://www.capterra.com/p/209734/Soundtrap/pricing/).
   - Ultimate Guitar: ["Heck of an increase!"](https://community.justinguitar.com/t/ultimate-guitar-price-increase/386865).
2. **Bugs que perdem trabalho ou travam o acesso (6 menções, 5 produtos).**
   - BandLab: ["it will stop in the middle at a random time frame"](https://apps.apple.com/app/id968585775).
   - Songwriter's Pad: ["the recordings don't show up on the list"](https://apps.apple.com/us/app/-/id6462515092) e "I can't get past the screen to create an account".
   - Cifra Club: ["As músicas quando salva na lista ou elas não salvam ou elas saem fora de ordem"](https://apps.apple.com/BR/app/id921625944).
   - Também: Lyric Notepad "won't open" e Hookpad, assinatura paga sem liberar o recurso ([fórum](https://forum.hooktheory.com/t/do-i-not-save-band-feature-with-a-monthly-subscription/3305)).
3. **Anúncios demais (3 menções, tema fraco).**
   - Lyric Notepad: ["COMPLETELY UNUSABLE IN ITS BASIC VERSION BECAUSE OF THE ADS"](https://apps.apple.com/us/app/lyric-notepad/id1435329761).
   - Cifra Club: um usuário reclama de anúncios em cada cifra ([App Store BR](https://apps.apple.com/BR/app/id921625944)).
   - Soundtrap: anúncios no plano gratuito ([Capterra](https://www.capterra.com/p/209734/Soundtrap/pricing/)).
4. **Coautoria desorganizada no substituto (tema fraco; vem de textos editoriais, não de avaliações).**
   - ["Wait — which lyric are we using?"](https://www.hypebot.com/great-co-write-now-save-the-song/)
   - "An amazing voice memo nobody else can find isn't much of a handoff."
   - "'we'll figure it out later' leaves you with one more thing to chase" (mesma fonte, 03/11/2026).
   - A Orphiq resume: ["The conflict is not about greed. It is about ambiguity."](https://orphiq.com/resources/songwriter-credit-disputes)
5. **Ferramentas rasas para compor de verdade (1 menção, tema fraco).** Sobre o BandLab, um usuário do Reddit diz que é ["more like training wheels"](https://reddit.birdcat.cafe/r/Bandlab/comments/1jx85l7/do_people_actually_compose_on_bandlab). O link é de um espelho do Reddit, e o endereço original não apareceu.

Não encontrei avaliações públicas do Songcraft, o concorrente mais próximo. A página do Subscribed.fyi não abriu e o Product Hunt não tem avaliações. Para ele, as reclamações acima não valem.

### 5. A lacuna

**Ninguém guarda a prova de quem escreveu o quê no momento em que a música nasce, em português, por um preço em reais.**

- O **Songcraft** já faz a coescrita, mas em inglês, em dólar e sem divisão de autoria na página.
- **Songtrust, Orphiq, MusicasRegistradas e a EDA** só registram depois, sem saber qual trecho é de quem. A EDA cobra R$ 40 por obra e leva cerca de 30 dias.
- O substituto dominante, caderno + WhatsApp, é grátis, mas espalha letra e áudio e adia a divisão. É exatamente o "a gente acerta depois" das citações.
- O **Cifra Club** tem o público brasileiro, mas lida com cifras de músicas de terceiros, não com composição original.

O Compoze pode defender quatro pontos com base nas reclamações:

- **Autoria por trecho com hash**: transforma a divisão em registro feito durante a escrita.
- **Plano grátis generoso** (canções ilimitadas): responde à reclamação nº 1, de paywall no básico.
- **Offline e versões imutáveis**: respondem à nº 2, de perda de trabalho.
- **Sem anúncios**: responde à nº 3.

Um alerta: o registro com hash não substitui o registro oficial na EDA nem o cadastro na associação. Ele deve ser vendido como a prova que facilita esses passos, não como o registro em si.

### 6. A ameaça

1. **Songcraft**: é o mais próximo. Já tem coescrita em tempo real, histórico de versões e PDF. Adicionar porcentagem de autoria e traduzir para português é um trabalho pequeno para eles. A defesa do Compoze está no que é local: PIX, preço em R$, cifra no padrão brasileiro e o fluxo de registro na EDA e nas associações.
2. **Cifra Club (Studio Sol)**: tem 51 mil avaliações só na App Store BR e já tem o "Criar minha versão". Um modo "compor" chegaria de uma vez a todo o público do Compoze.
3. **MusicasRegistradas.com**: já faz hash e certificado no Brasil. Se acrescentar um caderno colaborativo, passa a disputar o Pro do Compoze.
4. **BandLab**: é grátis e enorme, mas está irritando a base com paywalls. É mais uma chance de captar usuários do que uma ameaça.

### Notas para o CFO

**Mercado Pago, Checkout** ([página oficial](https://www.mercadopago.com.br/ferramentas-para-vender/check-out), consultada em 17/11/2026):

| Meio | Liberação | Taxa |
| --- | --- | --- |
| PIX | na hora | 0,99% |
| Cartão de crédito | na hora | 4,98% |
| Cartão de crédito | em 14 dias | 4,49% |
| Cartão de crédito | em 30 dias | 3,98% |
| Boleto | até 3 dias | R$ 3,49 |

**Mercado Pago, Assinaturas** ([página oficial](https://www.mercadopago.com.br/ferramentas-para-vender/assinaturas?code=TYOSL)): a leitura da página trouxe 4,49% no crédito com liberação na hora, 3,99% com liberação em 30 dias e um valor de "débito 4,99%". Esse último parece trocado. A página não mostra taxa de PIX para assinatura. **Confirme na conta antes de modelar.** A [tabela geral de tarifas](https://www.mercadopago.com.br/knowledge-hub/tabela-taxas-tarifas_45243) e a [página de taxas para desenvolvedores](https://www.mercadopago.com.br/developers/pt/support/taxas-de-servico-para-transacoes_37740) não abriram ou vieram sem valores.

**Google Play Billing** ([Central de Ajuda do Play Console](https://support.google.com/googleplay/android-developer/answer/112622?hl=en)): o Brasil está nos "remaining markets". Lá, assinaturas pagam 15% em qualquer faixa de receita. Outras compras pagam 15% no primeiro US$ 1 milhão do ano e 30% acima disso. A página avisa que novas taxas serão anunciadas, sem data.

**O que sobra do Plus de R$ 9,90/mês:**

| Meio | Taxa | Fica com o Compoze |
| --- | --- | --- |
| PIX (Checkout) | cerca de R$ 0,10 | cerca de R$ 9,80 |
| Crédito na hora (Checkout) | cerca de R$ 0,49 | cerca de R$ 9,41 |
| Google Play | cerca de R$ 1,49 | cerca de R$ 8,41 |

A conta da Play Store não inclui a inscrição de US$ 25.

**Custo que o usuário já paga hoje:** R$ 40,00 por obra na Biblioteca Nacional ([tabela EDA](https://www.gov.br/bn/pt-br/atuacao/direitos-autorais-1/documentos-do-eda-2/05-tabela-de-retribuicao.pdf); a tabela não traz data). É uma âncora útil para o preço do certificado do Pro.

## The buyer panel

**20 buy · 80 pass** (20% buy) out of 100 simulated buyers. Seed 2026, so the same cards can be dealt again.

These are simulated buyers, not customers. Use this to find objections and weak spots, then confirm the big ones with real people before you spend.

### By segment

| group | buyers | buy rate |
| --- | ---: | ---: |
| Compositor profissional do mercado (sertanejo, gospel, pagode) que vende ou cede músicas | 10 | 80% |
| Compositor ou banda com lançamentos e parcerias frequentes (associado a UBC/ABRAMUS) | 20 | 20% |
| Músico independente semiprofissional (toca na noite, dá aula, lança no streaming) | 40 | 18% |
| Estudante ou iniciante que compõe por hobby | 30 | 3% |

### By buying behaviour

| group | buyers | buy rate |
| --- | ---: | ---: |
| Desconfiado com direitos | 10 | 60% |
| Organizado | 15 | 47% |
| Compra ferramenta de trabalho | 10 | 20% |
| Parceiro de WhatsApp | 20 | 15% |
| Leal ao Cifra Club e ao caderno | 10 | 10% |
| Fiel ao grátis | 25 | 4% |
| Testa tudo | 10 | 0% |

### By income

| group | buyers | buy rate |
| --- | ---: | ---: |
| $67,000 and up | 35 | 37% |
| $29,000 to $67,000 | 32 | 19% |
| under $29,000 | 33 | 3% |

### Why they pass

| reason | buyers | in their words |
| --- | ---: | --- |
| trust | 32 | "Eu ainda nao tenho nenhuma parceria fechada que precise de folha de divisao, e minhas letras inéditas sao o que mais tenho de valor. Nao quero colocar isso num servico que eu nao conheço, mesmo que o texto diga que so os coautores veem." (P003) · "A ideia de a parceria virar papel me interessa, mas não quero minhas letras inéditas guardadas na nuvem de outra pessoa. Eu ainda não tenho uma canção pronta para sair do caderno, então não tenho motivo para pagar agora; o bloco de notas e o áudio do WhatsApp fazem o trabalho por zero real." (P006) |
| habit | 25 | "Eu componho de graça no WhatsApp e no caderno, e isso funciona com meus parceiros. Só pagaria os R$ 9,90 quando uma música fosse sair, e nenhuma está pronta esta semana." (P004) · "Eu escrevo de graça no caderno e no áudio do WhatsApp e nunca paguei assinatura de app além de streaming. Uma folha de R$ 9,90 por música ainda é pouco para quem lança uma por mês, mas eu teria que mudar meu jeito de fazer as coisas para pagar, e hoje não sinto que preciso." (P008) |
| need | 13 | "Eu não tenho canção saindo do caderno ainda. Escrevo no celular, no ônibus, e nada disso está sendo publicado, então não preciso de folha de divisão agora. Se a versão grátis já faz quase tudo, não vejo motivo para tirar R$ 9,90 do meu orçamento." (P002) · "Eu nem tenho canção saindo do caderno ainda, então não preciso de folha de divisão agora. Escrever de graça é legal, mas pagar R$ 9,90 por um PDF que eu não vou levar pra UBC ou editora este mês não faz sentido pra quem ganha pouco e faz música por hobby." (P005) |
| timing | 6 | "Eu escrevo muito, mas a maioria das canções ainda não vai sair do caderno, então não tenho motivo para pagar R$ 9,90 agora. Também não largo meu bloco de notas e meu áudio do WhatsApp por um app novo só para isso." (P001) · "Eu escrevo com parceiros no bloco de notas e no WhatsApp e não vejo problema nisso enquanto a canção não sai. Só penso em divisão de coautoria quando a música vai pro streaming ou pra associação, e isso não acontece todo mês. Não compro agora porque não tenho canção pronta para registrar." (P017) |
| price | 3 | "Escrever é de graça e eu já escrevo no bloco de notas sem pagar nada. A folha só me faria sentido no dia em que uma música fosse sair, e nesse mês eu teria que decidir se R$ 9,90 num mês apertado valem um PDF, sem saber se a associação ou a editora vão aceitar mesmo." (P020) · "Eu escrevo com um parceiro em outra cidade e hoje me viro com WhatsApp, caderno e bloco de notas, que são grátis e já fazem o trabalho. Pagar R$ 9,90 por uma folha de divisão só faz sentido na hora de publicar, e eu ainda não sei se a canção vai sair do caderno." (P054) |
| values | 1 | "Não quero minhas letras inéditas guardadas na nuvem de ninguém, e o caderno e o WhatsApp já fazem o que eu preciso. A folha de divisão é útil, mas eu teria que mudar meu jeito de escrever para usar o app, e não vejo motivo para isso." (P030) |

### Why they buy

| reason | buyers | in their words |
| --- | ---: | --- |
| need | 15 | "Eu co-escrevo quase tudo com parceiro e, quando a música sai, a divisão vira briga se ninguém tiver anotado. Pagar R$ 9,90 uma vez por uma folha com aceite de cada um é barato comparado a perder uma parceria ou um repasse da UBC. Só compraria se fosse uma música que de fato vai sair." (P007) · "A briga de quem fica com quanto da música acontece depois que ela já saiu, e uma folha assinada por todo mundo antes do lançamento me poupava essa dor de cabeça. Pago R$ 9,90 por uma canção que vai para a associação sem pensar duas vezes, mas só quando ela realmente vai sair do caderno." (P010) |
| trust | 5 | "Já vi briga de coautoria estourar por causa de uma música sem papel nenhum, então uma folha com o aceite de cada um e o histórico de versões vale muito mais que R$ 9,90. Pago na hora da canção que vai sair, não antes." (P015) · "Briga de coautoria já me custou parceria, então um documento com o aceite de cada um e o histórico de versões me interessa de verdade. Pago os R$ 9,90 só na música que for sair este mês, mas só depois de ver que a folha aceita o nome de quem escreveu cada trecho e que consigo exportar tudo." (P039) |

### What would flip a no

- Se uma distribuidora ou a UBC/ABRAMUS me pedir a folha assinada antes de liberar uma música, eu compro na hora.
- Uma parceria real com registro próximo: se eu fosse gravar ou mandar uma música para editora ou distribuidora e precisasse da divisão assinada por todos, eu pagaria.
- Se eu pudesse ver um exemplo real da folha de divisao em PDF e saber que a letra fica no meu aparelho ou que eu consigo tirar tudo antes de decidir, e se a associacao de fato aceitasse esse documento.
- Uma música minha entrar na distribuidora e um parceiro discutir a divisão depois. Aí eu pago na hora.
- Se uma canção minha fosse aceita por uma banda, editora ou produtor que exigisse a folha de divisão assinada pelos coautores antes de gravar.
- Uma garantia clara e curta de que as letras ficam só com os coautores, que dá para apagar tudo, e uma canção minha já fechada para lançar que precise da folha de divisão.
- Se a distribuidora ou a associação me pedisse essa divisão documentada para liberar uma música, e eu não tivesse outro jeito de fazer isso de graça.
- Ver uma folha de divisão feita no Compoze aceita pela distribuidora ou pela UBC/ABRAMUS, por um compositor que eu conheço, e poder baixar tudo antes de pagar qualquer coisa.
- Ver que dá para escrever e guardar tudo só no celular, sem subir nada, e que eu posso apagar tudo do servidor quando quiser, antes de gerar a folha.
- Uma associação ou editora confirmando por escrito que aceita a folha do Compoze como comprovante de divisão, ou uma música minha que esteja de fato saindo para distribuição.
- Uma canção minha entrar de verdade numa editora ou ser tocada e cobrar direitos, e aí a associação pedir o documento de divisão.
- Ter uma canção minha já fechada, marcada para gravar ou lançar, e precisar da folha de divisão para a associação ou a distribuidora.

Buyers say they would buy **1.0 times** in the first month on average.

100 buyers gave all four price answers. Run founder-pricing's van_westendorp.py on the answers folder.

## Pricing

Base: o painel de 100 compradores simulados (v3, pagar por canção), o mapa de concorrentes e o CFO. Curva completa em [pricing-curve.md](pricing-curve.md) (a ferramenta imprime "$"; são reais).

### O que os compradores disseram (Van Westendorp, 98 respostas válidas, preço de UMA folha)

| ponto | preço |
| --- | ---: |
| Barato demais para ser bom (PMC) | R$ 3,03 |
| Menor resistência (OPP) | R$ 3,04 |
| Indiferença (IPP) | R$ 6,03 |
| Caro demais (PME) | R$ 20,00 |

Faixa aceitável: **R$ 3 a R$ 20.** Medianas: barato demais R$ 2, pechincha R$ 5, começa a ficar caro R$ 15, caro demais R$ 25.

Para comparação, no painel da assinatura Plus (v1, 20 compradores) a faixa foi R$ 3 a R$ 15 por **mês**, e ninguém comprou. As pessoas aceitam pagar quase o mesmo valor por **uma canção** que aceitavam pagar por **um mês**, desde que paguem só quando precisam.

### O que se paga hoje pelo mesmo trabalho

- **Registro na Biblioteca Nacional (EDA): R$ 40 por obra**, cerca de 30 dias ([tabela EDA](https://www.gov.br/bn/pt-br/atuacao/direitos-autorais-1/documentos-do-eda-2/05-tabela-de-retribuicao.pdf)). É a âncora natural: a folha prepara esse passo.
- **Apps de composição estrangeiros:** US$ 7,99 a US$ 14,99 por mês (Hookpad a BandLab), em inglês, sem divisão de autoria ([competitors.md](competitors.md)).
- **Caderno + WhatsApp + "a gente acerta depois": R$ 0.** É o concorrente real.

### O que o negócio precisa (CFO)

| preço | equilíbrio | lucro ano 1 | caixa necessário |
| ---: | ---: | ---: | ---: |
| R$ 4,90 | 52/mês | −R$ 1.626 | — |
| R$ 9,90 | 25/mês | −R$ 306 | R$ 1.364 |
| **R$ 14,90** | **17/mês** | **R$ 1.014** | **R$ 1.070** |
| R$ 19,90 | 13/mês | R$ 2.334 | — |

### Decisão

1. **O preço: R$ 14,90 por folha de divisão (uma canção, todos os coautores).** Fica dentro da faixa aceitável, logo abaixo da mediana "começa a ficar caro" (R$ 15), custa um terço do registro na EDA, e é o menor preço que deixa o ano 1 no lucro com a rampa do CFO. Margem por folha: 98%.
2. **A escada:**
   - **Grátis:** escrever, escrever junto, offline, exportar tudo. Sem limite de canções. (O grátis é o que traz os parceiros; nunca cobrar por ele.)
   - **Folha avulsa — R$ 14,90 por canção:** paga uma vez, por qualquer coautor, na hora em que a canção sai do caderno.
   - **Pacote de 5 folhas — R$ 49,90** (R$ 9,98 cada), válido por 12 meses: para quem lança um EP ou fecha várias parcerias.
   - **Plus — R$ 19,90/mês ou R$ 199/ano:** folhas ilimitadas, memos e histórico sem limite. Motivo para subir: quem fecha 2 ou mais canções por mês (o compositor profissional de mercado, onde o painel teve 80% de compra).
   - O antigo "Pro" some por enquanto: mural, estatísticas e espaço de banda não apareceram em nenhum motivo de compra.
3. **A oferta de abertura:** **preço de fundador de R$ 9,90 por folha nas primeiras 300 folhas vendidas ou até 31/03/2027, o que vier primeiro.** Só é seguro se a infraestrutura continuar no plano grátis (ver CFO, item 3). Não usar "de R$ X por R$ Y" com preço que nunca foi cobrado.
4. **O que testar com gente real:** R$ 9,90 contra R$ 14,90, em duas páginas iguais (ou alternando por semana), com o botão "Gerar a folha desta canção" levando a um pagamento PIX de verdade. Meta para validar R$ 14,90: pelo menos 60% da taxa de compra de R$ 9,90.
5. **As objeções de preço do painel (para o marketing responder):**
   - "Por que pagar R$ 9,90 por um PDF que eu posso fazer de graça num modelo do Word?" (P063, P093, P037)
   - "R$ 9,90 num mês apertado, sem saber se a associação ou a editora vão aceitar mesmo." (P020)
   - "É mais de um décimo do que eu ganho no ano." (P020 v2, P066, P095: hobbyistas de renda muito baixa, fora do público pagante)

Respostas de preço de compradores simulados escolhem o que testar; não são prova.

## The offer

Método: a lente de Ofertas ([../.claude/skills/founder-board/lenses.md](../.claude/skills/founder-board/lenses.md)), resumo de um framework publicado, aplicado ao Compoze.

### O que aconteceu, em três rodadas

| versão | o que se vendia | painel | compra |
| --- | --- | --- | ---: |
| v1 ([pitch-v1.md](pitch-v1.md)) | Assinatura Plus R$ 9,90/mês por memos, histórico e PDF | 20 (rápido) | **0%** |
| v2 ([pitch-v2.md](pitch-v2.md)) | Plus com folha de divisão assinada, exportar grátis, 1º mês grátis, preço de fundador, devolução | 20 (mesma semente) | **0%** |
| v3 ([pitch.md](pitch.md)) | Tudo grátis; **paga R$ 9,90 por canção** só quando ela sai do caderno | 100 (completo) | **20%** |

O v2 mudou **por que** as pessoas diziam não: "confiança" caiu de 9 para 5 em 20 e "necessidade/momento" subiu de 2 para 7. Ou seja, a confiança foi parcialmente resolvida pela promessa de exportação, e apareceu o problema de fundo: **ninguém quer pagar todo mês por algo que usa quando lança uma música.** O v3 mudou a forma de cobrar para acompanhar esse momento, e a compra foi de 0% para 20%.

### A lista de problemas (na voz do comprador)

Antes de comprar
1. "Meus parceiros nunca vão instalar mais um app."
2. "O bloco de notas e o WhatsApp já resolvem."
3. "App de um desenvolvedor só, fora da Play Store, pode sumir com minhas músicas."
4. "Não quero minhas letras inéditas na nuvem de alguém."
5. "Esse hash não vale nada, o registro é na Biblioteca Nacional."
6. "A UBC/ABRAMUS/a distribuidora aceita esse PDF?" (objeção nº 1 do v3, citada por quase todos os compradores)
7. "Posso fazer uma folha de divisão de graça num modelo do Word."
8. "Mais uma assinatura num mês apertado."
9. "Não tenho canção saindo do caderno agora."
Durante
10. "E se o parceiro não aceitar o link?"
11. "Vai ter cadastro, tour e mural antes de eu ver a canção?"
12. "E se o parceiro discordar do percentual?"
13. "Quem escreveu qual trecho, se a gente mexeu junto?"
Depois
14. "O que eu faço com o PDF na associação?"
15. "Se o Compoze fechar, o documento continua valendo?"
16. "O parceiro pode 'desassinar' depois?"

### Soluções, pontuadas (valor 1–5 / custo 1–5)

| problema | solução | valor | custo | fica? |
| --- | --- | ---: | ---: | :---: |
| 1, 10, 11 | Coautor aceita a divisão **pelo link, no navegador, sem criar conta** (só nome + e-mail ou telefone e um "concordo") | 5 | 2 | ✓ |
| 6, 14 | **Guia "Da folha ao registro"**: passo a passo para EDA, UBC, ABRAMUS e distribuidoras, com os campos que eles pedem, escrito com base nos sites oficiais | 5 | 1 | ✓ |
| 6 | Perguntar por escrito à UBC e à ABRAMUS se aceitam a folha como documento de apoio, e publicar a resposta, seja qual for | 5 | 1 | ✓ |
| 3, 15 | Exportar tudo grátis + aviso de 90 dias se fechar + verificação do código de integridade possível fora do Compoze (algoritmo público) | 4 | 1 | ✓ |
| 4 | Página "Onde ficam suas letras" em linguagem simples (servidor, quem acessa, como apagar a conta) | 4 | 1 | ✓ |
| 7 | Mostrar uma folha de exemplo antes de pagar; a diferença para o Word é o aceite datado de cada coautor e o histórico de quem escreveu cada trecho | 4 | 1 | ✓ |
| 8, 9 | Pagar por canção, só na hora; sem assinatura obrigatória | 5 | 1 | ✓ |
| 12 | Divisão sugerida a partir da autoria por trecho (ponto de partida, editável) | 3 | 3 | depois |
| 16 | Folha fechada é imutável; mudar exige nova versão aceita por todos | 4 | 1 | ✓ |
| 2 | — (o grátis tem de ser melhor que o WhatsApp para escrever junto; é o produto, não a oferta) | — | — | — |
| 5 | Parar de vender o "hash"; vender "a folha com o aceite de cada um e o histórico" | 4 | 0 | ✓ |
| — | Mural, seguidores, estatísticas, apoio por PIX | 1 | 3 | esconder |

### A oferta montada

- **Nome: "Folha de divisão Compoze".** Frase: *a parceria vira papel.*
- **O núcleo:** a canção sai do caderno com a divisão fechada em 100%, com o aceite datado de cada coautor e o histórico de quem escreveu cada trecho, num PDF pronto para a associação, a editora ou a distribuidora.
- **Bônus** (cada um mata uma objeção):
  1. *Aceite sem instalar nada* (mata 1 e 10).
  2. *Guia "Da folha ao registro"* (mata 6 e 14).
  3. *Suas canções saem com você* (exportação grátis, aviso de 90 dias) (mata 3 e 15).
- **Garantia:** se a associação, a editora ou a distribuidora recusar a folha, devolução integral, sem perguntas, em até 60 dias. Custo modelado: com 10% de pedidos, ~R$ 390 a menos no ano 1 (CFO). Cabe.
- **Urgência real:** preço de fundador R$ 9,90 nas primeiras 300 folhas ou até 31/03/2027.
- **Preço:** R$ 14,90 por canção; pacote de 5 por R$ 49,90; Plus R$ 19,90/mês para quem fecha muitas (ver [pricing.md](pricing.md)).

### Equação de valor (1–10), antes (v1) e depois (v3 + bônus)

| elemento | v1 | depois | o que mexeu |
| --- | ---: | ---: | --- |
| Resultado dos sonhos | 4 | 7 | Vender "parceria fechada no papel", não "memos e histórico" |
| Probabilidade percebida | 2 | 5 | Garantia de devolução + guia + resposta das associações. **Ainda é o ponto fraco:** sem aceite de uma entidade, fica em 5 |
| Tempo até o resultado | 5 | 8 | Folha na hora em que a canção sai |
| Esforço e sacrifício | 3 | 7 | Parceiro aceita pelo link; paga só quando precisa |

### O re-teste

v1 → v2 com a mesma semente: **0% → 0%.** Conforme a regra do pacote: quando a oferta não mexe, o problema é o mercado ou o preço. Aqui era a **forma de cobrar**. v3 (pagar por canção) no painel completo: **20%**, com 80% entre compositores profissionais de mercado e 3% entre hobbyistas. O bônus da garantia e do guia ainda não foi testado num painel; o que mais pesa contra o v3 é "a associação aceita?", e só uma resposta real das associações resolve isso.

## The numbers

> **Leia assim:** todos os valores estão em **reais** (a ferramenta imprime "$"). A unidade é **uma folha de divisão (uma canção)** e, como `days_per_month` é 1, onde a tabela diz **"a day" leia "por mês"**. Preço de base: **R$ 14,90 por folha** (ver [pricing.md](pricing.md)).

### Nota do CFO

- **A margem:** cada folha deixa **R$ 14,63** (98%) depois da taxa do Mercado Pago e do servidor. Na meta de 60 folhas/mês a margem final é **72%**. O custo por unidade é quase zero; o negócio inteiro depende de volume.
- **A linha a vigiar: o volume (a rampa).** Com metade das vendas previstas, o ano 1 vira **prejuízo de R$ 917** (`--volume 0.5`). Com 20% a menos, o lucro cai de R$ 1.014 para R$ 242. Preço e custo unitário mexem pouco.
- **Caixa:** precisa de **R$ 1.070** antes de se pagar (gasto inicial de R$ 483 + os meses abaixo do ponto de equilíbrio). O gasto inicial volta no **mês 11**.
- **Ponto de equilíbrio:** **17 folhas por mês** com os custos fixos de R$ 237/mês.
- **Tamanho, dito sem rodeio:** no plano, o ano 1 fatura **R$ 3.934** e lucra **R$ 1.014**. É um negócio que se paga e paga a infraestrutura, **não um salário**. Para virar renda (ex.: R$ 3.000/mês de lucro) seriam ~220 folhas/mês, ou assinantes do Plus; isso é hipótese a testar, não está neste modelo.

#### Três jeitos de melhorar a margem (rodados, não chutados)

1. **Ficar no Neon grátis enquanto der** (a folha não precisa de áudio; memos e imagens são o que enche os 0,5 GB): equilíbrio cai de 17 para **9 folhas/mês**, lucro do ano 1 sobe de R$ 1.014 para **R$ 2.310**, caixa necessário cai para **R$ 637**.
2. **Preço R$ 14,90 em vez de R$ 9,90:** a R$ 9,90 o ano 1 dá **prejuízo de R$ 306** e o equilíbrio é 25/mês; a R$ 14,90 dá **lucro de R$ 1.014** e equilíbrio de 17. A R$ 19,90 o lucro iria a R$ 2.334, mas sai da faixa "começa a ficar caro" do painel (mediana R$ 15).
3. **R$ 9,90 sem o Neon pago** (se o preço de fundador ficar): equilíbrio de 14/mês e lucro de R$ 990 no ano 1. Ou seja, o preço de fundador só é seguro se a infraestrutura continuar grátis.

#### Condições do conselho sobre dinheiro

- "Uma garantia que o fundador consiga bancar": sim. Devolver uma folha custa R$ 14,90; com 10% de pedidos de devolução, o lucro do ano 1 cai ~R$ 390. Cabe.
- "Mostrar que alguém paga": **não atendida.** O modelo é projeção; só um teste real (ver [launch.md](launch.md)) responde.

Não é conselho financeiro, fiscal ou jurídico. Um contador deve conferir o enquadramento no MEI (atividade de software/serviço digital, limite de faturamento) e os tributos antes de cobrar.

---

## Unit economics: Compoze (folha de divisão por canção; escrever é grátis)

Every number below comes from the input file. Nothing is looked up or guessed.

### One folha de divisão (uma canção)

| line | per folha de divisão (uma canção) |
| --- | ---: |
| Price | $14.90 |
| Mercado Pago (mix 70% PIX a 0,99% + 30% cartão a 4,98%) | -$0.22 |
| Gerar e guardar o PDF (servidor e banco, por folha) | -$0.05 |
| **Contribution** (what each folha de divisão (uma canção) leaves to pay the fixed costs) | **$14.63** (98%) |

### The margin that matters

Fixed costs: $237 a month (Render Starter para a API (US$ 7, estimativa a R$ 5,70/US$) $40, Neon pago quando passar de 0,5 GB (estimativa US$ 19) $108, MEI: DAS mensal (estimativa 2026, serviços) $86, Domínio .com.br (R$ 40/ano) $3).

- **Break-even: 17 folha de divisão (uma canção)s a day.** Below that you lose money every month.
- **Profit margin at your plan** (60 a day): **72%** of every sale, after every cost.

### Year 1, month by month

| month | folha de divisão (uma canção)s a day | revenue | profit | cumulative (after $483 startup) |
| ---: | ---: | ---: | ---: | ---: |
| 1 | 3 | $45 | -$193 | -$676 |
| 2 | 5 | $74 | -$164 | -$841 |
| 3 | 8 | $119 | -$120 | -$961 |
| 4 | 11 | $164 | -$76 | -$1,037 |
| 5 | 14 | $209 | -$33 | -$1,070 |
| 6 | 18 | $268 | $26 | -$1,044 |
| 7 | 22 | $328 | $85 | -$959 |
| 8 | 26 | $387 | $143 | -$816 |
| 9 | 31 | $462 | $216 | -$600 |
| 10 | 36 | $536 | $289 | -$311 |
| 11 | 42 | $626 | $377 | $66 |
| 12 | 48 | $715 | $465 | $531 |

- **Year 1 operating profit: $1,014** on $3,934 of revenue.
- After the $483 startup spend: $531.
- Startup money earned back: month 11.
- Cash you need before it pays for itself: **$1,070**.

### What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 72% | 17 | $1,014 |
| Price -10% | 68% | 19 | $621 |
| Volume -20% | 65% | 17 | $242 |
| Unit costs +15% | 71% | 17 | $1,004 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.

## Marketing

### A evidência

- **Quem compra** (painel v3, 100 simulados): compositor profissional de mercado que vende ou cede músicas (sertanejo, gospel, pagode) **80%**; "desconfiado com direitos" **60%**; "organizado" **47%**; banda com lançamentos frequentes 20%; músico semiprofissional 18%; hobbyista **3%**. Renda alta 37%, baixa 3%.
- **Por que não compram:** confiança (32), hábito (25), necessidade (13), momento (6). Quase todos os "sim" e muitos "não" pararam na mesma dúvida: **"a UBC/ABRAMUS/a distribuidora aceita esse PDF?"**
- **Concorrentes:** os apps de composição falam em inglês, cobram em dólar e não fazem divisão; os de registro (EDA, MusicasRegistradas, Songtrust) só registram depois. Ninguém registra quem escreveu o quê **na hora em que se escreve**, em português ([competitors.md](competitors.md)).
- **Quanto vale um cliente:** cada comprador do painel compra ~1 folha no 1º mês. Supondo 3 folhas no ano (estimativa: um semiprofissional que lança 1 canção a cada 3–4 meses) a R$ 14,63 de contribuição: **~R$ 44 por cliente no ano 1.** É o teto do que se pode pagar para ganhar um. Na prática: **mídia paga quase não cabe**; o crescimento tem de vir de convites e comunidade.

### Posicionamento

1. **(recomendada)** *Para compositores que escrevem em parceria e já tiveram (ou viram) briga por percentual, o Compoze é o caderno compartilhado onde a canção sai com a divisão fechada e o aceite de cada coautor, diferente do grupo de WhatsApp, onde o acordo fica num áudio.* — Apoio: "desconfiado com direitos" 60% e as citações sobre briga de coautoria (P007, P015, P039, P060).
2. *Para quem cede ou vende música, o Compoze é o lugar onde a parceria vira papel antes de a música ir para o intérprete.* — Apoio: compositor de mercado 80%. Mais estreito, mais pagante; bom para a segunda fase.
3. *Para bandas que lançam todo mês, o Compoze é o caderno da banda que já entrega a folha para a distribuidora.* — Apoio fraco (20%).

### Canais (começar por dois)

| canal | por que serve | custo | como saber se funcionou |
| --- | --- | --- | --- |
| **Grupos e comunidades de compositores** (grupos de WhatsApp/Telegram, fóruns, coletivos, escolas de música, oficinas de composição) | é onde o "desconfiado com direitos" e o "organizado" já estão, e onde se fala de split | R$ 0, tempo do fundador | inscrições com código do grupo; ≥ 5% dos membros abordados criam conta |
| **O próprio convite** (cada canção coescrita leva o parceiro pelo link) | o produto é viral por natureza: uma canção = 2 a 4 pessoas | R$ 0 | convites aceitos por usuário ≥ 1,0 no 1º mês |
| Instagram/TikTok com vídeos curtos sobre briga de coautoria e "como dividir uma música" | conteúdo educativo, busca por "split sheet" e "como registrar música" | R$ 0 (+ R$ 300 de teste em impulsionamento) | visitas ao guia "Da folha ao registro" e contas criadas a partir dele |
| *Não agora:* Google Ads, influenciadores pagos, imprensa | custo por cliente acima de R$ 44 é quase certo; imprensa sem prova é ruído | — | — |

Parceria a buscar (custo zero, valor alto): **um escritório de direito autoral, um produtor ou uma editora pequena** que aceite a folha e diga isso publicamente. Isso responde a objeção nº 1 melhor que qualquer anúncio.

### Calendário de 30 dias (lançamento terça, 26/01/2027)

| data | canal | o quê |
| --- | --- | --- |
| 12/01 (L−14) | Instagram | Post 1: "Quem escreveu o refrão?" (gancho 1). Abre a lista do preço de fundador |
| 13/01 | Grupos | Apresentação pessoal do Ryan em 3 grupos de compositores (com permissão do admin), sem link de venda |
| 14/01 | Instagram/TikTok | Vídeo: o caso típico de briga de 50/50 que vira 70/30 (gancho 2) |
| 15/01 | Blog/guia | Publica "Da folha ao registro" (EDA, UBC, ABRAMUS), grátis, sem cadastro |
| 16/01 | Grupos | Compartilha o guia onde for permitido |
| 19/01 | Instagram | Bastidores: como o Compoze guarda quem escreveu cada trecho (gancho 4) |
| 20/01 | Grupos | Convite para 20 duplas testarem grátis uma canção real antes do lançamento |
| 21/01 | TikTok | "Folha de divisão em 30 segundos" (gancho 3) |
| 22/01 | Instagram | Publica a resposta das associações sobre a folha, seja ela qual for (gancho 6) |
| 23/01 | E-mail/WhatsApp da lista | "Terça abre. Preço de fundador R$ 9,90 nas 300 primeiras folhas" |
| **26/01 (L)** | todos | Lançamento: post fixo, vídeo, mensagem para a lista, Play Store no ar |
| 27/01 | Grupos | Agradece e responde perguntas; não spammar |
| 28/01 | Instagram | Gancho 5: "Seu parceiro aceita pelo link, sem instalar" |
| 29/01 | TikTok | Mostra uma folha de verdade (com permissão de uma dupla beta) |
| 02/02 | Instagram | Gancho 7 (exportar tudo grátis) |
| 04/02 | Grupos | Live curta: "como dividir uma música sem brigar" |
| 06–10/02 | — | Carnaval: só conteúdo leve, nada de oferta |
| 11/02 | Instagram | Gancho 8 ("não é registro, é o papel que você leva ao registro") |
| 18/02 | Lista | Balanço honesto: quantas folhas, o que mudou |
| 25/02 (L+30) | todos | Revisão; decide se o preço de fundador continua até 31/03 |

Sem novidade: bastidores do código, uma canção sendo escrita a quatro mãos, perguntas dos usuários respondidas.

### Dez ganchos (cada um responde uma objeção do painel)

1. "Quem escreveu o refrão? Daqui a dois anos, ninguém vai lembrar." (hábito: "o WhatsApp já resolve")
2. "50/50 no bar, 70/30 no contrato. Fecha a divisão antes de a música sair." (necessidade/momento)
3. "Folha de divisão com o aceite de cada parceiro em 30 segundos." (esforço)
4. "Cada verso guarda quem escreveu. Você não precisa lembrar." (confiança na prova)
5. "Seu parceiro aceita pelo link. Não precisa instalar nada." ("meus parceiros nunca vão instalar mais um app")
6. "Perguntamos à UBC e à ABRAMUS se aceitam a folha. A resposta está aqui." ("a associação aceita?")
7. "Suas canções saem com você: exportar tudo é grátis, sempre." ("o app pode sumir")
8. "Não é o registro. É o papel que você leva para ele." ("o hash não vale nada")
9. "Escrever é grátis. Você só paga quando a canção sai do caderno." ("mais uma assinatura")
10. "Só os coautores veem a canção. Veja onde suas letras ficam." ("minhas letras inéditas na nuvem")

Proibido: depoimentos falsos, números de seguidores, "visto em", e usar frases do painel como se fossem de clientes.

### Orçamento e números

- **Orçamento:** R$ 300 no total (já no CFO), só para impulsionar os 2 vídeos que mais engajarem organicamente. O resto é tempo.
- **O máximo para ganhar um cliente:** ~R$ 44 (contribuição de R$ 14,63 × ~3 folhas no ano). Na prática, mirar **menos de R$ 15**, ou seja, a primeira folha paga o cliente.
- **Três números por semana:**
  1. **Canções com 2+ coautores ativos** (meta: crescer toda semana; se cair 2 semanas, o problema é o convite).
  2. **% de canções "finalizadas" que geram folha paga** (meta ≥ 10%; abaixo de 5% por 3 semanas, rever preço ou oferta).
  3. **Convites aceitos por usuário novo** (meta ≥ 1,0; abaixo de 0,5, o primeiro uso do convidado está quebrado).

## Brand

### O nome: manter "Compoze"

O produto já tem nome, ícone, linguagem visual ("Caderno": papel, tinta, lápis vermelho) e usuários de teste. Trocar agora custaria mais que ganharia. Em vez de dez nomes novos, as checagens que o Ryan precisa fazer antes de cobrar:

- **Marca (INPI, Brasil):** buscar "Compoze" e variações ("Compose", "Compoz") nas classes **9** (software, app), **41** (serviços educacionais e de entretenimento, música) e **42** (software como serviço). Busca: [busca.inpi.gov.br](https://busca.inpi.gov.br/pePI/). Como "compose" é palavra comum em inglês na área de música e software, há risco de conflito com marcas parecidas: quem confirma é um advogado de marcas. Nada está protegido até o pedido ser feito.
- **Domínio:** checar `compoze.com.br` no [Registro.br](https://registro.br) e `compoze.app` / `compoze.com`. **Não verifiquei a disponibilidade**; não presuma. Alternativas se estiverem ocupados: `compoze.mus.br` (o .mus.br existe para música), `usecompoze.com.br`, `compoze.art.br`.
- **Perfis:** Instagram, TikTok, YouTube e X com `@compoze` ou `@compozeapp`.
- **Confusão com concorrentes:** nenhum nome em [competitors.md](competitors.md) se aproxima (Songcraft, Hookpad, Cifra Club, BandLab). O risco maior é a palavra genérica "compose".

### Promessa, slogan e voz

- **Promessa de uma linha:** *Cada canção sai do caderno com quem escreveu o quê, por escrito.*
- **Slogan (três opções):**
  1. **A parceria vira papel.** (recomendado: diz o resultado pago em quatro palavras)
  2. O caderno de quem compõe junto.
  3. Escreve junto. Divide certo.
- **Voz em três adjetivos:**
  - **Direta.** Faz: "Seu parceiro aceita pelo link." Não faz: "Revolucione sua colaboração musical."
  - **De ofício** (fala como quem compõe). Faz: "refrão", "ponte", "fechar a divisão". Não faz: "conteúdo", "assets", "workflow".
  - **Honesta sobre limites.** Faz: "Não é o registro. É o papel que você leva para ele." Não faz: "Proteção total dos seus direitos."
- **Antes / depois de uma linha do pitch:**
  - Antes: "Cada versão fica salva com data e um código de integridade (hash) que serve de base para o registro."
  - Depois: "Cada versão fica guardada com a data e o nome de quem escreveu. É isso que você leva para registrar."

### O visual (brief)

Já existe e é bom; o brief é para manter coerência no que é novo (a folha).

- **Cores:** Papel `#F6F1E7` (fundo), Tinta `#1E1C1A` (texto; contraste com o papel ≈ 15:1, passa AA e AAA), Lápis vermelho `#B3261E` (só ação e destaque; contraste com o papel ≈ 6:1, passa AA para texto normal). Conferir os valores exatos no [design system](../docs/frontend/design-system.md).
- **Tipos:** Newsreader (títulos, serifada) e Hanken Grotesk (texto), as duas livres no Google Fonts (OFL); IBM Plex Mono para o código de integridade.
- **Logo:** precisa funcionar a 32 px (ícone do app) e numa folha A4 impressa. Deve sugerir caderno/anotação, não nota musical genérica nem fone de ouvido. Evitar degradê e "estrela de IA".
- **Os cinco primeiros pontos de contato:**
  1. **A página de entrada:** a frase "A parceria vira papel", uma folha de exemplo de verdade e o botão "Começar uma canção".
  2. **O link de convite** que o parceiro recebe: nome de quem convidou, nome da canção, e "Ver a canção", sem cadastro antes.
  3. **A própria folha (PDF):** cabeçalho com a canção, tabela de coautores com percentual e data/hora do aceite, histórico resumido, código de integridade em mono e a linha "Documento de apoio. Não substitui o registro oficial."
  4. **O primeiro post:** o gancho 1 ("Quem escreveu o refrão?").
  5. **A resposta à primeira reclamação:** em até 24 h, em nome do Ryan, com o que vai mudar e a oferta de devolução quando couber.

## Operations

Um negócio digital de uma pessoa só. O que precisa rodar todo dia é pouco; o risco está em o fundador ser o único ponto de falha.

### O ciclo de cada dia (★ = o cliente vê)

1. Conferir o `/health` da API e o painel do Render/Neon (2 min).
2. ★ Responder mensagens e e-mails de suporte (meta: até 24 h).
3. ★ Conferir pagamentos do dia no Mercado Pago; folhas pagas e não geradas viram prioridade.
4. ★ Publicar o conteúdo do dia (calendário em [marketing.md](marketing.md)).
5. Ler os três números (canções com 2+ coautores, % de canções finalizadas com folha paga, convites aceitos).
6. Trabalho de produto (o resto do tempo).

### Fornecedores

| o quê | fornecedor | preço público | observação |
| --- | --- | --- | --- |
| Pagamento (PIX e cartão) | **Mercado Pago** (Checkout) | PIX 0,99%, cartão 4,98% na hora ([fonte](https://www.mercadopago.com.br/ferramentas-para-vender/check-out)) | precisa de conta de vendedor; o webhook confirma o pagamento e libera a folha |
| | Alternativas: Asaas, Pagar.me, Efí (Gerencianet) | ver páginas de cada um | conferir tarifa de PIX; algumas cobram valor fixo por PIX, o que pesa em R$ 14,90 |
| API | **Render** | grátis hoje; Starter US$ 7/mês | o grátis dorme e acorda devagar; para cobrar, a espera de ~30 s no primeiro acesso atrapalha a venda |
| Banco | **Neon** | grátis até 0,5 GB | a folha ocupa pouco; memos e imagens é que enchem |
| Push | Firebase | grátis | já configurado |
| App na loja | **Google Play Console** | US$ 25, uma vez | vender a folha **dentro** do app da loja exige Google Play Billing (15%); vender pela web/link evita a taxa, conferir as regras atuais da Play para conteúdo digital |
| Domínio | Registro.br | R$ 40/ano (.com.br) | necessário para e-mail próprio e para enviar convites por e-mail |
| E-mail | Gmail com senha de app (já usado) / Resend com domínio | grátis no volume inicial | |

Nenhum custo real diferiu do que está em [numbers.json](numbers.json); o CFO não precisa rodar de novo. Ponto aberto: **cotação da tarifa de PIX** na conta do Mercado Pago (pode ser diferente do Checkout público).

### Pessoas

| papel | quem | horas | custo |
| --- | --- | --- | --- |
| Produto, código, suporte, marketing | Ryan | fim de semana + noites (estimativa: 10–15 h/semana) | R$ 0 no modelo (o tempo do fundador **não** é pago) |
| Contador | a contratar quando faturar | — | MEI dispensa contador obrigatório; consultoria pontual: orçar |

Primeiro mês (lento): 70% do tempo em produto (a folha, o aceite pelo link), 30% em comunidades. Depois do lançamento: 50/50.

### Rotinas (uma página cada)

**Gerar e entregar uma folha**
1. Coautor clica "Gerar a folha desta canção" na canção finalizada.
2. O app confere: divisão em 100%, todos os coautores com aceite. Se faltar alguém, mostra quem e reenvia o link.
3. Pagamento (PIX/cartão) pelo Mercado Pago.
4. Webhook confirma → a API gera o PDF, grava o código de integridade e marca a versão como imutável.
5. Todos os coautores recebem o PDF (push + e-mail).
6. Se o webhook falhar em 10 min: conferir manualmente no Mercado Pago e liberar.

**Reclamação**
1. Responder em até 24 h, em nome próprio.
2. Se for a folha recusada por associação/editora/distribuidora: devolver na hora (garantia) e pedir, se a pessoa quiser, o motivo da recusa.
3. Registrar o motivo numa planilha; três recusas pelo mesmo motivo → mudar a folha.

**Revisão semanal (segunda, 30 min)**
1. Os três números.
2. Pagamentos vs. folhas geradas (bater).
3. Uso do Neon (GB) e horas do Render.
4. Ler todas as mensagens de suporte da semana.
5. Escolher uma coisa para mudar.

### Ferramentas

Mercado Pago (pagamento), Render + Neon + Firebase (já em uso), GitHub (código e releases do APK), uma planilha (suporte e recusas), o próprio Compoze para notas internas. Nenhuma ferramenta nova paga.

### Licenças, registro e impostos (Brasil)

- [ ] **MEI** pelo [Portal do Empreendedor](https://www.gov.br/empresas-e-negocios/pt-br/empreendedor). Conferir se a atividade de software/serviço digital é permitida no MEI (algumas atividades de TI não são) e o limite anual de faturamento. **Confirmar com um contador.**
- [ ] **Nota fiscal de serviço** (NFS-e nacional para MEI) a cada venda, ou conforme a regra da prefeitura.
- [ ] **Termos de uso e política de privacidade** de acordo com a **LGPD** (letras inéditas são dado pessoal sensível para o usuário; dizer onde ficam, quem acessa e como apagar). Referência: [ANPD](https://www.gov.br/anpd).
- [ ] **Código de Defesa do Consumidor:** direito de arrependimento de 7 dias em compras pela internet (a garantia de 60 dias já cobre).
- [ ] **Marca no INPI** (ver [brand.md](brand.md)).
- Regras mudam e variam por cidade. Não é aconselhamento jurídico.

### Riscos

| risco | chance | impacto | plano |
| --- | --- | --- | --- |
| Associações dizem que não aceitam a folha | média | alto | publicar a resposta mesmo assim; reposicionar como "acordo entre coautores" (que vale entre as partes) e manter a garantia |
| Ryan fica sem tempo (trabalho, faculdade, saúde) | alta | alto | o grátis continua rodando sozinho; congelar features, manter só suporte e pagamentos |
| API dorme no Render grátis na hora da compra | alta | médio | pagar o Starter (R$ 40) só quando houver vendas |
| Neon passa de 0,5 GB | média | médio | limitar memos no grátis; mover áudio para o R2 quando houver cartão |
| Webhook do pagamento falha | baixa | médio | rotina manual de 10 min |
| Songcraft lança divisão em português | baixa | alto | o fosso é local: PIX, R$, guia de registro BR, comunidade |
| Cifra Club lança modo "compor" | baixa | alto | foco no que eles não fazem: divisão e aceite |
| Vazamento de letra inédita | baixa | muito alto | revisão de acesso (só coautores), logs, plano de aviso em 72 h (LGPD) |
| Parceiro contesta a folha depois | média | médio | folha imutável; mudança só por nova versão aceita por todos |
| Mês fraco de vendas | alta | baixo | custo fixo baixo; o negócio aguenta meses parados |

## Launch plan

Hoje: 17/11/2026. Lançamento público proposto: **terça, 26/01/2027** (antes do Carnaval, 06–10/02).

### 1. Testar antes de gastar (01/12 a 14/12/2026)

**O teste:** uma página simples (pode ser no próprio app, na tela da canção finalizada) com o botão **"Gerar a folha desta canção — R$ 9,90"** que leva a um **PIX de verdade**. Na primeira versão a folha pode ser montada à mão pelo Ryan e enviada em até 24 h (o pagamento é o que se testa, não a automação).

**Para quem:** 30 a 50 compositores reais que escrevem em parceria, recrutados em 3 a 5 grupos de compositores e entre conhecidos, priorizando quem **cede ou vende música** e quem já teve problema de divisão (os segmentos de 80% e 60% no painel).

**Linha de sucesso (escrita antes):** **pelo menos 5 folhas pagas em 2 semanas** entre quem tem uma canção saindo, e **pelo menos 2 duplas** usando o app para escrever (não só para a folha). Teste paralelo de preço: metade vê R$ 9,90, metade R$ 14,90.

**Comparação com o painel:** o painel disse 20% (teto). Se a taxa real entre quem tem canção saindo ficar abaixo de 5%, **confiar nas pessoas reais** e voltar para `/founder-offer` (provavelmente a resposta das associações é o que falta). Se R$ 14,90 vender pelo menos 60% do que vende R$ 9,90, ficar com R$ 14,90.

Em paralelo, no mesmo período: **e-mail à UBC e à ABRAMUS** perguntando se aceitam a folha como documento de apoio.

### 2. Contagem regressiva

| semana | tarefa | dono | prazo |
| --- | --- | --- | --- |
| 17–23/11 | Abrir conta de vendedor no Mercado Pago; checar domínio e INPI | Ryan | 23/11 |
| 24–30/11 | Página/botão do teste com PIX real; texto da folha de exemplo | Ryan | 30/11 |
| 01–14/12 | **Teste real** + e-mail às associações | Ryan | 14/12 |
| 15–21/12 | Ler o resultado; decidir preço; **abrir MEI** se for seguir | Ryan | 21/12 |
| 22/12–04/01 | Construir: aceite pelo link sem conta, geração do PDF, webhook do Mercado Pago (ADR novo) | Ryan | 04/01 |
| 05–11/01 | Termos de uso + privacidade (LGPD); guia "Da folha ao registro"; conta Google Play (US$ 25) e envio do app para revisão | Ryan | 11/01 |
| 12–25/01 | Calendário de marketing L−14; 20 duplas beta | Ryan | 25/01 |
| 22/01 | **Dia de amigos:** 5 duplas conhecidas geram folhas reais (preço de fundador) | Ryan | 22/01 |
| **26/01** | **Lançamento** | Ryan | — |

**Caminho crítico:** (1) conta do Mercado Pago aprovada, (2) aceite pelo link + PDF + webhook, (3) revisão da Play Store. Se a Play atrasar, lançar pelo PWA e APK e anunciar a loja depois; não segurar o lançamento por ela.

Regra do projeto: cada funcionalidade nova no `main` gera um APK novo (versão nova).

### 3. O dia do lançamento (26/01/2027, horário de Brasília)

| hora | o quê |
| --- | --- |
| 08:00 | Conferir API, banco, pagamento de teste de R$ 1 e geração da folha |
| 09:00 | Publicar o APK novo no GitHub Releases e a versão da Play (se aprovada) |
| 10:00 | Post fixo no Instagram + vídeo no TikTok (gancho 1) |
| 10:30 | Mensagem para a lista de espera com o preço de fundador |
| 11:00–13:00 | Mensagem nos grupos onde é permitido; responder tudo |
| 14:00 | Conferir pagamentos × folhas geradas |
| 18:00 | Segundo vídeo (gancho 5, aceite pelo link) |
| 21:00 | Balanço do dia numa nota interna |
| Se algo quebrar | pagamento falhou → liberar folha manualmente; API caiu → aviso honesto nos canais, sem novas vendas até voltar; bug no PDF → gerar à mão e enviar |

### 4. Os primeiros 30 dias

Números de toda semana (do CFO e do marketing):

| número | equilíbrio / meta | gatilho de mudança |
| --- | --- | --- |
| Folhas pagas por mês | equilíbrio **17/mês** (R$ 14,90) ou 14/mês (R$ 9,90 sem Neon pago) | abaixo de 5 na semana 2 → rever oferta |
| % de canções finalizadas com folha paga | ≥ 10% | < 5% por 3 semanas → rever preço ou garantia |
| Canções com 2+ coautores ativos | crescer toda semana | caiu 2 semanas → consertar o convite |
| Convites aceitos por usuário novo | ≥ 1,0 | < 0,5 → refazer o primeiro uso do convidado |
| Devoluções | < 10% | > 10% → ler os motivos e mudar a folha |

**Revisões:**
- **Dia 7:** alguém de fora pagou? O convidado chegou à canção sem travar? O webhook funcionou sozinho?
- **Dia 14:** qual segmento comprou de verdade? Bate com o painel (compositor de mercado e "desconfiado com direitos")?
- **Dia 30:** estamos acima de 17 folhas/mês? Manter o preço de fundador até 31/03 ou encerrar? O que as associações responderam? Voltar ao `/founder-cfo` com a rampa real.

_The panel is simulated buyers and the numbers are projections from your inputs. Confirm demand with real customers and costs with real quotes before you spend. Not financial, legal or tax advice._
