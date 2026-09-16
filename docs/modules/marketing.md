# Marketing (Cupons e Campanhas)

**Rigor de camadas:** versão enxuta (Domain + Application + Infrastructure, sem separação forte de Interface).

## Responsabilidade
Cupons "Flash" para horários ociosos da profissional. Depende de dados de `Scheduling` (quais horários estão ociosos) via read model, não acesso direto.

**Fora de escopo do MVP:** campanhas recorrentes e promoções agendadas (Fase 2, conforme PRD).

## Entidades / Agregados

**`CupomFlash`** (Aggregate Root)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `servicoId: UUID`
- `janelaDisponibilidadeId: UUID` (a janela ociosa específica que o cupom cobre)
- `desconto: {tipo: enum {Percentual, ValorFixo}, valor: decimal}`
- `validoAte: timestamp`
- `status: enum {Ativo, Expirado, Utilizado}`
- Comportamentos: `utilizar(agendamentoId)`, `expirar()`

## Invariantes
- Um `CupomFlash` só pode ser criado para uma janela de tempo que ainda não tem `Agendamento` associado (não faz sentido dar desconto num horário já ocupado).
- Uso do cupom aplica o desconto ao `Agendamento` criado dentro daquela janela específica — não é um código genérico reutilizável em qualquer horário.
- `CupomFlash` expira automaticamente ao final do prazo definido, mesmo sem uso.

## Regras de negócio
- Desconto aplicado via `CupomFlash` reduz o preço congelado no `Agendamento`, mas o valor original do `Servico` no catálogo permanece inalterado.
- Profissional define o desconto dentro de limites configuráveis pelo `Plano` (ex: plano Starter pode ter limite menor de desconto máximo que Pro) — regra a refinar conforme estratégia comercial.

## Eventos de domínio
**Publicados:** `CupomFlashCriado`, `CupomFlashUtilizado`, `CupomFlashExpirado`.

## Dependências
- Lê janelas ociosas de `Scheduling` via read model, não acesso direto à tabela de `Agenda`/`JanelaDisponibilidade`.
- `Notifications` consome `CupomFlashCriado` para notificar clientes.
- Limite de desconto máximo por tier vem de `Plano.limites.descontoMaximoCupomPercentual` (`Billing`).

## Pontos em aberto
- Limites exatos de desconto máximo por tier de plano.
