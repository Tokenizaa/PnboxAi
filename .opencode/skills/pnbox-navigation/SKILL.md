---
name: pnbox-navigation
description: Use quando precisar navegar no PNBOX (Sebrae) — autenticar, localizar ferramentas em cards/tabs, abrir ferramenta, voltar ao plano e preservar sessão. Gatilhos: "navegar no PNBOX", "abrir ferramenta", "voltar ao plano", "login PNBOX", "localizar card".
---

# pnbox-navigation

Navegação real no PNBOX via Playwright. Regra: **nunca usar URL/rota inferida
como verdade** — usar caminhos confirmados pelo runtime-map
(`docs/pnbox/runtime/`).

## 1. Autenticação (scripts/pnbox/auth.mjs)

- Credenciais: `.env` → `LOGIN`, `PASSWORD`, `URL`.
- `login(page)` navega a `URL`, preenche email/senha por label regex
  (`/e-?mail|usu[aá]rio|login/i`), clica `entrar|login|acessar` e espera
  `waitForURL(/pnbox\.sebrae\.com\.br/, 60s)`.
- Erro comum: seletor de email não acha → conferir tela OAuth (Gestão AMEI)
  mudou. **Não adivinhar** — reportar ao discovery.

## 2. Browser (scripts/pnbox/browser.mjs)

- `launchBrowser(headless)` → Chromium com `--no-sandbox`, viewport 1280×900,
  locale `pt-BR`. Visible para debug; `headless: true` só em CI.

## 3. Localizar ferramenta na página do plano

1. Navegar para a URL do plano (a do `.env`, confirmada pelo runtime-map).
2. Localizar card pelo **nome acessível real**: `page.getByText(nome, {exact:false}).first()`.
3. Nome real vem do runtime-map (`card_name`/`open`), NUNCA da doc `inferred`.
4. Card pode ser div/button/link — tentar `click()` no card; se falhar, clicar
   pai (`locator('xpath=..')`). Confirmar URL destino mudou.

## 4. Retorno ao plano (preserva sessão)

- Voltar = `page.goto(URL_do_plano)` (sessão mantida no contexto) OU botão de
  retorno real observado. Preferir URL do plano — equivalente e determinístico.
- Antes de abrir outra ferramenta, SEMPRE voltar ao plano (não navegar de
  ferramenta em ferramenta direto).

## 5. Preservação de sessão

- Reusar o mesmo `browser`/`context` entre ferramentas — login é 1x por run.
- Se sessão expirar (volta para login): relogar e retomar da ferramenta
  corrente; registrar a expiração no estado.

## 6. Registro de evidência de navegação

- Sempre capturar `page.url()` após abrir/voltar.
- Salvar evidência em `docs/pnbox/evidencias/` quando mudanças estruturais
  forem notadas (screenshots anotados).

## Anti-padrões

- ❌ Usar `#segmentacao-mercado` como rota — docs marcam rotas como `inferred`.
- ❌ Navegar por nth-child/xpath frágil.
- ❌ Fazer login múltiplas vezes no mesmo contexto sem necessidade.
