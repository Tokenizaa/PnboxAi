export interface UserPlan {
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

/**
 * Cache transitório de metadados da aplicação.
 * NÃO é fonte de verdade dos planos: a fonte de verdade é o PNBOX.
 * O cache existe apenas para manter contexto interno de pesquisa/status entre chamadas.
 */
export const USER_PLANS: Map<string, UserPlan[]> = new Map();

export function getUserPlans(userId: string): UserPlan[] {
  return USER_PLANS.get(userId) || [];
}

export function setUserPlans(userId: string, plans: UserPlan[]): void {
  USER_PLANS.set(userId, plans);
}
