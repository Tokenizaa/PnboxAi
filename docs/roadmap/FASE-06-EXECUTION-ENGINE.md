# FASE 06 — Execution Engine

**Estado:** PLANEJADA — não executada  
**Objetivo:** garantir que toda operação contra PNBOX tenha ciclo de execução, erro e confirmação verificável.

## Leitura

- Ler somente dados reais do PNBOX.
- Aplicar timeout para dependências externas.
- Propagar erro explicitamente.
- Implementar reconexão segura.
- Validar resposta contra contrato/schema.
- Permitir cache somente como otimização claramente identificada.

## Escrita

Antes do envio:

- Validar schema.
- Validar identidade e plano.
- Garantir idempotência quando aplicável.

Depois do envio:

- Interpretar corretamente o resultado DDP.
- Confirmar por reread e/ou evento real.
- Tratar falha de confirmação como `UNCONFIRMED`, nunca como sucesso.
- Não exibir sucesso antes da confirmação.

## Batch

- Isolar falhas por item.
- Impedir duplicação.
- Retry somente quando seguro/idempotente.
- Suportar cancelamento de forma explícita.
- Produzir relatório baseado em resultados reais.

## Evidências

- Testes de timeout e erro.
- Testes de reconexão.
- Testes de confirmação.
- Teste em que a escrita é aceita mas não confirmada e permanece não confirmada.
- Testes de batch com sucesso e falha por item.
- Logs/telemetria sem secrets.

## Gate

`EXECUTION_ENGINE_VERIFIED` quando leitura, escrita e batch apresentarem estados honestos e confirmação verificável.
