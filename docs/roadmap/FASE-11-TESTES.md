# FASE 11 — Testes

**Estado:** PLANEJADA — não executada  
**Objetivo:** provar comportamento correto, inclusive falhas e isolamento, antes da produção.

## Unitários

Cobrir:

- schemas;
- validators;
- mappers;
- autenticação;
- autorização;
- planos;
- ferramentas;
- tratamento de erros.

## Integração

Cobrir:

- API → PNBOX;
- auth → PNBOX;
- plano → ferramenta;
- read;
- create;
- update;
- delete;
- confirmação de escrita.

Operações externas só podem ser classificadas como LIVE quando o contrato estiver comprovado e o ambiente de teste for real/controlado.

## E2E mínimo

`login → PNBOX → plano real → ferramentas → leitura → edição → salvar → confirmar → reload → verificar`

## Casos negativos

- sem autenticação;
- sessão expirada;
- plano inexistente;
- acesso cross-user;
- payload inválido;
- PNBOX indisponível;
- timeout;
- erro DDP;
- escrita sem confirmação.

## Evidências

- Comandos executados.
- Resultado de cada suíte.
- Ambiente utilizado.
- Falhas não mascaradas.
- Evidência de testes negativos.
- Artefatos E2E quando disponíveis.

## Gate

`TESTS_CRITICAL_GREEN` quando os testes críticos definidos pelo projeto estiverem verdes e as exceções ambientais estiverem explicitamente registradas, sem falsos positivos.
