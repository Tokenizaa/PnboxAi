# Integração Sebrae PNBOX (PNBOX-INTEGRATION.md)

## Protocolo e Especificações Técnicas
A integração com o **Sebrae PNBOX** é fundamentada em:
1. **Autenticação OIDC**: SSO oficial do Sebrae com geração de cookies de sessão (`connect.sid`, `meteor_login_token`).
2. **Protocolo DDP (Distributed Data Protocol)**: WebSocket rodando sobre SockJS no endpoint `wss://pnbox.sebrae.com.br/sockjs/websocket`.
3. **Persistência MongoDB**: 14 coleções oficiais associadas individualmente pelo campo `idPlano`.

## Matriz das 14 Coleções do PNBOX

| # | Ferramenta | Coleção MongoDB | Campos Críticos |
|---|---|---|---|
| 01 | Segmentação de Mercado | `segmentacaoMercado` | `idPlano`, `descricao`, `segmento`, `variavel1`, `variavel2` |
| 02 | Gerador de Personas | `geradorPersonas` | `idPlano`, `nome`, `idade`, `ocupacao`, `dores`, `objetivos` |
| 03 | Jornada do Cliente | `jornadaCliente` | `idPlano`, `etapa`, `acao`, `pontoContato`, `emocao` |
| 04 | Proposta de Valor | `propostaValor` | `idPlano`, `tarefasCliente`, `dores`, `ganhos`, `produtosServicos` |
| 05 | Análise da Concorrência | `analiseConcorrencia` | `idPlano`, `nomeConcorrente`, `pontosFortes`, `pontosFracos` |
| 06 | Forças e Fraquezas | `forcasFraquezas` | `idPlano`, `tipo`, `fator`, `grau`, `acao` |
| 07 | Oportunidades e Ameaças | `oportunidadesAmeacas` | `idPlano`, `tipo`, `fator`, `impacto`, `probabilidade` |
| 08 | Análise SWOT | `analiseSwot` | `idPlano`, `quadrante`, `item`, `estrategia` |
| 09 | Investimento Fixo | `investimentoFixo` | `idPlano`, `descricao`, `quantidade`, `valorUnitario`, `valorTotal` |
| 10 | Investimento Pré-Operacional | `investimentoPreOperacional` | `idPlano`, `descricao`, `valor` |
| 11 | Estoque Inicial | `estoqueInicial` | `idPlano`, `descricao`, `quantidade`, `custoUnitario`, `total` |
| 12 | Capital de Giro | `capitalGiro` | `idPlano`, `contasReceberDias`, `estoqueDias`, `fornecedoresDias` |
| 13 | Custos Fixos Mensais | `custoFixo` | `idPlano`, `descricao`, `valorMensal` |
| 14 | Produtos e Serviços | `produtoServico` | `idPlano`, `nome`, `precoVenda`, `custoVariavel`, `estimativaVendas` |

## Ciclo de Vida de Sincronização DDP
1. `DDP Connect`: handshake com versão `1` e `support: ["1", "pre2", "pre1"]`.
2. `DDP Method Call`: chamadas para `<collection>.insert`, `<collection>.update` e `<collection>.remove`.
3. `DDP Subscriptions`: escuta de publicações ativas do plano para atualização de estado em tempo real.
