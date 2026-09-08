# FASE 14 — Realtime e Sincronização

**Estado:** FROZEN até a conclusão da Fase 04  
**Objetivo:** homologar sincronização bidirecional somente depois que o contrato DDP real estiver comprovado.

## Pré-condição

Nenhum trabalho de sincronização pode transformar uma publication/method hipotético em contrato oficial. A Fase 04 deve estar `DDP_CONTRACT_VERIFIED`.

## Escopo após desbloqueio

- PNBOX → PNBOX AI.
- PNBOX AI → PNBOX.
- Reconexão.
- Dedupe.
- Ordenação de eventos.
- Conflitos.
- Multi-tab.
- Eventos perdidos.
- Estado inicial e atualização incremental.

## Critérios técnicos

A solução deve definir identidade de evento/registro, comportamento em reconnect, idempotência, ordenação quando necessária, tratamento de eventos duplicados e recuperação de estado perdido.

## Evidências

- Evento real capturado do PNBOX.
- Mudança real no PNBOX refletida na aplicação.
- Mudança confirmada pela aplicação refletida no PNBOX, quando a operação for suportada.
- Reconexão sem duplicação ou perda indevida.
- Teste multi-tab.
- Teste de conflito e evento perdido.

## Critério final

Uma alteração real em qualquer lado deve aparecer no outro sem intervenção manual, perda ou duplicação incompatível com o contrato.

## Gate

`REALTIME_HOMOLOGATED` somente após testes reais e evidências do comportamento descrito.
