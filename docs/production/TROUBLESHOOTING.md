# Resolução de Problemas (TROUBLESHOOTING.md)

## Problemas Comuns e Ações de Correção

### 1. Erro `PNBOX_REAL_PLAN_REQUIRED`
- **Causa**: Foi feita uma chamada para gravar, carregar ou reconciliar uma ferramenta utilizando um identificador de plano vazio, placeholder (`:idPlano`) ou sintético (`plano_...`).
- **Solução**: Crie ou selecione um plano real na conta oficial do Sebrae PNBOX e selecione-o na lista do painel.

### 2. Erro `FORBIDDEN_PLAN_ACCESS`
- **Causa**: O usuário autenticado tentou acessar dados de um plano que não pertence ao seu perfil.
- **Solução**: Verifique se a sessão ativa corresponde ao usuário proprietário do plano. Faça login com a conta correta.

### 3. Erro `BLOCKED_EXTERNAL_CONTRACT`
- **Causa**: Tentativa de disparar a criação remota de nova instância de plano via DDP sem contrato homologado pelo Sebrae.
- **Solução**: Crie o plano no portal web do Sebrae PNBOX (`https://pnbox.sebrae.com.br`) e clique em "Sincronizar Planos" no painel do PNBOX AI para carregar o plano real.

### 4. Falha de Conexão com o Servidor DDP (`DDP Connection Refused / Timeout`)
- **Causa**: O servidor DDP do Sebrae (`pnbox.sebrae.com.br/sockjs`) está temporariamente inacessível ou o cookie de autenticação OIDC expirou.
- **Solução**: No painel, abra "Configurações PNBOX", clique em "Reconectar" ou renove as credenciais de CPF/Senha para reemitir os tokens.

### 5. Erro `RATE_LIMIT_EXCEEDED` (HTTP 429)
- **Causa**: Número excessivo de requisições disparadas em curto intervalo para endpoints de IA ou autenticação.
- **Solução**: Observe o header `Retry-After` retornado na resposta e aguarde o período indicado antes de retentar.
