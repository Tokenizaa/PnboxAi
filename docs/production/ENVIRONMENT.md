# Variáveis de Ambiente (ENVIRONMENT.md)

Todas as variáveis de ambiente necessárias e opcionais para operação do PNBOX AI.

| Variável | Obrigatória? | Descrição | Exemplo |
|---|---|---|---|
| `NODE_ENV` | Sim | Ambiente de execução (`production` ou `development`) | `production` |
| `PORT` | Sim | Porta do servidor HTTP | `3000` |
| `GEMINI_API_KEY` | Sim | Chave de API Google Gemini para Deep Research e Copilot | `AIzaSy...` |
| `PNBOX_CPF` | Sim (p/ automação) | CPF da conta cadastrada no portal Sebrae | `00000000000` |
| `PNBOX_PASSWORD` | Sim (p/ automação) | Senha de acesso do Sebrae PNBOX | `********` |
| `GOOGLE_CUSTOM_SEARCH_API_KEY` | Recomendado | Chave de API para busca web real no Google Custom Search | `AIzaSy...` |
| `GOOGLE_CUSTOM_SEARCH_ENGINE_ID` | Recomendado | ID do mecanismo de busca personalizada (CX) | `0123456789:abcdef` |
| `NVIDIA_API_KEY` | Opcional | Chave alternativa para inferência em modelos DeepSeek / Llama | `nvapi-...` |
| `JWT_SECRET` | Recomendado | Segredo para assinatura de tokens de sessão da plataforma | `sua-chave-secreta-forte` |

## Regras de Segurança para Variáveis
1. **Nunca comitar `.env` com valores reais** no controle de versão.
2. Todas as chaves do backend devem ser lidas exclusivamente via `process.env`.
3. Não prefixar chaves confidenciais com `VITE_` para impedir vazamento para o navegador do cliente.
