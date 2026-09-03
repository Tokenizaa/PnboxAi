import { AgentContext, AgentExecutionResult } from '../types';
import { valuePropositionSkill, ValuePropositionResult } from '../../skills/value-proposition';

export class ValuePropositionAgent {
  public async execute(
    context: AgentContext,
    dores: string[] = ['Burocracia excessiva', 'Lentidão nas respostas', 'Falta de clareza'],
    desejos: string[] = ['Atendimento ágil', 'Segurança jurídica', 'Custo-benefício previsível']
  ): Promise<AgentExecutionResult<ValuePropositionResult>> {
    const start = Date.now();
    try {
      const result = await valuePropositionSkill.generate(
        context.projectName || 'Empreendimento Inovador',
        context.sector || 'Serviços',
        dores,
        desejos
      );

      return {
        agentName: 'value-proposition',
        success: true,
        data: result,
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'value-proposition',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const valuePropositionAgent = new ValuePropositionAgent();
