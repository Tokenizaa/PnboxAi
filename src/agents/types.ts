import { CanonicalBusinessPlan } from '../skills/business-plan';
import { PnboxToolsOutput } from '../skills/pnbox';
import { ValidationReport } from '../skills/validation';
import { DeepResearchSkillResult } from '../skills/deep-research';

export interface AgentContext {
  userId: string;
  planId: string;
  projectName?: string;
  sector?: string;
  city?: string;
  estimatedBudget?: number;
  existingResearch?: DeepResearchSkillResult;
  existingPlan?: CanonicalBusinessPlan;
  existingPnboxTools?: PnboxToolsOutput;
}

export interface AgentExecutionResult<T = unknown> {
  agentName: string;
  success: boolean;
  data: T;
  durationMs: number;
  error?: string;
  persistedId?: string;
}

export interface FullOrchestrationResult {
  planId: string;
  userId: string;
  research: DeepResearchSkillResult;
  plan: CanonicalBusinessPlan;
  pnbox: PnboxToolsOutput;
  validation: ValidationReport;
  durationTotalMs: number;
  status: 'completed' | 'failed';
}
