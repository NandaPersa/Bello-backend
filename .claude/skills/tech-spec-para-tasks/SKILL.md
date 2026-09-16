---
name: tech-spec-para-tasks
description: Quebra um tech spec do projeto Bellô em tasks técnicas granulares, sequenciadas por camada de Clean Architecture (Domain → Application → Infrastructure → Interface → testes) e por dependência entre módulos. Use sempre que já existir um tech spec (gerado pela skill card-para-tech-spec) e for hora de planejar a implementação, ou quando o usuário pedir para "quebrar em tasks", "criar subtasks", "planejar a implementação" de uma feature do Bellô. Não gere código nesta etapa — apenas o plano de tasks.
---

# Tech Spec → Tasks (Bellô)

## Quando usar
Segunda etapa do pipeline (`card-para-tech-spec` → **`tech-spec-para-tasks`** → `implementar-task` → `quality-gate`). Pressupõe que um tech spec já existe (no formato gerado por `card-para-tech-spec`).

## Passo a passo

1. **Ler o tech spec** e identificar módulo(s) e camadas impactadas.

2. **Gerar uma task por camada realmente afetada**, na ordem de dependência:
   1. Domain (entidades, value objects, regras puras) — sempre a base, mesmo em módulos de camadas enxutas.
   2. Application (casos de uso, ports/interfaces).
   3. Infrastructure (implementação dos ports: repositório Prisma, integração externa).
   4. Interface (controller, DTO, validação) — só se o módulo tem essa camada separada (ver rigor de camadas no `docs/modules/<modulo>.md` — módulos enxutos como `Notifications`, `Discovery`, `Analytics`, `Marketing` não separam Interface).
   5. Testes — **não é uma task à parte no final**; cada task de Domain/Application já inclui seus testes (unidade sem mock no Domain, integração no Application).

3. **Se o spec é cross-módulo**, criar uma task explícita para a integração (evento publicado/consumido ou chamada síncrona via interface pública) — nunca deixar implícito "o módulo B vai ler direto do módulo A".

4. **Formato de cada task**, seguindo o padrão já usado no backlog do Bellô (história de usuário + Dado/Quando/Então):

```markdown
### [Camada] — [Nome curto da task]

**Como** [profissional/cliente/sistema], **quero** [ação técnica], **para** [motivo ligado ao spec].

**Critérios de aceite:**
- Dado [contexto], quando [ação], então [resultado esperado].

**Módulo:** [nome]
**Depende de:** [task anterior, se houver]
**Definição de pronto:** código + teste passando + sem import direto entre módulos + revisado pelo quality-gate.
```

5. **Opcional:** se o usuário pedir, criar as subtasks diretamente no Jira via Atlassian Rovo (`createJiraIssue` com tipo Subtask, linkado ao card pai via `createIssueLink` ou campo de parent).

## Regra de ordenação
Nunca colocar uma task de Infrastructure ou Interface antes da task de Domain correspondente — a regra de dependência de camadas (externas dependem das internas) vale também para a ordem de execução, não só para o código.
