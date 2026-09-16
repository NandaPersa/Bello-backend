# Billing (Assinatura e Planos)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface). Módulo que gera receita — deve ter as regras de negócio (e testes) mais rígidas do sistema.

## Responsabilidade
Planos (Free/Starter/Pro/Business), cobrança recorrente, upgrade/downgrade, trial. Distinto de `Payments` — dois fluxos de dinheiro completamente diferentes: `Billing` é receita da plataforma, `Payments` é repasse entre cliente e profissional.

## Entidades / Agregados

**`Assinatura`** (Aggregate Root, por Profissional)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `planoId: UUID`
- `status: enum {TrialAtivo, Ativa, Inadimplente, Cancelada}`
- `dataInicioCiclo: timestamp`
- `dataProximaCobranca: timestamp`
- Comportamentos: `iniciarTrial()`, `renovar()`, `alterarPlano(novoPlanoId)` (upgrade imediato / downgrade só no próximo ciclo), `cancelar()`

**`Plano`** (Aggregate Root — catálogo, gerenciado via `Admin`)
- `id: UUID`
- `nome: string` (Free, Starter, Pro, Business)
- `precoMensal: decimal`
- `limites: {maxServicos: int | null, descontoMaximoCupomPercentual: decimal | null, maxProfissionaisVinculados: int | null}`

**`Fatura`** (Entity, filha de `Assinatura`)
- `id: UUID`
- `assinaturaId: UUID`
- `valor: decimal`
- `status: enum {Pendente, Paga, Falhou}`
- `dataVencimento: timestamp`
- `dataPagamento: timestamp | null`
- `tentativas: int`

## Invariantes
- Uma `Assinatura` nunca fica sem `Plano` associado — mesmo o tier Free é um Plano formal, não a ausência de plano.
- Downgrade de plano não pode reduzir recursos já em uso de forma destrutiva (ex: profissional com 5 serviços faz downgrade para plano com limite de 3 — os serviços excedentes ficam **inativos**, não são excluídos).
- `Fatura` com falha de pagamento move `Assinatura` para `Inadimplente` após N tentativas (a definir), o que dispara a remoção do perfil de `Discovery` (via evento) sem excluir dados.

## Regras de negócio
- Trial tem prazo definido e conversão automática para cobrança ao final, ou downgrade automático para tier gratuito permanente — **decisão de produto pendente**.
- Upgrade de plano tem efeito imediato; downgrade só entra em vigor no próximo ciclo de cobrança (evita usar recurso premium e "devolver" no meio do período pago).
- Cancelamento de assinatura mantém acesso até o fim do ciclo já pago — não é bloqueio imediato.

## Eventos de domínio
**Publicados:** `AssinaturaIniciada`, `AssinaturaRenovada`, `AssinaturaVencida`, `PlanoAlterado`, `AssinaturaCancelada`.
- **`PrimeiroPagamentoConfirmado`** — disparado especificamente na primeira `Fatura` paga com sucesso (distinto de renovações subsequentes). É este evento, e não `AssinaturaIniciada`, que `ProfessionalCatalog` escuta para ativar automaticamente o perfil — `AssinaturaIniciada` pode ocorrer antes mesmo do pagamento ser confirmado (ex: início de trial), então não é o gatilho correto.

## Dependências
- `ProfessionalCatalog` consome `PrimeiroPagamentoConfirmado` para ativação automática.
- `Discovery` consome `AssinaturaVencida` para remover o perfil do índice de busca.
- `Admin` faz CRUD de `Plano` através do caso de uso exposto por este módulo, nunca por acesso direto à tabela.

## Pontos em aberto
- Se o Trial converte automaticamente em cobrança ou faz downgrade automático para Free permanente.
- Número exato de tentativas (N) antes de mover `Assinatura` para `Inadimplente`.
