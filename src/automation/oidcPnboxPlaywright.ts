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

    // ETAPA 1: Navegar para PNBOX → redireciona para Keycloak
    console.log('[OIDC/Playwright] Navegando para PNBOX...');
    await page.goto(PNBOX_BASE + '/', {
      waitUntil: 'domcontentloaded',
      timeout: 30000
    });

    // Aguardar formulário de login do Keycloak
    console.log('[OIDC/Playwright] Aguardando tela de login SSO...');
    await page.waitForSelector('input[name="username"], input#username', {
      timeout: 15000
    });

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

    // ETAPA 5: Aguardar PNBOX carregar (deve mostrar a home ou redirecionar para /planoNegocio)
    await page.waitForLoadState('networkidle', { timeout: 15000 }).catch(() => {});

    // ETAPA 6: Extrair cookies do PNBOX (NÃO os do Keycloak)
    const allCookies = await context.cookies();
    const pnboxCookies = allCookies.filter(c =>
      c.domain.includes('pnbox.sebrae.com.br') ||
      c.domain === 'pnbox.sebrae.com.br' ||
      c.domain === '.pnbox.sebrae.com.br'
    );

    if (pnboxCookies.length === 0) {
      throw new Error('[OIDC/Playwright] Nenhum cookie do PNBOX encontrado após login');
    }

    // Serializar cookies no formato Cookie header
    const pnboxCookieHeader = pnboxCookies
      .map(c => `${c.name}=${c.value}`)
      .join('; ');

    console.log(`[OIDC/Playwright] ${pnboxCookies.length} cookies PNBOX capturados`);

    // ETAPA 7: Capturar tokens OIDC via window/cookies do navegador
    // O PNBOX armazena os tokens em localStorage ou cookies, vamos tentar ambos
    let idToken = '';
    let accessToken = '';
    let refreshToken: string | undefined;

    try {
      const storage = await page.evaluate(() => {
        const result: any = {};
        try {
          for (let i = 0; i < window.localStorage.length; i++) {
            const key = window.localStorage.key(i);
            if (key) {
              result[key] = window.localStorage.getItem(key);
            }
          }
          (window as any).sessionStorage && (window as any).sessionStorage.length;
        } catch {}
        return result;
      });

      // Procurar tokens em chaves comuns
      for (const [key, val] of Object.entries(storage || {})) {
        const strVal = String(val || '');
        if (strVal.startsWith('eyJ') && strVal.length > 100) {
          // JWT detectado
          try {
            const payload = JSON.parse(
              Buffer.from(strVal.split('.')[1], 'base64').toString()
            );
            if (payload.typ === 'ID' || key.includes('id_token')) idToken = strVal;
            if (payload.typ === 'Bearer' || key.includes('access_token')) accessToken = strVal;
            if (key.includes('refresh_token')) refreshToken = strVal;
          } catch {}
        }
      }
    } catch (e) {
      console.warn('[OIDC/Playwright] Não foi possível extrair tokens do localStorage:', e);
    }

    // Se não conseguimos extrair via localStorage, tentar pegar do ID da página (injetado por window.__meteor_runtime_config__)
    if (!idToken || !accessToken) {
      try {
        const meteordata = await page.evaluate(() => {
          const scripts = Array.from(document.querySelectorAll('script'));
          for (const script of scripts) {
            const txt = script.innerHTML;
            if (txt.includes('__meteor_runtime_config__')) {
              const m = txt.match(/__meteor_runtime_config__\s*=\s*JSON\.parse\(decodeURIComponent\("([^"]+)"\)\)/);
              if (m) {
                return decodeURIComponent(m[1]);
              }
            }
          }
          return null;
        });
        if (meteordata) {
          console.log('[OIDC/Playwright] Meteor runtime config capturado');
        }
      } catch {}
    }

    // Fallback: usar valores vazios para tokens (cookies são suficientes para DDP)
    if (!idToken) {
      // Tokens vazios são OK — cookies sozinhos bastam para WebSocket DDP
      console.log('[OIDC/Playwright] Tokens OIDC não encontrados — usando apenas cookies PNBOX');
    }

    return {
      pnboxCookies: pnboxCookieHeader,
      idToken: idToken || 'cookie-only',
      accessToken: accessToken || 'cookie-only',
      refreshToken,
      expiresAt: Date.now() + (50 * 60 * 1000) // 50 min — TTL interno do Hub
    };
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
