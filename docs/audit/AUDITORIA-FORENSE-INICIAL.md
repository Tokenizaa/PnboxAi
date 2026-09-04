# PNBOXAI — AUDITORIA FORENSE INICIAL

**Data:** 2025-09-03
**Branch:** main
**Commit:** $(git rev-parse HEAD)
**Node:** v24.18.0
**npm:** (pnpm 11.21.0 - com erro de SQLite)
**TypeScript:** 5.8.2
**Build Status:** FALHA (erros de sintaxe)
**Test Status:** NÃO EXECUTADO
**Environment:** Development local
**Database Provider:** Supabase (configurado no .env)
**AI Provider:** NVIDIA (primário), Gemini (fallback)

---

## 1. ARQUITETURA MAPEADA

### 1.1 Estrutura de Diretórios Principais

```
/src
├── ai/                     # Unified AI Provider (NVIDIA + Gemini)
├── agents/                 # 13 agents (orchestrator, research, financial, etc.)
├── automation/             # PNBOX automation (14 tools, schema, DDP, Playwright)
├── components/             # React components (layout, pnbox, forms)
├── contexts/               # React contexts (auth, plan, etc.)
├── hooks/                  # Custom React hooks
├── pages/                  # Page components (Dashboard, Plans, Research, etc.)
├── research/               # Research Engine (agentic, evidence-based)
│   ├── engine/             # SourceEngine, GapAnalyzer, ContradictionAnalyzer
│   ├── evidence/           # EvidenceStore, EvidenceAnalyst
│   ├── planner/            # BusinessAnalyzer, ResearchPlanner, TaskOrchestrator
│   ├── synthesis/          # ResearchSynthesizer
│   └── mappers/            # PnboxAdapter
├── skills/                 # 14 skills (web-research, deep-research, database, etc.)
├── types/                  # TypeScript types
└── utils/                  # Utilities (schemaGenerator, auditUtils, planUtils)
```

### 1.2 Componentes Funcionais Identificados

| Componente | Arquivo Principal | Status |
|------------|-------------------|--------|
| Unified AI Provider | `src/ai/unifiedProvider.ts` | COMPILA |
| Research Engine | `src/research/ResearchEngine.ts` | COMPILA |
| Evidence Store | `src/research/evidence/EvidenceStore.ts` | COMPILA |
| Source Engine | `src/research/engine/SourceEngine.ts` | COMPILA |
| Gap Analyzer | `src/research/engine/GapAnalyzer.ts` | COMPILA |
| Contradiction Analyzer | `src/research/engine/ContradictionAnalyzer.ts` | COMPILA |
| Research Planner | `src/research/planner/ResearchPlanner.ts` | COMPILA |
| Research Synthesizer | `src/research/synthesis/ResearchSynthesizer.ts` | COMPILA |
| Pnbox Adapter | `src/research/mappers/PnboxAdapter.ts` | COMPILA |
| Schema Catalog | `src/automation/schemaCatalog.ts` | COMPILA |
| Schema Validator | `src/automation/schemaValidator.ts` | COMPILA |
| Schema Generator | `src/utils/schemaGenerator.ts` | **ERRO SINTAXE** |
| Real Runner (DDP) | `src/automation/realRunner.ts` | COMPILA |
| Auth System | `src/automation/auth.ts` | COMPILA |
| Server/API | `server.ts` | COMPILA |
| Database Skill | `src/skills/database/index.ts` | COMPILA |
| Web Research Skill | `src/skills/web-research/index.ts` | COMPILA |
| Deep Research Skill | `src/skills/deep-research/index.ts` | COMPILA |

### 1.3 Dependências Críticas

- **@supabase/supabase-js** - Auth + Database
- **@google/genai** - Gemini API
- **express** - API Server
- **playwright** - Browser automation PNBOX
- **NVIDIA NIM API** - Primary AI provider (via fetch)
- **Tavily/Brave/SerpApi** - Web search (configurado via env)

---

## 2. PROBLEMAS CRÍTICOS IDENTIFICADOS (FASE 0)

### 2.1 Build Quebrado - Erros TypeScript

**Arquivo:** `src/utils/schemaGenerator.ts`
- Linha 588: `);` extra (fecha bloco incorretamente)
- Linha 1085: Sintaxe inválida `): Record<string, unknown>[] = [`
- Linha 1181: Sintaxe inválida `): Record<string, unknown>[] = {`
- Linhas 1210, 1214, 1221, 1225: Métodos declarados fora da classe

**Arquivos temporários poluindo o workspace:**
- `temp.ts` - Cópia completa de schemaGenerator.ts (1232 linhas)
- `temp2.ts` - Outra cópia com mesmos erros

### 2.2 Mock Data Extensivo (VIOLAÇÃO FASE 2)

**src/automation/aiProviders.ts** - `executarPesquisaUnificada()` (linhas 283-331):
```typescript
// FALLBACK ESTRUTURADO DE ALTA FIDELIDADE - GERA DADOS FAKE COMPLETOS
if (!parsed || !parsed.nomeNegocioSugerido) {
  parsed = {
    nomeNegocioSugerido: promptNegocio.length > 30 ? `${promptNegocio.substring(0, 25)} & Cia` : `${promptNegocio} Hub`,
    setor: 'Serviços Especializados & Comércio',
    // ... 100+ linhas de dados hardcoded/fake
    concorrentesMapeados: [
      { nome: 'Líder Regional Tradicional', ... },
      { nome: 'Operações de Baixo Custo / Low Cost', ... }
    ],
    buyerPersona: { nome: 'Mariana Silva', ... },
    investimentoEstimado: { capexTotal: orcamentoEstimado || 85000, ... },
    aspectosLegaisTributarios: { cnaeSugerido: 'CNAE Principal e Secundários', ... }
  };
}
```

**src/utils/schemaGenerator.ts** - Gera dados mock completos para 14 ferramentas:
- `generateMockData()` - 14 ferramentas com dados hardcoded por arquétipo
- `generateRandomBatch()` - Gera múltiplos templates aleatórios
- `BUSINESS_ARCHETYPES` - 11 arquétipos com nomes, descrições, valores hardcoded
- Dados financeiros hardcoded: CAPEX, OPEX, ticket médio, faturamento, etc.

**src/pages/PlanHistory.tsx** - `mockHistory` array com eventos falsos

**src/pages/PlanOverview.tsx** - `mockPlanData` com dados fictícios

**src/components/DocumentationGuide.tsx** - Aba "gerador_mock" com UI para gerar mocks

**src/automation/auth.ts** - Tokens mock para DRY_RUN:
```typescript
const mockToken = 'sim_dryrun_' + Buffer.from(`${credentials.cpf}:${agora}`).toString('base64').substring(0, 24);
```

### 2.3 Fallback Silencioso de Provedor IA (VIOLAÇÃO FASE 13)

**src/ai/unifiedProvider.ts** - `chat()` método (linhas 106-133):
```typescript
if (provider === 'nvidia') {
  try {
    return await this.callNvidia(messages, options);
  } catch (nvidiaError: any) {
    if (fallback && process.env.GEMINI_API_KEY) {
      console.info('[AI Provider] Acionando fallback transparente para Gemini...');
      return await this.callGemini(messages, options); // FALHA SILENCIOSA
    }
    throw nvidiaError;
  }
}
```

### 2.4 Fontes Hardcoded/Falsas (VIOLAÇÃO FASE 16)

**src/automation/aiProviders.ts** - `fontesPesquisa` hardcoded (linhas 203-207):
```typescript
let fontesPesquisa: Array<{ titulo: string; uri: string }> = [
  { titulo: 'Sebrae Nacional - Ideias de Negócios & Estudos de Mercado', uri: 'https://sebrae.com.br/sites/PortalSebrae/ideiasdenegocios' },
  { titulo: 'IBGE - Pesquisa Anual de Serviços e Comércio', uri: 'https://www.ibge.gov.br' },
  { titulo: 'Portal do Empreendedor - CNAE & Enquadramento', uri: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor' }
];
```

### 2.5 Dados Financeiros Hardcoded (VIOLAÇÃO FASE 10)

Em `schemaGenerator.ts` - Valores monetários inventados:
- `investimentoFixo`: R$ 38.000 (máquina café), R$ 14.000 (notebooks), etc.
- `produtoServico`: Preços R$ 16,50 (café), R$ 499 (SaaS Pro), etc.
- `custoFixo`: R$ 5.500 (aluguel), R$ 14.500 (folha), etc.
- `capitalGiro`: R$ 25.000 reserva fixa

---

## 3. AUDITORIA SEMÂNTICA DE MOCK (FASE 6)

### Padrão Proibido Encontrado: "API falhou → gera dados → retorna sucesso"

**Localização:** `src/automation/aiProviders.ts:283-331`
**Comportamento:** Quando IA falha em parsear JSON, gera relatório completo com dados fictícios e retorna como sucesso.

**Localização:** `src/ai/unifiedProvider.ts:115-118`
**Comportamento:** NVIDIA falha → fallback transparente para Gemini → retorna sucesso sem avisar que provedor mudou.

---

## 4. FALLBACKS CLASSIFICADOS (FASE 7)

| Fallback | Tipo | Permitido? | Ação |
|----------|------|------------|------|
| NVIDIA → Gemini (AI Provider) | Fabrica conteúdo | **PROIBIDO** | Remover / tornar explícito |
| AI parse falha → dados fake | Fabrica conteúdo | **PROIBIDO** | Remover / erro explícito |
| Supabase falha → local JSON | Técnico (persistência) | PERMITIDO | Manter com log |
| DRY_RUN tokens mock | Técnico (teste) | PERMITIDO (isolado) | Mover para testes |
| Search API falha → erro | Técnico | PERMITIDO | Já correto (lança erro) |

---

## 5. DATA ORIGIN AUDIT (FASE 8)

**Campos sem origem rastreável:**
- Todos os dados em `schemaGenerator.ts` (BUSINESS_ARCHETYPES, generateMockData)
- `executarPesquisaUnificada` fallback data
- `mockPlanData`, `mockHistory`
- PNBOX Adapter gera dados para campos vazios (ex: `prazoMedioVendas: 7` hardcoded)

**Implementação necessária:**
- Todo Claim deve ter `origin: DataOrigin` (USER_PROVIDED, DIRECT_SOURCE, CALCULATED, INFERRED, ESTIMATED)
- `EvidenceAnalyst` já implementa `createCalculatedClaim` e `createEstimatedClaim` ✓
- `CanonicalBusinessModel` tem `provenance: ProvenanceMap` ✓

---

## 6. CONFIDENCE AUDIT (FASE 9)

**Problemas:**
- `executarPesquisaUnificada` retorna `confidence: 0.9` hardcoded para fatos fake
- `sourceValidationSkill` atribui `reliability` baseada só no domínio, não no conteúdo
- `EvidenceAnalyst.calculateConfidence` usa heurísticas simples

---

## 7. RESEARCH ENGINE AUDIT (FASE 11)

| Componente | Status | Notas |
|------------|--------|-------|
| BusinessAnalyzer | EXISTE | `src/research/planner/BusinessAnalyzer.ts` |
| ResearchPlanner | EXISTE | `src/research/planner/ResearchPlanner.ts` |
| TaskOrchestrator | EXISTE | `src/research/planner/TaskOrchestrator.ts` |
| SourceEngine | EXISTE | `src/research/engine/SourceEngine.ts` - USA APIs REAIS |
| EvidenceStore | EXISTE | `src/research/evidence/EvidenceStore.ts` ✓ |
| EvidenceAnalyst | EXISTE | `src/research/evidence/EvidenceAnalyst.ts` ✓ |
| ResearchReviewer | **MISSING** | Não encontrado |
| GapAnalyzer | EXISTE | `src/research/engine/GapAnalyzer.ts` ✓ |
| ContradictionAnalyzer | EXISTE | `src/research/engine/ContradictionAnalyzer.ts` ✓ |
| ResearchSufficiency | EXISTE | `src/research/engine/ResearchSufficiency.ts` ✓ |
| ResearchSynthesizer | EXISTE | `src/research/synthesis/ResearchSynthesizer.ts` ✓ |
| CanonicalBusinessModel | EXISTE | Type definido em `src/research/types.ts` ✓ |
| PnboxAdapter | EXISTE | `src/research/mappers/PnboxAdapter.ts` ✓ |

---

## 8. AGENT → SKILL VALIDATION (FASE 12)

**Violações encontradas:**

1. **server.ts** acessa Supabase diretamente nas rotas de auth (linhas 263-298, 344-363) - deveria usar `databaseSkill`
2. **server.ts** usa `iniciarSessaoPlaywright` diretamente - deveria usar skill de automação
3. **agents/** - Precisa verificar se agents usam skills intermediárias

---

## 9. NVIDIA PROVIDER AUDIT (FASE 13)

**Configuração:**
- Primary: NVIDIA (via `AI_PROVIDER=nvidia`)
- 3 Slots de conta configurados no .env ✓
- Modelos disponíveis: 5 modelos NVIDIA NIM ✓

**Problema CRÍTICO:** Fallback transparente para Gemini (linha 115-118 unifiedProvider.ts)
- Não há log de auditoria quando fallback ocorre
- Usuário não sabe qual provedor foi usado
- Viola princípio "NVIDIA deve ser provider primário"

---

## 10. WEB RESEARCH AUDIT (FASE 15)

**SourceEngine** (`src/research/engine/SourceEngine.ts`):
- ✅ Usa Tavily/Brave/SerpApi reais (requer API key)
- ✅ Lança erro se API key não configurada (linha 95)
- ✅ Fetch real de conteúdo HTML
- ✅ Classificação de fonte por domínio

**WebResearchSkill** (`src/skills/web-research/index.ts`):
- ✅ Usa `aiProvider.generateStructured` para extrair fatos
- ✅ Valida fontes via `sourceValidationSkill`
- ⚠️ Confidence default 0.5 quando não fornecido (linha 87)

---

## 11. 14 FERRAMENTAS PNBOX (FASE 24)

Todas definidas em `schemaCatalog.ts` com schemas completos.
**Matriz de validação pendente** - precisa testar execução real.

---

## 12. MULTIUSER & AUTH (FASE 28, 29)

**Auth endpoints:** `/api/auth/register`, `/api/auth/login`, `/api/auth/logout`, `/api/auth/me`, `/api/auth/refresh` ✓
**Plans CRUD:** `/api/plans` (GET, POST, PATCH, DELETE, duplicate, archive) ✓
**Ownership check:** Verifica `userId` em todas as rotas de plans ✓
**Supabase Auth:** Configurado com service role ✓
**Local fallback:** Em memória (Map) quando Supabase não disponível

---

## 13. DATABASE STATUS (FASE 27)

**Supabase configurado:** Sim (URL, anon key, service role key no .env)
**Tabelas necessárias (não verificadas):**
- `profiles` (auth)
- `pnbox_credentials` (credenciais PNBOX por usuário)
- Tabelas de pesquisa/planos

**Status:** BLOCKED - Database schema não verificado/reconstruído

---

## 14. CLASSIFICAÇÃO INICIAL DE PROBLEMAS

### CRITICAL (Bloqueiam VERDICT: READY)
1. **Build quebrado** - Erros sintaxe em schemaGenerator.ts + temp files
2. **Mock data em produção** - aiProviders.ts fallback gera dados fake completos
3. **Fallback silencioso NVIDIA→Gemini** - Troca provedor sem avisar
4. **Fontes hardcoded** - Sebrae/IBGE URLs fixas como "fontes de pesquisa"
5. **Dados financeiros hardcoded** - 100+ valores monetários inventados em schemaGenerator
6. **Database não verificado** - Schema Supabase não confirmado

### HIGH
7. **Mock UI components** - PlanHistory, PlanOverview, DocumentationGuide (aba mock)
8. **Auth tokens mock** - DRY_RUN gera tokens fake
9. **Agent→Skill violations** - Server acessa DB diretamente
10. **Confidence arbitrária** - 0.5/0.9 hardcoded sem evidência

### MEDIUM
11. **ResearchReviewer MISSING** - Componente não existe
12. **Source validation** - Baseada só em domínio, não conteúdo
13. **PnboxAdapter defaults** - `prazoMedioVendas: 7` hardcoded

### LOW
14. **Temp files** - temp.ts, temp2.ts poluindo workspace
15. **DocumentationGuide mock tab** - UI para gerar mocks
16. **Console.warn excessivo** - Muitos warnings não acionáveis

---

## 15. PRÓXIMOS PASSOS (ORDEM DE PRIORIDADE)

1. **Fixar build** - Corrigir schemaGenerator.ts, remover temp.ts/temp2.ts
2. **Eliminar mock data produção** - Remover fallback fake em aiProviders.ts
3. **Fixar fallback IA** - Tornar explícito ou remover fallback NVIDIA→Gemini
4. **Remover fontes hardcoded** - Exigir pesquisa real para fontes
5. **Remover dados financeiros fake** - schemaGenerator.ts deve gerar estruturas vazias
6. **Verificar database** - Confirmar tabelas Supabase
7. **Testar E2E real** - Fluxo completo com APIs reais
8. **Remover mock UI** - PlanHistory, PlanOverview, DocumentationGuide mock tab
9. **Auditar agents→skills** - Refatorar server.ts para usar skills
10. **Implementar ResearchReviewer** - Componente faltante

---

## 16. VERDICT INICIAL

```
VERDICT: BLOCKED

Bloqueadores críticos:
- Build falha (TypeScript errors)
- Mock data em caminho de produção (aiProviders.ts, schemaGenerator.ts)
- Fallback IA silencioso (unifiedProvider.ts)
- Fontes hardcoded/fake (aiProviders.ts)
- Dados financeiros inventados (schemaGenerator.ts)
- Database não verificado
```

---

*Este documento será atualizado conforme a auditoria avança pelas fases.*