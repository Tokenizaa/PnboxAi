import { AgentContext, AgentExecutionResult } from '../types';
import { pnboxSkill, PnboxToolsOutput } from '../../skills/pnbox';
import { CanonicalBusinessPlan } from '../../skills/business-plan';
import { databaseSkill } from '../../skills/database';

export class PnboxAgent {
  public async execute(
    plan: CanonicalBusinessPlan,
    context: AgentContext
  ): Promise<AgentExecutionResult<PnboxToolsOutput>> {
    const start = Date.now();
    try {
      const output = pnboxSkill.mapCanonicalToPnbox(plan, context.planId);

      // Persistência das 14 ferramentas vinculadas ao plano e usuário
      await databaseSkill.insert('pnbox_collections', {
        id: `col_${context.planId}`,
        userId: context.userId,
        planId: context.planId,
        ferramentas: output.ferramentas,
        totalFerramentas: output.totalFerramentas,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      });

      return {
        agentName: 'pnbox',
        success: true,
        data: output,
        durationMs: Date.now() - start,
        persistedId: `col_${context.planId}`
      };
    } catch (err: any) {
      return {
        agentName: 'pnbox',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const pnboxAgent = new PnboxAgent();
