import { AgentContext, AgentExecutionResult } from '../types';
import { customerJourneySkill, CustomerJourneyResult } from '../../skills/customer-journey';

export class CustomerJourneyAgent {
  public async execute(
    context: AgentContext,
    propostaValor: string,
    personaNome: string
  ): Promise<AgentExecutionResult<CustomerJourneyResult>> {
    const start = Date.now();
    try {
      const result = await customerJourneySkill.mapJourney(
        propostaValor,
        personaNome,
        context.sector || 'Serviços'
      );

      return {
        agentName: 'customer-journey',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'customer-journey',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const customerJourneyAgent = new CustomerJourneyAgent();
