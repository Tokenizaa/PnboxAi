import { AgentContext, AgentExecutionResult } from '../types';
import { competitorAnalysisSkill, CompetitorAnalysisResult } from '../../skills/competitor-analysis';

export class CompetitorResearchAgent {
  public async execute(
    context: AgentContext,
    propostaValor: string = 'Solução ágil, transparente e orientada a resultados'
  ): Promise<AgentExecutionResult<CompetitorAnalysisResult>> {
    const start = Date.now();
    try {
      const result = await competitorAnalysisSkill.analyze(
        context.sector || 'Geral',
        propostaValor,
        context.city || 'Brasil'
      );

      return {
        agentName: 'competitor-research',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'competitor-research',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const competitorResearchAgent = new CompetitorResearchAgent();
