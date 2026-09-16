# Reviews (Avaliações e Confiança)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Avaliações pós-serviço, moderação, selo de verificação exibido no perfil. Só permite criar avaliação vinculada a um `Agendamento` concluído — depende de evento publicado por `Scheduling`, não de chamada direta.

## Entidades / Agregados

**`Avaliacao`** (Aggregate Root)
- `id: UUID`
- `agendamentoId: UUID` (único — um agendamento gera no máximo uma avaliação)
- `clienteId: UUID`
- `perfilProfissionalId: UUID`
- `nota: int` (1-5)
- `comentario: string | null`
- `respostaProfissional: string | null`
- `status: enum {Ativa, RemovidaPorDenuncia}`
- `criadoEm: timestamp`
- Comportamentos: `responder(texto)` (só a profissional avaliada), `remover(adminUserId)` (só via `Admin`, mediante `Denuncia` procedente)

**`Denuncia`** (Entity, filha de `Avaliacao`)
- `id: UUID`
- `avaliacaoId: UUID`
- `denuncianteContaId: UUID`
- `motivo: string`
- `status: enum {Pendente, Analisada}`
- `analisadoPorAdminUserId: UUID | null`
- `resolvidoEm: timestamp | null`

## Invariantes
- Uma `Avaliacao` só pode ser criada se existe um `Agendamento` correspondente com status `Concluido` — impossível avaliar sem ter passado pelo fluxo de agendamento real.
- Máximo de uma `Avaliacao` por `Agendamento` (não por par Cliente-Profissional — cada atendimento gera direito a uma avaliação própria).
- `Avaliacao` com `Denuncia` mantida como procedente é removida do cálculo de nota média, mas mantida no sistema para auditoria (soft removal).

## Regras de negócio
- Janela para avaliar após conclusão: a definir (ex: até 7 dias após `AgendamentoConcluido`); depois disso a avaliação não pode mais ser criada.
- Profissional pode responder publicamente a uma avaliação, mas não pode editá-la ou excluí-la.
- Nota média exibida no perfil é recalculada de forma **assíncrona** a cada nova `Avaliacao` ou remoção por denúncia procedente — consumida por `Discovery` como projeção, não como fonte de verdade.

## Eventos de domínio
**Publicados:** `AvaliacaoCriada`, `DenunciaRegistrada`, `AvaliacaoRemovida`.

**Consumidos:** `AgendamentoConcluido` (de `Scheduling`).

## Dependências
- Remoção de `Avaliacao` por denúncia procedente é ação exclusiva de `AdminUser` via módulo `Admin` — nunca automática.

## Pontos em aberto
- Janela exata (em dias) para avaliar após a conclusão do agendamento.
