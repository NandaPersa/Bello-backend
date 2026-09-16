# Admin (Painel Administrativo / Operações da Plataforma)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Aprovação/rejeição de verificação de profissionais, ativação/desativação de contas, moderação de denúncias, dashboards de negócio, gestão de planos.

**Natureza especial:** diferente dos demais módulos, `Admin` **não introduz novas regras de negócio de domínio** — ele orquestra casos de uso já expostos por outros módulos (ex: chama `AprovarVerificacao` de `Identity`, `SuspenderConta` de `Identity`, `ResolverDenuncia` de `Reviews`, `AtualizarPlano` de `Billing`). O valor deste módulo é a interface e o controle de acesso, não novas invariantes.

**Importante:** apesar de "só orquestrar", este módulo é **estruturalmente obrigatório desde o primeiro dia** — sem ele, nenhuma profissional consegue sair do status `PendenteVerificacao`, o que trava a plataforma inteira. Pelo menos a fila de aprovação de verificação deve existir desde o dia 1.

## Entidades / Agregados

**`AdminUser`** (Aggregate Root)
- `id: UUID`
- `nome: string`
- `email: string`
- `papel: enum {Owner, Suporte, Financeiro}`
- `status: enum {Ativo, Inativo}`
- Comportamentos: `autenticar()`, `desativar()` — segue o mesmo mecanismo de `Sessao` de `Identity`, mas com escopo de permissões próprio do papel.

**`AcaoAdministrativa`** (Entity — log de auditoria, append-only)
- `id: UUID`
- `adminUserId: UUID`
- `tipoAcao: enum` (AprovarVerificacao, RejeitarVerificacao, SuspenderConta, ResolverDenuncia, AlterarPlano)
- `entidadeAfetadaTipo: string`
- `entidadeAfetadaId: UUID`
- `motivo: string | null`
- `criadoEm: timestamp`
- Sem comportamentos de edição — apenas criação, nunca alteração ou remoção.

## Invariantes
- Toda ação que altera `PerfilVerificacao.status`, `Conta.status` (suspensão) ou resolve uma `Denuncia` **deve** gerar um registro correspondente em `AcaoAdministrativa` — a ação e o log são atômicos (não existe uma sem a outra).
- Um `AdminUser` só pode executar ações permitidas pelo seu papel (ex: papel Suporte pode suspender conta, mas não pode alterar preço de `Plano` — isso é exclusivo de Financeiro/Owner).
- `AcaoAdministrativa` nunca é editável ou removível após criada (auditoria imutável).

## Regras de negócio
- A fila de verificação prioriza por ordem de chegada (FIFO), com possibilidade de sinalizar casos urgentes/suspeitos para revisão prioritária.
- Rejeição de verificação exige motivo em texto livre ou categorizado (ex: "documento ilegível", "foto não corresponde"), visível para a profissional no reenvio.
- Dashboards de negócio são consultas de leitura sobre os read models já existentes em `Analytics` e `Billing` — `Admin` não duplica cálculo de métricas, apenas consome.
- Gestão de planos (CRUD) em `Admin` escreve diretamente no agregado `Plano` de `Billing` através do caso de uso exposto por aquele módulo — nunca por acesso direto a tabela.

## Eventos de domínio
**Publicados:** `VerificacaoAprovada`, `VerificacaoRejeitada`, `ContaSuspensaPorAdmin`, `DenunciaResolvida`, `PlanoAlteradoPorAdmin`.
- Nota: `VerificacaoAprovada` dispara, via `Identity`, o mesmo `PerfilProfissionalAprovado` já descrito no módulo `Identity` — `Admin` não substitui o evento de `Identity`, apenas é a origem da ação que o causa.

## Escopo de MVP
- Módulo apenas web, uso interno da equipe do Bellô (não é voltado a cliente nem profissional).
- Fila de aprovação de verificação: essencial desde o dia 1.
- Dashboards de negócio e gestão de planos via UI: podem ser mais simples no início (inclusive operados via acesso direto ao banco/ferramenta interna antes de virar UI dedicada), desde que a ação de aprovação passe pelos casos de uso corretos do domínio.

## Pontos em aberto
- Matriz exata de permissões por papel de `AdminUser` (o que cada papel pode ou não fazer em cada módulo).
- Critério de verificação de identidade (documento simples vs. checagem de antecedentes com custo).
