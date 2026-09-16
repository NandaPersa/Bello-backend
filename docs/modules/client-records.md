# ClientRecords (Ficha Técnica de Clientes)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Histórico de atendimentos por cliente e preferências registradas pela profissional, com consentimento LGPD. Separado de propósito de `Scheduling`: é dado sensível com regras próprias de retenção/portabilidade, não deveria estar acoplado à lógica de agenda.

## Entidades / Agregados

**`FichaCliente`** (Aggregate Root, por par Profissional-Cliente)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `clienteId: UUID`
- `observacoes: Observacao[]`
- Comportamentos: `adicionarObservacao(texto, agendamentoId)`, `exportarDados()` (portabilidade LGPD), `anonimizar()` (em caso de revogação de consentimento)

**`Observacao`** (Entity, filha de `FichaCliente`)
- `id: UUID`
- `texto: string`
- `agendamentoRelacionadoId: UUID | null`
- `criadoEm: timestamp`

**`ConsentimentoLGPD`** (Aggregate Root próprio, referenciado por `FichaCliente`)
- `id: UUID`
- `clienteId: UUID`
- `perfilProfissionalId: UUID`
- `escopo: string` (o que foi consentido)
- `concedidoEm: timestamp`
- `revogadoEm: timestamp | null`
- Comportamentos: `conceder(escopo)`, `revogar()`

## Invariantes
- Nenhum campo de `FichaCliente` pode ser criado ou editado sem um `ConsentimentoLGPD` válido e não revogado para aquela cliente.
- Revogação de consentimento pela cliente exige exclusão (ou anonimização) dos dados da `FichaCliente` correspondente — não apenas bloqueio de leitura.

## Regras de negócio
- A `FichaCliente` é populada apenas com informações inseridas manualmente pela profissional após um `Agendamento` concluído — não é preenchida automaticamente a partir de outros módulos, para manter o escopo do dado sob controle explícito.
- Dado armazenado aqui não é visível para outras profissionais — escopado por par (Profissional, Cliente), nunca compartilhado entre profissionais diferentes.
- Exportação/portabilidade: cliente pode solicitar todos os dados de `FichaCliente` que qualquer profissional tenha sobre ela (direito LGPD), exigindo agregação entre múltiplos registros.

## Eventos de domínio
**Publicados:** `ConsentimentoConcedido`, `ConsentimentoRevogado`, `FichaClienteAtualizada`.

## LGPD/Auditoria
- O consentimento é um conceito compartilhado (shared kernel leve) — outros módulos que venham a coletar dado sensível devem seguir o mesmo padrão de consentimento explícito, não reinventar a regra localmente.
