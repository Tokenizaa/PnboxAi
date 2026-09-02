/**
 * Helper para chamadas autenticadas ao backend.
 * Adiciona automaticamente o modoExecucao atual (LIVE / DRY_RUN)
 * para que cada endpoint saiba se deve chamar o servidor real.
 */

import { AuthSessionState } from '../types/pnbox';

export function authFetch(
  url: string,
  init: RequestInit,
  authSession: AuthSessionState
): Promise<Response> {
  const body = init.body ? JSON.parse(init.body as string) : {};
  body.modoExecucao = body.modoExecucao || authSession.modoExecucao || 'DRY_RUN';
  return fetch(url, {
    ...init,
    headers: {
      ...init.headers,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(body)
  });
}
