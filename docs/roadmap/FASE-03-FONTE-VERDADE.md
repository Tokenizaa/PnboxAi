# FASE 03 — Fonte Única de Verdade

**Estado:** PLANEJADA — não executada  
**Gate:** PNBOX comprovadamente como autoridade dos dados oficiais.

## Objetivo

Garantir que planos e dados das ferramentas sejam obtidos do PNBOX, sem stores locais concorrentes, IDs padrão inventados ou cache usado como autoridade.

## Planos

- Listagem exclusivamente pelo PNBOX.
- Remover stores locais oficiais.
- Remover planos padrão artificiais.
- Remover IDs padrão inventados.
- Cache pode acelerar leitura, mas nunca substituir a fonte oficial.
- Estado offline deve ser explícito.

## Matriz das 14 ferramentas

| # | Ferramenta | Read | Create | Update | Delete | Schema | Contrato comprovado | Teste LIVE |
|---|---|---|---|---|---|---|---|---|
| 01 | Segmentação de Mercado | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 02 | Gerador de Personas | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 03 | Jornada do Cliente | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 04 | Proposta de Valor | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 05 | Análise da Concorrência | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 06 | Forças e Fraquezas | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 07 | Oportunidades e Ameaças | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 08 | Análise SWOT | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 09 | Investimento Fixo | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 10 | Investimento Pré-Operacional | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 11 | Estoque Inicial | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 12 | Capital de Giro | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 13 | Custos Fixos Mensais | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |
| 14 | Produtos e Serviços | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ | ☐ |

## Regra

Código existente não prova suporte. Cada célula só pode ser marcada mediante evidência adequada, especialmente para operações que dependem do contrato DDP.

## Evidências

- Inventário de fontes de dados.
- Prova de que PNBOX é a autoridade.
- Matriz preenchida com evidências por ferramenta/operação.
- Testes de isolamento e de ausência de fallback local.

## Gate

`PNBOX_SOURCE_OF_TRUTH` quando nenhuma fonte local concorrente puder produzir estado oficial e a matriz estiver baseada em evidência, não em inferência.
