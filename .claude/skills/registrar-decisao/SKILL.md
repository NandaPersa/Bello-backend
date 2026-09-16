---
name: registrar-decisao
description: Registra uma decisão de arquitetura ou de produto do Bellô como um ADR (Architecture Decision Record) curto, e atualiza o docs/modules/ correspondente removendo o item de "Pontos em aberto" que foi resolvido. Use sempre que o usuário decidir algo que hoje está listado como pendente (ex: escolher entre Mercado Pago e Pagar.me, definir o prazo de cancelamento gratuito, definir a matriz de permissões do Admin), ou quando pedir explicitamente para "registrar uma decisão" ou "criar um ADR".
---

# Registrar Decisão (Bellô)

## Quando usar
Fora do fluxo linear das outras 4 skills — roda sempre que uma decisão pendente (das seções "Pontos em aberto" dos `docs/modules/*.md`, ou da seção 12 do PRD) é tomada durante o desenvolvimento. Evita que a mesma decisão seja tomada de formas diferentes em tasks diferentes, ou esquecida e reaberta depois.

## Passo a passo

1. **Identificar qual item de "Pontos em aberto"** (em `docs/modules/<modulo>.md`) ou "Abertos para Decisão" (no PRD) está sendo resolvido.

2. **Gerar o ADR** no formato abaixo, salvo em `docs/decisoes/NNN-titulo-curto.md` (`NNN` = próximo número sequencial disponível na pasta).

```markdown
# ADR-NNN: [Título curto da decisão]

**Data:** [data]
**Módulo(s) afetado(s):** [nome]
**Status:** Aceita

## Contexto
[O que estava em aberto e por que precisava ser decidido agora]

## Decisão
[O que foi decidido, de forma direta]

## Alternativas consideradas
- [Alternativa A] — [por que não foi escolhida]
- [Alternativa B] — [por que não foi escolhida]

## Consequências
- [O que muda no código/regra de negócio a partir de agora]
- [Se algum `docs/modules/*.md` precisa ser atualizado além da remoção do item em aberto]
```

3. **Atualizar o `docs/modules/<modulo>.md` correspondente:**
   - Remover o item resolvido da seção "Pontos em aberto".
   - Se a decisão virou uma regra nova (ex: "cancelamento gratuito até 4h antes"), adicionar essa regra na seção "Regras de negócio" ou "Invariantes" do mesmo arquivo, com uma nota apontando para o ADR (`ver ADR-NNN`).

4. **Não implementar código nesta skill.** Registrar a decisão é o que destrava as skills `implementar-task`/`quality-gate` a tratarem o item como regra travada em vez de pendência — a implementação em si segue o pipeline normal.
