# PNBOX AI — Roadmap para Produção 100%

**Status:** ATIVO  
**Branch de referência:** `main`  
**Data de criação:** 2026-09-06

## Objetivo

Levar o PNBOX AI a um estado comprovadamente apto para produção, sem dados fictícios, IDs sintéticos, credenciais falsas, fallbacks silenciosos ou fontes concorrentes de verdade.

> **Regra central:** o PNBOX é a única fonte de verdade para planos e dados das ferramentas. Estado local pode existir somente como estado transitório de UI, cache ou enriquecimento não autoritativo.

---

## Estado congelado

A integração de sincronização PNBOX ↔ PNBOX AI está **CONGELADA** até que o contrato DDP real do PNBOX seja comprovado por tráfego autenticado.

Não devemos, nesta etapa:

- inventar publications ou methods DDP;
- habilitar criação/alteração/exclusão de planos por métodos não confirmados;
- fabricar IDs ou registros locais;
- chamar polling de sincronização realtime;
- declarar sincronização bidirecional como pronta sem teste real.

A etapa de sincronização será reaberta somente na fase de homologação específica.

---

# FASE 0 — Congelamento e baseline

- [ ] Congelar a integração DDP atual.
- [ ] Confirmar branch `main`.
- [ ] Executar lint.
- [ ] Executar typecheck/build.
- [ ] Executar testes existentes.
- [ ] Registrar SHA do baseline.
- [ ] Registrar problemas existentes.
- [ ] Criar matriz de status das funcionalidades.

### Classificação obrigatória

Cada funcionalidade deve ser classificada como:

- `PRODUCTION_READY`
- `BLOCKED_EXTERNAL_CONTRACT`
- `IMPLEMENTED_NEEDS_TEST`
- `PARTIAL`
- `NOT_IMPLEMENTED`
- `DEPRECATED`

---

# FASE 1 — Auditoria completa do código

## 1.1 Eliminar simulações executáveis

- [ ] Auditar `DRY_RUN`.
- [ ] Auditar `SIMULATION`.
- [ ] Auditar `mock`.
- [ ] Auditar `fake`.
- [ ] Auditar `placeholder`.
- [ ] Auditar `fallback`.
- [ ] Auditar `example` / `exemploPayload`.
- [ ] Auditar IDs `plano_*`.
- [ ] Auditar IDs fixos do PNBOX.
- [ ] Auditar CPFs e senhas fictícios.
- [ ] Auditar tokens e credenciais fictícios.
- [ ] Auditar `Math.random()` e `Date.now()` usados para fabricar entidades.
- [ ] Auditar dados estáticos apresentados como dados reais.

**Critério:** fixtures/documentação podem existir; código produtivo nunca pode interpretar exemplos como dados reais.

---

# FASE 2 — Fonte única de verdade

## 2.1 Planos

- [x] Remover armazenamento local de planos como fonte oficial.
- [x] Remover plano padrão sintético.
- [x] Remover IDs sintéticos.
- [x] Direcionar listagem para PNBOX.
- [ ] Auditar todos os consumidores de planos.
- [ ] Garantir que nenhum componente leia fonte paralela.
- [ ] Garantir que nenhum serviço recrie plano inexistente.

## 2.2 Ferramentas

Para cada uma das 14 ferramentas:

- [ ] Identificar fonte real dos dados.
- [ ] Identificar schema.
- [ ] Identificar ID do documento.
- [ ] Identificar relação com `idPlano`.
- [ ] Identificar leitura.
- [ ] Identificar criação.
- [ ] Identificar atualização.
- [ ] Identificar exclusão, se aplicável.
- [ ] Identificar estado vazio real.
- [ ] Identificar erros reais.
- [ ] Criar teste correspondente.

Criar matriz de cobertura:

| Ferramenta | Read | Create | Update | Delete | Schema | Teste real |
|---|---|---|---|---|---|---|
| 01 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 02 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 03 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 04 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 05 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 06 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 07 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 08 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 09 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 10 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 11 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 12 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 13 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |
| 14 | [ ] | [ ] | [ ] | [ ] | [ ] | [ ] |

---

# FASE 3 — Autenticação e segurança

## 3.1 Sessão PNBOX

- [ ] Validar OIDC real.
- [ ] Validar expiração.
- [ ] Validar renovação.
- [ ] Validar logout.
- [ ] Validar múltiplos usuários simultâneos.
- [ ] Garantir isolamento por usuário.
- [ ] Garantir isolamento por plano.
- [ ] Impedir sessão A de acessar plano B.
- [ ] Impedir troca arbitrária de `idPlano`.

## 3.2 Credenciais

- [ ] Nenhuma senha em código.
- [ ] Nenhuma senha em logs.
- [ ] Nenhum token em logs.
- [ ] Nenhum cookie persistido indevidamente.
- [ ] Criptografia validada.
- [ ] Secrets somente em ambiente seguro.
- [ ] Processo de rotação documentado.

## 3.3 API

- [ ] Auth middleware em todas as rotas protegidas.
- [ ] Autorização por usuário.
- [ ] Validação de `idPlano`.
- [ ] Validação de payload.
- [ ] Rate limiting.
- [ ] Limite de payload.
- [ ] CORS revisado.
- [ ] Headers de segurança.
- [ ] Erros sem exposição de segredos.

---

# FASE 4 — Contratos e tipagem

## 4.1 API

Para todas as rotas críticas:

- [ ] Request schema.
- [ ] Response schema.
- [ ] Status HTTP correto.
- [ ] Contrato de erros.
- [ ] Autenticação.
- [ ] Autorização.
- [ ] Timeout.
- [ ] Retry seguro.
- [ ] Idempotência.

## 4.2 PNBOX

Manter contrato interno estrito para:

```text
PNBOX
 ├── Authentication
 ├── Plan
 ├── Tool
 ├── Document
 ├── Collection
 ├── Read
 ├── Write
 ├── Update
 └── Realtime Event
```

Nenhum método/publication DDP deve ser marcado como oficial sem evidência do PNBOX real.

---

# FASE 5 — Dados e integridade

## 5.1 Mapper canônico

- [ ] Um único mapper PNBOX → aplicação.
- [ ] Um único mapper aplicação → PNBOX.
- [ ] Proibir transformação silenciosa.
- [ ] Proibir valores default inventados.
- [ ] Campos obrigatórios ausentes geram erro.
- [ ] Preservar tipos.
- [ ] Preservar IDs.
- [ ] Preservar datas.
- [ ] Preservar relacionamentos.

## 5.2 Integridade

Testar:

- [ ] dado vazio;
- [ ] dado incompleto;
- [ ] dado inválido;
- [ ] campo desconhecido;
- [ ] tipo incorreto;
- [ ] ID inexistente;
- [ ] plano inexistente;
- [ ] documento inexistente;
- [ ] documento de outro plano.

---

# FASE 6 — Motor de execução

## 6.1 Leitura

- [ ] PNBOX real somente.
- [ ] Timeout.
- [ ] Desconexão.
- [ ] Reconexão segura.
- [ ] Validação da resposta.
- [ ] Nenhum cache como autoridade.

## 6.2 Escrita

- [ ] Schema validation.
- [ ] Idempotência.
- [ ] Confirmação da persistência.
- [ ] Tratamento de erro.
- [ ] `call()` não equivale automaticamente a sucesso.
- [ ] Confirmação por leitura ou evento real.

## 6.3 Batch

- [ ] Controle de parcialidade.
- [ ] Retry seguro.
- [ ] Não duplicar documentos.
- [ ] Relatório real de sucesso/falha.
- [ ] Cancelamento seguro.

---

# FASE 7 — Realtime / sincronização

> **CONGELADA nesta etapa.**

Será reaberta somente após captura do protocolo real.

## 7.1 Descoberta

- [ ] Capturar tráfego autenticado do PNBOX.
- [ ] Identificar publications reais.
- [ ] Identificar methods reais.
- [ ] Identificar `added`.
- [ ] Identificar `changed`.
- [ ] Identificar `removed`.
- [ ] Identificar criação.
- [ ] Identificar atualização.
- [ ] Identificar exclusão.
- [ ] Identificar vínculo plano → ferramenta.

## 7.2 Implementação

- [ ] Subscription persistente.
- [ ] Bridge DDP → backend.
- [ ] Bridge backend → frontend.
- [ ] Sincronização inicial.
- [ ] Sincronização incremental.
- [ ] Reconexão.
- [ ] Resolução de conflitos.
- [ ] Proteção contra duplicação.

## 7.3 Homologação bidirecional

- [ ] PNBOX → PNBOX AI.
- [ ] PNBOX AI → PNBOX.
- [ ] Edição simultânea.
- [ ] Desconexão.
- [ ] Reconexão.
- [ ] Múltiplas abas.
- [ ] Dados preservados após reload.

**Critério:** somente declarar `SYNC_PRODUCTION_READY` quando alterações reais em qualquer lado forem refletidas corretamente no outro, sem intervenção manual, perda ou duplicação.

---

# FASE 8 — Frontend

## 8.1 Estados obrigatórios

- [ ] Loading.
- [ ] Vazio real.
- [ ] Erro.
- [ ] Não autenticado.
- [ ] Sessão expirada.
- [ ] Plano inexistente.
- [ ] Ferramenta indisponível.
- [ ] Operação bloqueada.
- [ ] Operação em andamento.
- [ ] Sucesso confirmado.

## 8.2 UX honesta

- [ ] Nenhum botão para operação inexistente.
- [ ] Nenhum progresso fictício.
- [ ] Nenhum status fictício.
- [ ] Nenhuma data inventada.
- [ ] Nenhum plano demonstrativo em produção.
- [ ] Nenhum sucesso sem confirmação do backend.

---

# FASE 9 — Observabilidade

## 9.1 Logs

Padrão mínimo:

```text
request
user
plan
tool
operation
duration
status
error
correlationId
```

Nunca registrar senha, cookie ou token.

## 9.2 Métricas

- [ ] Login success/failure.
- [ ] DDP connection.
- [ ] DDP disconnect.
- [ ] Read latency.
- [ ] Write latency.
- [ ] Write failures.
- [ ] Confirmation failures.
- [ ] API errors.
- [ ] Batch failures.

## 9.3 Alertas

- [ ] PNBOX indisponível.
- [ ] Aumento de erros DDP.
- [ ] Falha de autenticação.
- [ ] Operações não confirmadas.
- [ ] Degradação de latência.

---

# FASE 10 — Testes

## 10.1 Unitários

- [ ] Schemas.
- [ ] Validators.
- [ ] Mappers.
- [ ] Authentication.
- [ ] Plan validation.
- [ ] Tool validation.
- [ ] Error handling.

## 10.2 Integração

- [ ] API → PNBOX.
- [ ] Auth → PNBOX.
- [ ] Plano → ferramenta.
- [ ] Leitura.
- [ ] Escrita.
- [ ] Atualização.
- [ ] Confirmação.

## 10.3 E2E

Fluxo principal:

```text
Login
 ↓
PNBOX
 ↓
Selecionar plano real
 ↓
Carregar ferramentas
 ↓
Consultar dados
 ↓
Editar
 ↓
Salvar
 ↓
Confirmar persistência
 ↓
Recarregar
 ↓
Verificar dados
```

Fluxo realtime posterior:

```text
PNBOX
 ↓
Alteração externa
 ↓
Evento realtime
 ↓
PNBOX AI
 ↓
Interface atualizada
```

---

# FASE 11 — CI/CD

Pipeline obrigatório:

- [ ] Install.
- [ ] Typecheck.
- [ ] Lint.
- [ ] Unit tests.
- [ ] Integration tests.
- [ ] Build.
- [ ] E2E em ambiente apropriado.
- [ ] Auditoria de dependências.

**Regra:** nenhum merge para produção com CI vermelho.

---

# FASE 12 — Auditoria de produção

## Código

- [ ] Zero mocks executáveis.
- [ ] Zero IDs sintéticos.
- [ ] Zero credenciais fictícias.
- [ ] Zero fallback de produção.
- [ ] Zero fonte local concorrente.
- [ ] Zero TODO crítico.
- [ ] Zero operação crítica silenciosamente ignorada.

## Segurança

- [ ] Secrets.
- [ ] Autenticação.
- [ ] Autorização.
- [ ] Isolamento de dados.
- [ ] Logs.
- [ ] CORS.
- [ ] Rate limit.

## Operação

- [ ] Observabilidade.
- [ ] Backup.
- [ ] Recovery.
- [ ] Rollback.
- [ ] Documentação.
- [ ] Monitoramento.

---

# FASE 13 — Homologação final

Uma funcionalidade somente passa quando houver:

```text
Código
   ↓
Teste
   ↓
Integração
   ↓
E2E
   ↓
Segurança
   ↓
Observabilidade
   ↓
Homologação
   ↓
PRODUCTION_READY
```

## Critérios finais de 100%

A plataforma somente será declarada apta para produção quando:

1. Não houver comportamento simulado no caminho produtivo.
2. PNBOX for a única fonte de verdade.
3. Todos os dados exibidos forem reais ou estados explicitamente vazios.
4. Toda escrita for confirmada no destino.
5. Nenhuma operação crítica depender de método DDP inventado.
6. Autenticação e autorização estiverem validadas.
7. As 14 ferramentas tiverem cobertura conhecida.
8. Testes unitários, integração e E2E estiverem verdes.
9. CI estiver verde.
10. Logs e métricas permitirem diagnosticar falhas reais.
11. Não existirem fontes concorrentes de dados.
12. A sincronização bidirecional passar pelos testes reais de homologação.

---

# Ordem oficial de execução

**Baseline → Auditoria do código → Fonte de verdade → Segurança → Contratos → Dados → Runner → Frontend → Testes → CI/CD → Observabilidade → Auditoria final → Homologação → Reabrir sincronização → Produção.**

---

## Regra de trabalho deste roadmap

Este documento é o **roadmap oficial de execução** do projeto.

Ao concluir uma tarefa:

1. Implementar.
2. Testar.
3. Validar.
4. Marcar o item como concluído.
5. Registrar evidência quando relevante.
6. Corrigir regressões antes de avançar.

Não avançar uma fase crítica com pendências ocultas da fase anterior.
