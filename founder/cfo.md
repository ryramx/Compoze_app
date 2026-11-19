# CFO: Compoze

> **Leia assim:** todos os valores estão em **reais** (a ferramenta imprime "$"). A unidade é **uma folha de divisão (uma canção)** e, como `days_per_month` é 1, onde a tabela diz **"a day" leia "por mês"**. Preço de base: **R$ 14,90 por folha** (ver [pricing.md](pricing.md)).

## Nota do CFO

- **A margem:** cada folha deixa **R$ 14,63** (98%) depois da taxa do Mercado Pago e do servidor. Na meta de 60 folhas/mês a margem final é **72%**. O custo por unidade é quase zero; o negócio inteiro depende de volume.
- **A linha a vigiar: o volume (a rampa).** Com metade das vendas previstas, o ano 1 vira **prejuízo de R$ 917** (`--volume 0.5`). Com 20% a menos, o lucro cai de R$ 1.014 para R$ 242. Preço e custo unitário mexem pouco.
- **Caixa:** precisa de **R$ 1.070** antes de se pagar (gasto inicial de R$ 483 + os meses abaixo do ponto de equilíbrio). O gasto inicial volta no **mês 11**.
- **Ponto de equilíbrio:** **17 folhas por mês** com os custos fixos de R$ 237/mês.
- **Tamanho, dito sem rodeio:** no plano, o ano 1 fatura **R$ 3.934** e lucra **R$ 1.014**. É um negócio que se paga e paga a infraestrutura, **não um salário**. Para virar renda (ex.: R$ 3.000/mês de lucro) seriam ~220 folhas/mês, ou assinantes do Plus; isso é hipótese a testar, não está neste modelo.

### Três jeitos de melhorar a margem (rodados, não chutados)

1. **Ficar no Neon grátis enquanto der** (a folha não precisa de áudio; memos e imagens são o que enche os 0,5 GB): equilíbrio cai de 17 para **9 folhas/mês**, lucro do ano 1 sobe de R$ 1.014 para **R$ 2.310**, caixa necessário cai para **R$ 637**.
2. **Preço R$ 14,90 em vez de R$ 9,90:** a R$ 9,90 o ano 1 dá **prejuízo de R$ 306** e o equilíbrio é 25/mês; a R$ 14,90 dá **lucro de R$ 1.014** e equilíbrio de 17. A R$ 19,90 o lucro iria a R$ 2.334, mas sai da faixa "começa a ficar caro" do painel (mediana R$ 15).
3. **R$ 9,90 sem o Neon pago** (se o preço de fundador ficar): equilíbrio de 14/mês e lucro de R$ 990 no ano 1. Ou seja, o preço de fundador só é seguro se a infraestrutura continuar grátis.

### Condições do conselho sobre dinheiro

- "Uma garantia que o fundador consiga bancar": sim. Devolver uma folha custa R$ 14,90; com 10% de pedidos de devolução, o lucro do ano 1 cai ~R$ 390. Cabe.
- "Mostrar que alguém paga": **não atendida.** O modelo é projeção; só um teste real (ver [launch.md](launch.md)) responde.

Não é conselho financeiro, fiscal ou jurídico. Um contador deve conferir o enquadramento no MEI (atividade de software/serviço digital, limite de faturamento) e os tributos antes de cobrar.

---

# Unit economics: Compoze (folha de divisão por canção; escrever é grátis)

Every number below comes from the input file. Nothing is looked up or guessed.

## One folha de divisão (uma canção)

| line | per folha de divisão (uma canção) |
| --- | ---: |
| Price | $14.90 |
| Mercado Pago (mix 70% PIX a 0,99% + 30% cartão a 4,98%) | -$0.22 |
| Gerar e guardar o PDF (servidor e banco, por folha) | -$0.05 |
| **Contribution** (what each folha de divisão (uma canção) leaves to pay the fixed costs) | **$14.63** (98%) |

## The margin that matters

Fixed costs: $237 a month (Render Starter para a API (US$ 7, estimativa a R$ 5,70/US$) $40, Neon pago quando passar de 0,5 GB (estimativa US$ 19) $108, MEI: DAS mensal (estimativa 2026, serviços) $86, Domínio .com.br (R$ 40/ano) $3).

- **Break-even: 17 folha de divisão (uma canção)s a day.** Below that you lose money every month.
- **Profit margin at your plan** (60 a day): **72%** of every sale, after every cost.

## Year 1, month by month

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

## What if

| scenario | margin at plan | break-even a day | year 1 profit |
| --- | ---: | ---: | ---: |
| Base plan | 72% | 17 | $1,014 |
| Price -10% | 68% | 19 | $621 |
| Volume -20% | 65% | 17 | $242 |
| Unit costs +15% | 71% | 17 | $1,004 |

No red flags in these numbers. They are only as good as the inputs: check every cost against a real quote.
