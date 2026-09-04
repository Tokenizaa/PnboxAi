import { AuthSessionState } from '../types/pnbox';
import { pnboxOidcLoginViaPlaywright } from './oidcPnboxPlaywright';
import { getEncryptedPnboxCredentials } from '../utils/secureStorage';
import { PnboxConnectionStep } from './connectionJob';

/**
 * Estado de autenticação PNBOX.
 *
 * IMPORTANTE: Por padrão, este módulo NÃO armazena credenciais em disco ou em variáveis globais
 * de longa duração por motivos de segurança. As credenciais do usuário são passadas a cada chamada
 * `iniciarSessaoPlaywright(cpf, password)` e descartadas após o handshake.
 *
 * Entretanto, para conveniência, o usuário pode optar por salvar credenciais criptografadas
 * localmente via UI de Configurações. Neste caso, as credenciais podem ser reutilizadas
 * automaticamente quando não forem fornecidas explicitamente.
 *
 * As credenciais históricas foram removidas para impedir uso não-autorizado.
 * Agora o usuário pode escolher entre fornecer credenciais na UI ou usar as salvas.
 */

export interface Credentials {
  cpf: string;
  password: string;
  idPlano: string;
}

/**
 * CREDENCIAIS_PADRAO_DEPRECATED — stub vazio para compatibilidade.
 * O playwrightScriptGenerator.ts usa isso só para preencher a string de código
 * gerado para o usuário rodar LOCALMENTE. Não é usado para autenticar o Hub.
 *
 * Use sempre a UI para inserir credenciais.
 */
export const CREDENCIAIS_PADRAO = {
  cpf: '',
  password: '',
  idPlano: ''
};

/**
 * @deprecated Não use — credenciais devem vir SEMPRE da UI.
 */
export const CREDENCIAIS_PADRAO_DEPRECATED = CREDENCIAIS_PADRAO;

/**
 * Sessão ativa — apenas runtime, nunca persistida em disco.
 * Substitui credenciais por tokens OIDC + cookies após autenticação.
 */
export interface SessaoPnbox {
  cookiesPnbox: string;
  idToken: string;
  accessToken: string;
  refreshToken?: string;
  meteorSessionId?: string;
  meteorUserId?: string;
  cpf: string;
  idPlano: string;
  autenticadoEm: string;
  expiraEm: string;
}

// Tempo de vida da sessão em minutos (TTL do token OIDC + margem)
export const TEMPO_VIDA_SESSAO_MINUTOS = 50;

/**
 * Cache de sessões PNBOX por usuário (em memória, por processo).
 * Chave: userId (string)
 * Não é global único - cada usuário tem sua sessão isolada.
 */
const userSessions = new Map<string, SessaoPnbox>();

/**
 * Obtém a sessão PNBOX de um usuário específico.
 */
export function obterSessaoUsuario(userId: string): SessaoPnbox | null {
  const sessao = userSessions.get(userId);
  if (!sessao) return null;
  if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
    userSessions.delete(userId);
    return null;
  }
  return sessao;
}

/**
 * Define/atualiza a sessão PNBOX de um usuário.
 */
export function definirSessaoUsuario(userId: string, sessao: SessaoPnbox): void {
  userSessions.set(userId, sessao);
}

/**
 * Remove a sessão PNBOX de um usuário (logout/expiração).
 */
export function removerSessaoUsuario(userId: string): void {
  userSessions.delete(userId);
}

/**
 * Obtém cookies PNBOX de um usuário específico.
 */
export function obterCookiesPnboxUsuario(userId: string): string | null {
  const s = obterSessaoUsuario(userId);
  return s?.cookiesPnbox || null;
}

/**
 * Estado exposto para a UI (AuthSessionState) - mantido para compatibilidade
 * mas agora deriva de sessão específica do usuário.
 * NOTA: Para uso em servidor multi-usuário, passe userId explicitamente.
 */
export const globalAuthState: AuthSessionState = {
  status: 'idle',
  cpf: '',
  idPlano: '',
  modoExecucao: 'DRY_RUN',
  logs: [
    {
      timestamp: new Date().toISOString(),
      mensagem:
        'Módulo de autenticação pronto. Forneça CPF + senha na aba "Sessão Playwright" para conectar ao PNBOX.',
      level: 'info'
    }
  ]
};

export function addAuthLog(mensagem: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  const entry = { timestamp: new Date().toISOString(), mensagem, level };
  globalAuthState.logs.unshift(entry);
  if (globalAuthState.logs.length > 100) globalAuthState.logs.pop();
  globalAuthState.ultimoLog = mensagem;
  // NÃO logar credenciais
  if (!level || level === 'info' || level === 'success' || level === 'warn' || level === 'error') {
    console.log(`[PNBOX Auth] [${level.toUpperCase()}] ${mensagem}`);
  }
}

/**
 * Obtém status de sessão para um usuário específico.
 * Substitui obterStatusSessaoAtualizada() para uso multi-usuário.
 */
export function obterStatusSessaoUsuario(userId: string): AuthSessionState {
  const sessao = obterSessaoUsuario(userId);

  const state: AuthSessionState = {
    status: 'idle',
    cpf: '',
    idPlano: '',
    modoExecucao: globalAuthState.modoExecucao,
    logs: [...globalAuthState.logs],
    isExpired: false,
    tempoRestanteMinutos: 0,
    isOnline: false,
  };

  if (!sessao) {
    state.status = 'idle';
    state.isExpired = false;
    state.tempoRestanteMinutos = 0;
    state.isOnline = false;
    return state;
  }

  const restanteMs = new Date(sessao.expiraEm).getTime() - Date.now();
  const restanteMin = Math.max(0, Math.round(restanteMs / 60000));

  state.status = restanteMin > 0 ? 'authenticated' : 'expired';
  state.isExpired = restanteMin <= 0;
  state.tempoRestanteMinutos = restanteMin;
  state.cpf = sessao.cpf;
  state.idPlano = sessao.idPlano;
  state.meteorLoginToken = sessao.idToken.length > 24
    ? sessao.idToken.substring(0, 24) + '...'
    : sessao.idToken;
  state.meteorUserId = sessao.meteorUserId;
  state.autenticadoEm = sessao.autenticadoEm;
  state.expiresAt = sessao.expiraEm;
  state.cookiesCount = sessao.cookiesPnbox
    ? sessao.cookiesPnbox.split(';').length
    : 0;
  state.isOnline = true;
  state.ultimoPing = new Date().toISOString();

  return state;
}

/**
 * @deprecated Use obterStatusSessaoUsuario(userId) para multi-usuário.
 * Mantido para compatibilidade com código legado que usa estado global.
 */
export function obterStatusSessaoAtualizada(): AuthSessionState {
  // Para compatibilidade: retorna estado do primeiro usuário ou idle
  const firstUserId = userSessions.keys().next().value;
  if (firstUserId) {
    return obterStatusSessaoUsuario(firstUserId);
  }
  return globalAuthState;
}

export function simularExpiracaoSessao(): AuthSessionState {
  // Para compatibilidade: limpa todas as sessões (apenas para testes)
  userSessions.clear();
  globalAuthState.status = 'expired';
  globalAuthState.isExpired = true;
  globalAuthState.tempoRestanteMinutos = 0;
  globalAuthState.meteorLoginToken = undefined;
  globalAuthState.meteorUserId = undefined;
  globalAuthState.isOnline = false;
  addAuthLog(
    'Todas as sessões encerradas — necessário novo login.',
    'warn'
  );
  return globalAuthState;
}

/**
 * Autentica o usuário no PNBOX via fluxo OIDC (Keycloak AMEI no modo LIVE, ou simulação segura em DRY_RUN).
 *
 * @param credentials CPF + senha fornecidos pelo próprio usuário na UI
 * @param consentimentoAceito TRUE se o usuário marcou o checkbox de consentimento
 * @param modoExecucao 'DRY_RUN' ou 'LIVE'
 * @param userId ID do usuário da plataforma (opcional - para isolamento multi-usuário)
 */
export async function iniciarSessaoPlaywright(
  credentials: Credentials | null = null,
  consentimentoAceito: boolean = false,
  modoExecucao: 'DRY_RUN' | 'LIVE' = 'DRY_RUN',
  userId?: string,
  onProgress?: (step: PnboxConnectionStep) => void
): Promise<AuthSessionState> {
  if (!consentimentoAceito) {
    globalAuthState.status = 'failed';
    addAuthLog(
      'Login bloqueado — usuário não marcou o consentimento de uso das credenciais.',
      'error'
    );
    return globalAuthState;
  }

  // If no credentials provided, try to load from secure storage (client-side fallback)
  if (!credentials) {
    const storedCredentials = await getEncryptedPnboxCredentials();
    if (storedCredentials && storedCredentials.cpf && storedCredentials.password) {
      credentials = {
        cpf: storedCredentials.cpf,
        password: storedCredentials.password,
        idPlano: storedCredentials.idPlano || ''
      };
      addAuthLog('Usando credenciais salvas do armazenamento seguro', 'info');
    } else {
      globalAuthState.status = 'failed';
      addAuthLog(
        'Nenhuma credencial fornecida e nenhuma encontrada no armazenamento seguro',
        'error'
      );
      return globalAuthState;
    }
  }

  globalAuthState.status = 'authenticating';
  globalAuthState.cpf = credentials.cpf;
  globalAuthState.idPlano = credentials.idPlano;
  globalAuthState.modoExecucao = modoExecucao;

  const cpfMascarado = credentials.cpf
    ? credentials.cpf.substring(0, 3) + '.***.***-' + credentials.cpf.slice(-2)
    : '(vazio)';

  // MODO DRY_RUN: Simulação segura do ambiente Sebrae PNBOX sem necessidade de conexão remota ao vivo
  if (modoExecucao === 'DRY_RUN') {
    addAuthLog(`[DRY_RUN] Inicializando sessão de simulação segura para CPF ${cpfMascarado}...`, 'info');
    const agora = Date.now();
    const expiraEmMs = agora + TEMPO_VIDA_SESSAO_MINUTOS * 60 * 1000;
    const cpfDigits = credentials.cpf.replace(/\D/g, '') || '515178';
    const mockToken = 'sim_dryrun_' + Buffer.from(`${credentials.cpf}:${agora}`).toString('base64').substring(0, 24);
    const mockUserId = `usr_sebrae_${cpfDigits.slice(0, 6)}`;

    const sessao: SessaoPnbox = {
      cookiesPnbox: `meteor_login_token=${mockToken}; x_mtok=${mockToken}; meteor_user_id=${mockUserId}`,
      idToken: mockToken,
      accessToken: mockToken,
      refreshToken: undefined,
      meteorSessionId: 'ddp_dryrun_' + Math.random().toString(36).substring(2, 9),
      meteorUserId: mockUserId,
      cpf: credentials.cpf,
      idPlano: credentials.idPlano,
      autenticadoEm: new Date(agora).toISOString(),
      expiraEm: new Date(expiraEmMs).toISOString()
    };

    // Armazenar por usuário se userId fornecido
    if (userId) {
      definirSessaoUsuario(userId, sessao);
    }

    globalAuthState.status = 'authenticated';
    globalAuthState.autenticadoEm = sessao.autenticadoEm;
    globalAuthState.expiresAt = sessao.expiraEm;
    globalAuthState.isExpired = false;
    globalAuthState.tempoRestanteMinutos = TEMPO_VIDA_SESSAO_MINUTOS;
    globalAuthState.isOnline = true;
    globalAuthState.meteorLoginToken = mockToken;
    globalAuthState.meteorUserId = mockUserId;
    globalAuthState.cookiesCount = 3;
    globalAuthState.ultimoPing = new Date(agora).toISOString();

    addAuthLog(
      `Sessão DRY_RUN inicializada com sucesso. Conexão simulada DDP ativa para o plano ${credentials.idPlano}.`,
      'success'
    );

    return userId ? obterStatusSessaoUsuario(userId) : obterStatusSessaoAtualizada();
  }

  // MODO LIVE: Autenticação real via navegador Playwright headless no Sebrae ID oficial
  addAuthLog(`[LIVE] Iniciando autenticação OIDC oficial no Sebrae ID para CPF ${cpfMascarado}...`, 'info');

  try {
    const result = await pnboxOidcLoginViaPlaywright(credentials.cpf, credentials.password, onProgress);

    const agora = Date.now();
    const expiraEmMs = result.expiresAt || (agora + TEMPO_VIDA_SESSAO_MINUTOS * 60 * 1000);

    const sessao: SessaoPnbox = {
      cookiesPnbox: result.pnboxCookies,
      idToken: result.idToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      meteorSessionId: undefined, // Preenchido na conexão DDP
      meteorUserId: (result as any).meteorUserId,
      cpf: credentials.cpf,
      idPlano: credentials.idPlano,
      autenticadoEm: new Date(agora).toISOString(),
      expiraEm: new Date(expiraEmMs).toISOString()
    };

    // Armazenar por usuário se userId fornecido
    if (userId) {
      definirSessaoUsuario(userId, sessao);
    }

    globalAuthState.status = 'authenticated';
    globalAuthState.autenticadoEm = sessao.autenticadoEm;
    globalAuthState.expiresAt = sessao.expiraEm;
    globalAuthState.isExpired = false;
    globalAuthState.tempoRestanteMinutos = TEMPO_VIDA_SESSAO_MINUTOS;
    globalAuthState.isOnline = true;
    globalAuthState.ultimoPing = new Date(agora).toISOString();

    addAuthLog(
      `Autenticação OIDC LIVE concluída com sucesso. Tokens Sebrae prontos para DDP.`,
      'success'
    );

    return userId ? obterStatusSessaoUsuario(userId) : obterStatusSessaoAtualizada();
  } catch (err: any) {
    globalAuthState.status = 'failed';
    globalAuthState.isOnline = false;
    addAuthLog(`Falha na autenticação OIDC: ${err.message}`, 'error');
    return globalAuthState;
  }
}
