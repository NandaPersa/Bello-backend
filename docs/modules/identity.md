# Identity (Identidade e Acesso)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Autenticação, autorização, cadastro de contas (Cliente e Profissional), verificação de identidade da profissional. Cliente e Profissional são tipos de conta distintos, mas compartilham o mesmo contexto de autenticação — não são módulos separados.

## Entidades / Agregados

**`Conta`** (Aggregate Root)
- `id: UUID`
- `tipo: enum {Cliente, Profissional}`
- `email: string | null`
- `telefone: string | null`
- `senhaHash: string | null` (nulo se a conta usa apenas login social/OTP)
- `status: enum {PendenteVerificacao, Ativa, Suspensa, Encerrada}`
- `criadoEm: timestamp`
- Comportamentos: `autenticar(credenciais)`, `suspender(motivo, adminUserId)`, `reativar(adminUserId)`, `encerrar()`

**`PerfilVerificacao`** (Entity, referencia `contaId`, só aplicável a Profissional)
- `id: UUID`
- `contaId: UUID`
- `documentoUrl: string`
- `status: enum {NaoIniciado, EmAnalise, Aprovado, Rejeitado}`
- `motivoRejeicao: string | null`
- `analisadoPorAdminUserId: UUID | null`
- `analisadoEm: timestamp | null`
- Comportamentos: `enviarDocumento()`, `aprovar(adminUserId)`, `rejeitar(adminUserId, motivo)` — os dois últimos só chamáveis a partir do módulo `Admin`.

**`Sessao`** (Entity de suporte)
- `id: UUID` (token)
- `contaId: UUID`
- `criadaEm: timestamp`
- `expiraEm: timestamp`
- `dispositivo: string | null`
- Comportamentos: `renovar()`, `revogar()`
- Toda ação que exige autenticação (criar `Agendamento`, criar `Avaliacao`, acessar `FichaCliente`, qualquer ação em `Admin`) valida uma `Sessao` ativa via middleware compartilhado, antes de chegar à Application do módulo correspondente.

## Invariantes
- Uma `Conta` não pode existir sem email **ou** telefone verificado (pelo menos um canal confirmado).
- Uma `Conta` do tipo Profissional só pode publicar perfil em `ProfessionalCatalog` se `PerfilVerificacao.status = Aprovado`.
- `Conta` Suspensa não pode criar novos agendamentos nem receber novos, mas agendamentos já confirmados permanecem visíveis (bloqueio de ações, não exclusão).

## Regras de negócio
- Verificação de identidade da profissional é **obrigatória antes da ativação do perfil público** — não é opcional nem pode ser pulada.
- **A transição de `PerfilVerificacao.status` para `Aprovado` ou `Rejeitado` só pode ser feita por ação explícita de um `AdminUser` — nunca automaticamente.** O valor da verificação como sinal de confiança depende de revisão humana real.
- Rejeição de verificação exige motivo registrado e permite reenvio de documentação (não é bloqueio definitivo automático).
- Troca de tipo de conta (Cliente → Profissional) é permitida, mas exige novo fluxo de verificação — não herda status de conta Cliente.
- Suspensão de conta (Cliente ou Profissional) é ação exclusiva de `AdminUser`, nunca disparada automaticamente por outro módulo.

## Eventos de domínio
**Publicados:** `ContaCriada`, `ContaVerificada`, `PerfilProfissionalAprovado`, `ContaSuspensa`.

## Autenticação — regra de fronteira (vale para todo o sistema)
- **Públicas (sem sessão):** Home/`Discovery`, busca, visualização de `PerfilProfissional`, lista de `Servico`/preços, leitura de `Avaliacao`.
- **Exigem sessão autenticada:** criação de `Agendamento` (ponto de conversão), `Payments`, criação de `Avaliacao`, qualquer tela do painel da Profissional, todo o `Admin`.
- O middleware de autenticação é aplicado **por caso de uso**, não por módulo inteiro (ex: `Scheduling` tem casos de uso públicos e privados no mesmo módulo).

## Dependências
- Exposto como middleware/interceptor reutilizável pelos demais módulos — autenticação/autorização é centralizada aqui, nunca reimplementada em outro módulo.
