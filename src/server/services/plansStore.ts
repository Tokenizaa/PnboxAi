import { ID_PLANO_PADRAO } from '../../automation/schemaCatalog';
import { PlanoCriadoInfo } from '../../types/pnbox';

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

export const USER_PLANS: Map<string, UserPlan[]> = new Map();

export function generatePlanId(): string {
  return 'plan_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

export function getUserPlans(userId: string): UserPlan[] {
  return USER_PLANS.get(userId) || [];
}

export function setUserPlans(userId: string, plans: UserPlan[]): void {
  USER_PLANS.set(userId, plans);
}

export const PLANOS_CRIADOS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO,
    nomePlano: 'Cafeteria Especial & Coworking Criativo',
    setor: 'Alimentação & Espaços de Trabalho',
    descricao: 'Cafeteria de microlotes e espaço de trabalho compartilhado com Wi-Fi ultra veloz.',
    cidadeUf: 'Curitiba / PR',
    criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14
  }
];
