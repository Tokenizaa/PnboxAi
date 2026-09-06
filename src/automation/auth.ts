import { AuthSessionState } from '../types/pnbox';
import { pnboxOidcLoginViaPlaywright } from './oidcPnboxPlaywright';
import { PnboxConnectionStep } from './connectionJob';

/** Autenticação PNBOX exclusivamente LIVE. Não há sessão, credencial ou estado PNBOX sintético. */
export interface Credentials { cpf: string; password: string; idPlano: string; }

export const CREDENCIAIS_PADRAO = { cpf: '', password: '', idPlano: '' };
export const CREDENCIAIS_PADRAO_DEPRECATED = CREDENCIAIS_PADRAO;

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
  modoExecucao?: 'LIVE';
  planosPnbox?: any[];
}

export const TEMPO_VIDA_SESSAO_MINUTOS = 50;
const userSessions = new Map<string, SessaoPnbox>();

export function obterSessaoUsuario(userId: string): SessaoPnbox | null {
  const sessao = userSessions.get(userId);
  if (!sessao) return null;
  if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
    userSessions.delete(userId);
    return null;
  }
  return sessao;
}

export function definirSessaoUsuario(userId: string, sessao: SessaoPnbox): void {
  if (sessao.modoExecucao !== 'LIVE') throw new Error('Somente sessões LIVE do PNBOX podem ser registradas.');
  userSessions.set(userId, sessao);
}

export function removerSessaoUsuario(userId: string): void { userSessions.delete(userId); }

export function obterCookiesPnboxUsuario(userId: string): string | null {
  return obterSessaoUsuario(userId)?.cookiesPnbox || null;
}

export const globalAuthState: AuthSessionState = {
  status: 'idle', cpf: '', idPlano: '', modoExecucao: 'DRY_RUN', logs: [{
    timestamp: new Date().toISOString(),
    mensagem: 'Autenticação PNBOX pronta. Somente conexão LIVE oficial é permitida.',
    level: 'info'
  }]
};

export function addAuthLog(mensagem: string, level: 'info' | 'warn' | 'error' | 'success' = 'info') {
  globalAuthState.logs.unshift({ timestamp: new Date().toISOString(), mensagem, level });
  if (globalAuthState.logs.length > 100) globalAuthState.logs.pop();
  globalAuthState.ultimoLog = mensagem;
  console.log(`[PNBOX Auth] [${level.toUpperCase()}] ${mensagem}`);
}

export function obterStatusSessaoUsuario(userId: string): AuthSessionState {
  const sessao = obterSessaoUsuario(userId);
  const state: AuthSessionState = {
    status: 'idle', cpf: '', idPlano: '', modoExecucao: 'DRY_RUN', logs: [...globalAuthState.logs],
    isExpired: false, tempoRestanteMinutos: 0, isOnline: false
  };
  if (!sessao) return state;
  const expiraEmMs = new Date(sessao.expiraEm).getTime();
  const restanteMin = Math.max(0, Math.floor((expiraEmMs - Date.now()) / 60000));
  const isValid = restanteMin > 0 && !!sessao.idToken && sessao.idToken.length >= 20 && !!sessao.cookiesPnbox;
  state.status = isValid ? 'authenticated' : 'expired';
  state.isExpired = !isValid;
  state.tempoRestanteMinutos = restanteMin;
  state.cpf = sessao.cpf;
  state.idPlano = sessao.idPlano;
  state.meteorLoginToken = sessao.idToken.length > 24 ? `${sessao.idToken.substring(0, 24)}...` : sessao.idToken;
  state.meteorUserId = sessao.meteorUserId;
  state.autenticadoEm = sessao.autenticadoEm;
  state.expiresAt = sessao.expiraEm;
  state.cookiesCount = sessao.cookiesPnbox.split(';').length;
  state.isOnline = isValid;
  state.modoExecucao = isValid ? 'LIVE' : 'DRY_RUN';
  state.ultimoPing = new Date().toISOString();
  state.planosPnbox = sessao.planosPnbox || [];
  return state;
}

export function atualizarPlanosSessao(userId: string, planos: any[]): void {
  const sessao = obterSessaoUsuario(userId);
  if (sessao) { sessao.planosPnbox = planos; userSessions.set(userId, sessao); }
}

export function obterStatusSessaoAtualizada(): AuthSessionState {
  const firstUserId = userSessions.keys().next().value;
  return firstUserId ? obterStatusSessaoUsuario(firstUserId) : globalAuthState;
}

export function simularExpiracaoSessao(): AuthSessionState {
  userSessions.clear();
  globalAuthState.status = 'expired';
  globalAuthState.isExpired = true;
  globalAuthState.tempoRestanteMinutos = 0;
  globalAuthState.meteorLoginToken = undefined;
  globalAuthState.meteorUserId = undefined;
  globalAuthState.isOnline = false;
  addAuthLog('Todas as sessões encerradas — necessário novo login.', 'warn');
  return globalAuthState;
}

/**
 * Autentica exclusivamente via OIDC/Playwright real do Sebrae ID.
 * DRY_RUN foi removido para impedir que uma sessão sintética alcance o executor DDP.
 */
export async function iniciarSessaoPlaywright(
  credentials: Credentials | null = null,
  consentimentoAceito = false,
  modoExecucao: 'DRY_RUN' | 'LIVE' = 'LIVE',
  userId?: string,
  onProgress?: (step: PnboxConnectionStep) => void
): Promise<AuthSessionState> {
  if (!consentimentoAceito) {
    globalAuthState.status = 'failed';
    addAuthLog('Login bloqueado — usuário não marcou o consentimento de uso das credenciais.', 'error');
    return globalAuthState;
  }
  if (modoExecucao !== 'LIVE') {
    globalAuthState.status = 'failed';
    globalAuthState.isOnline = false;
    addAuthLog('DRY_RUN desativado: a integração PNBOX exige autenticação LIVE real.', 'error');
    return userId ? obterStatusSessaoUsuario(userId) : globalAuthState;
  }
  if (!credentials?.cpf || !credentials.password || !credentials.idPlano?.trim()) {
    globalAuthState.status = 'failed';
    globalAuthState.isOnline = false;
    addAuthLog('CPF, senha e ID de plano PNBOX real são obrigatórios.', 'error');
    return userId ? obterStatusSessaoUsuario(userId) : globalAuthState;
  }

  globalAuthState.status = 'authenticating';
  globalAuthState.cpf = credentials.cpf;
  globalAuthState.idPlano = credentials.idPlano;
  globalAuthState.modoExecucao = 'LIVE';
  const cpfMascarado = `${credentials.cpf.substring(0, 3)}.***.***-${credentials.cpf.slice(-2)}`;
  addAuthLog(`[LIVE] Iniciando autenticação OIDC oficial no Sebrae ID para CPF ${cpfMascarado}...`, 'info');

  try {
    const result = await pnboxOidcLoginViaPlaywright(credentials.cpf, credentials.password, onProgress);
    const agora = Date.now();
    const sessao: SessaoPnbox = {
      cookiesPnbox: result.pnboxCookies,
      idToken: result.idToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      meteorSessionId: undefined,
      meteorUserId: (result as any).meteorUserId,
      cpf: credentials.cpf,
      idPlano: credentials.idPlano,
      autenticadoEm: new Date(agora).toISOString(),
      expiraEm: new Date(result.expiresAt || agora + TEMPO_VIDA_SESSAO_MINUTOS * 60 * 1000).toISOString(),
      modoExecucao: 'LIVE',
      planosPnbox: (result as any).planosPnbox || []
    };
    if (userId) definirSessaoUsuario(userId, sessao);
    globalAuthState.status = 'authenticated';
    globalAuthState.modoExecucao = 'LIVE';
    globalAuthState.autenticadoEm = sessao.autenticadoEm;
    globalAuthState.expiresAt = sessao.expiraEm;
    globalAuthState.isExpired = false;
    globalAuthState.tempoRestanteMinutos = TEMPO_VIDA_SESSAO_MINUTOS;
    globalAuthState.isOnline = true;
    globalAuthState.ultimoPing = new Date(agora).toISOString();
    addAuthLog('Autenticação OIDC LIVE concluída com sucesso. Tokens Sebrae prontos para DDP.', 'success');
    return userId ? obterStatusSessaoUsuario(userId) : obterStatusSessaoAtualizada();
  } catch (err: any) {
    globalAuthState.status = 'failed';
    globalAuthState.isOnline = false;
    addAuthLog(`Falha na autenticação OIDC: ${err.message}`, 'error');
    if (userId) {
      const state = obterStatusSessaoUsuario(userId);
      state.status = 'failed';
      state.isOnline = false;
      return state;
    }
    return globalAuthState;
  }
}
