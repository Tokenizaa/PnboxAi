# Procedimentos de Operação e Runbook (RUNBOOK.md)

## Rotinas Operacionais do PNBOX AI

### 1. Inicialização do Ambiente
1. Clone do repositório em diretório limpo.
2. Definição do arquivo `.env` baseado em `.env.example`.
3. Execução de instalação e verificação:
   ```bash
   npm ci
   npm run lint
   npm test
   npm run build
   npm start
   ```

### 2. Verificação de Saúde do Sistema (Healthcheck)
- **Endpoint**: `GET /api/system/health`
- **Resposta Esperada**:
  ```json
  {
    "status": "ok",
    "timestamp": "2026-09-07T...",
    "version": "1.0.0",
    "services": {
      "api": "healthy",
      "auth": "configured"
    }
  }
  ```

### 3. Procedimento de Rotação de Credenciais
1. Gerar novo segredo JWT (`JWT_SECRET`) se houver suspeita de comprometimento.
2. Atualizar as credenciais `PNBOX_CPF` e `PNBOX_PASSWORD` no gestor de segredos.
3. Chamar `POST /api/automation/auth/expire` para forçar renovação de tokens ativos.
4. Reiniciar os serviços de backend para carregar os novos segredos.

### 4. Monitoramento e Telemetria
- O painel exibe telemetria de tráfego na aba "Configurações PNBOX -> Tráfego Interceptado".
- Requisições DDP, inserções e atualizações são logadas com timestamps precisos e níveis `info`, `warn` e `error`.
- Logs de erro contêm códigos padronizados para auditoria forense.
