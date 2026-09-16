# Stack Tecnológica — Backend Bellô

**Baseado em:** PRD_App_Beleza_Delivery.md, Arquitetura_Backend_Bello.md
**Escopo deste documento:** decisões de tecnologia para implementar a arquitetura já definida (Monolito Modular + DDD + Clean Architecture)
**Contexto:** desenvolvimento solo, produto em fase de ideia/pré-validação, com ambição de lançamento nacional

---

## 1. Critério de decisão

Toda escolha abaixo segue o mesmo princípio: **produtividade para um dev solo agora, sem fechar a porta para escalar depois** — coerente com a decisão de Monolito Modular já registrada em Arquitetura_Backend_Bello.md, seção 1.

---

## 2. Linguagem e Framework

### Escolha: TypeScript + NestJS

**Justificativa:**
- O sistema de módulos do Nest (`@Module`) mapeia quase 1:1 para os 11 bounded contexts já definidos (`Identity`, `Scheduling`, `Billing`, `ProfessionalCatalog` etc.) — cada um vira um módulo Nest real, com fronteiras de import reforçadas por convenção de pastas.
- Injeção de dependência nativa facilita a Clean Architecture: ports (interfaces) definidos no Application, implementação concreta no Infrastructure, sem gambiarra.
- Módulo de CQRS/Event Bus in-process (`@nestjs/cqrs`) pronto para o padrão de comunicação assíncrona entre módulos já descrito na arquitetura (ex: `AgendamentoConcluido` disparando `Reviews`, `Notifications`, `Analytics`).
- Geração automática de Swagger/OpenAPI via decorators — importante porque os apps mobile (iOS/Android) vão consumir essa API e precisam de contrato claro.
- Ecossistema maduro para filas, WebSockets, upload de arquivo, rate limiting.

**Alternativas consideradas:**

| Opção | Por que não foi a escolha principal |
|---|---|
| Java/Spring Boot | Arquitetura equivalente, mas mais boilerplate e ciclo de desenvolvimento mais lento para dev solo |
| Go | Ótima performance, mas exige implementar manualmente DI, validação e ORM que o Nest já resolve — custo alto para time de 1 pessoa |
| Python (FastAPI/Django) | Viável, mas o encaixe com DDD/Clean Architecture é mais artesanal; Nest foi desenhado em cima desses padrões |

---

## 3. Banco de Dados

### Escolha: PostgreSQL + PostGIS

**Justificativa:**
- Compatível diretamente com a estratégia de dados definida em Arquitetura_Backend_Bello.md, seção 6 (um banco físico, um schema por módulo: `identity.*`, `scheduling.*`, `billing.*` etc.).
- **PostGIS** resolve a busca geolocalizada do módulo `Discovery` (raio de atendimento, ordenação por "mais próximos") via `ST_DWithin`, sem exigir um serviço de busca separado no MVP.
- Transações ACID, essenciais para o núcleo do domínio (`Scheduling` prevenindo double-booking em tempo real, PRD seção 4.3).

**ORM:** Prisma — migrations declarativas, type-safety ponta a ponta com TypeScript. Os repositórios seguem como ports (interface no Application), com a implementação Prisma isolada na camada de Infrastructure, sem vazar detalhes do ORM para o Domain.

---

## 4. Cache e Filas

### Escolha: Redis + BullMQ

- **Cache:** read model do `Discovery`, evitando recalcular busca geolocalizada a cada requisição.
- **Filas (BullMQ):** processamento assíncrono de eventos de domínio com retry — mais robusto que o event bus puramente in-process para o módulo `Notifications` (envio de WhatsApp/push não pode travar a resposta HTTP nem se perder em caso de falha).

---

## 5. Integrações Externas

| Necessidade (PRD) | Sugestão | Observação |
|---|---|---|
| PIX/cartão — pagamento do serviço (`Payments`) | Mercado Pago ou Pagar.me | Ambos oferecem PIX e split de pagamento, útil se um dia houver comissão sobre transação |
| Assinatura recorrente (`Billing`) | Asaas, Iugu ou Vindi | Especializados em cobrança recorrente SaaS no Brasil — evita reimplementar dunning/retry de cartão |
| WhatsApp — lembretes (PRD seção 4.5) | Meta Cloud API (direto) ou Z-API (integração mais rápida) | Meta Cloud API é mais barato em escala; Z-API acelera o início |
| Push notification | Firebase Cloud Messaging (FCM) | Cobre iOS e Android com uma única integração |
| Fotos de portfólio (PRD seção 4.2) | Cloudflare R2 ou AWS S3 | Armazenamento de objeto, custo baixo |

---

## 6. Autenticação e Login

Decisão por perfil de usuário, dentro do módulo `Identity` (Arquitetura_Backend_Bello.md, seção 3.1). O agregado `Conta` já prevê `senhaHash: string | null`, ou seja, o modelo foi desenhado contemplando login sem senha.

### 6.1 Cliente — telefone + OTP via WhatsApp (principal)
- Reaproveita a mesma integração WhatsApp Business API já prevista para o módulo `Notifications` (PRD seção 4.5), sem custo extra de infraestrutura.
- Elimina fricção de senha/"esqueci minha senha", coerente com a persona que "decide rápido" (PRD seção 2.1) e com o objetivo de agendamento em 3 cliques (PRD seção 4.3).
- Padrão já familiar ao público brasileiro (iFood, 99, Nubank).

**Complementar — login social (Google / Apple):**
- Reduz fricção adicional no primeiro cadastro.
- **Restrição da App Store:** se houver qualquer login social de terceiro (Google, Facebook), a Apple exige que "Sign in with Apple" também esteja disponível, sob pena de rejeição na revisão do app. Incluir no escopo se optarem por login social.

### 6.2 Profissional — email + senha (principal), OTP opcional
- Cadastro mais deliberado (passa por verificação de documento e assinatura de plano pago), o que torna aceitável um pouco mais de fricção em troca de um método previsível para uso recorrente via web — inclusive no balcão do salão (PRD seção 3).

### 6.3 Admin — email + senha com 2FA obrigatório (TOTP)
- Painel interno com poder de aprovar/suspender contas (Arquitetura_Backend_Bello.md, seção 6). Nível de acesso mais sensível do sistema; 2FA via app autenticador (TOTP) é mais adequado aqui do que OTP via WhatsApp.

### 6.4 Implementação técnica
- **NestJS + Passport.js**, estratégia JWT: access token de vida curta (~15min) + refresh token rotativo, armazenado com hash no banco.
- **OTP:** código de 6 dígitos gerado no backend, guardado no Redis (já presente na stack — seção 4) com TTL de ~5min, validado antes da emissão do JWT.
- **Sessões:** o agregado `Sessao` (Arquitetura_Backend_Bello.md, seção 3.1) guarda o refresh token, permitindo revogação individual de sessões (ex: "sair de todos os dispositivos").
- **Rate limiting obrigatório** no endpoint de solicitação de OTP — sem isso, o endpoint vira vetor de abuso (spam de WhatsApp) com custo direto para a operação.

---

## 7. Infraestrutura e Deploy

**Fase atual (dev solo, produto não validado):**
- **Docker** — aplicação containerizada desde o início, facilita migração futura sem retrabalho.
- **Railway ou Fly.io** — deploy simples, banco Postgres gerenciado incluso, custo baixo durante a validação.

**Caminho de evolução:**
- Migração para **AWS (ECS/Fargate + RDS)** quando o volume justificar.
- O monolito modular bem feito facilita inclusive extrair um módulo específico (ex: `Discovery` sob carga pesada de busca) para um serviço próprio — caminho já previsto em Arquitetura_Backend_Bello.md, seção 1.

Kubernetes foi deliberadamente descartado nesta fase: overhead operacional desnecessário para um produto ainda sem validação de demanda.

---

## 8. Observabilidade e Testes

- **Logging:** Pino, com correlation ID por requisição/fluxo — essencial para rastrear um fluxo que atravessa vários módulos via eventos, conforme já apontado em Arquitetura_Backend_Bello.md, seção 7.
- **Error tracking:** Sentry.
- **Testes:** Vitest (ver ADR-001) — prioridade para testes de unidade no Domain (regras de negócio puras, sem necessidade de mock) e testes de integração nos casos de uso do Application dos módulos críticos (`Scheduling`, `Billing`).
- **CI/CD:** GitHub Actions.

---

## 9. Resumo da Stack

| Camada | Tecnologia |
|---|---|
| Linguagem/Framework | TypeScript + NestJS |
| Banco de dados | PostgreSQL + PostGIS |
| ORM | Prisma |
| Cache/Filas | Redis + BullMQ |
| Autenticação | JWT (Passport.js) + OTP via WhatsApp (Cliente) / email+senha (Profissional) / 2FA TOTP (Admin) |
| Pagamento de serviço | Mercado Pago ou Pagar.me |
| Cobrança recorrente | Asaas, Iugu ou Vindi |
| WhatsApp | Meta Cloud API ou Z-API |
| Push | Firebase Cloud Messaging |
| Armazenamento de arquivos | Cloudflare R2 ou AWS S3 |
| Deploy inicial | Docker + Railway/Fly.io |
| Deploy futuro | AWS ECS/Fargate + RDS |
| Logging | Pino |
| Error tracking | Sentry |
| Testes | Vitest (ver ADR-001) |
| CI/CD | GitHub Actions |

---

## 10. Abertos para Decisão

- Escolha final entre Mercado Pago vs. Pagar.me (requer comparação de taxas para PIX/cartão).
- Escolha final entre Asaas, Iugu e Vindi para cobrança recorrente (requer comparação de taxas e suporte a upgrade/downgrade de plano).
- Escolha entre Meta Cloud API direto vs. Z-API (trade-off custo vs. velocidade de integração inicial).
- Momento de migração de Railway/Fly.io para AWS (definir gatilho por métrica, ex: volume de agendamentos/mês).
- Decisão sobre incluir login social (Google/Apple) já no MVP, considerando a exigência de "Sign in with Apple" na App Store caso haja qualquer login social de terceiro.
