# Analytics (Dashboard de Ganhos)

**Rigor de camadas:** versão enxuta (Domain + Application + Infrastructure, sem separação forte de Interface). Assim como `Discovery`, é majoritariamente um read model.

## Responsabilidade
Faturamento do dia/semana/mês da profissional, métricas por serviço/categoria. Agrega `TransacaoConfirmada` e `AgendamentoConcluido` por profissional, por período.

## Entidades / Projeções

**`FaturamentoAgregado`** (projeção, não aggregate transacional)
- `perfilProfissionalId: UUID`
- `periodo: {tipo: enum {Dia, Semana, Mes}, referencia: date}`
- `valorFaturado: decimal`
- `quantidadeAgendamentosConcluidos: int`
- `quantidadeClientesNovas: int` (ver regra de cálculo abaixo)

## Regras de negócio
- Faturamento exibido no dashboard reflete `Transacao` **confirmadas**, não `Agendamento` apenas solicitados ou confirmados sem pagamento registrado.
- **Métrica de "clientes novas geradas"** (KPI central do PRD) é calculada contando `Agendamento` cujo Cliente **não tinha nenhum `Agendamento Concluido` anterior** com aquela mesma profissional — precisa de consulta cross-referenciando histórico, não apenas contagem simples.

## Eventos de domínio
**Consumidos:** `AgendamentoConcluido` (de `Scheduling`), `TransacaoConfirmada`, `TransacaoEstornada` (de `Payments`).

## Dependências
- `Admin` consome os dashboards deste módulo por leitura — não duplica cálculo de métricas.

## Performance
- Read model agregado — evita recalcular métricas de faturamento em tempo real a cada consulta ao dashboard.
