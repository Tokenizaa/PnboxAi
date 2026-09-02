import { AuthSessionState } from '../types/pnbox';
import { pnboxOidcLoginViaPlaywright } from './oidcPnboxPlaywright';

/**
 * Estado de autenticação PNBOX.
 *
 * IMPORTANTE: Este módulo NÃO armazena credenciais em disco ou em variáveis globais
 * de longa duração. As credenciais do usuário são passadas a cada chamada
 * `iniciarSessaoPlaywright(cpf, password)` e descartadas após o handshake.
 *
 * As credenciais históricas foram removidas para impedir uso não-autorizado.
 * Agora o usuário SEMPRE fornece seu próprio CPF/senha na UI.
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
 * Sessão ativa em memória. É substituída a cada novo login e descartada
 * quando o servidor reinicia.
 */
let sessaoAtual: SessaoPnbox | null = null;

export function obterSessaoAtual(): SessaoPnbox | null {
  if (!sessaoAtual) return null;
  if (new Date(sessaoAtual.expiraEm).getTime() <= Date.now()) {
    sessaoAtual = null;
    return null;
  }
  return sessaoAtual;
}

export function obterCookiesPnbox(): string | null {
  const s = obterSessaoAtual();
  return s?.cookiesPnbox || null;
}

/**
 * Estado exposto para a UI (AuthSessionState).
 * Deriva do sessaoAtual.
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

export function obterStatusSessaoAtualizada(): AuthSessionState {
  const sessao = obterSessaoAtual();

  if (!sessao) {
    globalAuthState.status = 'idle';
    globalAuthState.isExpired = false;
    globalAuthState.tempoRestanteMinutos = 0;
    globalAuthState.meteorLoginToken = undefined;
    globalAuthState.meteorUserId = undefined;
    globalAuthState.ultimoPing = new Date().toISOString();
    globalAuthState.isOnline = false;
    return globalAuthState;
  }

  const restanteMs = new Date(sessao.expiraEm).getTime() - Date.now();
  const restanteMin = Math.max(0, Math.round(restanteMs / 60000));

  globalAuthState.status = restanteMin > 0 ? 'authenticated' : 'expired';
  globalAuthState.isExpired = restanteMin <= 0;
  globalAuthState.tempoRestanteMinutos = restanteMin;
  globalAuthState.cpf = sessao.cpf;
  globalAuthState.idPlano = sessao.idPlano;
  globalAuthState.meteorLoginToken = sessao.idToken.substring(0, 24) + '...';
  globalAuthState.meteorUserId = sessao.meteorUserId;
  globalAuthState.autenticadoEm = sessao.autenticadoEm;
  globalAuthState.expiresAt = sessao.expiraEm;
  globalAuthState.cookiesCount = sessao.cookiesPnbox
    ? sessao.cookiesPnbox.split(';').length
    : 0;
  globalAuthState.isOnline = true;
  globalAuthState.ultimoPing = new Date().toISOString();

  return globalAuthState;
}

export function simularExpiracaoSessao(): AuthSessionState {
  sessaoAtual = null;
  globalAuthState.status = 'expired';
  globalAuthState.isExpired = true;
  globalAuthState.tempoRestanteMinutos = 0;
  addAuthLog(
    'Sessão encerrada manualmente pelo usuário — necessário novo login.',
    'warn'
  );
  return globalAuthState;
}

/**
 * Autentica o usuário no PNBOX via fluxo OIDC real (Keycloak AMEI).
 *
 * @param credentials CPF + senha fornecidos pelo próprio usuário na UI
 * @param consentimentoAceito TRUE se o usuário marcou o checkbox de consentimento
 */
export async function iniciarSessaoPlaywright(
  credentials: Credentials,
  consentimentoAceito: boolean = false
): Promise<AuthSessionState> {
  if (!consentimentoAceito) {
    globalAuthState.status = 'failed';
    addAuthLog(
      'Login bloqueado — usuário não marcou o consentimento de uso das credenciais.',
      'error'
    );
    return globalAuthState;
  }

  globalAuthState.status = 'authenticating';
  globalAuthState.cpf = credentials.cpf;
  globalAuthState.idPlano = credentials.idPlano;

  // Sanitizar CPF no log (apenas primeiros 3 dígitos)
  const cpfMascarado = credentials.cpf
    ? credentials.cpf.substring(0, 3) + '.***.***-' + credentials.cpf.slice(-2)
    : '(vazio)';
  addAuthLog(`Iniciando autenticação OIDC para CPF ${cpfMascarado}...`, 'info');

  try {
    const result = await pnboxOidcLoginViaPlaywright(credentials.cpf, credentials.password);

    const agora = Date.now();
    sessaoAtual = {
      cookiesPnbox: result.pnboxCookies,
      idToken: result.idToken,
      accessToken: result.accessToken,
      refreshToken: result.refreshToken,
      meteorSessionId: undefined, // Será preenchido na primeira conexão DDP
      cpf: credentials.cpf,
      idPlano: credentials.idPlano,
      autenticadoEm: new Date(agora).toISOString(),
      expiraEm: new Date(agora + TEMPO_VIDA_SESSAO_MINUTOS * 60 * 1000).toISOString()
    };

    globalAuthState.status = 'authenticated';
    globalAuthState.autenticadoEm = sessaoAtual.autenticadoEm;
    globalAuthState.expiresAt = sessaoAtual.expiraEm;
    globalAuthState.isExpired = false;
    globalAuthState.tempoRestanteMinutos = TEMPO_VIDA_SESSAO_MINUTOS;
    globalAuthState.isOnline = true;
    globalAuthState.ultimoPing = new Date(agora).toISOString();

    addAuthLog(
      `Autenticação OIDC concluída. ${result.pnboxCookies ? 'Cookies PNBOX' : 'Sem cookies'} prontos para DDP.`,
      'success'
    );

    return obterStatusSessaoAtualizada();
  } catch (err: any) {
    globalAuthState.status = 'failed';
    addAuthLog(`Falha na autenticação OIDC: ${err.message}`, 'error');
    return globalAuthState;
  }
}
