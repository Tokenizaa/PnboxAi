# FASE 04 — Contrato DDP Real

**Estado:** PLANEJADA — não executada  
**Gate:** contrato externo comprovado por evidência real.

## Objetivo

Separar claramente a infraestrutura DDP já implementada das operações cujo método/publicação/coleção ainda não foi comprovado contra o PNBOX real.

## Descoberta obrigatória

Com sessão autenticada e ambiente controlado:

- Capturar tráfego real do PNBOX.
- Identificar endpoint efetivamente usado.
- Identificar publications reais.
- Identificar methods reais.
- Identificar parâmetros e formatos.
- Identificar respostas e erros reais.
- Identificar coleções realmente utilizadas.
- Confirmar a relação com `idPlano`.
- Confirmar create/update/delete.
- Confirmar subscriptions e eventos.
- Registrar exemplos de resposta sem expor credenciais ou dados sensíveis.

## Estado de implementação

Candidates no código são hipóteses até que a evidência real as confirme. Operações desconhecidas devem permanecer `BLOCKED_EXTERNAL_CONTRACT`.

## Evidências

Cada operação deve registrar:

1. ação executada;
2. endpoint/publication/method observado;
3. parâmetros relevantes;
4. resposta real esperada;
5. erro real, quando aplicável;
6. relação com plano;
7. critério de confirmação;
8. data/ambiente da captura;
9. referência ao artefato de evidência.

## Segurança

Nunca registrar senha, token, cookie, authorization header ou segredo bruto. Sanitizar payloads e respostas antes de armazenar evidências.

## Documentação

Somente depois da confirmação o contrato deve ser tratado como oficial em `docs/production/PNBOX-INTEGRATION.md` ou documento equivalente. Hipóteses devem ser marcadas como hipóteses.

## Gate

`DDP_CONTRACT_VERIFIED` somente quando as operações críticas utilizadas pelo runtime tiverem evidência real suficiente. O que não foi comprovado continua bloqueado.
