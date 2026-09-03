/**
 * Autenticação OIDC do PNBOX usando Playwright headless.
 *
 * POR QUE PLAYWRIGHT?
 * O Keycloak AMEI está configurado com `response_mode=fragment`, o que significa
 * que o `code` de autorização é entregue via fragmento URL (#code=...).
 * O JavaScript no PNBOX extrai esse code e faz POST back-channel para
 * `/protocol/openid-connect/token` para trocar por tokens.
 *
 * Como fragment URL não é enviado ao servidor, não há como completar o fluxo
 * OIDC sem um navegador JavaScript real.
 *
 * Esta implementação usa Playwright em modo headless para automatizar esse
 * processo, mantendo a sessão efêmera e descartando o navegador após uso.
 */

import { chromium, Browser, BrowserContext, Page } from 'playwright';
import { OidcLoginResult } from './oidcPnboxAuth';

const KEYCLOAK_BASE = 'https://amei.sebrae.com.br';
const PNBOX_BASE = 'https://pnbox.sebrae.com.br';

/**
 * Faz login OIDC completo usando Playwright headless.
 * Retorna cookies PNBOX prontos para uso em WebSocket DDP.
 *
 * @param cpf CPF do titular da conta
 * @param password Senha do titular
 * @returns Resultado com cookies PNBOX formatados para WebSocket
 */
export async function pnboxOidcLoginViaPlaywright(
  cpf: string,
  password: string
): Promise<OidcLoginResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  try {
    console.log('[OIDC/Playwright] Iniciando Chromium headless...');
    browser = await chromium.launch({
      headless: true,
      args: [
        '--disable-blink-features=AutomationControlled',
        '--no-sandbox',
        '--disable-setuid-sandbox',
        '--disable-dev-shm-usage'
      ]
    });

    context = await browser.newContext({
      viewport: { width: 1366, height: 768 },
      userAgent: 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      locale: 'pt-BR',
      timezoneId: 'America/Sao_Paulo'
    });

    page = await context.newPage();

    // Capturar logs do console do browser para debug
    page.on('console', msg => {
      console.log(`[Browser ${msg.type()}]`, msg.text().substring(0, 200));
    });

    // ETAPA 1: Navegar para PNBOX → redireciona para Keycloak
    console.log('[OIDC/Playwright] Navegando para PNBOX...');
    await page.goto(PNBOX_BASE + '/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });
    const urlAposGoto = page.url();
    console.log(`[OIDC/Playwright] URL após goto: ${urlAposGoto}`);

    // Esperar React/MUI hidratar — pode haver delay no SPA
    await page.waitForTimeout(2000);

    // Se ainda está no PNBOX (não redirecionou), pode estar na home com botão "Entrar"
    if (urlAposGoto.includes('pnbox.sebrae.com.br') && !urlAposGoto.includes('login') && !urlAposGoto.includes('amei')) {
      console.log('[OIDC/Playwright] Procurando botão Entrar na home...');
      // Esperar botão ficar visível (pode demorar para React renderizar)
      try {
        await page.waitForSelector('button:has-text("Entrar")', {
          timeout: 10000,
          state: 'visible'
        });
      } catch (e) {
        console.error('[OIDC/Playwright] Botão Entrar não apareceu após 10s');
      }

      const entrarBtn = page.locator('button:has-text("Entrar")').first();
      const btnCount = await entrarBtn.count();
      console.log(`[OIDC/Playwright] ${btnCount} botão(ões) "Entrar" encontrado(s)`);

      if (btnCount > 0) {
        const visible = await entrarBtn.isVisible();
        const enabled = await entrarBtn.isEnabled();
        console.log(`[OIDC/Playwright] Botão visível: ${visible}, habilitado: ${enabled}`);

        // Tentar clique com Promise.all para capturar navegação
        try {
          await Promise.all([
            page.waitForNavigation({
              waitUntil: 'domcontentloaded',
              timeout: 30000
            }).catch((e) => {
              console.warn('[OIDC/Playwright] waitForNavigation timeout/error:', e.message.substring(0, 80));
            }),
            entrarBtn.click({ force: true, timeout: 5000 })
          ]);
          console.log(`[OIDC/Playwright] URL após clicar Entrar: ${page.url()}`);
        } catch (e: any) {
          console.error('[OIDC/Playwright] Falha ao clicar Entrar:', e.message);
          // Tentar sem Promise.all
          await entrarBtn.click({ force: true }).catch(() => {});
          await page.waitForTimeout(3000);
          console.log(`[OIDC/Playwright] URL após segundo clique: ${page.url()}`);
        }
      }
    }

    // Aguardar formulário de login do Keycloak
    console.log('[OIDC/Playwright] Aguardando tela de login SSO...');
    try {
      await page.waitForSelector('input[name="username"], input#username', {
        timeout: 20000,
        state: 'visible'
      });
      console.log('[OIDC/Playwright] Form de login SSO detectado!');
    } catch (e) {
      // Debug: capturar screenshot e HTML para entender
      const debugPath = `/tmp/pnbox-debug-${Date.now()}.png`;
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
      const html = await page.content().catch(() => '');
      console.error(`[OIDC/Playwright] Falha. URL: ${page.url()}`);
      console.error(`[OIDC/Playwright] Screenshot: ${debugPath}`);
      console.error(`[OIDC/Playwright] HTML snippet: ${html.substring(0, 500)}`);
      throw new Error(`[OIDC/Playwright] Form de login não apareceu em ${page.url()}`);
    }

    // ETAPA 2: Preencher credenciais
    console.log(`[OIDC/Playwright] Preenchendo CPF (3 primeiros dígitos): ${cpf.substring(0, 3)}***`);
    await page.fill('input[name="username"]', cpf);
    await page.fill('input[name="password"]', password);

    // Marcar "Lembre-se de mim" se houver
    const rememberCheckbox = page.locator('input[name="rememberMe"]');
    if (await rememberCheckbox.count() > 0) {
      await rememberCheckbox.check().catch(() => {});
    }

    // ETAPA 3: Submeter formulário
    console.log('[OIDC/Playwright] Submetendo formulário de login...');
    await Promise.all([
      page.waitForNavigation({
        waitUntil: 'domcontentloaded',
        timeout: 30000
      }),
      page.click('input[name="login"], button[name="login"], button[type="submit"]')
    ]);

    // ETAPA 4: Verificar se login teve sucesso
    const urlAposLogin = page.url();
    console.log(`[OIDC/Playwright] URL após login: ${urlAposLogin.substring(0, 80)}...`);

    // Se ainda está no Keycloak, falhou
    if (urlAposLogin.includes('amei.sebrae.com.br') &&
        (urlAposLogin.includes('/login') || urlAposLogin.includes('login-actions'))) {
      // Tentar pegar mensagem de erro
      const errorMsg = await page.locator('.kc-feedback-text, .instruction, .alert-error')
        .first()
        .textContent()
        .catch(() => null);
      throw new Error(
        `[OIDC/Playwright] Login SSO falhou — ainda em ${urlAposLogin}. ` +
        `Mensagem: ${errorMsg || '(sem mensagem)'}`
      );
    }

    // ETAPA 5: Aguardar PNBOX carregar e armazenar tokens Meteor
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});
    await page.waitForFunction(
      () => localStorage.getItem('Meteor.loginToken') !== null,
      { timeout: 10000 }
    ).catch(() => {});

    // ETAPA 6: Extrair tokens Meteor do localStorage (mais confiáveis que cookies)
    const meteorData = await page.evaluate(() => {
      return {
        loginToken: localStorage.getItem('Meteor.loginToken'),
        userId: localStorage.getItem('Meteor.userId'),
        loginTokenExpires: localStorage.getItem('Meteor.loginTokenExpires'),
        // Cookies relevantes para WebSocket DDP
        xMtok: document.cookie.split('; ').find(c => c.startsWith('x_mtok='))?.split('=')[1] || ''
      };
    });

    if (!meteorData.loginToken || !meteorData.userId) {
      throw new Error('[OIDC/Playwright] Meteor.loginToken/Meteor.userId ausentes após login');
    }

    console.log(`[OIDC/Playwright] Meteor tokens capturados: userId=${meteorData.userId}`);

    // ETAPA 7: Extrair cookies do PNBOX para completar autenticação WebSocket
    const allCookies = await context.cookies();
    const pnboxCookies = allCookies.filter(c =>
      c.domain.includes('pnbox.sebrae.com.br')
    );
    const pnboxCookieHeader = pnboxCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    console.log(`[OIDC/Playwright] ${pnboxCookies.length} cookies PNBOX capturados`);

    // Calcular TTL real a partir do loginTokenExpires
    let expiresAtMs = Date.now() + (50 * 60 * 1000);
    if (meteorData.loginTokenExpires) {
      const parsed = new Date(meteorData.loginTokenExpires).getTime();
      if (!isNaN(parsed)) expiresAtMs = parsed;
    }

    return {
      pnboxCookies: pnboxCookieHeader,
      // Tokens Meteor são o que importam — cookies são secundários
      idToken: meteorData.loginToken,
      accessToken: meteorData.loginToken,
      refreshToken: undefined,
      expiresAt: expiresAtMs,
      // Campos extras para o realRunner usar diretamente
      meteorLoginToken: meteorData.loginToken,
      meteorUserId: meteorData.userId
    } as any;
  } finally {
    // SEMPRE fechar o navegador — é a fonte do risco de segurança
    try {
      if (page) await page.close();
    } catch {}
    try {
      if (context) await context.close();
    } catch {}
    try {
      if (browser) await browser.close();
    } catch {}
  }
}
