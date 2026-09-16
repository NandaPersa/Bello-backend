# Discovery (Busca e Descoberta)

**Rigor de camadas:** versão enxuta (Domain + Application + Infrastructure, sem separação forte de Interface) — módulo majoritariamente reativo.

## Responsabilidade
Tela Home estilo iFood: busca geolocalizada, filtros, categorias, ranking de resultados. **Read model** — não possui agregados de negócio próprios, apenas uma projeção otimizada (desnormalizada) construída a partir de eventos de `ProfessionalCatalog`, `Reviews` e `Billing`. Isso evita que buscas pesadas concorram com escritas transacionais de agenda/cadastro.

## Entidades / Projeções

**`PerfilIndexado`** (projeção, reconstruída via upsert a cada evento relevante)
- `perfilProfissionalId: UUID`
- `nomeExibicao: string`
- `fotoCapaUrl: string`
- `categoriasOferecidas: enum[]`
- `notaMedia: decimal`
- `faixaPreco: {min: decimal, max: decimal}`
- `localizacao: {lat: decimal, lng: decimal}`
- `modalidadesDisponiveis: enum[]`
- Não expõe "comportamentos" de domínio — é reconstruída a cada evento consumido.

## Regras de negócio
- Um perfil só entra no índice de busca quando recebe `PerfilProfissionalPublicado` **e** a assinatura está ativa. Se a assinatura vence, o perfil é removido do índice até regularização — não é excluído, apenas invisível na busca.
- Ranking: distância é o critério primário quando não há outro filtro; empate de distância é desempatado por nota média (`Reviews`).
- Cálculo de distância usa o raio de atendimento do `Servico` (não da profissional em geral) — uma profissional pode aparecer para um serviço e não para outro, dependendo do raio configurado em cada um.
- Perfis com nota média abaixo de um limiar (a decidir) podem ser deprioritados no ranking, mas não removidos — evita punir profissional nova sem avaliações ainda.

## Eventos de domínio
**Consumidos:** `PerfilProfissionalPublicado`, `ServicoAtualizado` (de `ProfessionalCatalog`), `AssinaturaVencida` (de `Billing`), `AvaliacaoCriada` (de `Reviews`).

## Performance
- Busca geolocalizada via PostGIS (`ST_DWithin`), com índice espacial — sem exigir serviço de busca separado no MVP.
- Cache (Redis) do read model para evitar recalcular busca geolocalizada a cada requisição.

## Dependências
- Nunca acessa tabelas de `ProfessionalCatalog`, `Reviews` ou `Billing` diretamente — só consome os eventos publicados por eles.
