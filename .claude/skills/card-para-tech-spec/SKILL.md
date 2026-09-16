---
name: card-para-tech-spec
description: Transforma um card do Jira do projeto Bellô (backlog SCRUM) em um tech spec técnico, mapeado para os bounded contexts corretos, com invariantes e eventos de domínio já identificados. Use sempre que o usuário pedir para "analisar um card", "gerar spec técnico", "destrinchar a task", referenciar uma chave do Jira (ex: SCRUM-123), ou pedir para entender o que uma task do backlog do Bellô exige antes de codificar. Não pule esta etapa para ir direto para código — mesmo cards que parecem simples podem tocar em invariantes cross-módulo não óbvias.
---

# Card → Tech Spec (Bellô)

## Quando usar
Sempre que houver um card do Jira (projeto SCRUM) do Bellô a ser preparado para desenvolvimento, antes de gerar tasks técnicas ou codificar. Esta é a primeira etapa do pipeline: `card-para-tech-spec` → `tech-spec-para-tasks` → `implementar-task` → `quality-gate`.

## Passo a passo

1. **Buscar o card no Jira** via Atlassian Rovo (`getJiraIssue` pela chave, ou `search`/`searchJiraIssuesUsingJql` se o usuário descrever o card sem a chave exata). Ler título, descrição, critérios de aceite e labels.

2. **Identificar o(s) bounded context(s) tocados.** Use este mapeamento de termos do domínio para módulo — se o card menciona mais de um termo de módulos diferentes, o card é cross-módulo:

   | Termo no card | Módulo |
   |---|---|
   | login, cadastro, OTP, verificação de identidade, suspensão de conta | `Identity` |
   | perfil da profissional, serviço, preço, portfólio, modalidade domicílio/salão | `ProfessionalCatalog` |
   | busca, home, filtro, ranking, categorias | `Discovery` |
   | agenda, agendamento, horário, disponibilidade, no-show, cancelamento | `Scheduling` |
   | ficha técnica, consentimento LGPD, observação de cliente | `ClientRecords` |
   | avaliação, nota, denúncia, moderação de review | `Reviews` |
   | plano, assinatura, trial, fatura, cobrança recorrente | `Billing` |
   | pagamento do serviço, PIX, cartão, transação | `Payments` |
   | cupom, cupom flash, campanha, desconto | `Marketing` |
   | notificação, push, WhatsApp, lembrete | `Notifications` |
   | dashboard de ganhos, faturamento, métrica de clientes novas | `Analytics` |
   | painel admin, aprovar/rejeitar verificação, ativar/desativar conta, gestão de planos | `Admin` |

3. **Ler o contexto necessário — nunca os documentos completos:**
   - `CLAUDE.md` (sempre, já está no contexto do projeto).
   - `docs/modules/<modulo>.md` de cada módulo identificado no passo 2. Se o card é cross-módulo, ler todos os envolvidos para mapear a dependência (síncrona ou via evento) entre eles.

4. **Checar "Pontos em aberto".** Se o card depende de algo listado na seção "Pontos em aberto" do(s) `docs/modules/<modulo>.md` correspondente(s) (ex: prazo de cancelamento, matriz de permissões de `AdminUser`), **não assuma um valor arbitrário** — sinalize isso explicitamente no tech spec, na seção "Decisões pendentes", e pergunte ao usuário antes de seguir se a task não puder ser especificada sem essa decisão.

5. **Montar o tech spec** no template abaixo.

6. **Opcional:** se o usuário pedir, adicionar o tech spec como comentário no próprio card via `addCommentToJiraIssue`.

## Template do tech spec

```markdown
# Tech Spec — [CHAVE-DO-CARD] [Título do card]

## Contexto
[1-2 frases resumindo o que o card pede, em termos de negócio]

## Módulo(s) afetado(s)
- [Módulo principal]
- [Módulos secundários, se cross-módulo]

## Entidades / Agregados envolvidos
- `NomeEntidade` — [o que muda nela]

## Invariantes aplicáveis
- [Invariante do docs/modules/*.md que esta task precisa respeitar, citada literalmente]

## Eventos de domínio
- Publica: `EventoX` (quando/por quê)
- Consome: `EventoY` (de qual módulo)

## Camadas impactadas
- Domain: [sim/não — o quê]
- Application: [sim/não — o quê]
- Infrastructure: [sim/não — o quê]
- Interface: [sim/não — o quê]

## Dependências entre módulos
- [Chamada síncrona necessária, se houver, e por quê exige consistência imediata]
- [Comunicação via evento, se houver]

## Decisões pendentes (bloqueiam ou não a implementação)
- [Item de "Pontos em aberto" que este card toca, se houver]

## Fora de escopo
- [O que este card explicitamente não cobre]
```

## Regras não-negociáveis a verificar antes de fechar o spec
- Nenhuma dependência cross-módulo pode virar "acesso direto a tabela" no spec — deve ser sempre via interface pública do módulo dono ou evento.
- Se o spec envolve `Scheduling` criando/alterando `Agendamento`, o spec deve mencionar explicitamente a invariante de não sobreposição de horário.
- Se envolve dado sensível de cliente (`ClientRecords`), o spec deve mencionar a exigência de `ConsentimentoLGPD`.
