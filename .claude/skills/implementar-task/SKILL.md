---
name: implementar-task
description: Implementa uma task técnica do projeto Bellô (backend NestJS) respeitando a arquitetura de Monolito Modular + DDD + Clean Architecture, as regras de negócio do módulo tocado e os padrões de teste do projeto. Use sempre que o usuário pedir para codificar, implementar, ou escrever o código de uma task técnica do Bellô — mesmo que a task pareça pequena ou óbvia. Nunca escreva código de domínio para o Bellô sem antes consultar o docs/modules/ do módulo tocado por esta skill.
---

# Implementar Task (Bellô)

## Quando usar
Terceira etapa do pipeline (`card-para-tech-spec` → `tech-spec-para-tasks` → **`implementar-task`** → `quality-gate`). Usada task a task, não para uma feature inteira de uma vez.

## Passo a passo

1. **Ler antes de escrever qualquer código:**
   - `CLAUDE.md` (stack, regra de dependência de camadas, convenção de nomenclatura em português).
   - `docs/modules/<modulo>.md` do módulo da task — entidades, invariantes e regras de negócio exatas.
   - Se a task depende de outro módulo, ler também o `docs/modules/<modulo-dependente>.md` para saber se a integração é síncrona (via interface pública) ou por evento.

2. **Identificar a camada e aplicar o rigor correto:**
   - `Scheduling`, `Billing`, `ProfessionalCatalog`, `ClientRecords`, `Reviews` → 4 camadas rígidas (Domain, Application, Infrastructure, Interface).
   - `Notifications`, `Discovery`, `Analytics`, `Marketing` → versão enxuta (Domain + Application + Infrastructure, sem Interface separada).

3. **Regras de código não-negociáveis:**
   - **Nenhum import direto entre pastas de módulos diferentes.** Se a task precisa de dado de outro módulo, use a interface pública (facade/serviço de aplicação) exposta por aquele módulo, ou consuma um evento.
   - Domain não importa nada de framework, HTTP ou ORM.
   - Nomenclatura de domínio em português, igual aos documentos-fonte (`Conta`, `Agendamento`, `PerfilProfissional`, etc.) — não traduzir para inglês.
   - Onde a regra de negócio exigir "congelamento" de dado (preço e duração em `Agendamento`, valor de `CupomFlash` aplicado), copiar o valor no momento da criação — nunca referenciar o valor vivo do catálogo.
   - Transições de status sensíveis (verificação, suspensão, moderação de avaliação) só podem ser chamadas a partir de um caso de uso de `Admin` — não exponha esses métodos para chamada direta de outro fluxo, exceto a única transição automática documentada (`PerfilProfissional` → `Ativo`).

4. **Escrever os testes junto com o código, não depois:**
   - Domain: teste de unidade, sem mock (são regras puras).
   - Application: teste de integração no caso de uso.
   - Priorize cobertura completa em `Scheduling` (conflito de horário) e `Billing` (regras de cobrança) — são os módulos com testes mais rígidos do projeto.

5. **Se a task esbarrar em algo listado em "Pontos em aberto"** do `docs/modules/<modulo>.md` e o tech spec não resolveu isso, **pare e sinalize** ao usuário em vez de assumir um valor arbitrário (ex: não invente um prazo de cancelamento se ele ainda não foi decidido).

6. **Antes de considerar a task concluída**, rode mentalmente (ou peça para rodar) a skill `quality-gate` — `implementar-task` não substitui essa revisão.

## Checklist rápido antes de finalizar
- [ ] Import entre módulos: nenhum direto, só via interface pública ou evento.
- [ ] Camada correta para o rigor do módulo.
- [ ] Nomenclatura de domínio em português.
- [ ] Testes escritos (Domain sem mock / Application integração).
- [ ] Preço/duração/valor congelado onde a regra exige.
- [ ] Nenhuma decisão pendente foi assumida sem sinalizar.
