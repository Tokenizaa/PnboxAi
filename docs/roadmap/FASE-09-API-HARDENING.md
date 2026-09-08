# FASE 09 — API e Hardening

**Estado:** PLANEJADA — não executada  
**Objetivo:** proteger a superfície HTTP e tornar falhas de dependências externas explícitas e controladas.

## Controles

- Validar payloads por schema.
- Validar todos os parâmetros e identificadores.
- Rate limiting adequado aos endpoints.
- Limite de tamanho de payload.
- CORS restritivo ao ambiente real.
- Security headers adequados.
- Erros seguros sem stack trace ou secrets.
- Correlation/request ID.
- Timeout para dependências externas.
- Tratamento explícito de indisponibilidade do PNBOX.

## Autorização

Todo endpoint que recebe `idPlano`, documento, ferramenta ou entidade deve validar identidade e pertencimento no servidor. Não confiar em estado enviado pelo frontend.

## Evidências

- Testes de payload inválido.
- Testes de autenticação/autorização.
- Testes de rate limit e tamanho.
- Testes de timeout e indisponibilidade PNBOX.
- Verificação de headers e CORS no deployment.
- Verificação de ausência de informações sensíveis nos erros.

## Gate

`API_HARDENED` quando os endpoints críticos estiverem validados, protegidos e com comportamento de erro previsível.
