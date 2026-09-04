# AUDITORIA FORENSE — INTEGRAÇÃO BIDIRECIONAL PNBOX SEBRAE ↔ PNBOXAI

**Data da Auditoria:** 04 de Setembro de 2026  
**Ambiente:** PnboxAi Full-Stack (Node.js/Express + React/Vite + Playwright + WebSocket DDP + Supabase)  
**Alvo:** Integração com o portal oficial Sebrae PNBOX (`https://pnbox.sebrae.com.br`)  
**Metodologia:** Investigação forense estática e dinâmica de código-fonte, mapeamento de contratos, rastreamento de chamadas de rede, análise de protocolos (OIDC, Meteor DDP, HTTP) e verificação de ciclo de vida de dados ponta a ponta.

---

## 1. VEREDITO

### **CLASSIFICAÇÃO: BLOCKED**

A integração entre o **PnboxAi** e o **Sebrae PNBOX** **NÃO É BIDIRECIONAL**. 

Embora o PnboxAi possua uma infraestrutura real e funcional de **autenticação OIDC via Playwright** (`oidcPnboxPlaywright.ts`) e um cliente real de **WebSocket DDP Meteor** (`ddpClient.ts`, `realRunner.ts`), o sistema atualmente opera como um **emissor unidirecional de dados (Write-Only)** com dados de projetos e ferramentas originados de templates locais e `localStorage`.

### Resumo das Constatações Forenses:

1. **Leitura de Projetos (PNBOX → PnboxAi): INEXISTENTE (0% implementado).**  
   Quando o usuário conecta sua conta real do PNBOX, o PnboxAi **não consulta** a lista de projetos reais do usuário no PNBOX. Os projetos exibidos na tela de planos (`PnboxPlansView`, `PlanSwitcherModal`, `App.tsx`) são carregados de um array hardcoded no código (`PLANOS_EXEMPLO_INICIAIS` em `src/utils/planUtils.ts`), persistidos no `localStorage` do navegador.
2. **Leitura de Ferramentas (PNBOX → PnboxAi): INEXISTENTE (0% implementado).**  
   O PnboxAi **não possui nenhuma subscrição DDP** (`Meteor.subscribe`) nem endpoint de consulta para carregar os registros já existentes nas 14 ferramentas de um plano do PNBOX. O método `client.subscribe()` em `ddpClient.ts` nunca é invocado em nenhum lugar do codebase.
3. **Persistência de Edição Individual (PnboxAi → PNBOX): NÃO CONECTADA.**  
   Quando o usuário abre uma ferramenta na tela detalhada (`PnboxToolDetailView`) e edita ou adiciona um item clicando em "Salvar", a função `handleSaveToolItems` em `App.tsx` atualiza **apenas o estado React e o `localStorage`**. Nenhuma requisição HTTP ou mensagem DDP é enviada ao PNBOX.
4. **Sincronização em Lote (PnboxAi → PNBOX): PARCIAL / UNIDIRECIONAL (Apenas Insert).**  
   O único mecanismo que envia dados ao PNBOX é o botão "Sincronizar no Sebrae" (`POST /api/automation/fill-batch`). No modo `LIVE`, ele utiliza `realRunner.ts` para enviar métodos DDP `${collection}.insert`. Ele **nunca executa `.update`** (apenas cria novos registros) e **nunca relê** do PNBOX para confirmar se a gravação persistiu. Além disso, há um descompasso de contrato no frontend (`App.tsx` envia `{ dados }` enquanto `server.ts` espera `{ customData }`).
5. **Falsificação de Tráfego Detectada (Mocks de Rede):**  
   - Na inicialização do servidor (`server.ts:267`), a função `popularEventosIniciaisDescoberta()` injeta eventos falsos de subscrição DDP e inserção no `trafficMonitor`.
   - Na rota `POST /api/automation/planos/create` (`server.ts:1526`), o sistema registra um evento falso de `wss://pnbox.sebrae.com.br/websocket [planos.insert]` no monitor de tráfego, embora o plano tenha sido salvo apenas em um array em memória local (`PLANOS_CRIADOS`), sem qualquer comunicação com o PNBOX.
   - Na rota `POST /api/automation/execute-direct` (`server.ts:1269`), IDs aleatórios (`doc_...`) são gerados localmente e registrados como tráfego DDP real.

---

## 2. MAPA GERAL DA INTEGRAÇÃO ATUAL (FASE 1)

| Operação | Frontend (Origem) | Backend (API) | Serviço / Módulo | PNBOX Real (Destino) | Persistência Real | Status Forense |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Conectar Conta PNBOX** | `PnboxConnectionTimeline` | `POST /api/pnbox/connect` | `oidcPnboxPlaywright.ts` | `amei.sebrae.com.br` / `pnbox.sebrae.com.br` | Supabase (`pnbox_credentials`) | **REAL** (Playwright OIDC headless) |
| **Listar Projetos do Usuário** | `PnboxPlansView` / `App.tsx` | Nenhuma chamada a PNBOX | `planUtils.ts:carregarPlanosSalvos` | **NÃO CONSULTA** | `localStorage` (`pnbox_saved_plans`) | **FAKE / LOCAL** (Carrega `PLANOS_EXEMPLO_INICIAIS`) |
| **Listar Projetos (CRUD)** | `PlansContext.tsx` | `GET /api/plans` | `server.ts:getUserPlans` | **NÃO CONSULTA** | Memória do servidor (`USER_PLANS` Map) | **LOCAL APENAS** (Não consulta PNBOX) |
| **Criar Novo Projeto** | `AiPlanCreatorStudio` | `POST /api/automation/planos/create` | `server.ts:PLANOS_CRIADOS` | **NÃO ENVIA** (Gera falso tráfego DDP) | Memória do servidor (`PLANOS_CRIADOS`) | **SIMULADO** (Falso evento DDP registrado) |
| **Criar Novo Projeto (CRUD)** | `PlansContext.tsx` | `POST /api/plans` | `server.ts:USER_PLANS` | **NÃO ENVIA** | Memória do servidor (`USER_PLANS` Map) | **LOCAL APENAS** (Não envia ao PNBOX) |
| **Ler Dados das 14 Ferramentas** | `PnboxToolsMatrix` / `PnboxToolDetailView` | Nenhuma chamada a PNBOX | `App.tsx:planoAtivo.dados14Ferramentas` | **NÃO CONSULTA** | `localStorage` / Sintetizado por IA | **INEXISTENTE** (Zero leitura DDP) |
| **Editar/Salvar Item de Ferramenta** | `PnboxToolDetailView` | Nenhuma chamada a PNBOX | `App.tsx:handleSaveToolItems` | **NÃO ENVIA** | `localStorage` (`salvarPlanoNoHistorico`) | **LOCAL APENAS** (Nenhum tráfego de rede) |
| **Sincronizar em Lote no PNBOX** | `PnboxNavbar` ("Sincronizar no Sebrae") | `POST /api/automation/fill-batch` | `realRunner.ts:executarFerramentaNoPnbox` | `wss://pnbox.sebrae.com.br/websocket` | Servidor Meteor do PNBOX (MongoDB) | **REAL (Write-Only)** no modo `LIVE` / **MOCK** no modo `DRY_RUN` |
| **Executar Ferramenta Direta** | Teste de Desenvolvedor | `POST /api/automation/execute-direct` | `server.ts:1235` | **NÃO ENVIA** (Gera docId aleatório) | Monitor de tráfego em memória | **SIMULADO** (Simulador local com latência fake) |
| **Excluir Projeto** | `PlansContext.tsx` | `DELETE /api/plans/:id` | `server.ts:841` | **NÃO ENVIA** | Memória do servidor (`USER_PLANS` Map) | **LOCAL APENAS** (Sem deleção no PNBOX) |

---

## 3. INVESTIGAÇÃO DO FLUXO DE LOGIN (FASE 2)

### 3.1 Arquitetura de Autenticação
O Sebrae PNBOX utiliza autenticação federada com o Keycloak da AMEI Sebrae (`https://amei.sebrae.com.br`) configurado com `response_mode=fragment`. O token OIDC é emitido via fragmento de URL (`#code=...`), inviabilizando um fluxo REST puro sem renderizador JavaScript.

### 3.2 Execução Real via Playwright Headless
O arquivo `src/automation/oidcPnboxPlaywright.ts` implementa uma automação real:
1. Dispara o Chromium headless (`launchChromiumSafely`).
2. Acessa `https://pnbox.sebrae.com.br/`.
3. Detecta o botão "Entrar" e navega para o SSO Keycloak (`amei.sebrae.com.br`).
4. Preenche CPF e senha nos campos `input[name="username"]` e `input[name="password"]`.
5. Submete o formulário e aguarda o redirect de volta ao domínio `pnbox.sebrae.com.br`.
6. Avalia `localStorage` no browser para extrair:
   - `Meteor.loginToken`
   - `Meteor.userId`
   - `Meteor.loginTokenExpires`
7. Captura os cookies de sessão de `pnbox.sebrae.com.br`.
8. Encerra o processo do navegador (`page.close()`, `context.close()`, `browser.close()`).

### 3.3 Veredito do Login: **REAL**
- A autenticação é autêntica e suporta contas oficiais do Sebrae.
- As credenciais são encriptadas com chave derivada e armazenadas na tabela `pnbox_credentials` do Supabase.
- A sessão em memória é isolada por usuário (`userSessions.set(userId, sessao)` em `auth.ts`).
- **Limitação:** Ao concluir o login com sucesso, o sistema **não dispara nenhuma rotina para importar os projetos da conta recém-autenticada**.

---

## 4. DESCOBERTA DO PROTOCOLO DO PNBOX (FASE 3)

O Sebrae PNBOX é construído sobre o framework **Meteor.js**, utilizando o protocolo **DDP (Distributed Data Protocol)** sobre WebSocket no endpoint:
```text
wss://pnbox.sebrae.com.br/websocket
```

### 4.1 Como o PNBOX Real Disponibiliza Projetos e Ferramentas:
- **Handshake Inicial:** Mensagem DDP `{ "msg": "connect", "version": "1", "support": ["1", "pre2", "pre1"] }`.
- **Autenticação:** Chamada de método `{ "msg": "method", "method": "login", "params": [{ "resume": loginToken }], "id": "..." }`.
- **Coleções do PNBOX (MongoDB):**
  - Projetos: Coleção `planos`.
  - Ferramentas (14 coleções): `segmentacaoMercado`, `geradorPersonas`, `jornadaCliente`, `propostaValor`, `analiseConcorrencia`, `forcasFraquezas`, `oportunidadesAmeacas`, `analiseSwot`, `investimentoFixo`, `produtoServico`, `custoFixo`, `dre`, `capitalGiro`, `indicadoresFinanceiros`.
- **Publicações e Subscrições (Leitura Reativa):**
  - Para listar projetos: `Meteor.subscribe('planos.user')` ou `Meteor.subscribe('planos')`.
  - Para carregar ferramentas de um projeto: `Meteor.subscribe(`${collectionName}.default`, { idPlano })`.
  - O servidor envia mensagens `{ "msg": "added", "collection": "planos", "id": "...", "fields": { ... } }` seguidas de `{ "msg": "ready", "subs": ["..."] }`.

### 4.2 Lacuna Crítica no PnboxAi:
O cliente `DdpClient` (`src/automation/ddpClient.ts`) possui métodos prontos para `subscribe(name, params)` e escuta de eventos `added`, `changed`, `removed`. No entanto:
- **Nenhum arquivo em todo o backend ou frontend invoca `ddpClient.subscribe()`**.
- O sistema nunca subscreve a `planos` ou a qualquer uma das 14 ferramentas para leitura.

---

## 5. PROJETOS REAIS: ANÁLISE DE LEITURA (FASES 4 E 5)

### 5.1 O que o Usuário Vê no PnboxAi:
Quando o usuário conecta sua conta real do PNBOX, a interface continua exibindo os seguintes 4 projetos pré-carregados:

| # | ID do Projeto no PnboxAi | Nome Exibido no PnboxAi | Origem do Dado | Existe no PNBOX Real? |
| :- | :--- | :--- | :--- | :--- |
| 1 | `HCOQIkjSk97gGcfGDPb0h` | Defesai/AdeusMultas | `src/utils/planUtils.ts` (linha 9) | ID de um plano de teste antigo |
| 2 | `tokeniza_contratos` | Tokeniza Contratos Inteligentes | `src/utils/planUtils.ts` (linha 21) | NÃO (ID sintético local) |
| 3 | `weedness_cbd` | WeedNess | `src/utils/planUtils.ts` (linha 33) | NÃO (ID sintético local) |
| 4 | `chico_entrega` | Chico Entrega | `src/utils/planUtils.ts` (linha 45) | NÃO (ID sintético local) |

### 5.2 Evidência no Código-Fonte (`src/utils/planUtils.ts`):
```typescript
// Linhas 7 a 56:
export const PLANOS_EXEMPLO_INICIAIS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO_SISTEMA,
    nomePlano: 'Defesai/AdeusMultas',
    ...
  },
  {
    idPlano: 'tokeniza_contratos',
    nomePlano: 'Tokeniza Contratos Inteligentes',
    ...
  },
  ...
];

// Linha 122:
export function carregarPlanosSalvos(): PlanoCriadoInfo[] {
  try {
    const data = localStorage.getItem(STORAGE_KEY);
    if (data) {
      ...
    }
  } catch (e) { ... }
  return PLANOS_EXEMPLO_INICIAIS;
}
```

### 5.3 Veredito da Leitura de Projetos: **FALHA TOTAL (0% REAL)**
- **Os projetos existentes na conta PNBOX do usuário NUNCA são carregados.**
- Não existe chamada de API nem subscrição WebSocket para buscar projetos remotos.
- O usuário fica restrito a gerenciar os planos locais em cache ou planos gerados localmente via IA.

---

## 6. MODELO CANÔNICO E MAPEAMENTO (FASE 6)

O arquivo `src/automation/schemaCatalog.ts` cataloga com precisão cirúrgica os schemas das 14 ferramentas do PNBOX:
- Mapeia nomes de coleções Meteor (`segmentacaoMercado`, `geradorPersonas`, etc.);
- Mapeia nomes de métodos DDP (`.insert`, `.update`, `.remove`);
- Mapeia campos obrigatórios e opcionais.

No entanto:
- **Existe apenas Mapper de Saída (Frontend/IA → PNBOX payload)** (`schemaGenerator.ts`).
- **Não existe Mapper de Entrada (PNBOX MongoDB document → PnboxAi Canonical Model)**, pois nenhuma mensagem `added` do DDP é consumida para alimentar o estado da aplicação.

---

## 7. AUDITORIA DO SAVE E PERSISTÊNCIA (FASES 7, 8 E 19)

### 7.1 Edição Manual de Ferramentas
No componente `PnboxToolDetailView.tsx`, a edição ou exclusão de itens de uma ferramenta executa o handler `onSaveItems`:

```typescript
// src/App.tsx (linhas 430-445):
const handleSaveToolItems = (novosItems: Record<string, unknown>[]) => {
  const dadosAtuais = planoAtivo.dados14Ferramentas || {};
  const dadosAtualizados = {
    ...dadosAtuais,
    [ferramentaAtivaId]: novosItems
  };

  const planoAtualizado: PlanoCriadoInfo = {
    ...planoAtivo,
    dados14Ferramentas: dadosAtualizados,
    ferramentasPreenchidas: Math.max(planoAtivo.ferramentasPreenchidas || 0, Object.keys(dadosAtualizados).length)
  };

  const novosPlanos = salvarPlanoNoHistorico(planoAtualizado);
  setPlanos(novosPlanos);
};
```

**Evidência Forense:**
- Nenhuma requisição HTTP (`fetch` ou `axios`) é feita.
- Nenhuma mensagem DDP é transmitida.
- O dado é gravado **exclusivamente no `localStorage` do navegador**.
- O botão "Salvar" dentro do detalhe da ferramenta dá a ilusão de persistência, mas a gravação é estritamente local.

### 7.2 Sincronização em Lote ("Sincronizar no Sebrae")
Quando o usuário clica em "Sincronizar no Sebrae" (`handleSyncAllToSebrae` em `App.tsx:273`):
1. O frontend envia `POST /api/automation/fill-batch`.
2. No backend (`server.ts:1112`), se `modo === 'LIVE'`, obtém a sessão do usuário (`obterSessaoUsuario(userId)`).
3. Invoca `executarFerramentaReal` (`realRunner.ts:218`).
4. `realRunner.ts` conecta ao WebSocket DDP `wss://pnbox.sebrae.com.br/websocket`, autentica via `loginWithToken` e executa:
   ```typescript
   // realRunner.ts (linha 281):
   const result = await ddp.call(metodo, [payload]);
   ```
   onde `metodo` é `${ferramenta.collectionName}.insert`.

**Veredito da Escrita:**
- A chamada DDP `.insert` para as coleções do PNBOX é **REAL** quando executada no modo `LIVE`.
- **Porém, falhas estruturais graves impedem o funcionamento correto:**
  1. **Descompasso de Payload:** `App.tsx` envia `{ dados: dadosParaEnviar }`, enquanto `server.ts:1114` lê `{ customData }`. Com isso, `customData` é `undefined` e o backend envia os dados estáticos do template `defesai_adeus_multas` em vez do que o usuário editou ou gerou com IA.
  2. **Apenas Insert:** O método chamado é sempre `.insert`. Se o plano já possui registros no PNBOX, o sistema não executa `.update` e pode causar duplicação ou falha por violação de unicidade no MongoDB do Sebrae.
  3. **Ausência de Releitura de Confirmação:** O sistema nunca faz uma consulta posterior para verificar se o documento realmente persiste no PNBOX.

---

## 8. RELOAD E SINCRONIZAÇÃO INVERSA (FASES 9 E 10)

| Cenário de Teste | Comportamento Observado | Comportamento Esperado | Veredito |
| :--- | :--- | :--- | :--- |
| **F5 / Reload no PnboxAi** | Carrega dados salvos em `localStorage`. Nenhuma chamada ao PNBOX. | Revalidar estado com o PNBOX real e sincronizar deltas. | **PARCIAL (Cache local)** |
| **Alteração Direta no Portal PNBOX** | Usuário altera dados no site `pnbox.sebrae.com.br`. PnboxAi recarregado. O PnboxAi **não reflete** a alteração. | PnboxAi deve ler os dados atualizados do PNBOX e refletir no card. | **FALHA TOTAL (Sem sync inverso)** |
| **Novo Projeto Criado no PNBOX** | Usuário cria projeto no portal oficial. O projeto **não aparece** no PnboxAi. | O projeto deve ser listado na tela de planos do PnboxAi. | **FALHA TOTAL (Sem sync inverso)** |

---

## 9. MATRIZ DAS 14 FERRAMENTAS DO PNBOX (FASE 11)

| # | Ferramenta PNBOX | Collection Meteor | Ler do PNBOX | Renderizar no PnboxAi | Edição Local | Salvar no PNBOX | Releitura de Confirmação |
| :- | :--- | :--- | :-: | :-: | :-: | :-: | :-: |
| 1 | Segmentação de Mercado | `segmentacaoMercado` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 2 | Gerador de Personas | `geradorPersonas` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 3 | Jornada do Cliente | `jornadaCliente` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 4 | Proposta de Valor | `propostaValor` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 5 | Análise da Concorrência | `analiseConcorrencia` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 6 | Forças e Fraquezas | `forcasFraquezas` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 7 | Oportunidades e Ameaças | `oportunidadesAmeacas` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 8 | Análise SWOT | `analiseSwot` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 9 | Investimento Fixo | `investimentoFixo` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 10 | Produtos e Serviços | `produtoServico` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 11 | Custos Fixos | `custoFixo` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 12 | Demonstrativo de Resultados | `dre` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 13 | Capital de Giro | `capitalGiro` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |
| 14 | Indicadores Financeiros | `indicadoresFinanceiros` | ❌ NÃO | ✅ SIM (Local) | ✅ SIM (Local) | ⚠️ Apenas via Batch Insert | ❌ NÃO |

---

## 10. CRIAÇÃO E EXCLUSÃO DE PROJETOS (FASES 12 E 13)

### 10.1 Criação de Novo Projeto (`POST /api/automation/planos/create`):
Em `server.ts` (linhas 1501-1565):
- O backend recebe `nomePlano`, `setor`, `descricao`, etc.
- Gera um ID local (`plano_...`).
- Adiciona o objeto no array em memória `PLANOS_CRIADOS.unshift(novoPlano)`.
- **Em seguida, simula artificialmente uma chamada DDP:**
  ```typescript
  // server.ts (linhas 1526-1557):
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: 'wss://pnbox.sebrae.com.br/websocket [planos.insert]',
    status: 200,
    duracaoMs: 42,
    payloadEnviado: {
      msg: 'method',
      method: 'planos.insert',
      params: [ ... ],
      id: ddpReqId
    },
    respostaRecebida: {
      msg: 'result',
      id: ddpReqId,
      result: idGerado
    },
    operacaoDetectada: {
      acao: 'insert',
      collection: 'planos'
    }
  });
  ```
- **Evidência Forense:** O endpoint **nunca abriu um socket WebSocket** nem chamou o PNBOX real. Ele simplesmente forjou um registro no `trafficMonitor` para que a aba "Monitor de Tráfego" mostrasse um evento verde de sucesso!
- **Conclusão:** O projeto **NÃO é criado no PNBOX**.

### 10.2 Exclusão de Projeto:
- `PlansContext.tsx:deletePlan` chama `DELETE /api/plans/:id`.
- `server.ts:841` remove o plano do mapa em memória `USER_PLANS`.
- Nenhuma chamada DDP (`planos.remove`) ou HTTP é enviada ao PNBOX.

---

## 11. MULTIUSUÁRIO E SESSÃO (FASES 14 E 15)

### 11.1 Isolamento no Backend
- `auth.ts:userSessions` é um `Map<string, SessaoPnbox>` indexado por `userId`.
- `server.ts:USER_PLANS` é um `Map<string, UserPlan[]>` indexado por `userId`.
- No backend, as credenciais e sessões de usuários diferentes estão isoladas.

### 11.2 Vazamento no Frontend (`App.tsx`)
- O estado principal de planos em `App.tsx` (`const [planos, setPlanos] = useState(() => carregarPlanosSalvos())`) consome a chave `'pnbox_saved_plans'` do `localStorage`.
- Se o Usuário A deslogar da plataforma e o Usuário B fizer login no mesmo navegador, o Usuário B verá exatamente os mesmos planos locais que o Usuário A visualizava.

---

## 12. INVENTÁRIO DE MOCKS, FALLBACKS E FALSOS SUCESSOS (FASES 17 E 18)

| Arquivo / Linha | Elemento Falso Detectado | Comportamento Real |
| :--- | :--- | :--- |
| `server.ts:267` | `popularEventosIniciaisDescoberta(ID_PLANO_PADRAO)` | Injeta eventos de subscrição DDP pré-fabricados no monitor de tráfego assim que o servidor inicia. |
| `server.ts:1526-1557` | Simulação de DDP em `/api/automation/planos/create` | Falsifica uma resposta DDP `{ msg: "result", result: idGerado }` no monitor de tráfego sem conectar ao PNBOX. |
| `server.ts:1269-1290` | Simulação em `/api/automation/execute-direct` | Gera `doc_` aleatório e registra falso tráfego DDP com latência de `Math.random()`. |
| `officialRunner.ts:111` | `sebrae_doc_${Math.random()}` | Gera IDs de documentos fictícios e finge gravação no PNBOX no modo `DRY_RUN`. |
| `src/utils/planUtils.ts:7-56` | `PLANOS_EXEMPLO_INICIAIS` | Lista fixa de 4 planos fictícios injetada no `localStorage`. |
| `App.tsx:430` | `handleSaveToolItems` | Altera apenas `localStorage` e exibe feedback de sucesso, sem persistência remota. |

---

## 13. CLASSIFICAÇÃO DE FALHAS (FASE 15)

### CRITICAL (Impedem a integração bidirecional)
1. **Ausência de Pipeline de Leitura DDP:** Não existe subscrição DDP (`Meteor.subscribe`) nem parser de mensagens `added` para ler planos e ferramentas do PNBOX.
2. **Projetos Hardcoded:** A interface depende de `PLANOS_EXEMPLO_INICIAIS` e `localStorage`, ignorando completamente os projetos reais do titular da conta PNBOX.
3. **Falsificação de Tráfego de Criação de Planos:** `/api/automation/planos/create` simula uma chamada DDP no monitor de tráfego sem enviar dados ao PNBOX.
4. **Descompasso de Contrato no Batch Sync:** `App.tsx` envia `{ dados }`, enquanto `server.ts` lê `{ customData }`, provocando descarte silencioso dos dados reais e injeção do template padrão.

### HIGH
5. **Edição Unidirecional em Cache:** Salvar ferramenta em `PnboxToolDetailView` não propaga alterações ao backend nem ao PNBOX.
6. **Inexistência de Mutation Update:** O runner real executa apenas `.insert`, gerando potenciais duplicidades no PNBOX e incapacidade de atualizar registros preexistentes.
7. **Falta de Isolamento de Usuário no `localStorage`:** A chave de planos não é prefixada por `userId`.

### MEDIUM
8. **Monitor de Tráfego Pré-populado:** Eventos sintéticos inseridos na inicialização poluem os logs forenses.
9. **Falta de Releitura de Confirmação:** O sistema confia no retorno do DDP method sem efetuar um read-after-write.

---

## 14. PLANO DE CORREÇÕES NECESSÁRIAS (FASE 16)

Para que a integração seja promovida a **READY**, as seguintes etapas de engenharia devem ser implementadas:

### Etapa 1: Implementar o Leitor de Projetos DDP (PNBOX → PnboxAi)
- No `realRunner.ts` (ou novo módulo `pnboxReader.ts`), criar função `listarPlanosPnbox(authContext: DdpAuthContext): Promise<PlanoCriadoInfo[]>`.
- Utilizar `ddp.subscribe('planos.user')` (ou subscrição oficial equivalente) para receber os documentos da collection `planos`.
- Coletar as mensagens `added` recebidas pelo socket DDP até o evento `ready`.
- Retornar a lista real de planos do usuário e atualizar a UI.

### Etapa 2: Implementar o Leitor de Ferramentas DDP (PNBOX → PnboxAi)
- Criar função `carregarFerramentaPnbox(idPlano: string, collectionName: string, authContext: DdpAuthContext): Promise<Record<string, unknown>[]>`.
- Subscrever a `${collectionName}.default` passando `{ idPlano }`.
- Coletar os registros reais salvos no MongoDB do PNBOX e popular `dados14Ferramentas`.

### Etapa 3: Implementar Persistência Granular (Update e Insert)
- Criar endpoint `POST /api/automation/tool-save` que receba `idPlano`, `ferramentaId` e os itens atualizados.
- Se o registro possui `_id`, chamar `${collectionName}.update`. Se for novo, chamar `${collectionName}.insert`.
- Conectar o botão "Salvar" de `PnboxToolDetailView` a esse endpoint.

### Etapa 4: Corrigir Descompasso de Contrato no Batch Sync
- Corrigir `App.tsx` para enviar `{ customData: dadosParaEnviar }` em `handleSyncAllToSebrae`.

### Etapa 5: Eliminar Mocks e Falsificações de Tráfego
- Remover `popularEventosIniciaisDescoberta` em `server.ts:267`.
- Atualizar `/api/automation/planos/create` para chamar `ddp.call('planos.insert', [...])` real via `realRunner.ts`.

---

## 15. DECLARAÇÃO FORENSE CONCLUSIVA

> **"Não é possível afirmar que o projeto X foi lido do PNBOX real, renderizado no PnboxAi, editado e salvo com sucesso no PNBOX com confirmação de leitura. O PnboxAi atualmente carrega planos mockados do `localStorage`, simula eventos DDP no monitor de tráfego e possui apenas um canal unidirecional de escrita em lote via DDP `.insert`, sem qualquer mecanismo de leitura de projetos ou sincronização reversa a partir do Sebrae PNBOX."**

**Status da Integração:** `BLOCKED` até a implementação dos leitores DDP e reconciliação bidirecional.
