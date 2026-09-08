# FASE 05 — Integridade de Dados e Mappers

**Estado:** PLANEJADA — não executada  
**Dependência:** contrato DDP real comprovado quando a transformação depender dele.

## Objetivo

Garantir que dados entre PNBOX e aplicação mantenham identidade, tipos, relações e semântica sem defaults ou conversões silenciosas.

## Mapeamento

- Definir/validar mapper canônico PNBOX → aplicação.
- Definir/validar mapper canônico aplicação → PNBOX.
- Manter campos desconhecidos sob política explícita, sem descarte silencioso de informação crítica.
- Validar schema antes de consumir ou enviar dados.

## Validações obrigatórias

- Campos obrigatórios.
- Tipos.
- IDs e identidade da entidade.
- Datas.
- Relações entre plano, documento e ferramenta.
- Existência do plano.
- Existência do documento.
- Pertencimento do documento ao plano correto.
- Integridade de payloads de create/update.

## Rejeições

Payload incompleto, tipo incorreto, plano inexistente, documento inexistente ou recurso pertencente a outro plano deve gerar erro explícito e não correção silenciosa.

## Evidências

- Schemas versionados.
- Testes de mapper em ambas as direções.
- Testes de rejeição de payloads inválidos.
- Testes de relações e isolamento.
- Casos reais de leitura/escrita, quando o contrato estiver comprovado.

## Gate

`DATA_INTEGRITY_VERIFIED` quando transformações críticas forem determinísticas, validadas e cobertas por testes, sem defaults silenciosos.
