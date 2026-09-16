# ProfessionalCatalog (Catálogo de Profissionais)

**Rigor de camadas:** 4 camadas rígidas (Domain, Application, Infrastructure, Interface).

## Responsabilidade
Perfil público da profissional, portfólio de fotos, lista de serviços e preços, modalidade de atendimento (domicílio/salão/ambos) por serviço. Consome dados de `Identity` via referência de ID, nunca acesso direto a tabelas de outro módulo.

## Entidades / Agregados

**`PerfilProfissional`** (Aggregate Root)
- `id: UUID`
- `contaId: UUID` (referência a `Identity.Conta`, nunca join direto)
- `nomeExibicao: string`
- `bio: string | null`
- `cidadeBase: string`
- `status: enum {EmRevisao, Ativo, Inativo}`
- `criadoEm: timestamp`
- Comportamentos: `ativar()` (chamado internamente pela regra de dupla condição, ver abaixo), `desativar()`, `atualizarBio(texto)`

**`Servico`** (Entity, filha de `PerfilProfissional`)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `nome: string`
- `categoria: enum` (Manicure, Cabelo, Estetica, Maquiagem, Sobrancelha)
- `preco: decimal`
- `duracaoMinutos: int`
- `modalidade: enum {Domicilio, Salao, Ambos}`
- `raioAtendimentoKm: decimal | null` — obrigatório se `modalidade != Salao`
- `status: enum {Ativo, Inativo}`
- Comportamentos: `atualizarPreco(valor)`, `desativar()`

**`FotoPortfolio`** (Entity, filha de `PerfilProfissional`, opcionalmente vinculada a um `Servico`)
- `id: UUID`
- `perfilProfissionalId: UUID`
- `servicoId: UUID | null`
- `url: string`
- `ordem: int`

## Invariantes
- Um `Servico` com modalidade `Domicilio` ou `Ambos` **exige** raio de atendimento definido (não pode ser nulo).
- Preço de `Servico` não pode ser negativo nem zero (serviço gratuito é tratado via `Marketing`, não alterando o preço base).
- Um `PerfilProfissional` só aparece em `Discovery` se `status = Ativo` **e** a `Conta` vinculada está `Ativa` em `Identity` **e** a assinatura em `Billing` está em dia (regra cross-módulo, resolvida via evento, não via query direta).
- **`PerfilProfissional.status` só transiciona para `Ativo` quando `PerfilVerificacao.status = Aprovado` (evento `PerfilProfissionalAprovado` de `Identity`) E existe ao menos um pagamento de assinatura confirmado (evento `PrimeiroPagamentoConfirmado` de `Billing`).** As duas condições podem ocorrer em qualquer ordem — `ProfessionalCatalog` mantém estado interno de "pendências de ativação" e só publica a transição quando a segunda condição chega. **Este é o único caso do sistema em que uma transição de status é automática**, e só porque já depende de uma aprovação manual anterior (verificação) como pré-requisito.
- Se o pagamento falhar ou a assinatura ficar `Inadimplente` após já estar `Ativo`, o status **não volta** para `EmRevisao` — permanece `Ativo`, mas some de `Discovery` pela condição de "assinatura em dia". A inadimplência afeta visibilidade, não o status formal do perfil.

## Regras de negócio
- Profissional pode ter quantos `Servico` quiser dentro do limite do seu plano (`Billing` define limites por tier).
- Edição de preço de um `Servico` não afeta agendamentos já confirmados com o preço anterior (preço é "congelado" na confirmação — ver `Scheduling`).
- Alteração de modalidade de atendimento (ex: tirar opção domicílio) não cancela agendamentos futuros já confirmados nessa modalidade, mas bloqueia novos.

## Eventos de domínio
**Publicados:** `PerfilProfissionalPublicado` (disparado especificamente na transição automática para `Ativo`, não na criação do perfil, que pode existir em rascunho antes), `ServicoCriado`, `ServicoAtualizado`, `ServicoDesativado`.

**Consumidos:** `PerfilProfissionalAprovado` (de `Identity`), `PrimeiroPagamentoConfirmado` (de `Billing`).

## Dependências
- Lê `Identity` só por referência de ID (`contaId`), nunca join direto.
- Alimenta `Discovery` via eventos (`Discovery` não faz query direta neste módulo).
