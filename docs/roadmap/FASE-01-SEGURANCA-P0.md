# FASE 01 — Segurança P0

**Estado:** EM EXECUÇÃO — P0 parcialmente corrigido, gate ainda bloqueado  
**Última atualização:** 2026-09-07/08 UTC

## Objetivo

Eliminar os riscos de autenticação, credenciais e autorização que tornam o sistema inadequado para produção.

## Correções aplicadas

### 1. Autenticação

- Removido o caminho de autenticação local de `auth.routes.ts`.
- Removidos `LOCAL_USERS`, `createLocalToken`, `verifyLocalToken` e contas artificiais do runtime de autenticação.
- `authMiddleware` agora falha fechado quando Supabase não está configurado e valida o token com `supabase.auth.getUser()`.
- Registro, login e refresh dependem do Supabase Auth real; ausência do serviço retorna `503`, sem fallback local.
- Removido `src/server/middleware/utils/authUtils.ts`, que continha verificação de token fictícia por formato/hash.

### 2. Credenciais e segredos

- Removido fallback `default-pnbox-key-fallback-32b`.
- `PNBOX_CRED_ENCRYPTION_KEY` agora é obrigatório para criptografia/descriptografia.
- Ausência da chave gera erro explícito.
- Formato de credencial criptografada é validado; não existe fallback para plaintext em `encryptPnboxPassword`/`decryptPnboxPassword`.
- Persistência de credenciais PNBOX no endpoint de conexão não usa mais `LOCAL_CREDENTIALS` nem senha em memória como fallback.
- Persistência exige Supabase e sessão autenticada do usuário.

### 3. Regressão automatizada

Criado `src/server/__tests__/securityP0.test.js`, com invariantes que bloqueiam regressões para:

- `LOCAL_USERS`;
- `local_token_*`;
- geração artificial de usuário por `Math.random()` no fluxo de auth;
- `passwordHash` no fluxo de auth;
- fallback de chave criptográfica;
- fallback de plaintext;
- `LOCAL_CREDENTIALS` no fluxo de conexão;
- verificador de token placeholder.

O CI passou a executar esse guard explicitamente, além da suíte `npm test` já existente.

## Autorização — estado atual

O backend já exige `authMiddleware` nos endpoints de planos e possui `requireUserOwnsPlan()`, que rejeita IDs fabricados e consulta os planos associados à sessão PNBOX antes de permitir operações. Isso é evidência de controle de acesso no código, mas **não substitui teste negativo real**.

Ainda precisam ser executados e registrados:

- usuário A tentando acessar plano do usuário B;
- usuário A tentando gravar em plano do usuário B;
- plano inexistente/fabricado;
- recurso/ferramenta fora do contexto autorizado;
- isolamento entre usuários com tokens reais.

## Evidência CI

- Run `34176735881` no commit `1de28b1...`: suíte existente + build passaram.
- Run `34176884928` e `34176904776`: validações intermediárias dos commits de segurança foram iniciadas.
- Run `34177011156`, commit `c9b99bf...`: executa `npm test` + guard de Segurança P0 + build; no momento do fechamento deste registro ainda estava em execução.

## Bloqueios ainda abertos

1. Testes negativos de IDOR/isolation ainda não foram executados com dois contextos de usuário reais.
2. Expiração/refresh/logout precisam de evidência de execução contra Supabase real; a implementação local foi removida, mas isso não prova comportamento do ambiente externo.
3. Rotação/carregamento operacional dos secrets ainda não foi homologado em ambiente de deploy.
4. A ausência de `PNBOX_CRED_ENCRYPTION_KEY` foi tornada fail-closed no código, mas ainda precisa de teste de runtime controlado.

## Gate

`P0_SECURITY_CLEAR`: **NÃO**.

A fase não será marcada como concluída até que os testes de autenticação, expiração, refresh, logout, isolamento/IDOR e segredo obrigatório tenham evidência reproduzível e o CI correspondente esteja verde.

**Próxima ação:** concluir a validação automatizada da FASE 01; somente após o gate P0 será iniciada a FASE 02 — Eliminação de Simulação/Fakes.
