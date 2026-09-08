# FASE 00 — Baseline e Congelamento

**Estado:** PLANEJADA — não executada  
**Objetivo:** registrar o estado real do sistema antes de qualquer correção.

## Escopo

A fase cria uma fotografia reproduzível do repositório, CI/CD, deployment, testes e integrações existentes. Não altera comportamento de produção e não tenta corrigir falhas encontradas.

## Atividades

- Registrar branch e SHA inicial.
- Registrar estado do GitHub Actions e últimos workflows relevantes.
- Registrar estado dos deployments Vercel, incluindo falhas.
- Executar e registrar lint.
- Executar e registrar typecheck.
- Executar testes unitários existentes.
- Executar build.
- Inventariar testes E2E e sua capacidade atual de execução.
- Catalogar falhas, warnings e bloqueios sem mascará-los.
- Congelar mudanças de sincronização bidirecional PNBOX ↔ PNBOX AI durante o levantamento.

## Evidências obrigatórias

1. SHA exato do início da execução.
2. Relatório dos workflows CI/CD.
3. Deployment Vercel atual e seu estado.
4. Saída de lint/typecheck/test/build.
5. Inventário E2E.
6. Lista de falhas reproduzíveis.
7. Lista de riscos que serão tratados nas fases seguintes.

## Não fazer

- Não corrigir código nesta fase.
- Não considerar uma falha como sucesso por ausência de logs.
- Não criar dados ou credenciais para fazer testes passarem.
- Não declarar cobertura que não foi executada.

## Gate de saída

**BASELINE_ESTABLISHED:** todas as evidências acima disponíveis e associadas ao SHA inicial.
