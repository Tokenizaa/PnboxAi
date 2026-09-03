import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { ResearchReport, ResearchTask, ResearchGap, Contradiction, CanonicalBusinessModel } from '../research/types';
import { apiCall } from '../utils/authFetch';

interface ResearchState {
  report: ResearchReport | null;
  isLoading: boolean;
  error: string | null;
  currentStep: 'idle' | 'planning' | 'executing' | 'analyzing' | 'synthesizing' | 'completed' | 'failed';
  progress: number;
}

interface ResearchContextValue extends ResearchState {
  startResearch: (planId: string, input: ResearchInput) => Promise<void>;
  fetchResearch: (planId: string) => Promise<void>;
  cancelResearch: () => Promise<void>;
  clearError: () => void;
}

interface ResearchInput {
  prompt: string;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
  provider?: 'gemini' | 'nvidia';
  useSearchGrounding?: boolean;
  maxIterations?: number;
}

const ResearchContext = createContext<ResearchContextValue | undefined>(undefined);

export function ResearchProvider({ children }: { children: ReactNode }) {
  const [state, setState] = useState<ResearchState>({
    report: null,
    isLoading: false,
    error: null,
    currentStep: 'idle',
    progress: 0,
  });

  const startResearch = useCallback(async (planId: string, input: ResearchInput) => {
    setState((prev) => ({
      ...prev,
      isLoading: true,
      error: null,
      currentStep: 'planning',
      progress: 10,
    }));

    try {
      const data = await apiCall<{ report: ResearchReport }>('/api/research', {
        method: 'POST',
        body: JSON.stringify({ planId, ...input }),
      });

      setState({
        report: data.report,
        isLoading: false,
        error: null,
        currentStep: 'completed',
        progress: 100,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Falha na pesquisa',
        currentStep: 'failed',
        progress: 0,
      }));
    }
  }, []);

  const fetchResearch = useCallback(async (planId: string) => {
    setState((prev) => ({ ...prev, isLoading: true, error: null }));
    try {
      const data = await apiCall<{ report: ResearchReport }>(`/api/research/${planId}`);
      setState({
        report: data.report,
        isLoading: false,
        error: null,
        currentStep: 'completed',
        progress: 100,
      });
    } catch (err) {
      setState((prev) => ({
        ...prev,
        isLoading: false,
        error: err instanceof Error ? err.message : 'Falha ao carregar pesquisa',
        currentStep: 'failed',
        progress: 0,
      }));
    }
  }, []);

  const cancelResearch = useCallback(async () => {
    // TODO: Implement cancel via API
    setState((prev) => ({
      ...prev,
      isLoading: false,
      currentStep: 'idle',
      progress: 0,
    }));
  }, []);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const value: ResearchContextValue = {
    ...state,
    startResearch,
    fetchResearch,
    cancelResearch,
    clearError,
  };

  return (
    <ResearchContext.Provider value={value}>
      {children}
    </ResearchContext.Provider>
  );
}

export function useResearch(): ResearchContextValue {
  const context = useContext(ResearchContext);
  if (!context) {
    throw new Error('useResearch deve ser usado dentro de ResearchProvider');
  }
  return context;
}