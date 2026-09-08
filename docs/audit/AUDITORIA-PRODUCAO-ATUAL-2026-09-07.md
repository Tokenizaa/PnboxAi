# PNBOX AI — Auditoria de Produção Atual

**Data:** 2026-09-07  
**Branch:** `main`  
**Commit auditado:** `628684e78a75de13c37d55290ceef46c87ddc727`  
**Base comparativa:** `840f8352f006bcddd93aaafdca945751abf905e2`  
**Critério:** Prompt Mestre de Auditoria e Correção para Produção 100% + Roadmap `docs/ROADMAP-PRODUCAO-PNBOX-AI.md`

## 1. Veredito

**NOT_PRODUCTION_READY**

A execução anterior corrigiu uma parte importante da arquitetura, principalmente a remoção de planos locais como fonte oficial, bloqueio de operações PNBOX não confirmadas, endurecimento do RealRunner e introdução de controles de segurança. Porém, a auditoria atual encontrou violações concretas do critério de produção e não é correto considerar o roadmap concluído.

### Bloqueadores críticos

1. **Deploy de produção quebrado.** O último deployment Vercel associado ao commit auditado está em estado `ERROR`. O status combinado do commit também está `failure` no check Vercel.
2. **Autenticação local/de fallback continua executável.** `auth.routes.ts` cria usuários em memória, armazena senha em texto no campo `passwordHash` e cria tokens `local_token_*` quando Supabase não está configurado. Isso viola o requisito de autenticação de produção sem fallback local.
3. **Fallback criptográfico inseguro.** `authStore.ts` usa uma chave literal `default-pnbox-key-fallback-32b` quando `PNBOX_CRED_ENCRYPTION_KEY` não existe e, pior, `encryptPnboxPassword()` retorna a senha em plaintext quando a chave não existe. Isso é bloqueador de segurança.
4. **Copiloto IA ainda fabrica dados.** `PnboxAiCopilotDrawer.tsx` possui textos e payloads SWOT/financeiros hardcoded e defaults que são apresentados como recomendações derivadas da análise. Também envia `provider: 'gemini'`, contrariando o caminho documentado de NVIDIA primário sem fallback silencioso.
5. **Contrato DDP ainda não comprovado.** O cliente DDP real existe, mas publications/methods específicos do PNBOX continuam sendo candidatos exploratórios. A criação/alteração/exclusão de planos permanece corretamente bloqueada, e o realtime bidirecional continua não homologado.

## 2. Evidências positivas

### 2.1 Fonte de verdade de planos

A direção arquitetural está correta: o roadmap já registra planos como PNBOX-only e o código atual de `planUtils.ts` não usa `localStorage` para reconstruir planos oficiais. A mudança anterior também removeu o plano padrão sintético.

### 2.2 RealRunner

`realRunner.ts` rejeita IDs vazios, `:idPlano` e IDs `plano_*`, não usa cache como autoridade e exige plano real para execução. Isso está alinhado com o princípio de fonte única de verdade.

### 2.3 Cliente DDP

`ddpClient.ts` implementa WebSocket DDP real, `connect`, `method/result`, `sub/ready`, `added/changed/removed`, timeout e cleanup. Isso é infraestrutura real, mas não constitui prova de que os nomes de publication/method do PNBOX foram descobertos e homologados.

### 2.4 Bloqueio de criação de plano

As rotas de criação/alteração/exclusão de plano não devem ser consideradas prontas enquanto o contrato oficial do PNBOX não for comprovado. O comportamento de bloqueio é preferível a inventar um método DDP.

## 3. FASE 0 — Baseline

| Item | Status | Evidência |
|---|---|---|
| Branch `main` | PASS | commit auditado está em `main` |
| SHA baseline atual | PASS | `628684e78a75de13c37d55290ceef46c87ddc727` |
| Comparação com roadmap anterior | PASS | commit `628684e` é filho direto de `840f835` |
| CI completo | **FAIL/UNVERIFIED** | check Vercel em `failure`; workflow GitHub não retornou execução associada ao SHA |
| Produção publicada | **FAIL** | último deployment Vercel está `ERROR` |

## 4. FASE 1 — Simulações, mocks e dados fictícios

### 4.1 DRY_RUN

**Status: FAIL.**

Embora a sessão PNBOX principal esteja configurada como LIVE-only, ainda existem referências executáveis a `DRY_RUN` em tipos, contexto, UI e autenticação. `auth.ts` ainda aceita `modoExecucao: 'DRY_RUN' | 'LIVE'` na assinatura e somente rejeita em runtime. Isso significa que o conceito ainda atravessa a superfície da aplicação.

Arquivos identificados:
- `src/types/pnbox.ts`
- `src/contexts/ExecutionContext.tsx`
- `src/pages/System.tsx`
- `src/components/AuthSessionCard.tsx`
- `src/server/routes/pnbox-credentials.routes.ts`
- `src/automation/auth.ts`

**Ação:** remover DRY_RUN do contrato produtivo; se testes sintéticos forem necessários, isolá-los em fixtures/testes sem caminho de runtime.

### 4.2 Dados fictícios no Copiloto

**Status: FAIL — CRÍTICO.**

`src/components/pnbox/PnboxAiCopilotDrawer.tsx` contém fallback textual para SWOT:
- força = modelo focado em inovação;
- fraqueza = fase inicial de estruturação de marca;
- ameaça = concorrentes consolidados;
- oportunidade = crescimento de demanda quando não existe evidência.

Também existe fallback geral afirmando potencial de escala quando `data.report.resumoExecutivo` não existe. O botão de aplicação transforma esses valores em payload para `analiseSwot`, portanto não é apenas texto visual: existe caminho executável para enviar conteúdo inventado ao plano.

**Ação:** remover todos os defaults inventados. Sem evidência/resultado válido da IA, exibir estado vazio/erro e não gerar `actionPayload`.

### 4.3 IDs gerados com `Math.random()`

Foram encontrados vários geradores de IDs internos usando `Date.now()` + `Math.random()`, incluindo research IDs, source IDs, jobs e outros identificadores de execução. Isso não é automaticamente uma violação se o ID for puramente interno e não representar uma entidade PNBOX. Deve ser classificado como risco de qualidade/colisão, não como prova de fabricação de entidade externa.

**Ação:** migrar IDs internos críticos para `crypto.randomUUID()` quando apropriado; nunca usar esses IDs como `_id` PNBOX.

## 5. FASE 2 — Fonte única de verdade

**Status: PARTIAL.**

Planos estão próximos do modelo correto, porém a auditoria anterior marcou várias capacidades das 14 ferramentas como `[x]` sem prova LIVE. O catálogo possui nomes de collections e métodos como `<collection>.insert/update/remove`, mas isso ainda precisa de evidência de tráfego autenticado do PNBOX.

**Importante:** `schemaCatalog.ts` deve ser tratado como contrato interno de validação até que cada schema seja confrontado com documentos reais recebidos do PNBOX.

## 6. FASE 3 — Autenticação e segurança

### 6.1 Sessão PNBOX

**Status: PARTIAL/UNVERIFIED.**

O fluxo OIDC real e o armazenamento de sessão em memória são bons avanços. Entretanto, não há evidência nesta auditoria de teste LIVE completo de expiração, renovação, logout, dois usuários simultâneos e isolamento real contra o PNBOX.

### 6.2 Autenticação da própria aplicação

**Status: FAIL — CRÍTICO.**

`src/server/routes/auth.routes.ts` mantém uma segunda autenticação local:
- cria `LOCAL_USERS` em memória;
- usa `passwordHash: password` sem hash;
- compara senha em plaintext;
- cria `local_token_*` manualmente;
- usa `Math.random()` para criar `usr_*`;
- possui refresh local.

Isso contradiz uma aplicação pronta para produção se a intenção é exigir Supabase Auth real. A existência de fallback é especialmente perigosa porque ausência/má configuração do Supabase altera o mecanismo de autenticação.

**Ação:** tornar Supabase Auth obrigatório em produção; falha de configuração deve impedir inicialização ou retornar erro explícito, nunca trocar para autenticação local.

### 6.3 Criptografia de credenciais PNBOX

**Status: FAIL — CRÍTICO.**

`src/server/services/authStore.ts` contém:
- chave fallback literal `default-pnbox-key-fallback-32b`;
- `encryptPnboxPassword()` retorna plaintext se a chave não estiver configurada;
- `decryptPnboxPassword()` também devolve o valor original quando não consegue descriptografar.

**Ação:** exigir `PNBOX_CRED_ENCRYPTION_KEY` em ambiente de produção; falhar fechado se ausente; nunca persistir ou retornar plaintext como fallback.

## 7. FASE 4 — Contratos e tipagem

**Status: PARTIAL.**

A introdução de Zod é positiva, mas o contrato real DDP ainda não foi comprovado. A classificação de `Realtime Event`, collections e operações como concluídas no roadmap está prematura.

Também é necessário eliminar assinaturas que aceitam modos/estados que o runtime não suporta de verdade.

## 8. FASE 5 — Dados e integridade

**Status: PARTIAL.**

Há validação de schema e rejeição de plano falso, mas o Copiloto ainda consegue produzir payloads sintéticos. Isso quebra a cadeia de proveniência mesmo que o `PnboxAdapter` seja estrito.

A regra deve ser: qualquer dado enviado ao PNBOX precisa ter origem rastreável e, quando originado por IA, estar associado ao resultado/evidência correspondente.

## 9. FASE 6 — Motor de execução

**Status: PARTIAL.**

O RealRunner está mais seguro, com validação e confirmação por leitura. Entretanto, não existe evidência LIVE suficiente para declarar Create/Update/Delete das 14 ferramentas como `PRODUCTION_READY`.

O `call()` aguardar `result` é correto para confirmação do método, mas persistência deve continuar sendo confirmada por reread/evento real, especialmente quando o servidor retorna sucesso sem documento completo.

## 10. FASE 7 — Realtime / sincronização

**Status: BLOCKED_EXTERNAL_CONTRACT.**

Continua corretamente congelada.

Ainda faltam:
- captura de tráfego autenticado;
- publications reais;
- methods reais;
- fluxo comprovado `added/changed/removed` do PNBOX;
- vínculo plano → ferramenta comprovado;
- sincronização bidirecional real;
- reconexão e resolução de conflitos homologadas.

Não deve ser marcada como pronta enquanto esses testes não existirem.

## 11. FASE 8 — Frontend

**Status: FAIL/PARTIAL.**

Há estados reais em partes do frontend, mas ainda existem:
- UI de DRY_RUN;
- Copiloto com respostas fictícias;
- botão de aplicação que pode transformar conteúdo inventado em payload;
- textos que dizem `Gemini 2.5` enquanto a arquitetura documentada prioriza NVIDIA;
- criação de plano que precisa permanecer explicitamente bloqueada enquanto o contrato DDP não estiver confirmado.

## 12. FASE 9 — Observabilidade

**Status: PARTIAL/UNVERIFIED.**

Há middleware de segurança e logs, mas a auditoria não encontrou evidência suficiente para considerar métricas, alertas, correlation IDs e monitoramento operacional completos.

Também é necessário revisar logs que possam incluir mensagens de erro vindas de provedores externos, garantindo que nenhum token/cookie/credencial seja propagado.

## 13. FASE 10 — Testes

**Status: FAIL.**

`package.json` define `npm test`, mas o workflow GitHub atual não executa `npm test`; executa somente `npm run lint` e `npm run build`.

Isso significa que a pipeline de CI não prova os testes existentes.

**Ação:** CI deve executar, no mínimo:
1. typecheck;
2. testes unitários;
3. testes de integração;
4. build;
5. E2E sem depender de credenciais reais para o conjunto determinístico;
6. suíte LIVE separada, explicitamente protegida por secrets/staging.

## 14. FASE 11 — CI/CD

**Status: FAIL — BLOQUEADOR.**

O workflow atual é:
- install;
- `npm run lint`;
- `npm run build`.

Não executa `npm test`.

Além disso, o deployment Vercel associado ao último commit está `ERROR`. Portanto, mesmo que o código compile localmente, não existe evidência de produção operacional.

## 15. FASE 12 — Auditoria de produção

**Status: FAIL.**

Critérios que falham:
- zero fallback de autenticação: FAIL;
- zero fallback criptográfico: FAIL;
- zero dados fictícios no caminho executável: FAIL;
- zero DRY_RUN no contrato produtivo: FAIL;
- produção publicada: FAIL;
- DDP oficial comprovado: FAIL/BLOCKED.

## 16. FASE 13 — Homologação final

**Status: NOT_STARTED.**

Não há base para `PRODUCTION_READY`.

## 17. Matriz consolidada

| Área | Status |
|---|---|
| Baseline | PASS |
| Fonte de verdade de planos | PARTIAL → boa direção |
| 14 ferramentas comprovadas LIVE | **BLOCKED_EXTERNAL_CONTRACT** |
| DRY_RUN removido | **FAIL** |
| Dados fictícios no caminho executável | **FAIL** |
| Auth Supabase-only | **FAIL** |
| Criptografia fail-closed | **FAIL** |
| API security | PARTIAL |
| Canonical mapper | PARTIAL/PASS estrutural |
| RealRunner | PARTIAL |
| Realtime | **BLOCKED_EXTERNAL_CONTRACT** |
| Frontend | **FAIL/PARTIAL** |
| Observabilidade | PARTIAL/UNVERIFIED |
| Testes | **FAIL** |
| CI | **FAIL** |
| Vercel production | **FAIL** |
| Homologação LIVE | **NOT_TESTED** |
| **VEREDITO** | **NOT_PRODUCTION_READY** |

## 18. Ordem obrigatória de correção

### P0 — Segurança e produção
1. Remover autenticação local de runtime.
2. Exigir Supabase Auth real.
3. Remover plaintext fallback de `encryptPnboxPassword/decryptPnboxPassword`.
4. Exigir `PNBOX_CRED_ENCRYPTION_KEY` e falhar fechado.
5. Remover DRY_RUN dos contratos produtivos.
6. Remover defaults/fallbacks fictícios do Copiloto.
7. Corrigir o caminho de provider do Copiloto para o contrato real de IA.
8. Corrigir CI para executar testes.
9. Diagnosticar e corrigir o deployment Vercel quebrado.

### P1 — Integridade
10. Revisar todos os consumidores de `actionPayload`.
11. Garantir proveniência para qualquer dado gerado por IA.
12. Revisar schemas das 14 ferramentas contra documentos reais.
13. Classificar cada operação como `PRODUCTION_READY` somente com evidência.

### P2 — PNBOX real
14. Capturar tráfego autenticado.
15. Confirmar publications/methods reais.
16. Homologar Read/Create/Update/Delete ferramenta por ferramenta.
17. Reabrir realtime somente após contrato comprovado.

### P3 — Homologação
18. E2E LIVE completo.
19. Teste multiusuário/multiplano.
20. Teste reconexão.
21. Teste de falha e recuperação.
22. Smoke test de produção.
23. Só então alterar o veredito para `PRODUCTION_READY`.

## 19. Regra de encerramento

Nenhum item deve ser marcado `[x]` no roadmap apenas porque existe código para ele. O item só pode ser concluído quando houver evidência verificável: teste automatizado, teste de integração, tráfego real, deployment verde ou homologação documentada.
