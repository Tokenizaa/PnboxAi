import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
  ReactNode,
} from 'react';
import { apiCall } from '../utils/authFetch';

export interface Plan {
  id: string;
  userId: string;
  name: string;
  description: string;
  sector: string;
  city: string;
  progress: number;
  status: 'rascunho' | 'pesquisa' | 'preparacao' | 'pronto' | 'executando' | 'concluido' | 'arquivado';
  researchStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  executionStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolsFilled: number;
  createdAt: string;
  updatedAt: string;
}

interface PlansState {
  plans: Plan[];
  isLoading: boolean;
  error: string | null;
}

type PlansAction =
  | { type: 'PLANS_START' }
  | { type: 'PLANS_SUCCESS'; payload: Plan[] }
  | { type: 'PLANS_FAILURE'; payload: string }
  | { type: 'PLAN_ADDED'; payload: Plan }
  | { type: 'PLAN_UPDATED'; payload: Plan }
  | { type: 'PLAN_REMOVED'; payload: string }
  | { type: 'PLAN_STATUS_UPDATED'; payload: { id: string; updates: Partial<Plan> } };

const initialState: PlansState = {
  plans: [],
  isLoading: true,
  error: null,
};

function plansReducer(state: PlansState, action: PlansAction): PlansState {
  switch (action.type) {
    case 'PLANS_START':
      return { ...state, isLoading: true, error: null };

    case 'PLANS_SUCCESS':
      return { ...state, plans: action.payload, isLoading: false, error: null };

    case 'PLANS_FAILURE':
      return { ...state, isLoading: false, error: action.payload };

    case 'PLAN_ADDED':
      return { ...state, plans: [action.payload, ...state.plans] };

    case 'PLAN_UPDATED':
      return {
        ...state,
        plans: state.plans.map((p) => (p.id === action.payload.id ? action.payload : p)),
      };

    case 'PLAN_REMOVED':
      return {
        ...state,
        plans: state.plans.filter((p) => p.id !== action.payload),
      };

    case 'PLAN_STATUS_UPDATED':
      return {
        ...state,
        plans: state.plans.map((p) =>
          p.id === action.payload.id ? { ...p, ...action.payload.updates } : p
        ),
      };

    default:
      return state;
  }
}

interface PlansContextValue extends PlansState {
  fetchPlans: () => Promise<void>;
  createPlan: (data: CreatePlanData) => Promise<Plan>;
  updatePlan: (id: string, data: Partial<Plan>) => Promise<Plan>;
  deletePlan: (id: string) => Promise<void>;
  duplicatePlan: (id: string) => Promise<Plan>;
  archivePlan: (id: string) => Promise<void>;
  refreshPlans: () => Promise<void>;
  clearError: () => void;
}

interface CreatePlanData {
  name: string;
  description?: string;
  sector?: string;
  city?: string;
}

const PlansContext = createContext<PlansContextValue | undefined>(undefined);

export function PlansProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(plansReducer, initialState);

  const fetchPlans = useCallback(async () => {
    dispatch({ type: 'PLANS_START' });
    try {
      const data = await apiCall<{ plans: Plan[] }>('/api/plans');
      dispatch({ type: 'PLANS_SUCCESS', payload: data.plans });
    } catch (error) {
      dispatch({
        type: 'PLANS_FAILURE',
        payload: error instanceof Error ? error.message : 'Falha ao carregar planos',
      });
    }
  }, []);

  const createPlan = useCallback(async (data: CreatePlanData): Promise<Plan> => {
    const response = await apiCall<{ plan: Plan }>('/api/plans', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    const plan = response.plan;
    dispatch({ type: 'PLAN_ADDED', payload: plan });
    return plan;
  }, []);

  const updatePlan = useCallback(async (id: string, data: Partial<Plan>): Promise<Plan> => {
    const response = await apiCall<{ plan: Plan }>(`/api/plans/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
    const plan = response.plan;
    dispatch({ type: 'PLAN_UPDATED', payload: plan });
    return plan;
  }, []);

  const deletePlan = useCallback(async (id: string): Promise<void> => {
    await apiCall(`/api/plans/${id}`, { method: 'DELETE' });
    dispatch({ type: 'PLAN_REMOVED', payload: id });
  }, []);

  const duplicatePlan = useCallback(async (id: string): Promise<Plan> => {
    const response = await apiCall<{ plan: Plan }>(`/api/plans/${id}/duplicate`, {
      method: 'POST',
    });
    const plan = response.plan;
    dispatch({ type: 'PLAN_ADDED', payload: plan });
    return plan;
  }, []);

  const archivePlan = useCallback(async (id: string): Promise<void> => {
    const response = await apiCall<{ plan: Plan }>(`/api/plans/${id}/archive`, {
      method: 'POST',
    });
    dispatch({ type: 'PLAN_UPDATED', payload: response.plan });
  }, []);

  const refreshPlans = useCallback(async () => {
    await fetchPlans();
  }, [fetchPlans]);

  const clearError = useCallback(() => {
    dispatch({ type: 'PLANS_START' });
  }, []);

  // Load plans on mount
  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const value: PlansContextValue = {
    ...state,
    fetchPlans,
    createPlan,
    updatePlan,
    deletePlan,
    duplicatePlan,
    archivePlan,
    refreshPlans,
    clearError,
  };

  return (
    <PlansContext.Provider value={value}>
      {children}
    </PlansContext.Provider>
  );
}

export function usePlans(): PlansContextValue {
  const context = useContext(PlansContext);
  if (!context) {
    throw new Error('usePlans deve ser usado dentro de PlansProvider');
  }
  return context;
}