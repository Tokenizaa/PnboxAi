# FASE 02 — Eliminação de Simulação e Dados Fictícios

**Estado:** PLANEJADA — não executada  
**Gate:** zero caminho produtivo que converta exemplo em dado real.

## Objetivo

Eliminar qualquer mecanismo que possa apresentar dados simulados, artificiais ou de exemplo como se fossem dados reais do PNBOX.

## Auditoria do runtime

Pesquisar código executável por:

- `DRY_RUN`
- `SIMULATION`
- `mock`
- `fake`
- `placeholder`
- `fallback`
- `example`
- `exemploPayload`
- IDs e planos `plano_*`
- IDs fixos usados como entidades reais
- CPFs, senhas e tokens fictícios
- `Math.random()` na fabricação de entidades
- `Date.now()` usado para fabricar identificadores/entidades
- dados estáticos apresentados como dados PNBOX

## Tratamento permitido

Documentação, fixtures e exemplos de teste podem existir quando estiverem claramente isolados e forem impossíveis de alcançar pelo runtime produtivo.

## Evidências

- Busca auditável pelos padrões.
- Classificação de cada ocorrência: runtime, teste, fixture, documentação ou falso positivo.
- Diff removendo/desativando caminhos produtivos fictícios.
- Testes que comprovem que exemplos não entram no fluxo oficial.
- Busca final sem caminho produtivo que transforme exemplo em dado real.

## Regra crítica

Não substituir um mock por outro mock. Quando a fonte real não estiver disponível, o sistema deve retornar estado explícito de indisponibilidade/bloqueio.

## Gate

`NO_PRODUCTION_SIMULATION` somente após auditoria final e testes comprovarem a separação entre exemplos e produção.
