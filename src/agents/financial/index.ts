import { AgentContext, AgentExecutionResult } from '../types';
import { financialAnalysisSkill, FinancialPlanMetrics } from '../../skills/financial-analysis';

export class FinancialAgent {
  public async execute(
    context: AgentContext,
    ticketSugerido: number = 180
  ): Promise<AgentExecutionResult<FinancialPlanMetrics>> {
    const start = Date.now();
    try {
      const orcamento = context.estimatedBudget || 80000;
      const result = await financialAnalysisSkill.analyze(
        context.sector || 'Serviços Especializados',
        orcamento,
        ticketSugerido,
        context.city || 'Brasil'
      );

      return {
        agentName: 'financial',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'financial',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const financialAgent = new FinancialAgent();
