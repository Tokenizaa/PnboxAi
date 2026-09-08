# Guia de Implantação em Produção (DEPLOYMENT.md)

## Requisitos de Sistema
- **Runtime**: Node.js 20+ LTS
- **Gerenciador de Pacotes**: npm 10+
- **Memória Mínima**: 1 GB RAM (recomendado 2 GB para execução do Playwright em modo headless)
- **Porta**: 3000 (obrigatória para Cloud Run / Proxy Ingress)

## Pipeline de Compilação
A compilação unificada do projeto gera os artefatos estáticos de frontend em `dist/` e empacota o backend Node.js em um bundle CommonJS autossuficiente em `dist/server.cjs`:

```bash
# 1. Instalação limpa de dependências
npm ci

# 2. Verificação de tipagem estrita
npm run lint

# 3. Execução dos testes automatizados
npm test

# 4. Compilação de produção
npm run build
```

## Inicialização do Servidor
O comando oficial de execução em produção:

```bash
npm start
# Executa: node dist/server.cjs
```

## Configuração em Contêineres (Docker / Cloud Run)
- O contêiner expõe a porta `3000`.
- O servidor faz bind obrigatório em `0.0.0.0:3000`.
- Variáveis de ambiente sensíveis devem ser injetadas via Secret Manager (GCP Secret Manager ou similar).
- Não embutir senhas ou chaves de API nas imagens de contêiner.
