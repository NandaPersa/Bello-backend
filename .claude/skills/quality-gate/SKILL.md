---
name: quality-gate
description: Revisa código já implementado do Bellô contra a arquitetura (fronteiras de módulo, camadas de Clean Architecture), cobertura de testes e pontos de performance específicos do domínio (busca geolocalizada, prevenção de double-booking). Use sempre antes de marcar uma task como concluída, antes de abrir um Pull Request, ou quando o usuário pedir para "revisar", "validar" ou "conferir" código do Bellô — mesmo que o código pareça correto à primeira vista, rode o checklist completo.
---

# Quality Gate (Bellô)

## Quando usar
Última etapa do pipeline (`card-para-tech-spec` → `tech-spec-para-tasks` → `implementar-task` → **`quality-gate`**). Roda sobre código já escrito, antes de fechar a task.

## Checklist de arquitetura

- [ ] **Nenhum import direto entre pastas de módulos diferentes.** Buscar por imports cruzando `src/<modulo-a>/` → `src/<modulo-b>/` fora de uma pasta de interface pública/facade.
- [ ] **Regra de dependência de camadas respeitada:** Domain não importa nada de Infrastructure/Interface/framework/ORM.
- [ ] **Rigor de camadas coerente com o módulo:** módulos de 4 camadas rígidas (`Scheduling`, `Billing`, `ProfessionalCatalog`, `ClientRecords`, `Reviews`) têm Interface separada; módulos enxutos (`Notifications`, `Discovery`, `Analytics`, `Marketing`) não precisam forçar essa separação.
- [ ] **Comunicação cross-módulo é só via evento ou interface pública**, nunca query direta na tabela/schema de outro módulo.

## Checklist de regras de negócio

- [ ] Transições de status sensíveis (`PerfilVerificacao`, suspensão de `Conta`, remoção de `Avaliacao`, alteração de `Plano`) só acontecem por ação de `AdminUser`, exceto a transição automática documentada de `PerfilProfissional` → `Ativo`.
- [ ] Toda ação administrativa relevante gera um registro em `AcaoAdministrativa` (atômico com a ação — não existe uma sem a outra).
- [ ] Valores congelados (`Agendamento.precoCongelado`, `Agendamento.duracaoCongeladaMinutos`, valor de `CupomFlash` aplicado) não são recalculados a partir do catálogo vivo depois de criados.
- [ ] Dado sensível de `ClientRecords` só é criado/editado com `ConsentimentoLGPD` válido e não revogado.

## Checklist de testes

- [ ] Domain tem teste de unidade sem mock cobrindo as invariantes tocadas pela task.
- [ ] Application tem teste de integração no caso de uso.
- [ ] Se a task tocou `Scheduling`: existe teste cobrindo a invariante de não sobreposição de horário (a mais crítica do sistema).
- [ ] Se a task tocou `Billing`: existe teste cobrindo upgrade/downgrade ou inadimplência conforme a regra específica tocada.

## Checklist de performance

- [ ] `Discovery`: busca geolocalizada usa `ST_DWithin` (PostGIS) com índice espacial, não filtro em memória.
- [ ] `Scheduling`: verificação de conflito de horário é síncrona e ocorre antes da confirmação — sem janela de corrida entre checagem e escrita.
- [ ] Nenhum N+1 ao montar listagens (card de profissional + serviços + nota média em `Discovery`, listagem de agendamentos em `Scheduling`).
- [ ] Operações que não podem travar a resposta HTTP (envio de WhatsApp/push em `Notifications`) estão na fila (BullMQ), não síncronas.

## Se algo falhar
Não corrija silenciosamente decisões de negócio — se o problema encontrado for uma regra mal aplicada, aponte a linha do `docs/modules/<modulo>.md` que está sendo violada antes de sugerir a correção. Se o problema for uma decisão que na verdade está em "Pontos em aberto" (ou seja, não há regra travada ainda), não trate como bug — sinalize como decisão pendente.
