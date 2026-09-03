# PNBOXAI — AUDITORIA FORENSE INICIAL

Data: 2026-09-03
Branch auditada: `main`
Commit: `1d146c4a10d99edb1c235e4cc66dfd925d32d27f`

## Escopo

Auditoria estática inicial conforme protocolo PNBOXAI — REAL DATA / ZERO MOCK / FUNCIONALIDADE REAL / ZERO REGRESSÃO.

## Estado do repositório

- Build/testes locais: `NOT_TESTED` — o conector GitHub permite inspeção do código e CI existente, mas não executa `npm/pnpm`, TypeScript, Playwright ou chamadas privadas de infraestrutura a partir deste ambiente.
- Estrutura Research Engine: presente.
- Agentes: presentes.
- Skills: presentes.
- Router e páginas de Dashboard/Plans/Plan/:id: presentes.
- Migrações Supabase: presentes.
- Runner real e runner DRY_RUN: presentes.

## Bloqueadores encontrados na inspeção estática

### CRITICAL — produção possui fallback/mock de dados

1. `src/skills/deep-research/index.ts` ainda produz `resumoExecutivo`, `oportunidadeMercado` e `tendencias` sintéticos quando os resultados reais estão ausentes.
2. `src/skills/web-research/index.ts` ainda injeta fontes Sebrae/IBGE quando a IA não retorna fontes, usa URL Sebrae como fallback de fatos e atribui confidence padrão.
3. `src/research/engine/SourceEngine.ts` possui `searchCustom()` com quatro fontes hardcoded e snippets artificiais. Isso é produção, não fixture isolada.
4. `src/utils/schemaGenerator.ts` contém templates de negócio e fallbacks financeiros/legais e um caminho `generateForTemplate()` que usa `exemploPayload`; `generateFromResearch()` também possui valores e textos default. Isso pode fabricar dados quando pesquisa estiver incompleta.
5. `server.ts` mantém `PLANOS_CRIADOS` com plano hardcoded e tráfego inicial de laboratório.

### CRITICAL — autenticação/persistência possuem fallback local

1. `server.ts` aceita autenticação em memória quando Supabase não está configurado.
2. O fallback local armazena senha em `passwordHash` sem hash (valor da senha é persistido em memória).
3. Tokens locais são tokens próprios baseados em payload Base64, não sessão JWT assinada por autoridade de identidade.
4. `DatabaseSkill` faz fallback para `.data/pnbox_store.json` quando Supabase falha. Isso permite que falha do banco real seja convertida em persistência alternativa.
5. `DatabaseSkill` também faz fallback local após erro de `upsert` do Supabase, o que viola a regra de erro explícito.

### CRITICAL — provider de pesquisa não está alinhado com NVIDIA-only/real path

1. `server.ts` chama `ResearchEngine.execute()` com `provider || 'gemini'`.
2. `ResearchEngine.generateWithAI()` também usa `input.provider || 'gemini'`.
3. `src/ai/unifiedProvider.ts` permite fallback automático NVIDIA → Gemini e Gemini → NVIDIA.
4. O `.env.example` documenta Gemini como fallback.
5. Portanto, a configuração atual não comprova NVIDIA como provider primário obrigatório sem fallback silencioso.

### CRITICAL — pesquisa real pode ser substituída por resultado sintético

`SourceEngine` tenta Tavily/Brave/SerpAPI quando configurados, mas qualquer falha cai para `searchCustom()`, que devolve fontes hardcoded. Mesmo sem chaves, o caminho retorna resultados sintéticos.

### CRITICAL — endpoint de pesquisa retorna mock

`server.ts` em `GET /api/research/:planId` contém explicitamente retorno de relatório vazio/sintético e comentário indicando mock, incluindo `validation.valid: true` sem execução correspondente. Isso é `fake success`.

### HIGH — planos não têm persistência real

`server.ts` mantém `USER_PLANS` em `Map` na memória. CRUD de planos opera somente nesse Map. Reinício do processo perde os planos.

### HIGH — RLS de planos permite leitura cruzada

`supabase/migrations/006_rls_policies.sql` define `plans_read_active` com `USING (ativo = true)`, sem restringir `user_id = auth.uid()`. Isso contradiz isolamento por usuário para planos.

### HIGH — credenciais PNBOX armazenadas como senha reversível/em texto

`server.ts` grava `password` diretamente em `pnbox_credentials`. A auditoria deve confirmar se esse campo é estritamente necessário e, se for, deve possuir proteção adequada e nunca ser exposto ao cliente. O endpoint GET não retorna a senha, mas o armazenamento exige revisão de segurança.

### HIGH — DRY_RUN está exposto como caminho funcional padrão

`/api/automation/fill-tool` usa `officialRunner` no modo DRY_RUN e responde `status: ok`. Isso pode ser válido como ferramenta técnica, mas precisa ficar explicitamente separado de qualquer fluxo de produção que possa apresentar simulação como execução real.

## Componentes presentes para auditoria posterior

- `src/research/ResearchEngine.ts`
- planner: BusinessAnalyzer / ResearchPlanner / TaskOrchestrator
- engine: SourceEngine / GapAnalyzer / ContradictionAnalyzer / ResearchSufficiency
- evidence: EvidenceStore / EvidenceAnalyst
- synthesis: ResearchSynthesizer
- mapper: PnboxAdapter
- `src/automation/schemaCatalog.ts`
- `src/automation/schemaValidator.ts`
- `src/automation/realRunner.ts`
- `src/automation/officialRunner.ts`
- `src/router.tsx`
- `src/pages/*`
- `src/contexts/*`
- Supabase migrations 001–009
- testes em `src/research/__tests__` e `tests/`

## Conclusão inicial

`VERDICT: BLOCKED`

O bloqueio já é justificável antes dos testes de infraestrutura: existem caminhos de produção que fabricam dados, fallback local de autenticação/persistência, fallback de pesquisa sintética, endpoint de pesquisa mock e RLS de planos incompatível com isolamento por usuário.

Nenhuma alteração funcional foi feita nesta etapa além deste relatório de snapshot. A correção deve ocorrer após completar a matriz de dependências e revisar os caminhos de execução afetados, preservando as implementações reais existentes.
