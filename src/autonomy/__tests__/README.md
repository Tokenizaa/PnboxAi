# Testes de Automação

Este diretório contém testes para verificar o funcionamento correto dos módulos de automação do sistema.

## Testes Incluídos

### 1. geminiDeepResearch.test.ts
Testes para o módulo de pesquisa profunda usando Gemini AI.

**O que verifica:**
- Existence das funções `executarDeepResearch` e `sintetizar14FerramentasPnbox`
- Comportamento quando a chave de API do Gemini está ausente (modo fallback)
- Que o sistema não falha quando o provedor de IA está indisponível

### 2. playwrightScriptGenerator.test.ts
Testes para o gerador de scripts Playwright.

**O que verifica:**
- Geração correta de scripts oficiais do PNBOX
- Geração correta de scripts para criação de novos planos
- Tratamento adequado de parâmetros customizados
- Comportamento de fallback para templateIds inválidos
- Geração de scripts com credenciais customizadas

## Como Executar

### Executar testes individuais:
```bash
npx tsx src/autonomy/__tests__/geminiDeepResearch.test.ts
npx tsx src/autonomy/__tests__/playwrightScriptGenerator.test.ts
```

### Executar todos os testes:
```bash
node src/autonomy/__tests__/runTests.js
```

## Observações

Alguns testes de correspondência exata de strings podem falhar devido à natureza dinâmica dos scripts gerados (IDs aleatórios, timestamps, etc.), mas os testes essenciais de estrutura e funcionamento estão passando.

Os testes verificam principalmente:
- Que as funções existem e podem ser chamadas
- Que os scripts gerados contêm os elementos essenciais (imports, funções principais, etc.)
- Que o tratamento de erros e fallbacks está funcionando corretamente