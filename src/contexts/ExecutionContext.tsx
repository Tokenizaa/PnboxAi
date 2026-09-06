import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ExecutionStepResult, BatchExecutionSummary } from '../automation/officialRunner';
import { apiCall } from '../utils/authFetch';

export type ExecutionMode = 'DRY_RUN' | 'LIVE';

type SessionStatus = 'idle' | 'authenticating' | 'authenticated' | 'expired';

interface ExecutionState {
  summary: BatchExecutionSummary | null;
  isExecuting: boolean;
  mode: ExecutionMode;
  sessionStatus: SessionStatus;
  error: string | null;
}

interface ExecutionContextValue extends ExecutionState {
  setMode: (mode: ExecutionMode) => void;
  authenticateSession: (credentials: { cpf: string; password: string; idPlano: string }) => Promise<void>;
  executeBatch: (planId: string, templateId: string, mode: ExecutionMode) => Promise<void>;
  executeSingle: (planId: string, ferramentaId: string, registros: Record<string, unknown>[], mode: ExecutionMode) => Promise<void>;
  clearError: () => void;
  resetExecution: () => void;
}

const ExecutionContext = createContext<ExecutionContextValue | undefined>(undefined);

const REAL_MODE: ExecutionMode = 'LIVE';

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExecutionState>({
    summary: null,
    isExecuting: false,
    mode: REAL_MODE,
    sessionStatus: 'idle',
    error: null,
  });

  useEffect(() => {
    let isMounted = true;

    async function checkServerSession() {
      try {
        const data = await apiCall<{
          isOnline: boolean;
          isExpired: boolean;
          session?: { status: string; isExpired: boolean; modoExecucao?: string };
        }>('/api/automation/auth/status');

        if (!isMounted) return;

        const isRealAuth = Boolean(
          data?.isOnline &&
          data.session?.status === 'authenticated' &&
          !data.session?.isExpired
        );

        setState((prev) => ({
          ...prev,
          mode: REAL_MODE,
          sessionStatus: isRealAuth
            ? 'authenticated'
            : data?.isExpired || data?.session?.status === 'expired'
            ? 'expired'
            : 'idle',
        }));
      } catch {
        if (isMounted) {
          setState((prev) => ({ ...prev, mode: REAL_MODE, sessionStatus: 'idle' }));
        }
      }
    }

    checkServerSession();
    return () => {
      isMounted = false;
    };
  }, []);

  const setMode = useCallback((requestedMode: ExecutionMode) => {
    if (requestedMode !== REAL_MODE) {
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        error: 'SIMULATION_DISABLED: a aplicação opera exclusivamente contra o PNBOX real.',
      }));
      return;
    }
    setState((prev) => ({ ...prev, mode: REAL_MODE, error: null }));
  }, []);

  const authenticateSession = useCallback(async (credentials: { cpf: string; password: string; idPlano: string }) => {
    if (!credentials.cpf.trim() || !credentials.password || !credentials.idPlano.trim()) {
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        sessionStatus: 'idle',
        error: 'CPF, senha e ID real do plano PNBOX são obrigatórios.',
      }));
      return;
    }

    setState((prev) => ({ ...prev, mode: REAL_MODE, sessionStatus: 'authenticating', error: null }));
    try {
      await apiCall('/api/automation/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          ...credentials,
          consentimentoAceito: true,
          modoExecucao: REAL_MODE,
        }),
      });
      setState((prev) => ({ ...prev, mode: REAL_MODE, sessionStatus: 'authenticated' }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        sessionStatus: 'expired',
        error: err instanceof Error ? err.message : 'Falha na autenticação',
      }));
    }
  }, []);

  const executeBatch = useCallback(async (planId: string, templateId: string, mode: ExecutionMode) => {
    if (mode !== REAL_MODE) {
      setState((prev) => ({ ...prev, mode: REAL_MODE, error: 'SIMULATION_DISABLED: execução sem persistência não é suportada.' }));
      return;
    }
    if (!planId.trim()) {
      setState((prev) => ({ ...prev, error: 'ID real do plano PNBOX é obrigatório.' }));
      return;
    }

    setState((prev) => ({ ...prev, mode: REAL_MODE, isExecuting: true, error: null }));
    try {
      const data = await apiCall<{ resumo: BatchExecutionSummary }>('/api/automation/fill-batch', {
        method: 'POST',
        body: JSON.stringify({ templateId, idPlano: planId, modoExecucao: REAL_MODE }),
      });
      setState((prev) => ({ ...prev, mode: REAL_MODE, summary: data.resumo, isExecuting: false }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        isExecuting: false,
        error: err instanceof Error ? err.message : 'Falha na execução',
      }));
    }
  }, []);

  const executeSingle = useCallback(async (
    planId: string,
    ferramentaId: string,
    registros: Record<string, unknown>[],
    mode: ExecutionMode
  ) => {
    if (mode !== REAL_MODE) {
      setState((prev) => ({ ...prev, mode: REAL_MODE, error: 'SIMULATION_DISABLED: execução sem persistência não é suportada.' }));
      return;
    }
    if (!planId.trim() || !ferramentaId.trim() || registros.length === 0) {
      setState((prev) => ({ ...prev, error: 'Plano real, ferramenta e registros reais são obrigatórios.' }));
      return;
    }

    setState((prev) => ({ ...prev, mode: REAL_MODE, isExecuting: true, error: null }));
    try {
      const data = await apiCall<{ resultado: ExecutionStepResult }>('/api/automation/fill-tool', {
        method: 'POST',
        body: JSON.stringify({ ferramentaId, registros, idPlano: planId, modoExecucao: REAL_MODE }),
      });
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        summary: prev.summary
          ? {
              ...prev.summary,
              steps: prev.summary.steps.map((s) => s.ferramentaId === ferramentaId ? data.resultado : s),
            }
          : null,
        isExecuting: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        mode: REAL_MODE,
        isExecuting: false,
        error: err instanceof Error ? err.message : 'Falha na execução',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null, mode: REAL_MODE }));
  }, []);

  const resetExecution = useCallback(() => {
    setState((prev) => ({ ...prev, mode: REAL_MODE, summary: null, isExecuting: false, error: null }));
  }, []);

  const value: ExecutionContextValue = {
    ...state,
    setMode,
    authenticateSession,
    executeBatch,
    executeSingle,
    clearError,
    resetExecution,
  };

  return <ExecutionContext.Provider value={value}>{children}</ExecutionContext.Provider>;
}

export function useExecution(): ExecutionContextValue {
  const context = useContext(ExecutionContext);
  if (!context) throw new Error('useExecution deve ser usado dentro de ExecutionProvider');
  return context;
}
