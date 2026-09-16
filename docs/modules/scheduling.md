# Scheduling (Agenda e Agendamento) — núcleo do domínio

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface). Provavelmente o módulo com mais regras de negócio e mais valor competitivo.

## Responsabilidade
Disponibilidade, bloqueio de horários, criação de agendamento (app e manual), prevenção de double-booking em tempo real, políticas de cancelamento/no-show. É o que sustenta o "agendamento em 3 cliques".

## Entidades / Agregados

**`Agenda`** (Aggregate Root)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `janelas: JanelaDisponibilidade[]`
- Comportamentos: `abrirJanela(inicio, fim, tipo)`, `bloquearHorario(inicio, fim)`, `removerJanela(id)`

**`JanelaDisponibilidade`** (Entity, filha de `Agenda`)
- `id: UUID`
- `agendaId: UUID`
- `inicio: timestamp`
- `fim: timestamp`
- `tipo: enum {Recorrente, Pontual, Bloqueio}`
- `regraRecorrencia: string | null` (ex: RRULE se recorrente)

**`Agendamento`** (Aggregate Root — transacional, referencia `agendaId` mas é seu próprio agregado por volume/consistência)
- `id: UUID`
- `clienteId: UUID` — **nunca nulo, sempre resolvido via `Sessao` autenticada**
- `perfilProfissionalId: UUID`
- `servicoId: UUID`
- `precoCongelado: decimal` (copiado de `Servico.preco` no momento da criação)
- `duracaoCongeladaMinutos: int`
- `modalidade: enum {Domicilio, Salao}`
- `enderecoAtendimento: {logradouro, cidade, lat, lng} | null` (obrigatório se `modalidade = Domicilio`)
- `status: enum {Solicitado, Confirmado, EmAndamento, Concluido, Cancelado, NoShow}`
- `criadoEm, confirmadoEm, concluidoEm, canceladoEm: timestamp | null`
- Comportamentos: `confirmar()`, `cancelar(motivo)`, `iniciarAtendimento()`, `concluir()`, `marcarComoNoShow()`, `reagendar()` (internamente: cancela este e cria um novo, mantendo referência)

## Invariantes
- **Nunca pode existir dois `Agendamento` com status ativo (Solicitado/Confirmado/EmAndamento) que se sobreponham no tempo para a mesma profissional.** Esta é a invariante mais crítica do sistema — qualquer tentativa de criação que viole isso deve ser rejeitada de forma **síncrona**, antes da confirmação.
- Um `Agendamento` só pode ser criado dentro de uma `JanelaDisponibilidade` aberta (não pode agendar em horário bloqueado).
- Preço e duração do `Servico` são copiados para o `Agendamento` no momento da criação (não são referência viva) — mudanças futuras de preço no catálogo não afetam agendamentos já feitos.
- Cancelamento fora da janela de cancelamento gratuito muda o status para `Cancelado` mas gera uma cobrança de taxa (se sinal foi pago) — regra específica **ainda em aberto** (prazo exato e percentual).

## Regras de negócio
- **Criação manual (recepção/profissional)** segue as mesmas invariantes de conflito de horário que a criação pelo app da cliente — não existe "bypass" para agendamento manual.
- **No-show:** se o `Agendamento` passa do horário confirmado sem check-in/confirmação de início, é marcado automaticamente como `NoShow` após um período de tolerância (a definir), distinto de `Cancelado` para fins de métrica e possível penalidade futura.
- Reagendamento é modelado como cancelamento do `Agendamento` original + criação de um novo, mantendo rastreabilidade (referência ao agendamento anterior) — não é edição in-place do horário.
- Alteração de endereço de atendimento (domicílio) só é permitida antes da confirmação; após confirmado, requer cancelamento e novo agendamento.

## Eventos de domínio
**Publicados:** `AgendamentoSolicitado`, `AgendamentoConfirmado`, `AgendamentoCancelado`, `AgendamentoConcluido`, `AgendamentoMarcadoComoNoShow`.

## Dependências
- Chamada síncrona a `ProfessionalCatalog` para checar se o `Servico` ainda está ativo antes de confirmar (única chamada síncrona documentada entre módulos, por exigir consistência imediata).
- `AgendamentoConcluido` dispara `Reviews`, `Notifications` e `Analytics` de forma assíncrona (event bus in-process).

## Performance
- Verificação de conflito de horário deve ser síncrona e rejeitar antes da confirmação — não pode haver janela de corrida entre checagem e escrita.

## Pontos em aberto
- Prazo exato da janela de cancelamento gratuito e regra de cobrança de sinal.
- Prazo de tolerância para marcar `NoShow` automaticamente.
