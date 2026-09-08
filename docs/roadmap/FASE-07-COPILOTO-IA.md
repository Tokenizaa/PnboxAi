# FASE 07 — Copiloto e IA

**Estado:** PLANEJADA — não executada  
**Objetivo:** garantir que IA seja uma camada de sugestão, sem fabricar estado oficial do PNBOX.

## Remoção de dados fictícios

- Remover payloads hardcoded apresentados como dados do negócio.
- Remover SWOT default executável.
- Remover métricas financeiras ou operacionais fictícias.
- Remover progresso, resultados ou datas inventadas.

## Contexto e provider

- Validar a origem de todo contexto enviado à IA.
- Definir provider oficial com base na arquitetura efetivamente adotada.
- Documentar fallback somente se existir e for suportado.
- Impedir escolha arbitrária de provider no runtime.

## Escritas sugeridas pela IA

A IA pode produzir uma `suggestion`, mas o fluxo deve separar essa sugestão do estado persistido. Antes de qualquer commit:

1. validar schema;
2. validar identidade/plano;
3. enviar ao PNBOX real somente se a operação estiver comprovada;
4. confirmar a persistência;
5. marcar como `committed` apenas após confirmação.

## Evidências

- Auditoria dos prompts/payloads hardcoded.
- Testes que diferenciem suggestion de committed data.
- Testes de contexto ausente/inválido.
- Evidência do provider oficial em uso.
- Testes de escrita IA → PNBOX com confirmação.

## Gate

`AI_PRODUCTION_SAFE` quando IA não puder transformar conteúdo inventado em estado oficial e todas as escritas passarem pelo mesmo controle de integridade e confirmação do restante do sistema.
