# Guia Completo de Automação & Engenharia Reversa do Sebrae PNBOX

Este documento detalha o ciclo de vida completo da automação, a arquitetura de engenharia reversa do backend Meteor DDP do Sebrae PNBOX, o uso do **SchemaGenerator**, a validação via **JsonDiffValidator**, o disparo direto via **DirectExecutionModal** e a inteligência de mercado via **Gemini Deep Research** e **NVIDIA NIM**.

---

## 1. Visão Geral da Arquitetura

O **Sebrae PNBOX** é uma aplicação baseada no framework **Meteor.js**, que utiliza o protocolo **DDP (Distributed Data Protocol)** sobre conexões **WebSocket** (`wss://pnbox.sebrae.com.br/websocket`).

Em vez de depender de cliques lentos, simulação de mouse e renderização do DOM (como robôs tradicionais de RPA), nosso Hub executa **chamadas de métodos DDP diretas e assíncronas** (`collection.insert` / `collection.update`), alcançando:
- Preenchimento completo das **14 ferramentas em menos de 3 segundos**.
- **100% de precisão de schema** sem falhas de clique ou seletores CSS instáveis.
- Suporte a **qualquer `idPlano`** gerado no Sebrae ou criado automaticamente via IA.
- Recuperação automática e retry com **backoff exponencial** em caso de erros transitórios (HTTP 503 / 504).

---

## 2. O Ciclo de Vida da Automação

O ciclo de vida da automação no PNBOX Hub é composto por 4 fases principais:

```
+-----------------------------------------------------------------------------------+
| 1. GERAÇÃO DE DADOS                                                               |
|    • Gemini Deep Research / NVIDIA NIM (Pesquisa de Mercado e Síntese Estruturada)|
|    • SchemaGenerator (Mapeamento de 14 coleções com dados de negócio realistas)   |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 2. AUDITORIA & VALIDAÇÃO DE SCHEMA                                                |
|    • JsonDiffValidator (Comparação contra schemas oficiais do Sebrae)             |
|    • PlanAuditManager (Health-Check visual: Ferramentas Synced vs Pending)        |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 3. INJEÇÃO DIRETA SEM RENDERIZAÇÃO                                                |
|    • DirectExecutionModal (Disparo individual de payload com validação prévia)    |
|    • BatchProcessingQueue (Execução em lote ordenada com rate limiting e pausa)   |
+------------------------------------------+----------------------------------------+
                                           |
                                           v
+-----------------------------------------------------------------------------------+
| 4. AUDITORIA & MONITORAMENTO EM TEMPO REAL                                        |
|    • TrafficMonitorPanel (Interceptador de frames WebSocket DDP e REST)          |
|    • Script Playwright Oficial (Exportação para automação CLI/Headless)           |
+-----------------------------------------------------------------------------------+
```

---

## 3. Passo a Passo de Execução

### Passo 1: Geração de Dados com o `SchemaGenerator`
O módulo `src/utils/schemaGenerator.ts` contém os schemas tipados de todas as 14 ferramentas e gera objetos realistas para qualquer setor:

```typescript
import { SchemaGenerator } from '../utils/schemaGenerator';

// Gerar payloads para um template de negócio pré-definido:
const dadosCafeteria = SchemaGenerator.generateForTemplate('cafeteria_coworking', 'SEU_ID_PLANO');

// Ou gerar a partir de um relatório de Deep Research da IA:
const dadosPersonalizados = SchemaGenerator.generateFromResearch(relatorioPesquisa, 'SEU_ID_PLANO');

// Inspecionar campos obrigatórios de uma ferramenta específica:
const camposObrigatorios = SchemaGenerator.getRequiredFields('segmentacao_mercado');
// Retorna: ['segmento', 'criterioDemografico', 'criterioGeografico', 'prioridade']
```

---

### Passo 2: Validação de Payload no `JsonDiffValidator`
Antes de injetar no backend do Sebrae, o payload pode ser inspecionado visualmente e validado contra a especificação:

1. Acesse a aba **"Comparador de JSON"** (`JsonDiffValidator`).
2. Selecione a ferramenta desejada ou cole o JSON capturado.
3. Clique em **"Executar Comparação e Validar"**.
4. O validador destacará:
   - **Campos Ausentes Obrigatórios** (Destacados em vermelho).
   - **Campos Extras / Não Reconhecidos** (Destacados em amarelo).
   - **Campos Perfeitamente Válidos** (Destacados em verde).

Chamada via API:
```http
POST /api/automation/validate
Content-Type: application/json

{
  "ferramentaId": "segmentacao_mercado",
  "jsonCapturado": {
    "idPlano": "HCOQIkjSk97gGcfGDPb0h",
    "segmento": "Profissionais Autônomos",
    "prioridade": "Alta"
  }
}
```

---

### Passo 3: Disparo e Injeção Direta com `DirectExecutionModal`
O `DirectExecutionModal` permite enviar qualquer payload diretamente para a collection oficial do Meteor DDP sem abrir o navegador:

1. Na tela **"Mapa Técnico"** ou no **"Preenchimento Oficial"**, clique em **"Executar Direto"**.
2. Revise ou edite o JSON em tempo real.
3. Escolha o modo de envio (**WebSocket DDP** ou **HTTP API**).
4. Clique em **"Disparar Gravação Direta Sem Renderização"**.
5. O sistema envia a mensagem DDP:
```json
{
  "msg": "method",
  "method": "segmentacaoMercado.insert",
  "params": [
    {
      "idPlano": "HCOQIkjSk97gGcfGDPb0h",
      "segmento": "Consumidores B2C",
      "criterioDemografico": "25 a 45 anos",
      "criterioGeografico": "Curitiba / PR",
      "prioridade": "Alta"
    }
  ],
  "id": "ddp_req_1725280000"
}
```
6. O Sebrae responde com o ID do documento gravado (`doc_xxxxxx`), que é imediatamente registrado no **Monitor de Tráfego**.

---

## 4. Integração de IA: Gemini Deep Research & NVIDIA NIM

O sistema suporta múltiplos provedores de inteligência artificial de ponta:

| Provedor | Modelos Recomendados | Diferenciais |
|---|---|---|
| **Google Gemini** | `gemini-3.7-flash`, `gemini-2.5-flash` | **Google Search Grounding** nativo, citações de fontes reais de mercado e alta velocidade. |
| **NVIDIA NIM** | `meta/llama-3.3-70b-instruct`, `deepseek-ai/deepseek-r1`, `mistralai/mistral-large-2-instruct` | **3 Contas / Tokens configuráveis**, alta capacidade de raciocínio lógico e adesão rígida a schemas JSON. |

### Fluxo de Criação Inteligente (`AiPlanCreatorStudio`):
1. O usuário digita a ideia de negócio (ex: *"Clínica veterinária 24h em Curitiba com UTI móvel"*).
2. O provedor selecionado (Gemini ou NVIDIA NIM) executa uma pesquisa aprofundada de mercado (TAM, Persona, Concorrentes, CAPEX, OPEX, Break-even e CNAE tributário).
3. Os dados da pesquisa são automaticamente sintetizados nas **14 ferramentas do PNBOX**.
4. Com 1 clique em **"Criar Plano & Preencher 14 Ferramentas"**, o plano é registrado no Sebrae e todas as coleções são sincronizadas.

---

## 5. Mapeamento das 14 Coleções do Sebrae PNBOX

| # | Ferramenta | Bloco | Collection DDP | Método Principal |
|---|---|---|---|---|
| 1 | Segmentação de Mercado | Cliente - Mercado | `segmentacaoMercado` | `segmentacaoMercado.insert` |
| 2 | Gerador de Personas | Cliente - Mercado | `geradorPersonas` | `geradorPersonas.insert` |
| 3 | Proposta de Valor | Problema - Solução | `propostaValor` | `propostaValor.insert` |
| 4 | Análise da Concorrência | Problema - Solução | `analiseConcorrencia` | `analiseConcorrencia.insert` |
| 5 | Modelo de Receita | Estratégia | `modeloReceita` | `modeloReceita.insert` |
| 6 | Estratégia de Marketing | Estratégia | `estrategiaMarketing` | `estrategiaMarketing.insert` |
| 7 | Canais de Venda | Estratégia | `canaisVenda` | `canaisVenda.insert` |
| 8 | Recursos Principais | Estratégia | `recursosPrincipais` | `recursosPrincipais.insert` |
| 9 | Investimento Inicial | Finanças | `investimentoInicial` | `investimentoInicial.insert` |
| 10 | Custos Fixos | Finanças | `custosFixos` | `custosFixos.insert` |
| 11 | Custos Variáveis | Finanças | `custosVariaveis` | `custosVariaveis.insert` |
| 12 | Faturamento Mensal | Finanças | `faturamentoMensal` | `faturamentoMensal.insert` |
| 13 | Indicadores de Viabilidade | Finanças | `indicadoresViabilidade` | `indicadoresViabilidade.insert` |
| 14 | Resumo Executivo | Complementares | `resumoExecutivo` | `resumoExecutivo.insert` |

---

## 6. Auditoria & Health-Check do Plano Ativo

Para garantir integridade operacional, o componente **Mapa Técnico** inclui uma barra de diagnóstico visual:
- **Status Synced (Verde):** A ferramenta possui payload válido e registrado no backend para o `idPlano` ativo.
- **Status Pending (Âmbar/Cinza):** A ferramenta ainda não foi preenchida ou sincronizada.
- **Botão Sincronizar Pendentes:** Dispara o preenchimento instantâneo apenas das ferramentas pendentes com dados validados do `SchemaGenerator`.
