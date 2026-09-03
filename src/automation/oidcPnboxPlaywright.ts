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
import { execSync } from 'child_process';
import { OidcLoginResult } from './oidcPnboxAuth';

const KEYCLOAK_BASE = 'https://amei.sebrae.com.br';
const PNBOX_BASE = 'https://pnbox.sebrae.com.br';

const CHROMIUM_LAUNCH_ARGS = [
  '--disable-blink-features=AutomationControlled',
  '--no-sandbox',
  '--disable-setuid-sandbox',
  '--disable-dev-shm-usage',
  '--disable-gpu',
];

async function launchChromiumSafely(): Promise<Browser> {
  try {
    return await chromium.launch({
      headless: true,
      args: CHROMIUM_LAUNCH_ARGS,
    });
  } catch (err: any) {
    const isMissingExecutable =
      err?.message?.includes("Executable doesn't exist") ||
      err?.message?.includes('playwright install') ||
      err?.message?.includes('browserType.launch');

    if (isMissingExecutable) {
      console.warn('[OIDC/Playwright] Binário do Chromium não encontrado no cache. Executando instalação automática...');
      try {
        execSync('npx playwright install chromium', { stdio: 'inherit' });
        console.log('[OIDC/Playwright] Chromium instalado com sucesso. Retentando inicialização...');
        return await chromium.launch({
          headless: true,
          args: CHROMIUM_LAUNCH_ARGS,
        });
      } catch (installErr: any) {
        console.error('[OIDC/Playwright] Falha ao instalar Chromium automaticamente:', installErr);
        throw new Error(
          `Não foi possível iniciar o navegador Chromium: binário ausente e falha na instalação automática (${installErr.message}). Execute 'npx playwright install chromium'.`
        );
      }
    }
    throw err;
  }
}

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
    browser = await launchChromiumSafely();

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
      waitUntil: 'load',
      timeout: 35000
    });
    let urlAposGoto = page.url();
    console.log(`[OIDC/Playwright] URL após goto: ${urlAposGoto}`);

    // Se ainda está no PNBOX (não redirecionou direto), aguardar o botão Entrar do React/MUI
    if (urlAposGoto.includes('pnbox.sebrae.com.br') && !urlAposGoto.includes('login') && !urlAposGoto.includes('amei')) {
      console.log('[OIDC/Playwright] Aguardando botão "Entrar" renderizar...');
      try {
        await page.waitForSelector('button:has-text("Entrar")', {
          timeout: 15000,
          state: 'visible'
        });
        const entrarBtn = page.locator('button:has-text("Entrar")').first();
        console.log('[OIDC/Playwright] Clicando em "Entrar"...');
        await entrarBtn.click({ force: true });
        
        // Aguardar transição para a URL de SSO da AMEI / Keycloak
        await page.waitForURL(
          (url) => {
            const u = url.toString();
            return u.includes('amei.sebrae.com.br') || u.includes('login') || u.includes('auth');
          },
          { timeout: 25000 }
        ).catch(() => {});
      } catch (e: any) {
        console.warn('[OIDC/Playwright] Aviso ao procurar/clicar botão Entrar:', e.message);
      }
    }

    // Aguardar formulário de login do Keycloak
    console.log('[OIDC/Playwright] Aguardando tela de login SSO...');
    try {
      await page.waitForSelector('input[name="username"], input#username', {
        timeout: 25000,
        state: 'visible'
      });
      console.log('[OIDC/Playwright] Form de login SSO detectado!');
    } catch (e) {
      const debugPath = `/tmp/pnbox-debug-${Date.now()}.png`;
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
      const html = await page.content().catch(() => '');
      console.error(`[OIDC/Playwright] Falha ao detectar login SSO. URL: ${page.url()}`);
      console.error(`[OIDC/Playwright] Screenshot: ${debugPath}`);
      console.error(`[OIDC/Playwright] HTML snippet: ${html.substring(0, 500)}`);
      throw new Error(`[OIDC/Playwright] Formulário de login SSO não carregou a tempo em ${page.url()}`);
    }

    // ETAPA 2: Preencher credenciais
    console.log(`[OIDC/Playwright] Preenchendo CPF (3 primeiros dígitos): ${cpf.substring(0, 3)}***`);
    await page.fill('input[name="username"], input#username', cpf);
    await page.fill('input[name="password"], input#password', password);

    // Marcar "Lembre-se de mim" se houver
    const rememberCheckbox = page.locator('input[name="rememberMe"]');
    if (await rememberCheckbox.count() > 0) {
      await rememberCheckbox.check().catch(() => {});
    }

    // ETAPA 3: Submeter formulário
    console.log('[OIDC/Playwright] Submetendo formulário de login...');
    const submitBtn = page.locator('input[name="login"], button[name="login"], #kc-login, button[type="submit"], input[type="submit"]').first();
    await submitBtn.click();

    // Aguardar redirecionamento de volta ao PNBOX ou erro no Keycloak
    await page.waitForURL(
      (url) => {
        const u = url.toString();
        return u.includes('pnbox.sebrae.com.br') || u.includes('/login-actions/') || u.includes('error');
      },
      { timeout: 30000 }
    ).catch(() => {});

    // ETAPA 4: Verificar se login teve sucesso
    const urlAposLogin = page.url();
    console.log(`[OIDC/Playwright] URL após login: ${urlAposLogin.substring(0, 80)}...`);

    // Se ainda está no Keycloak, capturar erro
    if (urlAposLogin.includes('amei.sebrae.com.br') &&
        (urlAposLogin.includes('/login') || urlAposLogin.includes('login-actions') || urlAposLogin.includes('protocol/openid-connect'))) {
      const errorMsg = await page.locator('.kc-feedback-text, .alert-error, #input-error, .instruction, .alert')
        .first()
        .textContent()
        .catch(() => null);
      const cleanError = errorMsg?.trim() || 'Usuário ou senha incorretos no Sebrae ID.';
      throw new Error(`[Sebrae ID] ${cleanError}`);
    }

    // ETAPA 5: Aguardar PNBOX carregar e armazenar tokens Meteor
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // ETAPA 6: Extrair tokens Meteor do localStorage ou memória
    let meteorData: { loginToken: string | null; userId: string | null; loginTokenExpires: string | null; xMtok?: string } = {
      loginToken: null,
      userId: null,
      loginTokenExpires: null,
      xMtok: ''
    };

    const startExtractTime = Date.now();
    while (Date.now() - startExtractTime < 15000) {
      const extracted = await page.evaluate(() => {
        const tok = localStorage.getItem('Meteor.loginToken') || (window as any).Meteor?.default_connection?._loginToken;
        const uId = localStorage.getItem('Meteor.userId') || (window as any).Meteor?.userId?.();
        const exp = localStorage.getItem('Meteor.loginTokenExpires');
        const xMtok = document.cookie.split('; ').find(c => c.startsWith('x_mtok='))?.split('=')[1] || '';
        return { loginToken: tok || null, userId: uId || null, loginTokenExpires: exp || null, xMtok };
      }).catch(() => null);

      if (extracted?.loginToken && extracted?.userId) {
        meteorData = extracted;
        break;
      }
      await page.waitForTimeout(500);
    }

    if (!meteorData.loginToken || !meteorData.userId) {
      throw new Error('[OIDC/Playwright] Sessão retornou do Sebrae ID mas o token Meteor não foi encontrado no navegador.');
    }

    console.log(`[OIDC/Playwright] Meteor tokens capturados com sucesso: userId=${meteorData.userId}`);

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
