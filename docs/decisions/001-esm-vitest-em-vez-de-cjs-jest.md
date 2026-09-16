# ADR-001: ESM + Vitest em vez de CJS + Jest

**Data:** 2026-09-16
**Módulo(s) afetado(s):** Todos (configuração global do projeto)
**Status:** Aceita

## Contexto

A stack técnica original (`docs/Backend_Stack.md`) especificava Jest como framework de testes e CJS como sistema de módulos. Ao instalar o NestJS 12 (versão corrente em setembro de 2026), o framework mudou seu padrão oficial para **ESM (ES Modules) + Vitest**, descontinuando CJS + Jest como setup recomendado.

## Decisão

Adotar o padrão do NestJS 12: **ESM + Vitest** para todo o projeto.

## Alternativas consideradas

- **CJS + Jest (stack original):** Manteria coerência com o documento de stack, mas iria contra o padrão do próprio framework, dificultando uso de features ESM nativas e reduzindo compatibilidade com o ecossistema atualizado do NestJS 12.
- **ESM + Vitest (escolhido):** Padrão oficial do NestJS 12, API quase idêntica ao Jest (`describe`, `it`, `expect`, `beforeEach`, mocks), mais rápido, suporte nativo a ESM sem hacks de transformação.

## Consequências

- `docs/Backend_Stack.md` deve ser atualizado: onde se lê "Jest", deve-se ler "Vitest".
- Todas as skills que mencionam "Jest" devem considerar "Vitest" como equivalente — a API de testes é compatível.
- O `package.json` usa `"type": "module"` e imports com extensão `.js` (padrão ESM/NodeNext).
- Vitest configs ficam em `vitest.config.ts` e `vitest.config.e2e.ts` na raiz do projeto `api/`.

