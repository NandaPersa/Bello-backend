# Bellô — Contexto do Projeto

App de agendamento de serviços de beleza (marketplace). Conecta clientes a profissionais de beleza (manicures, cabeleireiras, esteticistas, maquiadoras), com agendamento instantâneo, preços transparentes e avaliações reais. Modalidade híbrida: atendimento a domicílio, no salão/estúdio, ou ambos, definida pela profissional por serviço.

**Modelo de negócio:** SaaS puro — monetização via assinatura mensal/anual das profissionais. Cliente final não paga para usar o app. Sem comissão sobre transação nesta fase.

**Fase atual:** ideia/pré-validação, desenvolvimento solo, lançamento nacional desde o início.

**Documentos-fonte (sempre consultar antes de decidir algo, nunca duplicar conteúdo deles aqui):**
- `docs/PRD_Bello.md` — visão de produto, personas, requisitos funcionais, KPIs, riscos.
- `docs/Backend_Archtecture.md` — bounded contexts, camadas, comunicação entre módulos, estratégia de dados.
- `docs/Bussiness_Rules.md` — entidades, invariantes e regras de negócio por módulo.
- `docs/Backend_Stack.md` — decisões de tecnologia.
- `docs/modules/<nome-do-modulo>.md` — recorte por bounded context (entidades + invariantes + responsabilidade + eventos), usar este em vez dos documentos completos sempre que a task for de um módulo específico.

---

## Stack técnica (fixa — não trocar sem decisão explícita registrada em `docs/decisoes/`)

| Camada | Tecnologia |
|---|---|
| Linguagem/Framework | TypeScript + NestJS |
| Banco de dados | PostgreSQL + PostGIS |
| ORM | Prisma |
| Cache/Filas | Redis + BullMQ |
| Autenticação | JWT (Passport.js) + OTP via WhatsApp (Cliente) / email+senha (Profissional) / 2FA TOTP (Admin) |
| Pagamento do serviço | Mercado Pago ou Pagar.me (decisão final aberta) |
| Cobrança recorrente | Asaas, Iugu ou Vindi (decisão final aberta) |
| WhatsApp | Meta Cloud API ou Z-API (decisão final aberta) |
| Push | Firebase Cloud Messaging |
| Armazenamento de arquivos | Cloudflare R2 ou AWS S3 |
| Deploy inicial | Docker + Railway/Fly.io |
| Logging | Pino (com correlation ID por requisição/fluxo) |
| Error tracking | Sentry |
| Testes | Vitest (ver ADR-001) |
| CI/CD | GitHub Actions |

---

## Arquitetura: Monolito Modular + DDD + Clean Architecture

### Bounded contexts (módulos)

`Identity`, `ProfessionalCatalog`, `Discovery`, `Scheduling`, `ClientRecords`, `Reviews`, `Billing`, `Payments`, `Marketing`, `Notifications`, `Analytics`, `Admin`.

Cada módulo Nest (`@Module`) mapeia 1:1 para um bounded context. Estratégia de dados: um único banco físico, um schema por módulo (`identity.*`, `scheduling.*`, `billing.*` etc.).

### Camadas dentro de cada módulo (Clean Architecture)

1. **Domain** — entidades, agregados, value objects, regras de negócio puras. Zero dependência de framework, banco ou HTTP.
2. **Application** — casos de uso, define *ports* (interfaces) implementados pela Infrastructure.
3. **Infrastructure** — repositórios (Prisma), integrações externas (gateway de pagamento, WhatsApp, push, storage).
4. **Interface/Presentation** — controllers HTTP, DTOs, validação de entrada.

**Regra de dependência, não-negociável:** camadas externas dependem das internas, nunca o contrário. O Domain não sabe que existe HTTP ou banco de dados.

**Rigor por módulo:**
- **4 camadas rígidas:** `Scheduling`, `Billing`, `ProfessionalCatalog`, `ClientRecords`, `Reviews` (módulos com regra de negócio real).
- **Versão enxuta (Domain + Application + Infrastructure, sem Interface separada):** `Notifications`, `Discovery`, `Analytics`, `Marketing` (majoritariamente reativos/read model).

### Comunicação entre módulos

- **Nenhum módulo acessa tabela/schema de outro módulo diretamente.** Toda leitura de dado de outro módulo passa pela interface pública (facade/serviço de aplicação) daquele módulo.
- **Eventos de domínio** (`@nestjs/cqrs`, in-process) para comunicação assíncrona — ex.: `AgendamentoConcluido` disparando `Reviews`, `Notifications`, `Analytics`.
- **Chamada síncrona** só quando a operação exige consistência imediata (ex.: `Scheduling` checando se o `Servico` ainda está ativo em `ProfessionalCatalog` antes de confirmar).

**Regra dura de código:** nenhum import direto entre pastas de módulos diferentes. Toda dependência cruzada passa por uma interface pública exposta pelo módulo dono do dado.

---

## Convenções

- **Nomenclatura de domínio em português**, coerente com os documentos-fonte: `Conta`, `Agendamento`, `PerfilProfissional`, `Servico`, `Assinatura`, `AdminUser`, etc. Não traduzir para inglês.
- **Preço e duração são "congelados"** no momento da criação de `Agendamento` — nunca lidos por referência viva do catálogo.
- **Transições de status sensíveis** (`PerfilVerificacao`, suspensão de `Conta`, moderação de `Avaliacao`) exigem ação explícita de `AdminUser` — nunca automáticas, exceto a transição de `PerfilProfissional` para `Ativo`, que é o único caso automático do sistema (depende de `PerfilProfissionalAprovado` + `PrimeiroPagamentoConfirmado`, nessa ordem indiferente).
- **Autenticação:** Home/`Discovery`, busca, perfil de profissional, lista de serviços e avaliações são públicos (sem sessão). A partir da criação de `Agendamento`, sessão autenticada é obrigatória — aplicada por caso de uso, não por módulo inteiro.

---

## Testes

- **Domain:** testes de unidade, sem mock (regras de negócio puras).
- **Application:** testes de integração nos casos de uso, prioridade máxima em `Scheduling` (prevenção de double-booking) e `Billing`.
- Toda task de implementação inclui testes — não é uma etapa separada posterior.

---

## Performance — pontos de atenção específicos do domínio

- `Discovery`: busca geolocalizada via PostGIS (`ST_DWithin`), com índice espacial; read model desnormalizado para não concorrer com escritas transacionais de agenda/cadastro.
- `Scheduling`: verificação de conflito de horário deve ser síncrona e rejeitar antes da confirmação — é a invariante mais crítica do sistema.
- Evitar N+1 ao montar cards de listagem (profissional + serviços + nota média).

---

## Pipeline de desenvolvimento (skills)

Toda task de desenvolvimento segue este fluxo, usando as skills do projeto:

1. `card-para-tech-spec` — lê o card do Jira (via Atlassian Rovo) e o(s) `docs/modules/*.md` relevante(s), gera o tech spec.
2. `tech-spec-para-tasks` — quebra o spec em tasks técnicas por camada.
3. `implementar-task` — implementa respeitando este arquivo e o(s) `docs/modules/*.md` da task, com testes inclusos.
4. `quality-gate` — revisão de fronteiras entre módulos, cobertura de teste e performance antes de fechar a task.

Se uma task esbarrar em um item ainda não decidido (ver seção "Pontos em aberto" de `docs/Regras_Negocio_Bello.md`), sinalizar em vez de assumir uma regra arbitrária.
