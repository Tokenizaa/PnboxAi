import { AgentContext, AgentExecutionResult } from '../types';
import { deepResearchSkill, DeepResearchSkillResult } from '../../skills/deep-research';

export class ResearchAgent {
  public async execute(
    objectivePrompt: string,
    context: AgentContext
  ): Promise<AgentExecutionResult<DeepResearchSkillResult>> {
    const start = Date.now();
    try {
      const result = await deepResearchSkill.execute({
        prompt: objectivePrompt,
        setor: context.sector,
        cidadeUf: context.city,
        orcamentoEstimado: context.estimatedBudget,
        userId: context.userId,
        planId: context.planId
      });

      return {
        agentName: 'research',
        success: true,
        data: result,
        durationMs: Date.now() - start,
        persistedId: result.researchId
      };
    } catch (err: any) {
      return {
        agentName: 'research',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message || 'Erro na execução do Research Agent'
      };
    }
  }
}

export const researchAgent = new ResearchAgent();
