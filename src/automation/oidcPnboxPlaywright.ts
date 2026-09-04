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
import { PnboxConnectionStep } from './connectionJob';

const KEYCLOAK_BASE = 'https://amei.sebrae.com.br';
const PNBOX_BASE = 'https://pnbox.sebrae.com.br';

/** Callback para reportar progresso real da autenticação */
export type PnboxProgressCallback = (step: PnboxConnectionStep) => void;

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
 * @param onProgress Callback para emitir eventos de progresso reais
 * @returns Resultado com cookies PNBOX formatados para WebSocket
 */
export async function pnboxOidcLoginViaPlaywright(
  cpf: string,
  password: string,
  onProgress?: PnboxProgressCallback
): Promise<OidcLoginResult> {
  let browser: Browser | null = null;
  let context: BrowserContext | null = null;
  let page: Page | null = null;

  const report = (step: PnboxConnectionStep) => {
    if (onProgress) onProgress(step);
  };

  try {
    console.log('[OIDC/Playwright] Iniciando Chromium headless...');
    report('initializing');
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
    report('opening_pnbox');
    await page.goto(PNBOX_BASE + '/', {
      waitUntil: 'load',
      timeout: 35000
    });
    let urlAposGoto = page.url();
    console.log(`[OIDC/Playwright] URL após goto: ${urlAposGoto}`);

    // Se ainda está no PNBOX (não redirecionou direto), aguardar o botão Entrar do React/MUI
    if (urlAposGoto.includes('pnbox.sebrae.com.br') && !urlAposGoto.includes('login') && !urlAposGoto.includes('amei')) {
      console.log('[OIDC/Playwright] Aguardando botão "Entrar" renderizar...');
      report('waiting_login');
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
    report('waiting_login');
    try {
      await page.waitForSelector('input[name="username"], input#username', {
        timeout: 25000,
        state: 'visible'
      });
      console.log('[OIDC/Playwright] Form de login SSO detectado!');
      report('login_detected');
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
    report('submitting_credentials');
    await page.fill('input[name="username"], input#username', cpf);
    await page.fill('input[name="password"], input#password', password);

    // Marcar "Lembre-se de mim" se houver
    const rememberCheckbox = page.locator('input[name="rememberMe"]');
    if (await rememberCheckbox.count() > 0) {
      await rememberCheckbox.check().catch(() => {});
    }

    // ETAPA 3: Submeter formulário
    console.log('[OIDC/Playwright] Submetendo formulário de login...');
    report('authenticating');
    const submitBtn = page.locator('input[name="login"], button[name="login"], #kc-login, button[type="submit"], input[type="submit"]').first();
    await submitBtn.click();

    // ETAPA 4: Aguardar retorno ao PNBOX. Sucesso = URL dentro do PNBOX.
    // Sem desistir por URL ainda no Keycloak — redirect pode demorar.
    const deadline = Date.now() + 45000;
    let urlAposLogin = page.url();
    let authError: string | null = null;
    while (Date.now() < deadline) {
      urlAposLogin = page.url();

      // Sucesso: chegou no PNBOX
      if (urlAposLogin.includes('pnbox.sebrae.com.br')) {
        console.log(`[OIDC/Playwright] Login OK — URL após login: ${urlAposLogin.substring(0, 80)}...`);
        break;
      }

      // Erro REAL de credencial: seletor de erro visível no Keycloak
      if (urlAposLogin.includes('amei.sebrae.com.br')) {
        const errLocs = page.locator(
          '.kc-feedback-text, .alert-error, #input-error, .alert, .alert-error, .error, .kc-form-error'
        );
        if (await errLocs.first().isVisible().catch(() => false)) {
          authError = (await errLocs.first().textContent().catch(() => null))?.trim() || null;
          if (authError) {
            console.error(`[OIDC/Playwright] Erro real do Sebrae ID: ${authError}`);
            break;
          }
        }
      }

      await page.waitForTimeout(1000);
    }

    // Se desistimos sem sucesso nem erro de credencial → timeout de redirect
    if (!urlAposLogin.includes('pnbox.sebrae.com.br') && !authError) {
      const debugPath = `/tmp/pnbox-auth-timeout-${Date.now()}.png`;
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
      console.error(`[OIDC/Playwright] Redirect ao PNBOX não completou. URL final: ${urlAposLogin.substring(0, 120)}. Screenshot: ${debugPath}`);
      throw new Error(`[OIDC/Playwright] O redirecionamento ao PNBOX após o login não completou em tempo hábil (${urlAposLogin.substring(0, 80)}).`);
    }

    // Erro de credencial confirmado
    if (authError) {
      throw new Error(`[Sebrae ID] ${authError}`);
    }

    // ETAPA 5: Aguardar PNBOX carregar e armazenar tokens Meteor
    report('obtaining_session');
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // ETAPA 6: Extrair tokens Meteor do localStorage ou memória
    let meteorData: { loginToken: string | null; userId: string | null; loginTokenExpires: string | null; xMtok?: string } = {
      loginToken: null,
      userId: null,
      loginTokenExpires: null,
      xMtok: ''
    };

    // Esperar app PNBOX inicializar e popular Meteor (pode demorar após redirect)
    const startExtractTime = Date.now();
    while (Date.now() - startExtractTime < 30000) {
      const extracted = await page.evaluate(() => {
        const storage = (() => {
          try { return localStorage; } catch { return null; }
        })();
        const tok = storage?.getItem('Meteor.loginToken') || (window as any).Meteor?.default_connection?._loginToken;
        const uId = storage?.getItem('Meteor.userId') || (window as any).Meteor?.userId?.();
        const exp = storage?.getItem('Meteor.loginTokenExpires');
        const xMtok = document.cookie.split('; ').find(c => c.startsWith('x_mtok='))?.split('=')[1] || '';
        return { loginToken: tok || null, userId: uId || null, loginTokenExpires: exp || null, xMtok };
      }).catch(() => null);

      if (extracted?.loginToken && extracted?.userId) {
        meteorData = extracted;
        break;
      }
      // Recarregar se Meteor ainda não inicializou (SPA pode precisar de reload)
      if (Date.now() - startExtractTime > 12000 && !/pnbox\.sebrae\.com\.br\/?$/.test(page.url())) {
        await page.reload({ waitUntil: 'domcontentloaded', timeout: 20000 }).catch(() => {});
      }
      await page.waitForTimeout(800);
    }

    if (!meteorData.loginToken || !meteorData.userId) {
      const debugPath = `/tmp/pnbox-notoken-${Date.now()}.png`;
      await page.screenshot({ path: debugPath, fullPage: true }).catch(() => {});
      console.error(`[OIDC/Playwright] Token Meteor não encontrado após 30s. URL: ${page.url()}. Screenshot: ${debugPath}`);
      throw new Error(`[OIDC/Playwright] O login no Sebrae ID foi validado, mas a sessão do PNBOX não foi obtida no navegador. URL final: ${page.url().substring(0, 80)}.`);
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
