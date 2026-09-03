import React, {
  createContext,
  useContext,
  useState,
  useCallback,
  useEffect,
  ReactNode,
} from 'react';
import { Plan } from './PlansContext';
import { apiCall } from '../utils/authFetch';

interface PlanContextValue {
  currentPlan: Plan | null;
  isLoading: boolean;
  error: string | null;
  setCurrentPlan: (plan: Plan | null) => void;
  fetchPlan: (id: string) => Promise<void>;
  updatePlanProgress: (progress: number) => Promise<void>;
  updatePlanStatus: (status: Plan['status']) => Promise<void>;
  updateResearchStatus: (status: Plan['researchStatus']) => Promise<void>;
  updateExecutionStatus: (status: Plan['executionStatus']) => Promise<void>;
  clearError: () => void;
}

const PlanContext = createContext<PlanContextValue | undefined>(undefined);

export function PlanProvider({ children }: { children: ReactNode }) {
  const [currentPlan, setCurrentPlanState] = useState<Plan | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const setCurrentPlan = useCallback((plan: Plan | null) => {
    setCurrentPlanState(plan);
  }, []);

  const fetchPlan = useCallback(async (id: string) => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiCall<{ plan: Plan }>(`/api/plans/${id}`);
      setCurrentPlanState(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao carregar plano');
      setCurrentPlanState(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  const updatePlanProgress = useCallback(async (progress: number) => {
    if (!currentPlan) return;
    try {
      const data = await apiCall<{ plan: Plan }>(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ progress }),
      });
      setCurrentPlanState(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar progresso');
    }
  }, [currentPlan]);

  const updatePlanStatus = useCallback(async (status: Plan['status']) => {
    if (!currentPlan) return;
    try {
      const data = await apiCall<{ plan: Plan }>(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ status }),
      });
      setCurrentPlanState(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status');
    }
  }, [currentPlan]);

  const updateResearchStatus = useCallback(async (status: Plan['researchStatus']) => {
    if (!currentPlan) return;
    try {
      const data = await apiCall<{ plan: Plan }>(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ researchStatus: status }),
      });
      setCurrentPlanState(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status de pesquisa');
    }
  }, [currentPlan]);

  const updateExecutionStatus = useCallback(async (status: Plan['executionStatus']) => {
    if (!currentPlan) return;
    try {
      const data = await apiCall<{ plan: Plan }>(`/api/plans/${currentPlan.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ executionStatus: status }),
      });
      setCurrentPlanState(data.plan);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Falha ao atualizar status de execução');
    }
  }, [currentPlan]);

  const clearError = useCallback(() => {
    setError(null);
  }, []);

  // Auto-fetch plan when URL changes (handled by pages via useEffect)

  const value: PlanContextValue = {
    currentPlan,
    isLoading,
    error,
    setCurrentPlan,
    fetchPlan,
    updatePlanProgress,
    updatePlanStatus,
    updateResearchStatus,
    updateExecutionStatus,
    clearError,
  };

  return (
    <PlanContext.Provider value={value}>
      {children}
    </PlanContext.Provider>
  );
}

export function usePlan(): PlanContextValue {
  const context = useContext(PlanContext);
  if (!context) {
    throw new Error('usePlan deve ser usado dentro de PlanProvider');
  }
  return context;
}