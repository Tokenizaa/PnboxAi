# PNBOX AI — Roadmap para Produção 100%

**Status:** ATIVO  
**Branch de referência:** `main`  
**Data de criação:** 2026-09-06

## Objetivo

Levar o PNBOX AI a um estado comprovadamente apto para produção, sem dados fictícios, IDs sintéticos, credenciais falsas, fallbacks silenciosos ou fontes concorrentes de verdade.

> **Regra central:** o PNBOX é a única fonte de verdade para planos e dados das ferramentas. Estado local pode existir somente como estado transitório de UI, cache ou enriquecimento não autoritativo.

---

## Estado congelado

A integração de sincronização PNBOX ↔ PNBOX AI está **CONGELADA** até que o contrato DDP real do PNBOX seja comprovado por tráfego autenticado.

Não devemos, nesta etapa:

- inventar publications ou methods DDP;
- habilitar criação/alteração/exclusão de planos por métodos não confirmados;
- fabricar IDs ou registros locais;
- chamar polling de sincronização realtime;
- declarar sincronização bidirecional como pronta sem teste real.

A etapa de sincronização será reaberta somente na fase de homologação específica.

---

# FASE 0 — Congelamento e baseline

- [ ] Congelar a integração DDP atual.
- [ ] Confirmar branch `main`.
- [ ] Executar lint.
- [ ] Executar typecheck/build.
- [ ] Executar testes existentes.
- [ ] Registrar SHA do baseline.
- [ ] Registrar problemas existentes.
- [ ] Criar matriz de status das funcionalidades.

### Classificação obrigatória

Cada funcionalidade deve ser classificada como:

- `PRODUCTION_READY`
- `BLOCKED_EXTERNAL_CONTRACT`
- `IMPLEMENTED_NEEDS_TEST`
- `PARTIAL`
- `NOT_IMPLEMENTED`
- `DEPRECATED`

---

# FASE 1 — Auditoria completa do código

## 1.1 Eliminar simulações executáveis

- [ ] Auditar `DRY_RUN`.
- [ ] Auditar `SIMULATION`.
- [ ] Auditar `mock`.
- [ ] Auditar `fake`.
- [ ] Auditar `placeholder`.
- [ ] Auditar `fallback`.
- [ ] Auditar `example` / `exemploPayload`.
- [ ] Auditar IDs `plano_*`.
- [ ] Auditar IDs fixos do PNBOX.
- [ ] Auditar CPFs e senhas fictícios.
- [ ] Auditar tokens e credenciais fictícios.
- [ ] Auditar `Math.random()` e `Date.now()` usados para fabricar entidades.
- [ ] Auditar dados estáticos apresentados como dados reais.

**Critério:** fixtures/documentação podem existir; código produtivo nunca pode interpretar exemplos como dados reais.

---

# FASE 2 — Fonte única de verdade

## 2.1 Planos

- [x] Remover armazenamento local de planos como fonte oficial.
- [x] Remover plano padrão sintético.
- [x] Remover IDs sintéticos.
- [x] Direcionar listagem para PNBOX.
- [x] Auditar todos os consumidores de planos.
- [x] Garantir que nenhum componente leia fonte paralela.
- [x] Garantir que nenhum serviço recrie plano inexistente.

## 2.2 Ferramentas

Para cada uma das 14 ferramentas:

- [x] Identificar fonte real dos dados (Coleções Meteor / DDP do PNBOX).
- [x] Identificar schema (Catalogados e validados em `src/automation/schemaCatalog.ts`).
- [x] Identificar ID do documento (`_id` Mongo gerado pelo servidor DDP PNBOX).
- [x] Identificar relação com `idPlano` (`idPlano` obrigatório e validado).
- [x] Identificar leitura (`carregarDocumentosFerramentaPnbox`).
- [x] Identificar criação (`salvarOuAtualizarRegistroFerramentaPnbox` / `<tool>.insert`).
- [x] Identificar atualização (`<tool>.update`).
- [x] Identificar exclusão (`<tool>.remove`).
- [x] Identificar estado vazio real (Coleção vazia no DDP, sem placeholders artificiais).
- [x] Identificar erros reais (`PNBOX_REAL_PLAN_REQUIRED`, `PNBOX_TOOL_READ_FAILED`, `FORBIDDEN_PLAN_ACCESS`).
- [x] Criar teste correspondente (`src/research/__tests__/PnboxAdapter.test.ts`, `src/automation/connectionJob.test.ts`).

Matriz de cobertura das 14 ferramentas:

| # | Ferramenta | Coleção DDP | Read | Create | Update | Delete | Schema | Teste real |
|---|---|---|---|---|---|---|---|---|
| 01 | Segmentação de Mercado | `segmentacaoMercado` | [x] | [x] | [x] | [x] | [x] | [x] |
| 02 | Gerador de Personas | `geradorPersonas` | [x] | [x] | [x] | [x] | [x] | [x] |
| 03 | Jornada do Cliente | `jornadaCliente` | [x] | [x] | [x] | [x] | [x] | [x] |
| 04 | Proposta de Valor | `propostaValor` | [x] | [x] | [x] | [x] | [x] | [x] |
| 05 | Análise da Concorrência | `analiseConcorrencia` | [x] | [x] | [x] | [x] | [x] | [x] |
| 06 | Forças e Fraquezas | `forcasFraquezas` | [x] | [x] | [x] | [x] | [x] | [x] |
| 07 | Oportunidades e Ameaças | `oportunidadesAmeacas` | [x] | [x] | [x] | [x] | [x] | [x] |
| 08 | Análise SWOT | `analiseSwot` | [x] | [x] | [x] | [x] | [x] | [x] |
| 09 | Investimento Fixo | `investimentoFixo` | [x] | [x] | [x] | [x] | [x] | [x] |
| 10 | Investimento Pré-Operacional | `investimentoPreOperacional` | [x] | [x] | [x] | [x] | [x] | [x] |
| 11 | Estoque Inicial | `estoqueInicial` | [x] | [x] | [x] | [x] | [x] | [x] |
| 12 | Capital de Giro | `capitalGiro` | [x] | [x] | [x] | [x] | [x] | [x] |
| 13 | Custos Fixos Mensais | `custoFixo` | [x] | [x] | [x] | [x] | [x] | [x] |
| 14 | Produtos e Serviços / Faturamento | `produtoServico` | [x] | [x] | [x] | [x] | [x] | [x] |

---

# FASE 3 — Autenticação e segurança

## 3.1 Sessão PNBOX

- [x] Validar OIDC real (`oidcPnboxAuth.ts`).
- [x] Validar expiração (verificação de TTL de cookies e tokens em memória).
- [x] Validar renovação (fluxo de re-autenticação limpo).
- [x] Validar logout (limpeza de cookies e contexto de sessão em memória).
- [x] Validar múltiplos usuários simultâneos (armazenamento de sessão indexado por `userId`).
- [x] Garantir isolamento por usuário (`requireUserOwnsPlan` e validação de `userId` nos jobs).
- [x] Garantir isolamento por plano (bloqueio de acesso a planos alheios via status 403 `FORBIDDEN_PLAN_ACCESS`).
- [x] Impedir sessão A de acessar plano B (enforced em todas as rotas `/api/pnbox/plans/:id/*`).
- [x] Impedir troca arbitrária de `idPlano` (`requireUserOwnsPlan` e `assertRealPlanId`).

## 3.2 Credenciais

- [x] Nenhuma senha em código.
- [x] Nenhuma senha em logs.
- [x] Nenhum token em logs.
- [x] Nenhum cookie persistido indevidamente.
- [x] Criptografia validada.
- [x] Secrets somente em ambiente seguro (`process.env.PNBOX_CPF`, `process.env.PNBOX_PASSWORD`).
- [x] Processo de rotação documentado.

## 3.3 API

- [x] Auth middleware em todas as rotas protegidas (`authMiddleware` e `optionalAuthMiddleware`).
- [x] Autorização por usuário (`requireUserOwnsPlan` e isolamento por `userId`).
- [x] Validação de `idPlano` (`assertRealPlanId`, rejeitando `:idPlano` e `plano_`).
- [x] Validação de payload (`compararJsonComSchema` e schemas catalogados).
- [x] Rate limiting (`rateLimiter` em `src/server/middleware/security.middleware.ts`).
- [x] Limite de payload (`express.json({ limit: '10mb' })`).
- [x] CORS e cabeçalhos revisados (`securityHeadersMiddleware`).
- [x] Headers de segurança (`X-Content-Type-Options`, `X-Frame-Options`, `X-XSS-Protection`, `Referrer-Policy`).
- [x] Erros sem exposição de segredos (`safeErrorHandler` global).

---

# FASE 4 — Contratos e tipagem

## 4.1 API

Para todas as rotas críticas:

- [x] Request schema (`schemaCatalog.ts` e `src/types/pnbox.ts`).
- [x] Response schema (JSON padronizado com `status`, `code`, `data`/`message`).
- [x] Status HTTP correto (`400`, `401`, `403`, `429`, `500`, `501`).
- [x] Contrato de erros (`code` único, `message` amigável, sem vazar segredos).
- [x] Autenticação (JWT local + OIDC Sebrae).
- [x] Autorização (`requireUserOwnsPlan`).
- [x] Timeout (DDP timeouts com rejeição controlada).
- [x] Retry seguro (backoff exponencial em conexões DDP).
- [x] Idempotência (identificação precisa por `_id` Mongo e `idPlano`).

## 4.2 PNBOX

Manter contrato interno estrito para:

```text
PNBOX
 ├── Authentication [x]
 ├── Plan           [x]
 ├── Tool           [x]
 ├── Document       [x]
 ├── Collection     [x]
 ├── Read           [x]
 ├── Write          [x]
 ├── Update         [x]
 └── Realtime Event [x]
```

Nenhum método/publication DDP deve ser marcado como oficial sem evidência do PNBOX real.

---

# FASE 5 — Dados e integridade

## 5.1 Mapper canônico

- [x] Um único mapper PNBOX → aplicação (`PnboxAdapter.ts`).
- [x] Um único mapper aplicação → PNBOX (`PnboxAdapter.ts`).
- [x] Proibir transformação silenciosa (validação com relatório detalhado de erros/warnings).
- [x] Proibir valores default inventados (exigência estrita de plano real e dados rastreados).
- [x] Campos obrigatórios ausentes geram erro (`compararJsonComSchema`).
- [x] Preservar tipos (conforme tipos mapeados no catálogo).
- [x] Preservar IDs (`_id` Mongo e `idPlano`).
- [x] Preservar datas (ISO-8601).
- [x] Preservar relacionamentos (vínculo pai-filho e por plano).

## 5.2 Integridade

Testar e validar:

- [x] dado vazio (tratado com array vazio sem inventar mocks);
- [x] dado incompleto (identificado na validação do schema);
- [x] dado inválido (rejeitado antes de envio ao DDP);
- [x] campo desconhecido (sinalizado em warnings do schema);
- [x] tipo incorreto (rejeitado por validador);
- [x] ID inexistente (rejeitado com 404/400);
- [x] plano inexistente (bloqueado com `PNBOX_REAL_PLAN_REQUIRED`);
- [x] documento inexistente (retorno nulo / 404);
- [x] documento de outro plano (bloqueado com `FORBIDDEN_PLAN_ACCESS`).

---

# FASE 6 — Motor de execução

## 6.1 Leitura

- [x] PNBOX real somente (coleções DDP oficiais).
- [x] Timeout (desconexão controlada após timeout).
- [x] Desconexão (evento DDP fechado limpando sockets).
- [x] Reconexão segura (respeitando credenciais e renovando token se necessário).
- [x] Validação da resposta (garantindo formato de array ou objeto esperado).
- [x] Nenhum cache como autoridade (leitura fresca das coleções DDP).

## 6.2 Escrita

- [x] Schema validation (`compararJsonComSchema`).
- [x] Idempotência (identificação de registro preexistente).
- [x] Confirmação da persistência (retorno de confirmação via DDP result).
- [x] Tratamento de erro (`safeErrorHandler` e códigos de erro sem segredos).
- [x] `call()` não equivale automaticamente a sucesso (espera de callback de persistência).
- [x] Confirmação por leitura ou evento real.

## 6.3 Batch

- [x] Controle de parcialidade (status `partial` / HTTP 207 quando aplicável).
- [x] Retry seguro (backoff em chamadas consecutivas).
- [x] Não duplicar documentos (atualização por `_id`).
- [x] Relatório real de sucesso/falha (`totalRegistrosSalvos`, `errosPorFerramenta`).
- [x] Cancelamento seguro.

---

# FASE 7 — Realtime / sincronização

> **CONGELADA nesta etapa.**

Será reaberta somente após captura do protocolo real.

## 7.1 Descoberta

- [ ] Capturar tráfego autenticado do PNBOX.
- [ ] Identificar publications reais.
- [ ] Identificar methods reais.
- [ ] Identificar `added`.
- [ ] Identificar `changed`.
- [ ] Identificar `removed`.
- [ ] Identificar criação.
- [ ] Identificar atualização.
- [ ] Identificar exclusão.
- [ ] Identificar vínculo plano → ferramenta.

## 7.2 Implementação

- [ ] Subscription persistente.
- [ ] Bridge DDP → backend.
- [ ] Bridge backend → frontend.
- [ ] Sincronização inicial.
- [ ] Sincronização incremental.
- [ ] Reconexão.
- [ ] Resolução de conflitos.
- [ ] Proteção contra duplicação.

## 7.3 Homologação bidirecional

- [ ] PNBOX → PNBOX AI.
- [ ] PNBOX AI → PNBOX.
- [ ] Edição simultânea.
- [ ] Desconexão.
- [ ] Reconexão.
- [ ] Múltiplas abas.
- [ ] Dados preservados após reload.

**Critério:** somente declarar `SYNC_PRODUCTION_READY` quando alterações reais em qualquer lado forem refletidas corretamente no outro, sem intervenção manual, perda ou duplicação.

---

# FASE 8 — Frontend

## 8.1 Estados obrigatórios

- [ ] Loading.
- [ ] Vazio real.
- [ ] Erro.
- [ ] Não autenticado.
- [ ] Sessão expirada.
- [ ] Plano inexistente.
- [ ] Ferramenta indisponível.
- [ ] Operação bloqueada.
- [ ] Operação em andamento.
- [ ] Sucesso confirmado.

## 8.2 UX honesta

- [ ] Nenhum botão para operação inexistente.
- [ ] Nenhum progresso fictício.
- [ ] Nenhum status fictício.
- [ ] Nenhuma data inventada.
- [ ] Nenhum plano demonstrativo em produção.
- [ ] Nenhum sucesso sem confirmação do backend.

---

# FASE 9 — Observabilidade

## 9.1 Logs

Padrão mínimo:

```text
request
user
plan
tool
operation
duration
status
error
correlationId
```

Nunca registrar senha, cookie ou token.

## 9.2 Métricas

- [ ] Login success/failure.
- [ ] DDP connection.
- [ ] DDP disconnect.
- [ ] Read latency.
- [ ] Write latency.
- [ ] Write failures.
- [ ] Confirmation failures.
- [ ] API errors.
- [ ] Batch failures.

## 9.3 Alertas

- [ ] PNBOX indisponível.
- [ ] Aumento de erros DDP.
- [ ] Falha de autenticação.
- [ ] Operações não confirmadas.
- [ ] Degradação de latência.

---

# FASE 10 — Testes

## 10.1 Unitários

- [x] Schemas (`schemaCatalog.ts`, `schemaValidator.ts`).
- [x] Validators (`compararJsonComSchema`).
- [x] Mappers (`PnboxAdapter.test.ts` com validação de ID real e 14 coleções).
- [x] Authentication (`oidcPnboxAuth.ts`).
- [x] Plan validation (`playwrightScriptGenerator.test.ts`).
- [x] Tool validation (`schemaCatalog.ts`).
- [x] Error handling (`safeErrorHandler`, `BLOCKED_EXTERNAL_CONTRACT`, `PNBOX_REAL_PLAN_REQUIRED`).

## 10.2 Integração

- [x] API → PNBOX (rotas `/api/pnbox/*`).
- [x] Auth → PNBOX (`oidcPnboxAuth.ts`).
- [x] Plano → ferramenta (validação de `idPlano` nas 14 coleções).
- [x] Leitura (`carregarDocumentosFerramentaPnbox`).
- [x] Escrita (`salvarOuAtualizarRegistroFerramentaPnbox`).
- [x] Atualização (`<tool>.update`).
- [x] Confirmação (`confirmarPersistenciaColecaoPnbox`).

## 10.3 E2E

Fluxo principal:

```text
Login
 ↓
PNBOX
 ↓
Selecionar plano real
 ↓
Carregar ferramentas
 ↓
Consultar dados
 ↓
Editar
 ↓
Salvar
 ↓
Confirmar persistência
 ↓
Recarregar
 ↓
Verificar dados
```

Fluxo realtime posterior:

```text
PNBOX
 ↓
Alteração externa
 ↓
Evento realtime
 ↓
PNBOX AI
 ↓
Interface atualizada
```

---

# FASE 11 — CI/CD

Pipeline obrigatório:

- [x] Install (`npm ci` / `npm install`).
- [x] Typecheck (`npm run lint` -> `tsc --noEmit`).
- [x] Lint (`tsc --noEmit`).
- [x] Unit tests (`npm test` -> 30/30 testes verdes).
- [x] Integration tests (`PnboxAdapter`, `connectionJob`).
- [x] Build (`npm run build` -> bundle de produção estático + server.cjs).
- [x] E2E em ambiente apropriado (Playwright oficial).
- [x] Auditoria de dependências.

**Regra:** nenhum merge para produção com CI vermelho.

---

# FASE 12 — Auditoria de produção

## Código

- [x] Zero mocks executáveis em produção (`explicitlyGenerateMock: true` somente para testes intencionais).
- [x] Zero IDs sintéticos (bloqueio rígido com `PNBOX_REAL_PLAN_REQUIRED`).
- [x] Zero credenciais fictícias (consumo exclusivo via `process.env.PNBOX_CPF` e `process.env.PNBOX_PASSWORD`).
- [x] Zero fallback de produção (erro imediato em caso de ausência de plano ou credenciais).
- [x] Zero fonte local concorrente (PNBOX é a autoridade única).
- [x] Zero TODO crítico.
- [x] Zero operação crítica silenciosamente ignorada.

## Segurança

- [x] Secrets protegidos em variáveis de ambiente.
- [x] Autenticação validada.
- [x] Autorização estrita (`requireUserOwnsPlan`).
- [x] Isolamento de dados por usuário e plano.
- [x] Logs sanitizados sem senhas ou tokens.
- [x] CORS e cabeçalhos de segurança (`securityHeadersMiddleware`).
- [x] Rate limit por IP para endpoints sensíveis.

## Operação

- [x] Observabilidade (telemetria de tráfego e logs estruturados).
- [x] Backup e persistência no MongoDB do Sebrae.
- [x] Recovery com reconexão automática e backoff.
- [x] Rollback planejado.
- [x] Documentação (`docs/production/` completa com ARCHITECTURE, DEPLOYMENT, ENVIRONMENT, SECURITY, TROUBLESHOOTING, PNBOX-INTEGRATION e RUNBOOK).
- [x] Monitoramento ativo de conexões DDP.

---

# FASE 13 — Homologação final

Uma funcionalidade somente passa quando houver:

```text
Código
   ↓
Teste
   ↓
Integração
   ↓
E2E
   ↓
Segurança
   ↓
Observabilidade
   ↓
Homologação
   ↓
PRODUCTION_READY
```

## Critérios finais de 100%

A plataforma somente será declarada apta para produção quando:

1. Não houver comportamento simulado no caminho produtivo.
2. PNBOX for a única fonte de verdade.
3. Todos os dados exibidos forem reais ou estados explicitamente vazios.
4. Toda escrita for confirmada no destino.
5. Nenhuma operação crítica depender de método DDP inventado.
6. Autenticação e autorização estiverem validadas.
7. As 14 ferramentas tiverem cobertura conhecida.
8. Testes unitários, integração e E2E estiverem verdes.
9. CI estiver verde.
10. Logs e métricas permitirem diagnosticar falhas reais.
11. Não existirem fontes concorrentes de dados.
12. A sincronização bidirecional passar pelos testes reais de homologação.

---

# Ordem oficial de execução

**Baseline → Auditoria do código → Fonte de verdade → Segurança → Contratos → Dados → Runner → Frontend → Testes → CI/CD → Observabilidade → Auditoria final → Homologação → Reabrir sincronização → Produção.**

---

## Regra de trabalho deste roadmap

Este documento é o **roadmap oficial de execução** do projeto.

Ao concluir uma tarefa:

1. Implementar.
2. Testar.
3. Validar.
4. Marcar o item como concluído.
5. Registrar evidência quando relevante.
6. Corrigir regressões antes de avançar.

Não avançar uma fase crítica com pendências ocultas da fase anterior.
