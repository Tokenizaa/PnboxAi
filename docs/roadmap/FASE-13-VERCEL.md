# FASE 13 — Vercel e Infraestrutura de Produção

**Estado:** PLANEJADA — não executada  
**Gate:** deployment `READY` + smoke test real aprovado.

## Objetivo

Eliminar falhas do ambiente de produção e provar que o build implantado está corretamente configurado e integrado às dependências reais.

## Checklist

- Corrigir deployment atual.
- Validar build em ambiente equivalente à produção.
- Validar variáveis obrigatórias.
- Remover defaults inseguros.
- Validar secrets.
- Validar domínio.
- Validar health endpoint.
- Validar logs.
- Validar runtime Node.
- Validar Supabase.
- Validar PNBOX.
- Validar limites e timeouts.
- Validar rollback.

## Smoke test

Após deployment saudável, executar fluxo mínimo sem dados fictícios: autenticação real → carregamento de plano real → leitura de ferramenta suportada → validação do estado retornado.

Operações de escrita só entram no smoke test quando o contrato DDP estiver comprovado e houver ambiente controlado.

## Evidências

- ID/URL do deployment.
- Estado `READY`.
- Logs relevantes sem secrets.
- Build e runtime confirmados.
- Variáveis/secrets validados sem revelar valores.
- Resultado do smoke test real.
- Procedimento de rollback.

## Gate

`PRODUCTION_DEPLOYMENT_HEALTHY` somente com deployment saudável e smoke test real reproduzível.
