# Arquitetura de Backend — Bellô

**Baseado em:** PRD_App_Beleza_Delivery.md
**Estilo arquitetural:** Monolito Modular + Domain-Driven Design (DDD), com Clean Architecture dentro de cada módulo
**Escopo deste documento:** decisões estruturais e organização — sem código.

---

## 1. Por que essa combinação faz sentido aqui

- **Monolito modular** evita a complexidade operacional de microsserviços (deploy distribuído, observabilidade entre serviços, latência de rede) — crítico para desenvolvimento solo e para um produto que ainda não validou demanda (Fase de ideia, PRD seção 11).
- **DDD** força fronteiras de domínio claras desde o início. Isso importa especialmente aqui porque o produto tem dois lados de marketplace (Cliente e Profissional) com regras de negócio bem diferentes que não deveriam se misturar num "big ball of mud".
- **Clean Architecture dentro de cada módulo** mantém a lógica de negócio isolada de banco de dados, frameworks e providers externos (WhatsApp, push, gateway de pagamento) — o que facilita trocar peças (ex: trocar provedor de pagamento) sem reescrever regra de negócio.
- O caminho de evolução natural, se o produto crescer e precisar escalar times/times independentes, é extrair um módulo específico para um serviço separado — o monolito modular bem feito já está com as fronteiras certas para isso.

---

## 2. Módulos (Bounded Contexts)

Derivados diretamente das seções funcionais do PRD:

### 2.1 `Identity` (Identidade e Acesso)
- **Responsabilidade:** autenticação, autorização, cadastro de contas (cliente e profissional), verificação de identidade da profissional (PRD seção 9 — segurança em domicílio).
- **Agregados principais:** `Conta`, `PerfilVerificacao`.
- **Observação de fronteira:** Cliente e Profissional são tipos de conta distintos, mas compartilham o mesmo contexto de autenticação — não são módulos separados.

### 2.2 `ProfessionalCatalog` (Catálogo de Profissionais)
- **Responsabilidade:** perfil público da profissional, portfólio de fotos, lista de serviços e preços, modalidade de atendimento (domicílio/salão/ambos) por serviço.
- **Agregados principais:** `PerfilProfissional`, `Servico`, `Portfolio`.
- Consome dados de `Identity` (quem é a profissional) via referência de ID, nunca acesso direto a tabelas de outro módulo.
- **Ativação automática:** `PerfilProfissional` transiciona para `Ativo` de forma automática ao receber os eventos `PerfilProfissionalAprovado` (de `Identity`) e `PrimeiroPagamentoConfirmado` (de `Billing`) — a transição só ocorre quando ambos já chegaram, independente da ordem (detalhes em Regras_Negocio_Bello.md, seção 2).

### 2.3 `Discovery` (Busca e Descoberta)
- **Responsabilidade:** a tela Home estilo iFood — busca geolocalizada, filtros, categorias, ranking de resultados (PRD seção 4.1).
- **Modelo de leitura:** este módulo tipicamente não guarda dados próprios de negócio — é um **read model** otimizado (desnormalizado) construído a partir de eventos publicados por `ProfessionalCatalog` e `Reviews`. Isso evita que buscas pesadas concorram com escritas transacionais de agenda/cadastro.

### 2.4 `Scheduling` (Agenda e Agendamento)
- **Responsabilidade:** disponibilidade, bloqueio de horários, criação de agendamento (app e manual), prevenção de double-booking, políticas de cancelamento/no-show (PRD seções 4.3, 5.1–5.3).
- **Agregados principais:** `Agenda`, `Agendamento`, `JanelaDisponibilidade`.
- **Núcleo do domínio** — provavelmente o módulo com mais regras de negócio e mais valor competitivo (prevenção de conflito de horário em tempo real é o que sustenta "agendamento em 3 cliques").

### 2.5 `ClientRecords` (Ficha Técnica de Clientes)
- **Responsabilidade:** histórico de atendimentos por cliente, preferências registradas pela profissional, consentimento LGPD (PRD seção 5.6 e 7).
- **Agregados principais:** `FichaCliente`, `ConsentimentoLGPD`.
- Separado de `Scheduling` de propósito: é dado sensível com regras próprias de retenção/portabilidade, não deveria estar acoplado à lógica de agenda.

### 2.6 `Reviews` (Avaliações e Confiança)
- **Responsabilidade:** avaliações pós-serviço, moderação, selo de verificação exibido no perfil (PRD seção 9).
- **Agregados principais:** `Avaliacao`, `Denuncia`.
- Só permite criar avaliação vinculada a um `Agendamento` concluído — depende de evento publicado por `Scheduling`, não de chamada direta.

### 2.7 `Billing` (Assinatura e Planos)
- **Responsabilidade:** planos (Free/Starter/Pro/Business), cobrança recorrente, upgrade/downgrade, trial (PRD seção 11).
- **Agregados principais:** `Assinatura`, `Plano`, `Fatura`.
- Módulo isolado de propósito — é o módulo que gera receita e deve ter as regras de negócio (e testes) mais rígidas do sistema.

### 2.8 `Payments` (Pagamento do Serviço)
- **Responsabilidade:** pagamento do serviço em si (PIX/cartão dentro do app), distinto de `Billing` (que é a assinatura da profissional).
- **Por que separar de Billing:** são dois fluxos de dinheiro completamente diferentes — um é receita da plataforma (assinatura), outro é um repasse entre cliente e profissional que passa pela plataforma só como facilitador.

### 2.9 `Marketing` (Cupons e Campanhas)
- **Responsabilidade:** cupons "Flash" para horários ociosos (PRD seção 5.5).
- Depende de dados de `Scheduling` (quais horários estão ociosos) via read model, não acesso direto.

### 2.10 `Notifications` (Notificações)
- **Responsabilidade:** push e WhatsApp — lembretes 24h/1h, confirmações, cancelamentos (PRD seção 4.5).
- **Padrão de consumo:** módulo puramente reativo a eventos de domínio publicados por outros módulos (`Scheduling`, `Billing`, `Marketing`). Não deveria conter regra de negócio própria, só orquestração de envio.

### 2.11 `Analytics` (Dashboard de Ganhos)
- **Responsabilidade:** faturamento do dia/semana/mês, métricas por serviço (PRD seção 5.4).
- Assim como `Discovery`, é majoritariamente um read model agregando eventos de `Scheduling` e `Payments`.

### 2.12 `Admin` (Painel Administrativo / Operações da Plataforma)
- **Responsabilidade:** aprovação/rejeição de verificação de profissionais, ativação/desativação de contas, moderação de denúncias, dashboards de negócio, gestão de planos (PRD seção 6).
- **Agregados principais:** `AdminUser` (com papel/role), `AcaoAdministrativa` (log de auditoria — quem fez o quê, quando, por quê).
- **Natureza do módulo:** diferente dos demais, `Admin` não introduz novas regras de negócio de domínio — ele **orquestra casos de uso já expostos por outros módulos** (ex: chama o caso de uso `AprovarVerificacao` de `Identity`, `SuspenderConta` de `Identity`, `ResolverDenuncia` de `Reviews`, `AtualizarPlano` de `Billing`). O valor deste módulo é a interface e o controle de acesso, não novas invariantes de domínio.
- **Importante:** apesar de "só orquestrar", este módulo é **estruturalmente obrigatório desde o primeiro dia** — sem ele, nenhuma profissional consegue sair do status `PendenteVerificacao`, o que trava a plataforma inteira (ver seção 9 sobre a fila de aprovação como bloqueador do MVP).

---

## 3. Detalhamento das Entidades por Módulo

Convenção usada abaixo: **Aggregate Root** é a entidade por onde toda escrita naquele agregado deve passar; entidades filhas nunca são modificadas diretamente de fora do agregado. Atributos em notação `nome: tipo`. Comportamentos são os métodos/casos de uso que a entidade expõe — não implementação, só o contrato.

**Nota de autenticação, válida para todo o detalhamento abaixo:** nem toda ação do app da Cliente exige sessão autenticada. Navegação na Home (`Discovery`), busca, visualização de perfil de profissional, lista de serviços/preços e leitura de avaliações são **públicas** — o mesmo padrão do iFood, em que dá pra ver o cardápio sem login. **A partir do momento em que a cliente tenta criar um `Agendamento`, autenticação passa a ser obrigatória** — é o ponto de conversão onde a identidade da cliente entra no sistema. Isso está refletido abaixo: `Agendamento.clienteId` nunca é nulo e é sempre resolvido a partir da sessão autenticada, nunca de um formulário anônimo.

### 3.1 `Identity`

**`Conta`** (Aggregate Root)
- `id: UUID`
- `tipo: enum {Cliente, Profissional}`
- `email: string | null`
- `telefone: string | null` — pelo menos um entre email/telefone deve existir (invariante, ver Regras_Negocio_Bello.md)
- `senhaHash: string | null` (nulo se a conta usa apenas login social/OTP)
- `status: enum {PendenteVerificacao, Ativa, Suspensa, Encerrada}`
- `criadoEm: timestamp`
- Comportamentos: `autenticar(credenciais)`, `suspender(motivo, adminUserId)`, `reativar(adminUserId)`, `encerrar()`

**`PerfilVerificacao`** (Entity, referencia `contaId`)
- `id: UUID`
- `contaId: UUID` (FK para `Conta`, só aplicável a contas do tipo Profissional)
- `documentoUrl: string`
- `status: enum {NaoIniciado, EmAnalise, Aprovado, Rejeitado}`
- `motivoRejeicao: string | null`
- `analisadoPorAdminUserId: UUID | null`
- `analisadoEm: timestamp | null`
- Comportamentos: `enviarDocumento()`, `aprovar(adminUserId)`, `rejeitar(adminUserId, motivo)` — os dois últimos só chamáveis a partir do módulo `Admin`.

**`Sessao`** (Entity de suporte — o mecanismo técnico por trás da "autenticação obrigatória para agendar")
- `id: UUID` (token)
- `contaId: UUID`
- `criadaEm: timestamp`
- `expiraEm: timestamp`
- `dispositivo: string | null`
- Comportamentos: `renovar()`, `revogar()` (ex: logout, ou revogação forçada em caso de suspensão da `Conta`)
- Toda ação que exige autenticação (criar `Agendamento`, criar `Avaliacao`, acessar `FichaCliente`, qualquer ação em `Admin`) valida uma `Sessao` ativa antes de chegar à camada de Application do módulo correspondente — essa validação acontece no middleware compartilhado descrito na seção 7 (Cross-cutting concerns).

### 3.2 `ProfessionalCatalog`

**`PerfilProfissional`** (Aggregate Root)
- `id: UUID`
- `contaId: UUID` (referência a `Identity.Conta`, nunca join direto)
- `nomeExibicao: string`
- `bio: string | null`
- `cidadeBase: string`
- `status: enum {EmRevisao, Ativo, Inativo}`
- `criadoEm: timestamp`
- Comportamentos: `ativar()` (chamado internamente pela regra de dupla condição descrita na seção 2.2), `desativar()`, `atualizarBio(texto)`

**`Servico`** (Entity, filha de `PerfilProfissional`)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `nome: string`
- `categoria: enum` (ex: Manicure, Cabelo, Estetica, Maquiagem, Sobrancelha)
- `preco: decimal`
- `duracaoMinutos: int`
- `modalidade: enum {Domicilio, Salao, Ambos}`
- `raioAtendimentoKm: decimal | null` — obrigatório se `modalidade != Salao`
- `status: enum {Ativo, Inativo}`
- Comportamentos: `atualizarPreco(valor)`, `desativar()`

**`FotoPortfolio`** (Entity, filha de `PerfilProfissional`, opcionalmente vinculada a um `Servico`)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `servicoId: UUID | null`
- `url: string`
- `ordem: int`

### 3.3 `Discovery` (read model — não são agregados transacionais, são projeções)

**`PerfilIndexado`** (projeção, reconstruída a partir de eventos)
- `perfilProfissionalId: UUID`
- `nomeExibicao: string`
- `fotoCapaUrl: string`
- `categoriasOferecidas: enum[]`
- `notaMedia: decimal`
- `faixaPreco: {min: decimal, max: decimal}`
- `localizacao: {lat: decimal, lng: decimal}`
- `modalidadesDisponiveis: enum[]`
- Não expõe "comportamentos" no sentido de domínio — é reconstruída (upsert) a cada evento relevante consumido (`PerfilProfissionalPublicado`, `ServicoAtualizado`, `AvaliacaoCriada`, `AssinaturaVencida`).

### 3.4 `Scheduling`

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
- `clienteId: UUID` — **nunca nulo, sempre resolvido via `Sessao` autenticada** (ver nota de autenticação no topo desta seção)
- `perfilProfissionalId: UUID`
- `servicoId: UUID`
- `precoCongelado: decimal` (copiado de `Servico.preco` no momento da criação)
- `duracaoCongeladaMinutos: int`
- `modalidade: enum {Domicilio, Salao}`
- `enderecoAtendimento: {logradouro, cidade, lat, lng} | null` (obrigatório se `modalidade = Domicilio`)
- `status: enum {Solicitado, Confirmado, EmAndamento, Concluido, Cancelado, NoShow}`
- `criadoEm, confirmadoEm, concluidoEm, canceladoEm: timestamp | null`
- Comportamentos: `confirmar()`, `cancelar(motivo)`, `iniciarAtendimento()`, `concluir()`, `marcarComoNoShow()`, `reagendar()` (internamente: cancela este e cria um novo, mantendo referência)

### 3.5 `ClientRecords`

**`FichaCliente`** (Aggregate Root, por par Profissional-Cliente)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `clienteId: UUID`
- `observacoes: Observacao[]`
- Comportamentos: `adicionarObservacao(texto, agendamentoId)`, `exportarDados()` (para portabilidade LGPD), `anonimizar()` (em caso de revogação de consentimento)

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

### 3.6 `Reviews`

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

### 3.7 `Billing`

**`Assinatura`** (Aggregate Root)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `planoId: UUID`
- `status: enum {TrialAtivo, Ativa, Inadimplente, Cancelada}`
- `dataInicioCiclo: timestamp`
- `dataProximaCobranca: timestamp`
- Comportamentos: `iniciarTrial()`, `renovar()`, `alterarPlano(novoPlanoId)` (upgrade imediato / downgrade só no próximo ciclo, conforme regra já definida), `cancelar()`

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

### 3.8 `Payments`

**`Transacao`** (Aggregate Root)
- `id: UUID`
- `agendamentoId: UUID` (único)
- `valor: decimal` (deve corresponder ao `Agendamento.precoCongelado`)
- `metodo: enum {Pix, Cartao, Presencial}`
- `status: enum {Pendente, Confirmada, Estornada}`
- `criadoEm, confirmadoEm, estornadoEm: timestamp | null`
- `motivoEstorno: string | null`
- Comportamentos: `confirmar()`, `estornar(motivo)`

### 3.9 `Marketing`

**`CupomFlash`** (Aggregate Root)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `servicoId: UUID`
- `janelaDisponibilidadeId: UUID` (a janela ociosa específica que o cupom cobre)
- `desconto: {tipo: enum {Percentual, ValorFixo}, valor: decimal}`
- `validoAte: timestamp`
- `status: enum {Ativo, Expirado, Utilizado}`
- Comportamentos: `utilizar(agendamentoId)`, `expirar()`

### 3.10 `Notifications`

**`Notificacao`** (Entity — principalmente um registro/log de envio, não um agregado rico em regra de negócio)
- `id: UUID`
- `destinatarioContaId: UUID`
- `canal: enum {Push, WhatsApp}`
- `tipo: enum {LembreteAgendamento24h, LembreteAgendamento1h, AgendamentoConfirmado, AgendamentoCancelado, CupomFlashDisponivel, FaturaPendente}`
- `agendamentoRelacionadoId: UUID | null`
- `status: enum {Agendada, Enviada, Falhou}`
- `enviarEm: timestamp`
- Comportamentos: `agendar()`, `marcarComoEnviada()`, `cancelar()` (usado quando o `Agendamento` de origem é cancelado antes do envio).

### 3.11 `Analytics` (read model)

**`FaturamentoAgregado`** (projeção, não aggregate transacional)
- `perfilProfissionalId: UUID`
- `periodo: {tipo: enum {Dia, Semana, Mes}, referencia: date}`
- `valorFaturado: decimal`
- `quantidadeAgendamentosConcluidos: int`
- `quantidadeClientesNovas: int` (conforme regra de cálculo definida em Regras_Negocio_Bello.md, seção 11)

### 3.12 `Admin`

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
- `tipoAcao: enum` (ex: AprovarVerificacao, RejeitarVerificacao, SuspenderConta, ResolverDenuncia, AlterarPlano)
- `entidadeAfetadaTipo: string`
- `entidadeAfetadaId: UUID`
- `motivo: string | null`
- `criadoEm: timestamp`
- Sem comportamentos de edição — apenas criação, nunca alteração ou remoção (invariante já registrada em Regras_Negocio_Bello.md, seção 12).

---

## 4. Estrutura em camadas (Clean Architecture dentro de cada módulo)

Cada módulo acima segue internamente as mesmas 4 camadas, de dentro para fora:

1. **Domain** — entidades, agregados, value objects, regras de negócio puras. Zero dependência de framework, banco ou HTTP.
2. **Application** — casos de uso (ex: `CriarAgendamento`, `AtivarCupomFlash`), orquestram entidades do Domain. Define **ports** (interfaces) que a Infrastructure implementa (ex: `AgendamentoRepository` como interface aqui, implementação concreta lá fora).
3. **Infrastructure** — implementação dos ports: repositórios (acesso a banco), integrações externas (gateway de pagamento, WhatsApp API, push notification provider).
4. **Interface/Presentation** — controllers HTTP, serializers/DTOs, validação de entrada. É a camada mais fina, só traduz requisição HTTP em chamada de caso de uso.

**Regra de dependência:** camadas externas dependem das internas, nunca o contrário. O Domain não sabe que existe HTTP ou banco de dados.

---

## 5. Comunicação entre módulos

Esta é a regra mais importante para o monolito modular não virar um monolito comum disfarçado:

- **Nenhum módulo acessa a tabela/schema de outro módulo diretamente.** Toda leitura de dado de outro módulo passa por uma interface pública exposta por aquele módulo (um "módulo facade" ou serviço de aplicação exposto).
- **Eventos de domínio para comunicação assíncrona.** Quando `Scheduling` conclui um agendamento, publica um evento (`AgendamentoConcluido`) internamente (in-process event bus). `Reviews`, `Notifications` e `Analytics` escutam esse evento e reagem — sem acoplamento direto entre eles.
- **Chamadas síncronas apenas quando a operação exige consistência imediata** (ex: `Scheduling` verificando `ProfessionalCatalog` para saber se o serviço ainda está ativo antes de confirmar agendamento) — feitas via interface do módulo, nunca via query direta no banco do outro módulo.

---

## 6. Estratégia de dados

Recomendação pragmática para fase inicial (solo dev, sem validação ainda):

- **Um único banco de dados físico**, mas **um schema por módulo** (ex: `identity.*`, `scheduling.*`, `billing.*`).
- Isso dá a disciplina de fronteira (impossível fazer JOIN entre schemas por acidente sem querer) sem o custo operacional de gerenciar múltiplos bancos desde o dia 1.
- Se algum módulo precisar escalar separado no futuro (ex: `Discovery` sob carga pesada de busca), o schema isolado facilita a extração futura para um banco/serviço próprio.

---

## 7. Cross-cutting concerns

- **Autenticação/Autorização:** centralizada em `Identity` (agregado `Sessao`, seção 3.1), exposta como middleware/interceptor reutilizável pelos demais módulos — não implementada individualmente em cada um.
  - **Áreas públicas (sem sessão) no app da Cliente:** Home/`Discovery`, busca, visualização de `PerfilProfissional`, lista de `Servico` e preços, leitura de `Avaliacao`. Isso reduz fricção de entrada — a cliente pode explorar o app inteiro antes de decidir criar conta, no mesmo padrão do iFood.
  - **Áreas que exigem sessão autenticada:** criação de `Agendamento` (o ponto de conversão principal), pagamento (`Payments`), criação de `Avaliacao`, qualquer tela do app/painel da Profissional, e todo o `Admin`.
  - Na prática, o middleware de autenticação deve ser aplicado **por endpoint/caso de uso**, não por módulo inteiro — `Scheduling`, por exemplo, tem casos de uso públicos (consultar horários disponíveis) e privados (criar agendamento) dentro do mesmo módulo.
- **LGPD/Auditoria:** tratada principalmente dentro de `ClientRecords`, mas o consentimento deveria ser um conceito compartilhado (shared kernel leve) acessível por qualquer módulo que colete dado sensível.
- **Observabilidade:** logging estruturado e correlação de eventos entre módulos (correlation ID por requisição/fluxo) é essencial num monolito modular para conseguir depurar um fluxo que atravessa vários módulos via eventos.

---

## 8. Trade-offs e recomendação prática

- Clean Architecture completa (4 camadas) em **todos** os 11 módulos, para um dev solo, pode gerar overhead desnecessário em módulos simples (ex: `Notifications`, que é majoritariamente orquestração). Uma simplificação razoável: aplicar as 4 camadas rigorosamente nos módulos com regra de negócio real (`Scheduling`, `Billing`, `ProfessionalCatalog`, `ClientRecords`, `Reviews`) e uma versão mais enxuta (Domain + Application + Infrastructure, sem separação forte de Interface) nos módulos majoritariamente reativos (`Notifications`, `Discovery`, `Analytics`, `Marketing`).
- O maior risco prático desse estilo para um dev solo não é a arquitetura em si, mas a disciplina de manter as fronteiras ao longo do tempo sob pressão de prazo — vale definir desde já uma regra simples e não negociável: **nenhum import direto entre pastas de módulos diferentes, só através das interfaces públicas.**

---

## 9. Módulos sugeridos para o MVP (Fase 1 do PRD)

Considerando a estratégia de validação faseada do PRD (seção "Fora de Escopo V1"), nem todos os 11 módulos precisam existir com robustez total desde o início:

- **Essenciais desde o dia 1:** `Identity`, `ProfessionalCatalog`, `Scheduling`, `Discovery`, `Notifications`, e uma versão mínima de `Admin` — pelo menos a fila de aprovação de verificação (seção 3.12), sem a qual nenhuma profissional consegue ser publicada. O restante do `Admin` (dashboards de negócio, gestão de planos via UI) pode ser mais simples no início — inclusive operado via acesso direto ao banco/ferramenta interna antes de virar UI dedicada, desde que a ação de aprovação passe pelos casos de uso corretos do domínio.
- **Podem ser simplificados/adiados:** `Billing` (pode começar com um único plano fixo, sem tiers), `Marketing` (cupons Flash é V2 segundo o PRD), `Analytics` (dashboard básico em vez de relatórios avançados).
- **Podem esperar a Fase 2:** integrações de pagamento mais sofisticadas em `Payments`, moderação avançada em `Reviews`.
