# Notifications (Notificações)

**Rigor de camadas:** versão enxuta (Domain + Application + Infrastructure, sem separação forte de Interface). Módulo puramente reativo — não deveria conter regra de negócio própria, só orquestração de envio.

## Responsabilidade
Push e WhatsApp — lembretes 24h/1h antes do serviço, confirmações, avisos de cancelamento/reagendamento.

## Entidades

**`Notificacao`** (Entity — principalmente um registro/log de envio, não um agregado rico em regra de negócio)
- `id: UUID`
- `destinatarioContaId: UUID`
- `canal: enum {Push, WhatsApp}`
- `tipo: enum {LembreteAgendamento24h, LembreteAgendamento1h, AgendamentoConfirmado, AgendamentoCancelado, CupomFlashDisponivel, FaturaPendente}`
- `agendamentoRelacionadoId: UUID | null`
- `status: enum {Agendada, Enviada, Falhou}`
- `enviarEm: timestamp`
- Comportamentos: `agendar()`, `marcarComoEnviada()`, `cancelar()` (usado quando o `Agendamento` de origem é cancelado antes do envio).

## Regras de negócio
- Lembretes de 24h e 1h antes do `Agendamento` são dois envios distintos e independentes, agendados no momento em que `AgendamentoConfirmado` é publicado — **não recalculados dinamicamente depois** (se o agendamento for cancelado, os lembretes pendentes devem ser cancelados também).
- Canal de envio (Push vs WhatsApp) segue preferência da cliente, com fallback para o outro canal se o preferido falhar.
- Notificações de `Billing` (fatura vencendo, assinatura inadimplente) são direcionadas apenas à profissional, nunca à cliente.

## Eventos de domínio
**Consumidos:** `AgendamentoConfirmado`, `AgendamentoCancelado` (de `Scheduling`), `CupomFlashCriado` (de `Marketing`), `FaturaPendente` (de `Billing`).

## Performance
- Processamento assíncrono via fila (BullMQ) com retry — envio de WhatsApp/push não pode travar a resposta HTTP nem se perder em caso de falha.

## Dependências
- Reaproveita a integração WhatsApp Business API também usada em `Identity` para OTP da Cliente.
