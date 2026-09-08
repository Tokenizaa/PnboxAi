# FASE 12 — CI/CD

**Estado:** PLANEJADA — não executada  
**Objetivo:** impedir que código crítico avance sem validação automatizada e permitir deployment verificável e reversível.

## Pipeline obrigatório

1. install
2. typecheck
3. lint
4. unit tests
5. integration tests
6. build
7. E2E quando o ambiente permitir
8. dependency/security audit

## Políticas

- Nenhuma etapa crítica deve depender exclusivamente de execução manual.
- Merge para produção não pode ocorrer com CI vermelho.
- Build do ambiente Vercel deve ser verde.
- Deployment deve ser verificável.
- Rollback deve estar documentado e testável dentro das capacidades do ambiente.

## Evidências

- Workflow final versionado.
- Execução verde do workflow.
- Registro de cada etapa.
- E2E com ambiente configurado, quando aplicável.
- Resultado do dependency/security audit.
- Procedimento de rollback.

## Gate

`CI_CD_GREEN` quando o pipeline obrigatório estiver executando as etapas críticas e houver evidência verde no commit candidato à produção.
