# Lançamento

Hoje: 17/11/2026. Lançamento público proposto: **terça, 26/01/2027** (antes do Carnaval, 06–10/02).

## 1. Testar antes de gastar (01/12 a 14/12/2026)

**O teste:** uma página simples (pode ser no próprio app, na tela da canção finalizada) com o botão **"Gerar a folha desta canção — R$ 9,90"** que leva a um **PIX de verdade**. Na primeira versão a folha pode ser montada à mão pelo Ryan e enviada em até 24 h (o pagamento é o que se testa, não a automação).

**Para quem:** 30 a 50 compositores reais que escrevem em parceria, recrutados em 3 a 5 grupos de compositores e entre conhecidos, priorizando quem **cede ou vende música** e quem já teve problema de divisão (os segmentos de 80% e 60% no painel).

**Linha de sucesso (escrita antes):** **pelo menos 5 folhas pagas em 2 semanas** entre quem tem uma canção saindo, e **pelo menos 2 duplas** usando o app para escrever (não só para a folha). Teste paralelo de preço: metade vê R$ 9,90, metade R$ 14,90.

**Comparação com o painel:** o painel disse 20% (teto). Se a taxa real entre quem tem canção saindo ficar abaixo de 5%, **confiar nas pessoas reais** e voltar para `/founder-offer` (provavelmente a resposta das associações é o que falta). Se R$ 14,90 vender pelo menos 60% do que vende R$ 9,90, ficar com R$ 14,90.

Em paralelo, no mesmo período: **e-mail à UBC e à ABRAMUS** perguntando se aceitam a folha como documento de apoio.

## 2. Contagem regressiva

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

## 3. O dia do lançamento (26/01/2027, horário de Brasília)

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

## 4. Os primeiros 30 dias

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
