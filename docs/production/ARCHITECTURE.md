# Arquitetura do PNBOX AI

## Visão Geral
O **PNBOX AI** é uma plataforma full-stack desenvolvida para automação, orquestração e síntese profunda de dados empresariais com sincronização bidirecional em tempo real no **Sebrae PNBOX**.

```
┌─────────────────────────────────────────────────────────────┐
│                 Frontend React 19 + Vite                    │
│      (Dashboard, Matriz 14 Ferramentas, Copilot AI)         │
└──────────────────────────────┬──────────────────────────────┘
                               │ HTTP / JSON / SSE
┌──────────────────────────────▼──────────────────────────────┐
│                   Backend Express Node.js                    │
│   ├─ Security Middleware (Headers, Rate Limiting, Sanitizer)│
│   ├─ Auth Middleware & RBAC (Isolamento por Usuário/Plano)  │
│   ├─ Deep Research V2 Engine (Gemini / Provedor Oficial)    │
│   ├─ PNBOX DDP Adapter (Meteor DDP Client & Mapper Canônico)│
│   └─ Connection Job Worker (Orquestrador Assíncrono com SSE)│
└──────────────────────────────┬──────────────────────────────┘
                               │ WebSocket / DDP (SockJS)
┌──────────────────────────────▼──────────────────────────────┐
│               Sebrae PNBOX Oficial (Meteor DDP)              │
│       14 Coleções MongoDB & Métodos Oficiais de CRUD         │
└─────────────────────────────────────────────────────────────┘
```

## Componentes Principais

### 1. Frontend
- **Interface SPA**: React 19, Tailwind CSS, Lucide Icons, Recharts.
- **Painel de Controle**:
  - `PnboxPlansView`: Lista exclusiva de planos reais retornados do PNBOX oficial.
  - `PnboxToolsMatrix`: Visualização matricial das 14 ferramentas oficiais do Sebrae.
  - `PnboxToolDetailView`: Editor e validador schema-compliant com diff e status de persistência.
  - `PnboxAiCopilotDrawer`: Assistente contextual para refinamento de planos e ferramentas.
  - `PnboxBackendSettingsModal`: Configuração de credenciais e telemetria de tráfego.

### 2. Camada de Segurança e Autorização
- **Isolamento por Usuário**: Cada usuário possui seu namespace de dados, planos e jobs.
- **`requireUserOwnsPlan`**: Middleware rigoroso que impede que o Usuário A acesse, leia ou envie payloads para o plano do Usuário B.
- **Bloqueio de IDs Sintéticos**: Qualquer ID começando com `plano_` ou `:idPlano` é imediatamente rejeitado com `PNBOX_REAL_PLAN_REQUIRED`.
- **Bloqueio de Criação Não Comprovada**: `BLOCKED_EXTERNAL_CONTRACT` congela criação de instâncias de planos remotos via DDP até comprovação oficial do contrato Sebrae.

### 3. Motor de Pesquisa com IA (Deep Research V2)
- **DAG de Pesquisa**: Decomposição em tarefas concorrentes (`ResearchPlannerAgent`, `BusinessAnalyzer`).
- **Armazenamento de Evidências**: `EvidenceStore` rastreia a proveniência e confiabilidade de cada alegação (Claims & Sources).
- **Políticas Anti-Alucinação**: Rejeição de valores financeiros estimados sem fonte e proibição de taxas arbitrárias.

### 4. Integração DDP e Mapper Canônico
- **Mapeador Canônico (`PnboxAdapter`)**: Mapeia modelos canônicos para as 14 coleções Mongo exatas do PNBOX.
- **Catálogo de Schemas (`schemaCatalog`)**: Validação de campos obrigatórios, tipos e restrições antes de qualquer transmissão para o Sebrae.
