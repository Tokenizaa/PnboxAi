import { AgentContext, AgentExecutionResult } from '../types';
import { marketSizingSkill, MarketSizingResult } from '../../skills/market-sizing';

export class MarketResearchAgent {
  public async execute(
    context: AgentContext
  ): Promise<AgentExecutionResult<MarketSizingResult>> {
    const start = Date.now();
    try {
      const result = await marketSizingSkill.calculate(
        context.sector || 'Serviços Especializados',
        context.city || 'Brasil',
        'Consumidores e Empresas Qualificadas'
      );

      return {
        agentName: 'market-research',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'market-research',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const marketResearchAgent = new MarketResearchAgent();
