/**
 * Cliente OIDC para autenticação no PNBOX do Sebrae via Keycloak (AMEI).
 *
 * Fluxo:
 *  [1] GET https://pnbox.sebrae.com.br/ → redirect 302 para Keycloak
 *  [2] GET https://amei.sebrae.com.br/auth/realms/externo/protocol/openid-connect/auth?... → HTML
 *  [3] POST authenticate com username + password (form-urlencoded) → 302 com Location contendo fragmento #code
 *  [4] Cookies do Keycloak + extrair `code` do Location header (response_mode=fragment)
 *  [5] Trocar code por tokens em /protocol/openid-connect/token (back-channel)
 *  [6] Cookies do PNBOX vêm quando chamamos endpoint do PNBOX com Authorization Bearer
 *
 * Por causa de `response_mode=fragment`, o navegador JS extrai o `code` do `window.location.hash`.
 * Para automação server-side, o Keycloak retorna o code no header `Location` também,
 * mas o follow-redirect normal do fetch NÃO inclui o fragmento.
 *
 * A solução: NÃO seguir o redirect automaticamente, ler Location, parsear fragmento,
 * então chamar /protocol/openid-connect/token para trocar code → access_token + id_token.
 *
 * IMPORTANTE: Este código é feito para o usuário titular da conta.
 * Nunca persiste credenciais, nunca loga password, nunca transmite para terceiros.
 */

const KEYCLOAK_BASE = 'https://amei.sebrae.com.br';
const KEYCLOAK_REALM = 'externo';
const PNBOX_BASE = 'https://pnbox.sebrae.com.br';
const CLIENT_ID = 'pnbox-frontend';
const REDIRECT_URI = `${PNBOX_BASE}/`;

export interface OidcLoginResult {
  pnboxCookies: string;            // Cookies PNBOX prontos para WebSocket DDP
  meteorLoginToken?: string;       // Token Meteor (se extraído)
  meteorUserId?: string;           // userId Meteor
  idToken: string;                 // OIDC id_token
  accessToken: string;             // OIDC access_token
  refreshToken?: string;
  expiresAt: number;
}

export interface CookieMap {
  [name: string]: string;
}

/**
 * Parseia header Set-Cookie em um Map chave→valor (apenas name=value; ignora flags).
 */
function parseSetCookie(setCookieList: string[]): CookieMap {
  const cookies: CookieMap = {};
  for (const sc of setCookieList) {
    const first = sc.split(';')[0];
    const eq = first.indexOf('=');
    if (eq > 0) {
      const name = first.substring(0, eq).trim();
      const value = first.substring(eq + 1).trim();
      if (name && value !== undefined) {
        cookies[name] = value;
      }
    }
  }
  return cookies;
}

/**
 * Serializa cookies no formato Cookie: header.
 */
function cookiesToHeader(cookies: CookieMap): string {
  return Object.entries(cookies)
    .filter(([_, v]) => v !== '' && v !== 'deleted')
    .map(([k, v]) => `${k}=${v}`)
    .join('; ');
}

/**
 * Mescla dois CookieMap (sobrescrevendo chaves iguais).
 */
function mergeCookies(a: CookieMap, b: CookieMap): CookieMap {
  return { ...a, ...b };
}

/**
 * Faz o fluxo completo de login OIDC no PNBOX.
 *
 * @param username CPF do usuário (titular da conta)
 * @param password Senha do usuário
 */
export async function pnboxOidcLogin(
  username: string,
  password: string,
  fetchImpl: typeof fetch = fetch
): Promise<OidcLoginResult> {

  // ============================================================
  // ETAPA 1: Gerar state/nonce/tab_id e obter URL de authorize
  // ============================================================
  const state = randomUuid();
  const nonce = randomUuid();
  const tabId = randomUuid().replace(/-/g, '');

  const authorizeUrl = new URL(
    `${KEYCLOAK_BASE}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/auth`
  );
  authorizeUrl.searchParams.set('client_id', CLIENT_ID);
  authorizeUrl.searchParams.set('redirect_uri', REDIRECT_URI);
  authorizeUrl.searchParams.set('response_mode', 'fragment');
  authorizeUrl.searchParams.set('response_type', 'code');
  authorizeUrl.searchParams.set('scope', 'openid');
  authorizeUrl.searchParams.set('state', state);
  authorizeUrl.searchParams.set('nonce', nonce);

  // ============================================================
  // ETAPA 2: GET authorize para receber cookies Keycloak + execution code
  // ============================================================
  const authRes = await fetchImpl(authorizeUrl.toString(), {
    method: 'GET',
    redirect: 'manual',
    headers: { 'Accept': 'text/html' }
  });

  if (authRes.status !== 200 && authRes.status !== 302) {
    throw new Error(`[OIDC] authorize retornou HTTP ${authRes.status}`);
  }

  let keycloakCookies = parseSetCookie(
    Array.from(authRes.headers as any).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v as string)
  );
  const authHtml = authRes.status === 200 ? await authRes.text() : '';

  // Extrair URL do form de submit (contém execution, session_code, tab_id)
  const formActionMatch = authHtml.match(/<form[^>]+id=["']kc-form-login["'][^>]+action=["']([^"']+)["']/i)
    || authHtml.match(/<form[^>]+action=["']([^"']+)["'][^>]*id=["']kc-form-login["']/i);

  if (!formActionMatch) {
    throw new Error('[OIDC] form kc-form-login não encontrado na resposta do Keycloak');
  }

  // IMPORTANTE: O HTML do Keycloak usa entidades HTML (&) na URL do action.
  // Devemos DECODIFICAR para & literal antes de passar para fetch/URL,
  // pois & literal é o separador correto de query params.
  const formAction = formActionMatch[1].replace(/&/g, '&');

  // ============================================================
  // ETAPA 3: POST authenticate com credenciais (form-urlencoded)
  // ============================================================
  const body = new URLSearchParams();
  body.set('username', username);
  body.set('password', password);
  body.set('rememberMe', 'on');
  body.set('login', 'Entrar');

  const kcCookieHeader = cookiesToHeader(keycloakCookies);
  console.log('[OIDC DEBUG] Cookies extraídos:', Object.keys(keycloakCookies));
  console.log('[OIDC DEBUG] Cookie header length:', kcCookieHeader.length);
  console.log('[OIDC DEBUG] Cookie header keys:', kcCookieHeader.split(';').map(c => c.split('=')[0]).join(', '));

  const loginRes = await fetchImpl(formAction, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'text/html,application/xhtml+xml',
      'Cookie': kcCookieHeader,
      'Origin': KEYCLOAK_BASE,
      'Referer': authorizeUrl.toString(),
      'User-Agent': 'Mozilla/5.0 (compatible; PnboxHub/1.0)'
    },
    body: body.toString()
  });

  // Capturar novos cookies do login
  const newKcCookies = parseSetCookie(
    Array.from(loginRes.headers as any).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v as string)
  );
  keycloakCookies = mergeCookies(keycloakCookies, newKcCookies);

    // Módulo legado — mantido apenas para referência.
    // O fluxo real usa Playwright (oidcPnboxPlaywright.ts) porque o Keycloak AMEI
    // requer response_mode=fragment, o que exige navegador JavaScript real.
    throw new Error('[OIDC] Módulo legado desabilitado — use oidcPnboxPlaywright.ts');

  // O Keycloak retorna 302 com Location: https://pnbox.sebrae.com.br/#code=XXX&state=YYY
  const locationHeader = loginRes.headers.get('location') || '';
  if (!locationHeader) {
    throw new Error('[OIDC] Location ausente no 302 do Keycloak — fluxo possivelmente quebrado');
  }

  // Extrair code do fragmento
  const locUrl = new URL(locationHeader, PNBOX_BASE);
  const fragment = locUrl.hash.substring(1); // remove #
  const fragParams = new URLSearchParams(fragment);
  const code = fragParams.get('code');
  const returnedState = fragParams.get('state');

  if (!code) {
    throw new Error(`[OIDC] code ausente no fragment — fragment recebido: ${fragment.substring(0, 80)}...`);
  }
  if (returnedState !== state) {
    throw new Error('[OIDC] state mismatch — possível CSRF');
  }

  // ============================================================
  // ETAPA 4: Trocar code por tokens (back-channel token exchange)
  // ============================================================
  const tokenUrl = `${KEYCLOAK_BASE}/auth/realms/${KEYCLOAK_REALM}/protocol/openid-connect/token`;
  const tokenBody = new URLSearchParams();
  tokenBody.set('grant_type', 'authorization_code');
  tokenBody.set('client_id', CLIENT_ID);
  tokenBody.set('code', code);
  tokenBody.set('redirect_uri', REDIRECT_URI);

  const tokenRes = await fetchImpl(tokenUrl, {
    method: 'POST',
    redirect: 'manual',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'Accept': 'application/json',
      'Cookie': cookiesToHeader(keycloakCookies),
      'Origin': PNBOX_BASE,
      'User-Agent': 'Mozilla/5.0 (compatible; PnboxHub/1.0)'
    },
    body: tokenBody.toString()
  });

  if (tokenRes.status !== 200) {
    const errText = await tokenRes.text();
    throw new Error(`[OIDC] token exchange falhou (HTTP ${tokenRes.status}): ${errText.substring(0, 200)}`);
  }

  const tokenJson: any = await tokenRes.json();
  const accessToken: string = tokenJson.access_token;
  const idToken: string = tokenJson.id_token;
  const refreshToken: string | undefined = tokenJson.refresh_token;
  const expiresIn: number = tokenJson.expires_in ?? 300;

  if (!accessToken) {
    throw new Error('[OIDC] access_token ausente na resposta do token endpoint');
  }

  // ============================================================
  // ETAPA 5: Usar tokens para acessar PNBOX e obter cookies + loginToken Meteor
  // ============================================================
  // Acessar a raiz do PNBOX com Authorization Bearer para que o servidor PNBOX
  // faça back-channel com Keycloak, valide o token, e emita seus próprios cookies.
  const pnboxRes = await fetchImpl(`${PNBOX_BASE}/`, {
    method: 'GET',
    redirect: 'manual',
    headers: {
      'Accept': 'text/html',
      'Authorization': `Bearer ${accessToken}`,
      'User-Agent': 'Mozilla/5.0 (compatible; PnboxHub/1.0)'
    }
  });

  const pnboxCookiesRaw = parseSetCookie(
    Array.from(pnboxRes.headers as any).filter(([k]) => k.toLowerCase() === 'set-cookie').map(([, v]) => v as string)
  );
  const pnboxCookieHeader = cookiesToHeader(pnboxCookiesRaw);

  // O loginToken Meteor é entregue ao cliente via JS da página,
  // tipicamente em window.__meteor_runtime_config__ ou via DDP após connect.
  // Aqui retornamos o cookie header — o caller usará isso no WebSocket DDP
  // e depois fará client.call('login', [{ resume: token }]) se necessário.

  return {
    pnboxCookies: pnboxCookieHeader,
    idToken,
    accessToken,
    refreshToken,
    expiresAt: Date.now() + (expiresIn * 1000)
  };
}

function randomUuid(): string {
  // Node 19+ tem crypto.randomUUID nativo
  return globalThis.crypto.randomUUID();
}
