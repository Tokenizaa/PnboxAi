# FASE 10 — Observabilidade

**Estado:** PLANEJADA — não executada  
**Objetivo:** tornar operações, falhas e degradações observáveis sem expor segredos.

## Logs estruturados

Registrar, quando aplicável:

- requestId/correlationId;
- identificador seguro do usuário;
- plano;
- ferramenta;
- operação;
- duração;
- status;
- categoria de erro.

Nunca registrar senha, token, cookie, chave ou payload sensível sem necessidade e sanitização.

## Métricas

- login;
- conexão DDP;
- desconexão DDP;
- latência de leitura;
- latência de escrita;
- falhas de confirmação;
- erros de API;
- falhas de batch.

## Alertas

- PNBOX indisponível;
- aumento anormal de erros DDP;
- falhas de autenticação;
- operações não confirmadas;
- degradação de latência.

## Evidências

- Exemplos de logs sanitizados.
- Métricas emitidas pelos fluxos críticos.
- Alertas configurados e testados quando a infraestrutura permitir.
- Demonstração de correlação ponta a ponta por request/correlation ID.
- Verificação de que secrets não aparecem nos logs.

## Gate

`OBSERVABILITY_READY` quando incidentes críticos puderem ser identificados, correlacionados e diagnosticados sem depender de dados sensíveis.
