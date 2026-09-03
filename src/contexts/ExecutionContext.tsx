import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  ReactNode,
} from 'react';
import { ExecutionStepResult, BatchExecutionSummary } from '../automation/officialRunner';
import { apiCall } from '../utils/authFetch';

export type ExecutionMode = 'DRY_RUN' | 'LIVE';

interface ExecutionState {
  summary: BatchExecutionSummary | null;
  isExecuting: boolean;
  mode: ExecutionMode;
  sessionStatus: 'idle' | 'authenticating' | 'authenticated' | 'expired';
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

export function ExecutionProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ExecutionState>({
    summary: null,
    isExecuting: false,
    mode: 'DRY_RUN',
    sessionStatus: 'idle',
    error: null,
  });

  const setMode = useCallback((mode: ExecutionMode) => {
    setState((prev) => ({ ...prev, mode }));
  }, []);

  const authenticateSession = useCallback(async (credentials: { cpf: string; password: string; idPlano: string }) => {
    setState((prev) => ({ ...prev, sessionStatus: 'authenticating', error: null }));
    try {
      await apiCall('/api/automation/auth/login', {
        method: 'POST',
        body: JSON.stringify({
          ...credentials,
          consentimentoAceito: true,
          modoExecucao: 'LIVE',
        }),
      });
      setState((prev) => ({ ...prev, sessionStatus: 'authenticated' }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        sessionStatus: 'expired',
        error: err instanceof Error ? err.message : 'Falha na autenticação',
      }));
    }
  }, []);

  const executeBatch = useCallback(async (planId: string, templateId: string, mode: ExecutionMode) => {
    setState((prev) => ({ ...prev, isExecuting: true, error: null }));
    try {
      const data = await apiCall<{ resumo: BatchExecutionSummary }>('/api/automation/fill-batch', {
        method: 'POST',
        body: JSON.stringify({
          templateId,
          idPlano: planId,
          modoExecucao: mode,
        }),
      });
      setState((prev) => ({
        ...prev,
        summary: data.resumo,
        isExecuting: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
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
    setState((prev) => ({ ...prev, isExecuting: true, error: null }));
    try {
      const data = await apiCall<{ resultado: ExecutionStepResult }>('/api/automation/fill-tool', {
        method: 'POST',
        body: JSON.stringify({
          ferramentaId,
          registros,
          idPlano: planId,
          modoExecucao: mode,
        }),
      });
      // Update summary with single step result
      setState((prev) => ({
        ...prev,
        summary: prev.summary ? {
          ...prev.summary,
          steps: prev.summary.steps.map((s) =>
            s.ferramentaId === ferramentaId ? data.resultado : s
          ),
        } : null,
        isExecuting: false,
      }));
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isExecuting: false,
        error: err instanceof Error ? err.message : 'Falha na execução',
      }));
    }
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const resetExecution = useCallback(() => {
    setState((prev) => ({ ...prev, summary: null, isExecuting: false, error: null }));
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

  return (
    <ExecutionContext.Provider value={value}>
      {children}
    </ExecutionContext.Provider>
  );
}

export function useExecution(): ExecutionContextValue {
  const context = useContext(ExecutionContext);
  if (!context) {
    throw new Error('useExecution deve ser usado dentro de ExecutionProvider');
  }
  return context;
}