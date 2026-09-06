# Execução da Auditoria Forense — PnboxAi

**Data:** 2026-09-05
**Branch:** `main`

## Estado atual

A auditoria encontrou múltiplas implementações históricas/concorrentes de planos e iniciou a consolidação para que o PNBOX seja a única fonte de verdade.

## Evidências encontradas

### PNBOX/DDP real

- `realRunner.ts` possui cliente DDP real contra `wss://pnbox.sebrae.com.br/websocket`.
- A autenticação DDP usa `login` com `resume` a partir do token Meteor real.
- Existem rotas `/api/pnbox/plans`, `/api/pnbox/plans/:id/pull-all`, `/push-all` e operações por ferramenta.
- `oidcPnboxPlaywright.ts` implementa o fluxo real de OIDC/PNBOX e extrai `Meteor.userId`/token/cookies.

### Gaps descobertos

1. `PlansContext` consumia `/api/plans`, enquanto outros componentes consumiam `/api/pnbox/plans`.
2. `plansStore.ts` continha `USER_PLANS` como fonte de planos e um plano hardcoded (`PLANOS_CRIADOS`).
3. `planUtils.ts` continha `PLANOS_EXEMPLO_INICIAIS` e persistência em `localStorage`, incluindo IDs fictícios.
4. `App.tsx` inicializava/selecionava um plano padrão fictício quando não havia plano remoto.
5. `AiPlanCreatorStudio.tsx` chamava os caminhos antigos `/api/automation/planos/list` e `/api/automation/planos/create`.
6. `realRunner.ts` possuía fallback para `cachedPlanos` quando o DDP não retornava dados.
7. `criarPlanoPnboxDdp()` possui fallback interno para um ID `plano_<timestamp>` quando nenhum método Meteor confirma criação; isso ainda precisa ser removido no próximo ciclo para que a função nunca reporte criação não confirmada.
8. `DdpClient` coleta `added/changed/removed` durante `subscribeAndCollect`, mas ainda não existe um consumidor persistente de eventos para manter uma assinatura realtime contínua do plano após o snapshot.
9. `officialRunner.ts` continua existindo e é importado por componentes/rotas para DRY_RUN; isso é aceitável somente se o modo estiver explicitamente separado do LIVE e nunca puder ser apresentado como execução real.

## Alterações já aplicadas no GitHub

- Removido o plano hardcoded de `plansStore.ts`; o store passou a ser somente cache transitório de metadados.
- `planUtils.ts` deixou de ler/escrever `localStorage` para planos e deixou de fornecer planos de exemplo/fallback. `extrairIdPlano()` não inventa mais ID quando a entrada está vazia.
- `/api/plans` passou a consultar o PNBOX e sincronizar somente o cache transitório.
- `/api/plans` POST passou a criar via DDP real e rejeita criação sem ID confirmado pelo PNBOX.
- Operações locais de PATCH/DELETE/archive foram bloqueadas explicitamente até que os métodos Meteor oficiais correspondentes sejam confirmados, evitando falso sucesso.
- Duplicação usa criação real no PNBOX e exige ID confirmado.
- Os caminhos legados `/api/automation/planos/list` e `/api/automation/planos/create` agora são aliases do mesmo gateway PNBOX, eliminando uma segunda implementação local.

## Estado ainda BLOCKED

Ainda não é permitido declarar sincronização bidirecional/realtime completa.

### Próximos gaps técnicos

1. Remover o fallback `plano_<timestamp>` de `criarPlanoPnboxDdp()` e exigir resposta Meteor confirmada.
2. Remover o fallback de `cachedPlanos` dentro de `listarPlanosPnbox()`; cache nunca pode substituir resposta PNBOX.
3. Eliminar o fallback visual hardcoded restante em `App.tsx`.
4. Migrar `PlanSwitcherModal` de `localStorage` para os dados remotos da sessão/API.
5. Auditar e eliminar qualquer rota `server.ts` antiga que simule DDP ou gere `doc_*` localmente e ainda esteja acessível.
6. Confirmar os métodos Meteor reais de update/delete/archive antes de implementá-los.
7. Implementar assinatura DDP persistente para `added/changed/removed` e propagá-la ao frontend, se o protocolo do PNBOX permitir essa assinatura para os planos.
8. Validar Supabase `pnbox_credentials` contra o schema implantado e eliminar qualquer divergência `userId`/`user_id`.
9. Executar build, testes unitários e E2E LIVE em um executor real. A conexão GitHub usada nesta sessão não possui shell para executar npm/Playwright; portanto esses testes não foram falsamente marcados como PASS.

## VEREDITO

**IMPLEMENTAÇÃO INCONSISTENTE — BLOCKED.**

A consolidação já eliminou parte importante das fontes locais de divergência, mas a cadeia completa ainda não está provada:

`PNBOX REAL → AUTH REAL → METEOR REAL → DDP REAL → PROJECT REAL → TOOL DATA REAL → SUPABASE REAL → RECONCILIATION REAL → FRONTEND REAL → RELOAD → REALTIME`

Somente após todos esses elos serem comprovados será permitido declarar a integração concluída.
