# FASE 01 — Segurança P0

**Estado:** PLANEJADA — não executada  
**Gate:** zero falhas P0 abertas.

## Objetivo

Eliminar os riscos de autenticação, credenciais e autorização que tornam o sistema inadequado para produção.

## 1. Autenticação

- Remover autenticação local do caminho produtivo.
- Eliminar `LOCAL_USERS`, `local_token_*` e usuários artificiais do runtime.
- Garantir autenticação real via Supabase/OIDC conforme arquitetura adotada.
- Validar expiração de sessão.
- Validar renovação real.
- Validar logout e invalidação.
- Garantir isolamento entre usuários.

## 2. Credenciais e segredos

- Remover qualquer fallback de chave criptográfica.
- Segredo obrigatório ausente deve gerar falha explícita.
- Nunca armazenar senha em plaintext.
- Nunca registrar senha, token, cookie ou chave em logs.
- Verificar rotação e carregamento dos secrets.

## 3. Autorização

- Impedir troca arbitrária de `idPlano`.
- Validar usuário → plano.
- Validar plano → ferramenta/documento.
- Impedir acesso cross-user e cross-tenant.
- Cobrir IDOR com testes negativos.

## Evidências

- Diff dos caminhos de autenticação removidos/substituídos.
- Testes de sessão, expiração, logout e isolamento.
- Testes de autorização com plano inexistente, plano de outro usuário e recurso de outro contexto.
- Verificação de ausência de secrets em logs.
- CI verde para a suíte de segurança.

## Bloqueios

Qualquer autenticação local produtiva, plaintext de senha, fallback criptográfico inseguro, IDOR ou ausência de isolamento mantém a fase bloqueada.

## Gate

`P0_SECURITY_CLEAR` somente quando todas as evidências forem reproduzíveis e nenhum risco P0 permanecer.
