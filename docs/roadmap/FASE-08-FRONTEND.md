# FASE 08 — Frontend Honesto

**Estado:** PLANEJADA — não executada  
**Objetivo:** fazer a interface representar exatamente o estado real do backend e do PNBOX.

## Estados obrigatórios

Cada fluxo crítico deve distinguir:

- loading real;
- vazio real;
- erro real;
- sessão expirada;
- plano ausente;
- ferramenta indisponível;
- operação bloqueada;
- execução real em andamento;
- sucesso confirmado;
- sucesso não confirmado.

## Remover

- Botões que chamam operações não suportadas sem informar o usuário.
- Progresso fictício.
- Datas inventadas.
- Planos demo apresentados como reais.
- Status de sucesso antes da confirmação.
- Mensagens que ocultem erro de infraestrutura.

## Evidências

- Matriz de estados por fluxo.
- Testes de UI para sucesso, vazio, erro, expiração e bloqueio.
- E2E comprovando que o estado exibido corresponde ao resultado real.
- Capturas/logs de casos de operação não confirmada.

## Gate

`FRONTEND_HONEST` quando nenhuma interface crítica apresentar como real algo que o backend não confirmou.
