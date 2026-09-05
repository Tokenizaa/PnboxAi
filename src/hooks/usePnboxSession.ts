import { useState, useEffect, useRef, useCallback } from 'react';
import { getEncryptedPnboxCredentials } from '../utils/secureStorage';
import { getPlatformSession } from '../components/PlatformGate';

export interface PnboxSessionStatus {
  autenticado: boolean;
  expirado: boolean;
  tempoRestanteMinutos?: number;
  userId?: string;
  tokenMeteor?: string;
  cpf?: string;
  idPlano?: string;
  statusConexao: 'idle' | 'online' | 'expirado' | 'reconectando' | 'erro';
  ultimaVerificacao: string | null;
  tentativasReconexao: number;
}

export interface UsePnboxSessionOptions {
  checkIntervalMs?: number; // Padrão: 35000 (35s)
  autoReconnect?: boolean; // Padrão: true
  onReconnected?: (info: { cpf: string; idPlano: string }) => void;
  onSessionLost?: (motivo: string) => void;
}

export function usePnboxSession(options: UsePnboxSessionOptions = {}) {
  const checkIntervalMs = options.checkIntervalMs ?? 35000;
  const autoReconnect = options.autoReconnect ?? true;

  const [session, setSession] = useState<PnboxSessionStatus>({
    autenticado: false,
    expirado: false,
    statusConexao: 'idle',
    ultimaVerificacao: null,
    tentativasReconexao: 0
  });

  const isReconnectingRef = useRef(false);
  const optionsRef = useRef(options);
  optionsRef.current = options;

  /**
   * Executa reautenticação silenciosa em segundo plano usando credenciais criptografadas ou do banco
   */
  const reauthenticateSilently = useCallback(async (): Promise<boolean> => {
    if (isReconnectingRef.current) return false;
    isReconnectingRef.current = true;

    setSession(prev => ({
      ...prev,
      statusConexao: 'reconectando',
      tentativasReconexao: prev.tentativasReconexao + 1
    }));

    try {
      // 1. Tenta reconexão via credenciais salvas no banco da plataforma
      const platSession = getPlatformSession();
      if (platSession?.accessToken) {
        const reconnectRes = await fetch('/api/auth/pnbox-credentials/reconnect', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${platSession.accessToken}`
          }
        });

        if (reconnectRes.ok) {
          const data = await reconnectRes.json();
          if (data.sucesso) {
            setSession(prev => ({
              ...prev,
              autenticado: true,
              expirado: false,
              statusConexao: 'online',
              ultimaVerificacao: new Date().toISOString(),
              tokenMeteor: data.tokenMeteor
            }));
            isReconnectingRef.current = false;
            optionsRef.current.onReconnected?.({ cpf: data.cpf, idPlano: data.idPlano });
            return true;
          }
        }
      }

      // 2. Se não reconectou pelo banco, utiliza credenciais locais criptografadas
      const localCreds = await getEncryptedPnboxCredentials();
      if (localCreds && localCreds.cpf && localCreds.password) {
        const loginRes = await fetch('/api/automation/auth/login', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            ...(platSession?.accessToken ? { Authorization: `Bearer ${platSession.accessToken}` } : {})
          },
          body: JSON.stringify({
            cpf: localCreds.cpf,
            password: localCreds.password,
            idPlano: localCreds.idPlano
          })
        });

        if (loginRes.ok) {
          const data = await loginRes.json();
          setSession(prev => ({
            ...prev,
            autenticado: true,
            expirado: false,
            statusConexao: 'online',
            ultimaVerificacao: new Date().toISOString(),
            cpf: localCreds.cpf,
            idPlano: localCreds.idPlano
          }));
          isReconnectingRef.current = false;
          optionsRef.current.onReconnected?.({ cpf: localCreds.cpf, idPlano: localCreds.idPlano });
          return true;
        }
      }

      // Falha na reconexão
      setSession(prev => ({
        ...prev,
        autenticado: false,
        expirado: true,
        statusConexao: 'erro'
      }));
      optionsRef.current.onSessionLost?.('Credenciais expiradas e reconexão silenciosa falhou.');
      isReconnectingRef.current = false;
      return false;
    } catch (err: any) {
      setSession(prev => ({
        ...prev,
        statusConexao: 'erro'
      }));
      isReconnectingRef.current = false;
      return false;
    }
  }, []);

  /**
   * Consulta o status atual da sessão Meteor
   */
  const checkStatus = useCallback(async () => {
    try {
      const res = await fetch('/api/automation/auth/status');
      if (!res.ok) return;

      const data = await res.json();
      const isAuth = !!data.autenticado;
      const isExp = !!data.expirado;

      setSession(prev => ({
        ...prev,
        autenticado: isAuth,
        expirado: isExp,
        tempoRestanteMinutos: data.tempoRestanteMinutos,
        statusConexao: isExp ? 'expirado' : isAuth ? 'online' : 'idle',
        ultimaVerificacao: new Date().toISOString()
      }));

      // Se a sessão expirou e autoReconnect está ativo, dispara reconexão imediata
      if (isExp && autoReconnect && !isReconnectingRef.current) {
        console.info('[usePnboxSession] Token Meteor expirado detectado. Iniciando auto-reconexão...');
        await reauthenticateSilently();
      }
    } catch {
      // Ignora erro passageiro de rede
    }
  }, [autoReconnect, reauthenticateSilently]);

  // Polling contínuo em background
  useEffect(() => {
    checkStatus();
    const interval = setInterval(checkStatus, checkIntervalMs);
    return () => clearInterval(interval);
  }, [checkStatus, checkIntervalMs]);

  return {
    session,
    checkNow: checkStatus,
    reconnect: reauthenticateSilently,
    isOnline: session.statusConexao === 'online',
    isReconnecting: session.statusConexao === 'reconectando',
    isExpired: session.expirado
  };
}
