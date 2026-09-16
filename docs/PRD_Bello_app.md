# PRD — Bellô (App de Agendamento de Serviços de Beleza)

**Status:** Rascunho para validação
**Escopo de lançamento:** Nacional
**Modelo de negócio:** SaaS por assinatura (planos mensais/anuais para profissionais)

---

## 1. Visão Geral

### 1.1 Problema
- **Cliente:** mulheres com rotina corrida perdem tempo agendando serviços de beleza por telefone/WhatsApp, sem transparência de preço nem garantia de qualidade antes de ir.
- **Profissional:** manicures, cabeleireiras, esteticistas e maquiadoras autônomas ou donas de salão não têm ferramentas acessíveis de organização de agenda nem visibilidade para atrair novas clientes.

### 1.2 Proposta de valor
Conectar clientes a profissionais de beleza qualificados com a conveniência de agendamento instantâneo, preços transparentes e confiança via avaliações reais — atendendo tanto a domicílio quanto no salão/estúdio da profissional (modelo híbrido).

**Nota de terminologia:** a referência a "delivery" no conceito do produto diz respeito à **experiência de descoberta e navegação**, no padrão de apps como iFood (tela inicial com cards de estabelecimentos/profissionais, categorias, scroll de opções próximas) — e não a uma logística de entrega do serviço. A modalidade de atendimento (domicílio, salão, ou ambos) é uma dimensão independente, definida pela profissional por serviço (ver seção 3.1).

### 1.3 Modelo de negócio
- Monetização **exclusivamente via assinatura mensal/anual das profissionais** (SaaS puro).
- Cliente final **não paga** para usar o app (buscar, agendar).
- Pagamento do serviço pode ocorrer dentro do app (PIX/cartão) ou no local, sem taxa de intermediação cobrada pela plataforma nesta fase.
- Consequência direta: o valor da assinatura depende da capacidade do app de **gerar clientes novas**, não só organizar agenda. Isso deve guiar priorização de features (marketplace/descoberta > funcionalidades puramente administrativas).

---

## 2. Personas

### 2.1 Cliente
Mulher urbana, rotina corrida, busca praticidade para agendar sem ligar ou usar WhatsApp. Prioriza custo-benefício ou reputação da profissional. Decide rápido, valoriza transparência de preço e prova social (avaliações, fotos).

### 2.2 Profissional
Manicures, cabeleireiras, esteticistas, maquiadoras — autônomas ou donas de salão. Precisa de: organização de agenda, redução de faltas/no-show, visibilidade para atrair clientes novas, e controle financeiro simples do que fatura.

---

## 3. Escopo do Produto

Três interfaces principais:

- **App/Web Cliente** — descoberta, agendamento, pagamento, avaliação.
- **App/Web Profissional** — gestão de agenda, atendimento, marketing, financeiro. A versão web deve suportar uso no balcão do estabelecimento (ex: recepção de salão).
- **Painel Administrativo (Web, uso interno)** — ferramenta operacional para o time do Bellô: aprovação de verificação de profissionais, ativação/desativação de contas, moderação e dashboards de negócio. Não é voltado a cliente nem profissional — acesso restrito à equipe operadora da plataforma.

### 3.1 Modalidade de atendimento
Híbrido: a profissional define, por serviço, se atende **a domicílio**, **no seu salão/estúdio**, ou **ambos**. Quando a domicílio, é necessário capturar raio de atendimento e possível taxa de deslocamento.

---

## 4. Requisitos Funcionais — Painel da Cliente

### 4.1 Busca e Descoberta

**Tela inicial (Home) — padrão iFood:**
- Barra de busca no topo com localização atual da cliente (endereço/bairro selecionável).
- Carrossel de categorias (ex: Manicure, Cabelo, Estética, Maquiagem, Sobrancelha) como atalhos visuais.
- Banner/carrossel de destaques (ex: cupons Flash ativos, profissionais em destaque, novidades).
- Lista/grid de cards de profissionais e salões próximos, cada card exibindo: foto de capa, nome, categoria principal, nota média (estrelas), faixa de preço, distância, e um indicativo se atende a domicílio, no salão, ou ambos.
- Scroll infinito ou paginação conforme a cliente rola a tela, semelhante à listagem de restaurantes do iFood.

**Filtros e refinamento:**
- Categoria de serviço, geolocalização (raio configurável, ordenar por "mais próximos"), faixa de preço, avaliação média.
- Filtro específico por modalidade de atendimento (domicílio / salão / ambos).

### 4.2 Perfil da Profissional
- Portfólio de fotos (upload direto no MVP; integração com Instagram pode ser V2).
- Lista de serviços com preços transparentes.
- Avaliações e comentários de clientes anteriores (com moderação — ver seção 8).
- Selo de verificação (identidade/antecedentes — ver seções 6 e 9).

### 4.3 Agendamento em 3 Cliques
1. Seleção de serviço.
2. Escolha de profissional/horário disponível.
3. Confirmação (com resumo de preço e modalidade — domicílio ou salão).
- Sistema deve prevenir double-booking em tempo real.
- Deve haver política de cancelamento visível antes da confirmação (janela de cancelamento gratuito, regra de no-show).

### 4.4 Carteira e Pagamento
- Opção de pagar pelo app (PIX/cartão) ou no local.
- Nesta fase, sem taxa de intermediação da plataforma sobre a transação (consistente com modelo SaaS puro).

### 4.5 Central de Notificações
- Lembretes via Push e WhatsApp, 24h e 1h antes do serviço.
- Confirmação de agendamento e avisos de cancelamento/reagendamento.

---

## 5. Requisitos Funcionais — Painel da Profissional

### 5.1 Agenda do Dia
- Visão consolidada dos agendamentos do dia, com status (confirmado, em andamento, concluído, cancelado).

### 5.2 Criar Agendamento Manual
- Profissional pode registrar cliente que agendou fora do app (telefone, presencial), mantendo a agenda como fonte única de verdade.

### 5.3 Gestão de Agenda Dinâmica
- Bloqueio de horários pessoais.
- Abertura de "janelas" extras de disponibilidade.

### 5.4 Dashboard de Ganhos
- Faturamento do dia, semana e mês.
- Visão por serviço/categoria (quais serviços mais rendem).

### 5.5 Ferramentas de Marketing
- Cupons "Flash" para horários ociosos (ex: desconto por tempo limitado em horário específico).
- Fase 2 (não MVP): campanhas recorrentes, promoções agendadas.

### 5.6 Histórico de Clientes (Ficha Técnica)
- Registro por cliente: serviços realizados, preferências (ex: cor de esmalte usada), histórico de agendamentos.
- **Requer termo de consentimento explícito da cliente (LGPD)** — ver seção 8.

---

## 6. Requisitos Funcionais — Painel Administrativo

O painel administrativo é a interface interna usada pelo time do Bellô (não pela cliente nem pela profissional) para operar a plataforma.

### 6.1 Fila de Verificação de Profissionais
- Lista de cadastros de profissionais pendentes de análise de documento/antecedentes.
- Ação de aprovar ou rejeitar, com campo obrigatório de motivo em caso de rejeição.
- Sem aprovação aqui, o perfil da profissional nunca fica visível no app da cliente — esta é a porta de entrada obrigatória de toda profissional na plataforma.

### 6.2 Ativação e Desativação de Contas
- Ativar/suspender contas de Cliente e de Profissional (ex: por denúncia grave, fraude, solicitação de encerramento).
- Suspensão bloqueia novas ações (login, novos agendamentos), mas preserva histórico e dados já existentes — não é exclusão.
- Toda ação de ativação/desativação deve registrar responsável, data e motivo (log de auditoria).

### 6.3 Moderação de Avaliações e Denúncias
- Fila de denúncias reportadas por clientes ou profissionais sobre avaliações.
- Ação de manter ou remover uma avaliação denunciada, com motivo registrado.

### 6.4 Dashboards de Negócio
- Receita recorrente (assinaturas ativas, por plano).
- Volume de agendamentos e GMV (valor transacionado) por período e por região.
- Taxa de churn de assinaturas.
- Crescimento de cadastros (clientes e profissionais novos) por período/cidade.

### 6.5 Gestão de Planos
- CRUD dos planos de assinatura (nome, preço, limites de recursos) usados por `Billing`.

### 6.6 Controle de Acesso
- Acesso ao painel restrito por papel (ex: Owner, Suporte, Financeiro), com permissões diferentes por seção — nem todo operador precisa poder alterar preço de plano, por exemplo.

---

## 7. Requisitos Não Funcionais

- **Plataformas:** iOS, Android e Web responsiva para os painéis de Cliente e Profissional. O Painel Administrativo é **apenas web**.
- **Geolocalização:** precisão suficiente para busca por raio em áreas urbanas densas.
- **Escalabilidade:** arquitetura deve suportar expansão multi-cidade desde o início, dado o lançamento nacional.
- **LGPD:** consentimento explícito para dados de ficha técnica e localização; política clara de portabilidade/exclusão de dados da profissional caso ela saia da plataforma.
- **Segurança:** verificação de identidade da profissional antes da ativação do perfil (documento + possivelmente antecedentes), processada via fila de aprovação do Painel Administrativo (seção 6.1).

---

## 8. Métricas de Sucesso (KPIs)

- Taxa de conversão busca → agendamento.
- Taxa de no-show/cancelamento.
- Retenção de profissionais assinantes (churn mensal).
- % de profissionais que renovam após o período free/trial.
- Número médio de clientes novas geradas por profissional/mês (métrica central, pois justifica a assinatura).
- NPS de cliente e de profissional, separadamente.

---

## 9. Riscos e Pontos de Atenção

| Risco | Descrição | Mitigação sugerida |
|---|---|---|
| **Cold start nacional** | Lançar em todas as regiões ao mesmo tempo dilui esforço de aquisição e dificulta densidade de oferta em cada praça. | Priorizar marketing e onboarding de profissionais por praça, mesmo com app nacional. |
| **Confiança/segurança em domicílio** | Cliente recebe desconhecida em casa. | Verificação de identidade obrigatória, possível checagem de antecedentes, selo de verificação visível no perfil. |
| **No-show / cancelamento tardio** | Prejuízo financeiro para a profissional. | Política de cancelamento clara, possível cobrança de sinal via PIX. |
| **Avaliações falsas ou retaliação** | Compromete a confiança que é pilar do produto. | Moderação, avaliação só liberada após serviço confirmado como concluído. |
| **Dados sensíveis na ficha técnica** | Exposição a risco de LGPD. | Consentimento explícito, minimização de dados coletados. |
| **Dependência de assinatura sem prova de valor** | Profissional cancela se não perceber geração de clientes novas. | Free/trial generoso no início; métrica de "clientes geradas" visível no dashboard da profissional. |

---

## 10. Fora de Escopo (V1)

- Integração automática com Instagram (portfólio via upload manual no MVP).
- Preço dinâmico por demanda.
- Comissão sobre transação (modelo é SaaS puro nesta fase).
- Programa de fidelidade/pontos para cliente.
- Multi-idioma.

---

## 11. Estrutura de Planos (Profissional)

| Plano | Público | Principais recursos |
|---|---|---|
| **Free/Trial** | Aquisição inicial, teste | Perfil no marketplace, agenda básica, uso limitado ou período de teste |
| **Starter** | Autônoma solo | Agenda ilimitada, notificações WhatsApp, dashboard de ganhos |
| **Pro** | Profissional estabelecida | + Cupons Flash, ficha técnica, prioridade na busca, atendimento híbrido |
| **Business** | Salão com equipe | Múltiplas agendas/profissionais, relatórios avançados |

Desconto para planos semestrais/anuais recomendado para melhorar previsibilidade de receita.

---

## 12. Abertos para Decisão

- Definição de preço exato de cada plano (requer benchmark de disposição a pagar via pesquisa com profissionais-alvo).
- Regra final de cancelamento/sinal (percentual, prazo).
- Critério de verificação de identidade (documento simples vs. checagem de antecedentes com custo).
- Estratégia de priorização de praças dentro do lançamento nacional.
