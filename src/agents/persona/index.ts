import { AgentContext, AgentExecutionResult } from '../types';
import { personaGenerationSkill, BuyerPersonaDetailed } from '../../skills/persona-generation';

export class PersonaAgent {
  public async execute(
    context: AgentContext,
    publicoAlvoDescrito?: string
  ): Promise<AgentExecutionResult<BuyerPersonaDetailed>> {
    const start = Date.now();
    try {
      const publico = publicoAlvoDescrito || 'Consumidores e gestores que valorizam tempo, transparência e segurança.';
      const result = await personaGenerationSkill.generate(
        context.sector || 'Serviços Especializados',
        publico,
        180
      );

      return {
        agentName: 'persona',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'persona',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const personaAgent = new PersonaAgent();
