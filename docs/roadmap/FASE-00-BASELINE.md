# FASE 00 — Baseline e Congelamento

**Estado:** EXECUTADA — BASELINE ESTABELECIDA COM RESSALVAS OPERACIONAIS  
**Data:** 2026-09-07/08 UTC  
**Objetivo:** registrar o estado real do sistema antes das correções das fases subsequentes.

## Identificação do baseline

- Branch: `main`
- SHA funcional inicial: `4a5b146604d4c535d5ee2d8e5994fe2c4cb7506a`
- Esse SHA corresponde ao commit anterior à instrumentação do CI para executar a suíte de testes.
- Commit posterior, somente de CI: `1de28b1a08027c9b48376fed0a7c58b090b2d352`.

## GitHub Actions

Workflow: `.github/workflows/ci.yml`

- Run `34176297108`, SHA `4a5b146...`: **SUCCESS**.
- TypeScript (`npm run lint`): **SUCCESS**.
- Build de produção (`npm run build`): **SUCCESS**.
- O CI original não executava `npm test`; isso foi identificado como lacuna do baseline.
- Foi adicionada temporariamente/permanentemente ao CI a execução explícita da suíte existente.
- Run `34176735881`, SHA `1de28b1...`: **SUCCESS**.
- `npm test`: **SUCCESS**.
- Build no mesmo run: **SUCCESS**.

A alteração de CI não altera o comportamento funcional da aplicação; serve para tornar a suíte existente verificável no pipeline.

## Suíte de testes existente

`package.json` define `npm test` como:

1. `node src/autonomy/__tests__/runTests.js`
2. `tsx src/research/__tests__/run.ts`
3. `tsx src/automation/connectionJob.test.ts`

O run `34176735881` executou a cadeia completa com sucesso.

Arquivos E2E/instrumentação identificados no repositório:

- `tests/frontend.spec.ts`
- `tests/quick-check.mjs`

Esses testes não fazem parte do comando `npm test` e não foram declarados como executados pelo baseline CI. Portanto, **E2E não é considerado homologado nesta fase**.

## Build

- `npm run build`: **SUCCESS**.
- Vite transformou 2275 módulos.
- Bundle principal acima do limite de aviso do Vite: aproximadamente 766 KB, acima de 500 KB.
- O aviso de tamanho de chunk não impediu o build.

## Vercel

O estado de produção permanece **BLOQUEADO** no baseline. Há deployment recente em estado `ERROR`, incluindo o deployment identificado durante a auditoria como `dpl_3CotJsqg4mmP8Hkkmdww5GYLSFM`, associado ao commit `628684e78a75de13c37d55290ceef46c87ddc727`.

A correção de deployment não foi antecipada para esta fase; será tratada na FASE 13, conforme a ordem do roadmap.

## Riscos e bloqueios registrados

1. Autenticação local ainda presente em `auth.routes.ts`.
2. Fallback inseguro de chave/armazenamento em `authStore.ts`.
3. Remanescentes de `DRY_RUN`/simulação.
4. Payloads/defaults de negócio hardcoded no copilot.
5. Contrato DDP PNBOX ainda não comprovado por tráfego autenticado real.
6. Documentação de integração afirma detalhes do DDP ainda não comprovados.
7. E2E existe, mas não integra o baseline CI.
8. Deployment Vercel com falha.
9. Sincronização bidirecional PNBOX ↔ PNBOX AI permanece congelada enquanto o contrato externo não estiver comprovado.

## Não fazer nesta fase

- Não corrigir os problemas de segurança, DDP ou Vercel aqui.
- Não transformar ausência de evidência em sucesso.
- Não fabricar credenciais, IDs ou tráfego PNBOX.
- Não declarar E2E ou contrato DDP como homologados.

## Gate de saída

**BASELINE_ESTABLISHED: SIM, COM RESSALVAS DOCUMENTADAS.**

A fotografia inicial está identificada pelo SHA `4a5b146604d4c535d5ee2d8e5994fe2c4cb7506a`. A suíte existente foi efetivamente executada com sucesso em um descendente que altera somente o CI (`1de28b1a08027c9b48376fed0a7c58b090b2d352`). Nenhum resultado de teste foi inventado ou inferido.

**Próxima fase autorizada:** FASE 01 — Segurança P0.
