# Política de Segurança e Auditoria (SECURITY.md)

## Princípios de Segurança do PNBOX AI

### 1. Isolamento Rigoroso de Dados (Multi-Tenant)
- Cada usuário opera sob seu próprio identificador (`userId`), indexado por JWT validado.
- Os planos de negócio são de propriedade estrita do usuário criador ou conectado.
- O middleware `requireUserOwnsPlan` audita toda requisição a `/api/pnbox/plans/:id/*`. Tentativas de acesso a planos de terceiros resultam em `403 Forbidden` (`FORBIDDEN_PLAN_ACCESS`).

### 2. Proibição de Dados Sintéticos em Produção
- Planos fictícios ou placeholders (`:idPlano`, `plano_...`) são sumariamente rejeitados com `400 Bad Request` (`PNBOX_REAL_PLAN_REQUIRED`).
- O sistema não cria planos padrão silenciosos nem preenche dados aleatórios sem autorização explícita do operador.

### 3. Proteção de Credenciais e Segredos
- Credenciais do Sebrae (`CPF` e `Senha`) são transitadas apenas via HTTPS e protegidas por `bcrypt`/variáveis de ambiente seguras.
- Senhas, tokens e cookies de sessão nunca são impressos nos logs do servidor.
- Os scripts de automação Playwright consomem credenciais estritamente via `process.env.PNBOX_CPF` e `process.env.PNBOX_PASSWORD`.

### 4. Headers e Proteção da Camada HTTP
- `X-Content-Type-Options: nosniff`
- `X-Frame-Options: SAMEORIGIN`
- `X-XSS-Protection: 1; mode=block`
- `Referrer-Policy: strict-origin-when-cross-origin`
- Rate limiting por IP em rotas sensíveis de autenticação e IA.
- Limite máximo de payload em `10MB`.
- Tratador seguro de erros (`safeErrorHandler`) que oculta detalhes de banco de dados e stack traces em produção.
