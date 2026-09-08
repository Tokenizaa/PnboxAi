# PNBOX AI — Roadmap de Preparação para Produção

**Status:** ATIVO  
**Data:** 2026-09-07  
**Branch:** `main`  
**Repositório:** `Tokenizaa/PnboxAi`

## Objetivo

Levar o PNBOX AI de **NOT_PRODUCTION_READY** para **PRODUCTION_READY**, eliminando riscos técnicos, de segurança, dados fictícios, contratos não comprovados, falhas de CI/CD e inconsistências de documentação antes da abertura para usuários reais.

Este roadmap substitui qualquer interpretação otimista de tarefas anteriores: **nenhum item é considerado concluído sem evidência verificável**.

## Regras inegociáveis

1. PNBOX é a fonte oficial dos dados de plano e ferramentas.
2. Não usar mock, fake, simulation, DRY_RUN ou fallback para produzir dados apresentados como reais.
3. Não fabricar IDs, planos, usuários, documentos, progresso ou resultados.
4. Nenhum método/publicação DDP é considerado oficial sem evidência real.
5. Escrita no PNBOX só é sucesso após confirmação verificável.
6. Erro de infraestrutura não pode virar sucesso silencioso.
7. Dados incompletos devem gerar estado explícito, não valores inventados.
8. CI verde é obrigatório antes de avançar fase crítica.
9. Produção só pode ser declarada com deployment saudável e homologação real.
10. Cada fase deve registrar evidência antes de ser marcada como concluída.

---

# FASE 0 — Baseline e congelamento

**Objetivo:** estabelecer o estado real antes das correções.

- [ ] Registrar SHA inicial.
- [ ] Registrar status do GitHub Actions.
- [ ] Registrar status dos deployments Vercel.
- [ ] Executar lint.
- [ ] Executar typecheck.
- [ ] Executar testes unitários.
- [ ] Executar build.
- [ ] Levantar testes E2E existentes.
- [ ] Registrar falhas atuais sem mascará-las.
- [ ] Manter sincronização bidirecional PNBOX ↔ PNBOX AI congelada.

**Saída:** baseline reproduzível e lista de falhas conhecida.

---

# FASE 1 — Segurança P0

**Objetivo:** eliminar imediatamente os riscos que impedem qualquer uso produtivo.

## 1.1 Autenticação

- [ ] Remover autenticação local de produção.
- [ ] Remover `LOCAL_USERS` do caminho executável.
- [ ] Remover `local_token_*`.
- [ ] Remover criação de usuários artificiais.
- [ ] Garantir autenticação Supabase/OIDC real.
- [ ] Garantir expiração e renovação reais.
- [ ] Garantir logout real.
- [ ] Garantir isolamento entre usuários.

## 1.2 Credenciais

- [ ] Remover qualquer fallback de chave criptográfica.
- [ ] Falha explícita quando segredo obrigatório estiver ausente.
- [ ] Nunca persistir senha em plaintext.
- [ ] Nunca registrar senha/token/cookie em logs.
- [ ] Validar rotação de segredos.

## 1.3 Autorização

- [ ] Usuário não pode trocar arbitrariamente `idPlano`.
- [ ] Validar vínculo usuário → plano.
- [ ] Validar vínculo plano → documento/ferramenta.
- [ ] Impedir acesso cross-user.
- [ ] Testar IDOR/cross-tenant.

**Gate:** nenhuma falha P0 aberta.

---

# FASE 2 — Eliminação de simulação e dados fictícios

**Objetivo:** garantir que nenhum caminho produtivo fabrique realidade.

Auditar código executável para:

- [ ] `DRY_RUN`
- [ ] `SIMULATION`
- [ ] `mock`
- [ ] `fake`
- [ ] `placeholder`
- [ ] `fallback`
- [ ] `example`
- [ ] `exemploPayload`
- [ ] `plano_*`
- [ ] IDs fixos
- [ ] CPFs/senhas fictícios
- [ ] tokens fictícios
- [ ] `Math.random()` para entidades
- [ ] `Date.now()` usado para fabricar entidades
- [ ] dados estáticos apresentados como dados PNBOX

Documentação, fixtures e exemplos podem existir somente se estiverem claramente isolados do runtime.

**Gate:** zero caminho produtivo que transforme exemplo em dado real.

---

# FASE 3 — Fonte única de verdade

**Objetivo:** consolidar PNBOX como autoridade.

## Planos

- [ ] Listagem vem exclusivamente do PNBOX.
- [ ] Remover stores locais oficiais.
- [ ] Remover planos padrão artificiais.
- [ ] Remover IDs padrão inventados.
- [ ] Cache nunca pode substituir PNBOX.
- [ ] Estados offline devem ser explícitos.

## Ferramentas

Criar matriz definitiva das 14 ferramentas:

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

**Gate:** nenhuma operação é marcada como suportada apenas porque existe código para ela.

---

# FASE 4 — Contrato DDP real

**Objetivo:** separar implementação técnica de contrato comprovado.

- [ ] Capturar tráfego autenticado real do PNBOX.
- [ ] Identificar endpoint efetivo.
- [ ] Identificar publications reais.
- [ ] Identificar methods reais.
- [ ] Identificar parâmetros reais.
- [ ] Identificar respostas reais.
- [ ] Identificar erros reais.
- [ ] Identificar coleções realmente usadas.
- [ ] Confirmar relação `idPlano`.
- [ ] Confirmar create/update/delete.
- [ ] Confirmar subscriptions.
- [ ] Registrar evidências.
- [ ] Atualizar documentação somente após confirmação.

Até essa evidência existir, operações desconhecidas permanecem **BLOCKED_EXTERNAL_CONTRACT**.

---

# FASE 5 — Integridade de dados e mappers

- [ ] Criar/validar mapper canônico PNBOX → aplicação.
- [ ] Criar/validar mapper canônico aplicação → PNBOX.
- [ ] Proibir defaults silenciosos.
- [ ] Proibir alteração silenciosa de tipos.
- [ ] Validar campos obrigatórios.
- [ ] Validar IDs.
- [ ] Validar datas.
- [ ] Validar relacionamentos.
- [ ] Rejeitar payload incompleto.
- [ ] Rejeitar payload com tipo incorreto.
- [ ] Rejeitar documento inexistente.
- [ ] Rejeitar plano inexistente.
- [ ] Rejeitar documento de outro plano.

---

# FASE 6 — Execution Engine

## Leitura

- [ ] Somente PNBOX real.
- [ ] Timeout.
- [ ] Erro explícito.
- [ ] Reconexão segura.
- [ ] Validação de resposta.
- [ ] Cache apenas como cache, nunca autoridade.

## Escrita

- [ ] Schema validado antes do envio.
- [ ] Operação idempotente quando aplicável.
- [ ] Resultado DDP tratado corretamente.
- [ ] Confirmação por reread/evento.
- [ ] Falha de confirmação = estado não confirmado.
- [ ] Nunca exibir sucesso antes da confirmação.

## Batch

- [ ] Isolar falhas por item.
- [ ] Evitar duplicação.
- [ ] Retry seguro.
- [ ] Cancelamento.
- [ ] Relatório real de sucesso/falha.

---

# FASE 7 — Copiloto e IA

**Objetivo:** IA pode sugerir, mas nunca inventar estado oficial do PNBOX.

- [ ] Remover payloads hardcoded apresentados como dados do negócio.
- [ ] Remover SWOT default executável.
- [ ] Remover métricas fictícias.
- [ ] Remover progresso fictício.
- [ ] Remover dados financeiros fictícios.
- [ ] Validar origem de cada contexto enviado à IA.
- [ ] Definir provider oficial e fallback documentado.
- [ ] Não usar provider arbitrário no runtime.
- [ ] Toda escrita sugerida pela IA passa por validação e confirmação PNBOX.
- [ ] Separar claramente `suggestion` de `committed data`.

---

# FASE 8 — Frontend honesto

Todo fluxo precisa representar:

- [ ] loading real
- [ ] vazio real
- [ ] erro real
- [ ] sessão expirada
- [ ] plano ausente
- [ ] ferramenta indisponível
- [ ] operação bloqueada
- [ ] execução real
- [ ] sucesso confirmado
- [ ] sucesso não confirmado

Remover:

- [ ] botões que inevitavelmente chamam endpoints 501 sem informar o usuário.
- [ ] progressos fictícios.
- [ ] datas inventadas.
- [ ] planos demo.
- [ ] status de sucesso prematuro.

---

# FASE 9 — API e hardening

- [ ] Validar payloads.
- [ ] Validar parâmetros.
- [ ] Rate limiting.
- [ ] Limite de payload.
- [ ] CORS correto.
- [ ] Security headers.
- [ ] Erros seguros sem stack trace sensível.
- [ ] Correlation ID.
- [ ] Timeout de dependências externas.
- [ ] Tratamento de indisponibilidade PNBOX.

---

# FASE 10 — Observabilidade

Registrar sem segredos:

- [ ] requestId/correlationId
- [ ] usuário técnico/identificador seguro
- [ ] plano
- [ ] ferramenta
- [ ] operação
- [ ] duração
- [ ] status
- [ ] erro categorizado

Métricas:

- [ ] login
- [ ] conexão DDP
- [ ] desconexão DDP
- [ ] latência de leitura
- [ ] latência de escrita
- [ ] falha de confirmação
- [ ] erro de API
- [ ] falha batch

Alertas:

- [ ] PNBOX indisponível
- [ ] aumento de erros DDP
- [ ] falhas de autenticação
- [ ] operações sem confirmação
- [ ] degradação de latência

---

# FASE 11 — Testes

## Unitários

- [ ] schemas
- [ ] validators
- [ ] mappers
- [ ] auth
- [ ] authorization
- [ ] plans
- [ ] tools
- [ ] errors

## Integração

- [ ] API → PNBOX
- [ ] auth → PNBOX
- [ ] plano → ferramenta
- [ ] read
- [ ] create
- [ ] update
- [ ] delete
- [ ] confirmação

## E2E

Fluxo mínimo:

`login → PNBOX → plano real → ferramentas → leitura → edição → salvar → confirmar → reload → verificar`

## Casos negativos

- [ ] sem autenticação
- [ ] sessão expirada
- [ ] plano inexistente
- [ ] acesso cross-user
- [ ] payload inválido
- [ ] PNBOX indisponível
- [ ] timeout
- [ ] DDP error
- [ ] write sem confirmação

---

# FASE 12 — CI/CD

Pipeline obrigatório:

1. install
2. typecheck
3. lint
4. unit tests
5. integration tests
6. build
7. E2E quando ambiente permitir
8. dependency/security audit

- [ ] Nenhuma etapa crítica pode ser somente manual.
- [ ] Nenhum merge para produção com CI vermelho.
- [ ] Build Vercel precisa ficar verde.
- [ ] Deployment precisa ser verificável.
- [ ] Rollback documentado.

---

# FASE 13 — Vercel e infraestrutura de produção

- [ ] Corrigir deployment atual.
- [ ] Validar build em ambiente equivalente à produção.
- [ ] Validar variáveis de ambiente obrigatórias.
- [ ] Remover defaults inseguros.
- [ ] Validar secrets.
- [ ] Validar domínio.
- [ ] Validar health endpoint.
- [ ] Validar logs.
- [ ] Validar runtime Node.
- [ ] Validar integração Supabase.
- [ ] Validar integração PNBOX.
- [ ] Validar limites/timeouts.
- [ ] Validar rollback.

**Gate:** deployment `READY` e smoke test real aprovado.

---

# FASE 14 — Realtime / sincronização

Esta fase permanece **FROZEN** até a Fase 4 ser concluída.

Depois da comprovação do contrato:

- [ ] PNBOX → PNBOX AI.
- [ ] PNBOX AI → PNBOX.
- [ ] Reconexão.
- [ ] Dedupe.
- [ ] Ordenação.
- [ ] Conflitos.
- [ ] Multi-tab.
- [ ] Eventos perdidos.
- [ ] Estado inicial + incremental.

**Critério:** alteração real em qualquer lado precisa aparecer no outro sem intervenção manual, perda ou duplicação.

---

# FASE 15 — Auditoria final de produção

## Código

- [ ] Zero mocks executáveis.
- [ ] Zero IDs sintéticos em produção.
- [ ] Zero credenciais fictícias.
- [ ] Zero fallback inseguro.
- [ ] Zero fonte local concorrente.
- [ ] Zero TODO crítico.
- [ ] Zero operação crítica ignorada silenciosamente.

## Segurança

- [ ] Auth.
- [ ] Authz.
- [ ] Isolamento.
- [ ] Secrets.
- [ ] Logs.
- [ ] CORS.
- [ ] Rate limit.

## Operação

- [ ] Backup/recovery aplicável.
- [ ] Rollback.
- [ ] Monitoring.
- [ ] Alertas.
- [ ] Runbook.
- [ ] Troubleshooting.

---

# FASE 16 — Homologação final

Executar com dados reais controlados:

1. Login real.
2. Carregar plano real.
3. Carregar cada uma das 14 ferramentas.
4. Validar schema.
5. Criar quando contrato comprovado.
6. Alterar.
7. Confirmar.
8. Recarregar.
9. Verificar persistência.
10. Validar isolamento.
11. Testar falha.
12. Testar reconexão.
13. Testar deployment.
14. Registrar evidências.

---

# Critérios para `PRODUCTION_READY`

Todos devem ser verdadeiros:

- [ ] Nenhuma simulação no caminho produtivo.
- [ ] PNBOX é a única fonte de verdade.
- [ ] Dados exibidos são reais ou explicitamente vazios.
- [ ] Escritas são confirmadas.
- [ ] Nenhum método DDP crítico é baseado em hipótese.
- [ ] Auth/Authz comprovados.
- [ ] Isolamento comprovado.
- [ ] 14 ferramentas possuem matriz de cobertura real.
- [ ] Testes unitários verdes.
- [ ] Testes de integração verdes.
- [ ] E2E principal verde.
- [ ] CI verde.
- [ ] Vercel verde.
- [ ] Observabilidade operacional.
- [ ] Segurança sem P0/P1 aberto.
- [ ] Documentação coerente com a implementação real.
- [ ] Realtime homologado, quando habilitado.

Se qualquer item crítico falhar:

`NOT_PRODUCTION_READY`

---

# Ordem obrigatória de execução

```text
Baseline
  ↓
Segurança P0
  ↓
Eliminar simulação/fakes
  ↓
Fonte única de verdade
  ↓
Contrato DDP real
  ↓
Integridade de dados
  ↓
Execution Engine
  ↓
Copiloto/IA
  ↓
Frontend
  ↓
API Hardening
  ↓
Observabilidade
  ↓
Testes
  ↓
CI/CD
  ↓
Vercel
  ↓
Realtime
  ↓
Auditoria final
  ↓
Homologação
  ↓
PRODUCTION_READY
```

## Regra de execução

Para cada item:

1. Implementar.
2. Testar.
3. Validar.
4. Registrar evidência.
5. Atualizar este roadmap.
6. Só então marcar `[x]`.
7. Se surgir regressão, voltar à fase afetada.

**É proibido marcar uma fase como concluída por inferência, intenção ou existência de código.**