# Regras de Negócio por Módulo — Bellô

**Baseado em:** PRD_App_Beleza_Delivery.md e Arquitetura_Backend_Bello.md
**Objetivo:** detalhar entidades, invariantes e regras de negócio de cada bounded context, servindo como referência para modelagem do domínio.

---

## 1. `Identity` (Identidade e Acesso)

### Entidades / Agregados
- **Conta** — agregado raiz. Atributos-chave: tipo (Cliente | Profissional), email, telefone, status (PendenteVerificacao, Ativa, Suspensa, Encerrada).
- **PerfilVerificacao** — vinculado a Conta do tipo Profissional. Documento de identidade, status de verificação (NaoIniciado, EmAnalise, Aprovado, Rejeitado), data de aprovação.

### Invariantes
- Uma Conta não pode existir sem email **ou** telefone verificado (pelo menos um canal confirmado).
- Uma Conta do tipo Profissional só pode publicar perfil no `ProfessionalCatalog` se `PerfilVerificacao.status = Aprovado`.
- Conta Suspensa não pode criar novos agendamentos nem receber novos, mas agendamentos já confirmados permanecem visíveis (não é exclusão, é bloqueio de novas ações).

### Regras de negócio
- Verificação de identidade da profissional é **obrigatória antes da ativação do perfil público** — não é opcional nem pode ser pulada (é a base da confiança do produto, PRD seção 9).
- **A transição de `PerfilVerificacao.status` para `Aprovado` ou `Rejeitado` só pode ser feita por uma ação explícita de um `AdminUser` (módulo `Admin`) — nunca automaticamente.** Isso é intencional: o valor da verificação como sinal de confiança depende de haver revisão humana real, não apenas checagem automatizada de documento.
- Rejeição de verificação deve ter motivo registrado (preenchido pelo `AdminUser`) e permitir reenvio de documentação pela profissional (não é bloqueio definitivo automático).
- Troca de tipo de conta (Cliente virar Profissional) é permitida, mas exige novo fluxo de verificação — não herda status de conta Cliente.
- Suspensão de conta (Cliente ou Profissional) também é uma ação exclusiva de `AdminUser`, nunca disparada automaticamente por outro módulo sem revisão — evita suspensão indevida por falso positivo de algum outro sistema.

### Eventos de domínio publicados
- `ContaCriada`, `ContaVerificada`, `PerfilProfissionalAprovado`, `ContaSuspensa`.

---

## 2. `ProfessionalCatalog` (Catálogo de Profissionais)

### Entidades / Agregados
- **PerfilProfissional** — agregado raiz. Referencia `ContaId` (de Identity). Nome de exibição, bio, cidade base, status (Ativo, Inativo, EmRevisao).
- **Servico** — entidade filha do PerfilProfissional. Nome, categoria, preço, duração estimada, modalidade de atendimento (Domicilio, Salao, Ambos), raio de atendimento (se domicílio).
- **Portfolio** — coleção de fotos vinculadas ao perfil ou a um Serviço específico.

### Invariantes
- Um `Servico` com modalidade `Domicilio` ou `Ambos` **exige** raio de atendimento definido (não pode ser nulo).
- Preço de `Servico` não pode ser negativo nem zero (não permite "serviço gratuito" — isso seria tratado via `Marketing`, não alterando o preço base).
- Um `PerfilProfissional` só aparece em `Discovery` se `status = Ativo` **e** a Conta vinculada está `Ativa` em `Identity` **e** a assinatura em `Billing` está em dia (regra cross-módulo, resolvida via evento, não via query direta).
- **`PerfilProfissional.status` só transiciona para `Ativo` quando as duas condições a seguir são verdadeiras: `PerfilVerificacao.status = Aprovado` (evento `PerfilProfissionalAprovado` de `Identity`) e existe ao menos um pagamento de assinatura confirmado (evento `PrimeiroPagamentoConfirmado` de `Billing`).** Como as duas condições podem ocorrer em qualquer ordem, `ProfessionalCatalog` mantém um estado interno de "pendências de ativação" e só publica a transição para `Ativo` quando a segunda das duas condições chega — isso é o único caso do sistema em que uma transição de status é automática e não exige ação manual de `AdminUser`, justamente porque já depende de uma aprovação manual anterior (verificação) como pré-requisito.
- Se o pagamento falhar ou a assinatura ficar `Inadimplente` após já ter sido `Ativo`, `PerfilProfissional.status` não volta para `EmRevisao` — ele permanece tecnicamente `Ativo`, mas some de `Discovery` pela condição de "assinatura em dia" já existente acima. Isto é: a inadimplência afeta visibilidade, não o status formal do perfil (evita reprocessar verificação por um problema puramente financeiro).

### Regras de negócio
- Profissional pode ter quantos `Servico` quiser dentro do limite do seu plano (`Billing` define limites, se houver, por tier — ex: plano Free pode limitar número de serviços cadastrados).
- Edição de preço de um `Servico` não afeta agendamentos já confirmados com o preço anterior (preço é "congelado" no momento da confirmação — ver `Scheduling`).
- Alteração de modalidade de atendimento (ex: tirar opção domicílio) não cancela agendamentos futuros já confirmados nessa modalidade, mas bloqueia novos.

### Eventos de domínio publicados
- `PerfilProfissionalPublicado`, `ServicoCriado`, `ServicoAtualizado`, `ServicoDesativado`.
- `PerfilProfissionalPublicado` é disparado especificamente no momento da transição automática para `Ativo` descrita acima — não na criação do perfil, que pode existir em rascunho antes disso.

---

## 3. `Discovery` (Busca e Descoberta)

### Natureza do módulo
Read model — não possui agregados de negócio próprios, apenas uma projeção otimizada para leitura, reconstruída a partir de eventos de `ProfessionalCatalog`, `Reviews` e `Billing`.

### Regras de negócio
- Um perfil só entra no índice de busca quando recebe `PerfilProfissionalPublicado` **e** a assinatura está ativa. Se a assinatura vence (evento de `Billing`), o perfil é removido do índice até regularização — não é excluído, apenas invisível na busca.
- Ranking de resultados: distância é o critério primário quando a cliente não aplica outro filtro; quando há empate de distância, desempate por nota média (`Reviews`).
- Cálculo de distância usa o raio de atendimento do `Servico` (não da profissional em geral) — uma profissional pode aparecer para um serviço e não para outro, dependendo do raio configurado em cada um.
- Perfis com nota média abaixo de um limiar definido (a decidir) podem ser deprioritados no ranking, mas não removidos — evita punir profissional nova sem avaliações ainda.

### Eventos consumidos
- `PerfilProfissionalPublicado`, `ServicoAtualizado`, `AssinaturaVencida`, `AvaliacaoCriada`.

---

## 4. `Scheduling` (Agenda e Agendamento) — núcleo do domínio

### Entidades / Agregados
- **Agenda** — agregado raiz por profissional. Contém `JanelaDisponibilidade[]` e referências a `Agendamento[]`.
- **JanelaDisponibilidade** — intervalo de tempo em que a profissional está disponível (recorrente ou pontual), ou bloqueado (indisponibilidade pessoal).
- **Agendamento** — entidade transacional. Cliente, Profissional, Servico (com preço e duração congelados no momento da criação), modalidade (domicílio/salão), endereço (se domicílio), status (Solicitado, Confirmado, EmAndamento, Concluido, Cancelado, NoShow).

### Invariantes
- **Nunca pode existir dois `Agendamento` com status ativo (Solicitado/Confirmado/EmAndamento) que se sobreponham no tempo para a mesma profissional.** Esta é a invariante mais crítica do sistema — qualquer tentativa de criação que viole isso deve ser rejeitada de forma síncrona antes da confirmação.
- Um `Agendamento` só pode ser criado dentro de uma `JanelaDisponibilidade` aberta (não pode agendar em horário bloqueado).
- Preço e duração do `Servico` são copiados para o `Agendamento` no momento da criação (não são referência viva) — mudanças futuras de preço no catálogo não afetam agendamentos já feitos.
- Cancelamento fora da janela de cancelamento gratuito (regra a definir, ex: menos de 4h antes) muda o status para `Cancelado` mas gera uma cobrança de taxa (se sinal foi pago) — regra específica depende da decisão pendente do PRD (seção 11).

### Regras de negócio
- **Criação manual (recepção/profissional)** segue as mesmas invariantes de conflito de horário que a criação pelo app da cliente — não existe "bypass" para agendamento manual.
- **No-show:** se o `Agendamento` passa do horário confirmado sem check-in/confirmação de início, é marcado automaticamente como `NoShow` após um período de tolerância (a definir), distinto de `Cancelado` para fins de métrica e possível penalidade futura à cliente recorrente.
- Reagendamento é modelado como cancelamento do `Agendamento` original + criação de um novo, mantendo rastreabilidade (referência ao agendamento anterior), não como edição in-place do horário.
- Alteração de endereço de atendimento (domicílio) só é permitida antes da confirmação; após confirmado, requer cancelamento e novo agendamento.

### Eventos de domínio publicados
- `AgendamentoSolicitado`, `AgendamentoConfirmado`, `AgendamentoCancelado`, `AgendamentoConcluido`, `AgendamentoMarcadoComoNoShow`.

---

## 5. `ClientRecords` (Ficha Técnica de Clientes)

### Entidades / Agregados
- **FichaCliente** — agregado por par (Profissional, Cliente). Contém histórico de observações e preferências.
- **ConsentimentoLGPD** — registro de aceite da cliente para que a profissional armazene dados sobre ela, com data e escopo do consentimento (PRD seções 5.6 e 7).

### Invariantes
- Nenhum campo de `FichaCliente` pode ser criado ou editado sem um `ConsentimentoLGPD` válido e não revogado para aquela cliente.
- Revogação de consentimento pela cliente exige exclusão (ou anonimização) dos dados da `FichaCliente` correspondente, não apenas bloqueio de leitura.

### Regras de negócio
- A `FichaCliente` é populada apenas com informações inseridas manualmente pela profissional após um `Agendamento` concluído — não é preenchida automaticamente a partir de outros módulos, para manter o escopo do dado sob controle explícito.
- Dado armazenado aqui não é visível para outras profissionais — é escopado por par (Profissional, Cliente), nunca compartilhado entre profissionais diferentes.
- Exportação/portabilidade: cliente pode solicitar todos os dados de `FichaCliente` que qualquer profissional tenha sobre ela (direito LGPD), o que exige agregação entre múltiplos registros de `FichaCliente`.

### Eventos de domínio publicados
- `ConsentimentoConcedido`, `ConsentimentoRevogado`, `FichaClienteAtualizada`.

---

## 6. `Reviews` (Avaliações e Confiança)

### Entidades / Agregados
- **Avaliacao** — nota (1-5) e comentário, vinculada a um `AgendamentoId` concluído.
- **Denuncia** — sinalização de avaliação suspeita ou abusiva, com status (Pendente, Analisada, Removida, Mantida).

### Invariantes
- Uma `Avaliacao` só pode ser criada se existe um `Agendamento` correspondente com status `Concluido` — impossível avaliar sem ter passado pelo fluxo de agendamento real.
- Máximo de uma `Avaliacao` por `Agendamento` (não por par Cliente-Profissional — cada atendimento gera direito a uma avaliação própria).
- `Avaliacao` com `Denuncia` mantida como procedente é removida do cálculo de nota média, mas mantida no sistema para auditoria (soft removal).

### Regras de negócio
- Janela para avaliar após conclusão: a definir (ex: até 7 dias após `AgendamentoConcluido`), depois disso a avaliação não pode mais ser criada.
- Profissional pode responder publicamente a uma avaliação, mas não pode editá-la ou excluí-la.
- Nota média exibida no perfil é recalculada de forma assíncrona a cada nova `Avaliacao` ou remoção por denúncia procedente — consumida por `Discovery` como projeção, não como fonte de verdade.

### Eventos de domínio publicados
- `AvaliacaoCriada`, `DenunciaRegistrada`, `AvaliacaoRemovida`.

---

## 7. `Billing` (Assinatura e Planos)

### Entidades / Agregados
- **Assinatura** — agregado raiz por Profissional. Plano atual, status (TrialAtivo, Ativa, Inadimplente, Cancelada), data do próximo ciclo de cobrança.
- **Plano** — catálogo de planos disponíveis (Free/Starter/Pro/Business) com seus limites e preços.
- **Fatura** — registro de cada cobrança gerada, com status (Pendente, Paga, Falhou).

### Invariantes
- Uma `Assinatura` nunca fica sem `Plano` associado — mesmo o tier Free é um Plano formal, não a ausência de plano.
- Downgrade de plano não pode reduzir recursos já em uso de forma destrutiva (ex: se profissional tem 5 serviços cadastrados e faz downgrade para plano com limite de 3, os serviços excedentes ficam inativos, não são excluídos).
- `Fatura` com falha de pagamento move `Assinatura` para `Inadimplente` após N tentativas (a definir), o que dispara a remoção do perfil de `Discovery` (via evento) sem excluir dados.

### Regras de negócio
- Trial (Free/Trial do PRD) tem prazo definido e conversão automática para cobrança ao final, ou downgrade automático para tier gratuito permanente — decisão de produto pendente (qual dos dois modelos usar).
- Upgrade de plano tem efeito imediato; downgrade só entra em vigor no próximo ciclo de cobrança (evita usar recurso premium e "devolver" no meio do período pago).
- Cancelamento de assinatura mantém acesso até o fim do ciclo já pago, não é bloqueio imediato.

### Eventos de domínio publicados
- `AssinaturaIniciada`, `AssinaturaRenovada`, `AssinaturaVencida`, `PlanoAlterado`, `AssinaturaCancelada`.
- `PrimeiroPagamentoConfirmado` — disparado especificamente na primeira `Fatura` paga com sucesso de uma `Assinatura` (distinto de renovações subsequentes). É este evento, e não `AssinaturaIniciada`, que `ProfessionalCatalog` escuta para ativar automaticamente o perfil (ver seção 2) — `AssinaturaIniciada` pode ocorrer antes mesmo do pagamento ser confirmado (ex: início de trial), então não é o gatilho correto para ativação.

---

## 8. `Payments` (Pagamento do Serviço)

### Entidades / Agregados
- **Transacao** — vinculada a um `AgendamentoId`. Valor, método (PIX, Cartão, Presencial), status (Pendente, Confirmada, Estornada).

### Invariantes
- `Transacao` só é criada quando `Agendamento` está em status `Confirmado` ou posterior — não existe cobrança sem agendamento válido.
- Valor da `Transacao` deve corresponder exatamente ao preço congelado no `Agendamento` (nunca lido do catálogo atual).
- Estorno só é possível para `Transacao` com status `Confirmada`, e deve estar sempre associado a um motivo (cancelamento, disputa).

### Regras de negócio
- Pagamento "Presencial" ainda gera um registro de `Transacao` (para fins de métrica de faturamento no dashboard), apenas com status diferente de conciliação.
- Este módulo **não cobra taxa de intermediação** nesta fase (modelo SaaS puro definido no PRD) — o valor integral vai para a profissional; isso deve estar explícito para não ser confundido com `Billing` no futuro caso o modelo evolua para híbrido.

### Eventos de domínio publicados
- `TransacaoConfirmada`, `TransacaoEstornada`.

---

## 9. `Marketing` (Cupons e Campanhas)

### Entidades / Agregados
- **CupomFlash** — desconto vinculado a uma `JanelaDisponibilidade` ociosa específica. Percentual/valor de desconto, prazo de validade (curto, ex: poucas horas), status (Ativo, Expirado, Utilizado).

### Invariantes
- Um `CupomFlash` só pode ser criado para uma janela de tempo que ainda não tem `Agendamento` associado (não faz sentido dar desconto num horário já ocupado).
- Uso do cupom aplica o desconto ao `Agendamento` criado dentro daquela janela específica — não é um código genérico reutilizável em qualquer horário.
- `CupomFlash` expira automaticamente ao final do prazo definido, mesmo sem uso.

### Regras de negócio
- Desconto aplicado via `CupomFlash` reduz o preço congelado no `Agendamento`, mas o valor original do `Servico` no catálogo permanece inalterado.
- Profissional define o desconto dentro de limites configuráveis pelo `Plano` (ex: plano Starter pode ter limite menor de desconto máximo que Pro) — regra de negócio a refinar conforme estratégia comercial.

### Eventos de domínio publicados
- `CupomFlashCriado`, `CupomFlashUtilizado`, `CupomFlashExpirado`.

---

## 10. `Notifications` (Notificações)

### Natureza do módulo
Reativo — não possui agregados de negócio complexos, apenas orquestra envio com base em eventos de outros módulos.

### Regras de negócio
- Lembrete de 24h e 1h antes do `Agendamento` são dois envios distintos e independentes, agendados no momento em que `AgendamentoConfirmado` é publicado — não recalculados dinamicamente depois (se o agendamento for cancelado, os lembretes pendentes devem ser cancelados também).
- Canal de envio (Push vs WhatsApp) segue preferência da cliente, com fallback para o outro canal se o preferido falhar.
- Notificações de `Billing` (fatura vencendo, assinatura inadimplente) são direcionadas apenas à profissional, nunca à cliente.

### Eventos consumidos
- `AgendamentoConfirmado`, `AgendamentoCancelado`, `CupomFlashCriado`, `FaturaPendente` (de Billing).

---

## 11. `Analytics` (Dashboard de Ganhos)

### Natureza do módulo
Read model agregando `TransacaoConfirmada` e `AgendamentoConcluido` por profissional, por período (dia/semana/mês).

### Regras de negócio
- Faturamento exibido no dashboard reflete `Transacao` confirmadas, não `Agendamento` apenas solicitados ou confirmados sem pagamento registrado.
- Métrica de "clientes novas geradas" (KPI central do PRD, seção 7) é calculada contando `Agendamento` cujo Cliente não tinha nenhum `Agendamento Concluido` anterior com aquela mesma profissional — precisa de consulta cross-referenciando histórico, não apenas contagem simples.

### Eventos consumidos
- `AgendamentoConcluido`, `TransacaoConfirmada`, `TransacaoEstornada`.

---

## 12. `Admin` (Painel Administrativo)

### Entidades / Agregados
- **AdminUser** — conta interna do time do Bellô, distinta de Conta (Cliente/Profissional) em `Identity`. Papel/role (Owner, Suporte, Financeiro), status (Ativo, Inativo).
- **AcaoAdministrativa** — log de auditoria. Toda ação relevante (aprovar/rejeitar verificação, suspender conta, remover avaliação, alterar plano) gera um registro imutável: quem, quando, sobre qual entidade, motivo declarado.

### Invariantes
- Toda ação que altera `PerfilVerificacao.status`, `Conta.status` (suspensão) ou resolve uma `Denuncia` **deve** gerar um registro correspondente em `AcaoAdministrativa` — a ação e o log são atômicos (não existe uma sem a outra).
- Um `AdminUser` só pode executar ações permitidas pelo seu papel (ex: papel Suporte pode suspender conta, mas não pode alterar preço de `Plano` — isso é exclusivo de Financeiro/Owner).
- `AcaoAdministrativa` nunca é editável ou removível após criada (auditoria imutável).

### Regras de negócio
- A fila de verificação (PRD seção 6.1) deve priorizar por ordem de chegada (FIFO), com possibilidade de sinalizar casos urgentes/suspeitos para revisão prioritária.
- Rejeição de verificação exige motivo em texto livre ou categorizado (ex: "documento ilegível", "foto não corresponde"), visível para a profissional no reenvio.
- Dashboards de negócio (seção 6.4 do PRD) são consultas de leitura sobre os read models já existentes em `Analytics` e `Billing` — `Admin` não duplica cálculo de métricas, apenas consome.
- Gestão de planos (CRUD) em `Admin` escreve diretamente no agregado `Plano` de `Billing`, através do caso de uso exposto por aquele módulo — nunca por acesso direto a tabela.

### Eventos de domínio publicados
- `VerificacaoAprovada`, `VerificacaoRejeitada`, `ContaSuspensaPorAdmin`, `DenunciaResolvida`, `PlanoAlteradoPorAdmin`.
- Nota: `VerificacaoAprovada` dispara, via `Identity`, o mesmo `PerfilProfissionalAprovado` já descrito na seção 1 — `Admin` não substitui o evento de `Identity`, apenas é a origem da ação que o causa.

---

## 13. Pontos ainda em aberto (precisam de decisão de produto antes de virar regra travada)

- Prazo exato da janela de cancelamento gratuito e regra de cobrança de sinal (afeta `Scheduling` e `Payments`).
- Prazo de tolerância para marcar `NoShow` automaticamente.
- Se o Trial converte automaticamente em cobrança ou faz downgrade automático para Free permanente (`Billing`).
- Limiar de nota média que deprioriza um perfil em `Discovery`.
- Limites de desconto máximo por tier de plano em `CupomFlash`.
- Matriz exata de permissões por papel de `AdminUser` (o que cada papel pode ou não fazer em cada módulo).
