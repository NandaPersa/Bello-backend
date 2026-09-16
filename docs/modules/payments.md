# Payments (Pagamento do Serviço)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Pagamento do serviço em si (PIX/cartão dentro do app), distinto de `Billing` (assinatura da profissional). São dois fluxos de dinheiro completamente diferentes: um é receita da plataforma (assinatura), outro é um repasse entre cliente e profissional que passa pela plataforma só como facilitador.

## Entidades / Agregados

**`Transacao`** (Aggregate Root)
- `id: UUID`
- `agendamentoId: UUID` (único)
- `valor: decimal` (deve corresponder ao `Agendamento.precoCongelado`)
- `metodo: enum {Pix, Cartao, Presencial}`
- `status: enum {Pendente, Confirmada, Estornada}`
- `criadoEm, confirmadoEm, estornadoEm: timestamp | null`
- `motivoEstorno: string | null`
- Comportamentos: `confirmar()`, `estornar(motivo)`

## Invariantes
- `Transacao` só é criada quando `Agendamento` está em status `Confirmado` ou posterior — não existe cobrança sem agendamento válido.
- Valor da `Transacao` deve corresponder exatamente ao preço congelado no `Agendamento` (nunca lido do catálogo atual).
- Estorno só é possível para `Transacao` com status `Confirmada`, e deve estar sempre associado a um motivo (cancelamento, disputa).

## Regras de negócio
- Pagamento "Presencial" ainda gera um registro de `Transacao` (para fins de métrica de faturamento no dashboard), apenas com status diferente de conciliação.
- Este módulo **não cobra taxa de intermediação** nesta fase (modelo SaaS puro) — o valor integral vai para a profissional. Isso deve estar explícito para não ser confundido com `Billing` no futuro, caso o modelo evolua para híbrido.

## Eventos de domínio
**Publicados:** `TransacaoConfirmada`, `TransacaoEstornada`.

## Dependências
- Lê `Agendamento.precoCongelado` de `Scheduling` por referência de ID, nunca query direta na tabela de `Scheduling`.
- `Analytics` consome `TransacaoConfirmada`/`TransacaoEstornada` para o dashboard de faturamento.
