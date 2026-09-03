import { AgentContext, AgentExecutionResult } from '../types';
import { validationSkill, ValidationReport } from '../../skills/validation';
import { CanonicalBusinessPlan } from '../../skills/business-plan';

export class ValidatorAgent {
  public async execute(
    plan: CanonicalBusinessPlan,
    context: AgentContext
  ): Promise<AgentExecutionResult<ValidationReport>> {
    const start = Date.now();
    try {
      const report = validationSkill.validatePlan(plan);

      return {
        agentName: 'validator',
        success: report.isValido,
        data: report,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'validator',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const validatorAgent = new ValidatorAgent();
