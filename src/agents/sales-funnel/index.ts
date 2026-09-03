import { AgentContext, AgentExecutionResult } from '../types';

export interface SalesFunnelStage {
  etapa: string;
  volumeMensalEstimado: number;
  taxaConversaoPct: number;
  acoesChave: string[];
}

export interface SalesFunnelResult {
  etapas: SalesFunnelStage[];
  cacEstimadoBrl: number;
  ticketMedioBrl: number;
}

export class SalesFunnelAgent {
  public async execute(
    context: AgentContext,
    ticketMedio: number = 180
  ): Promise<AgentExecutionResult<SalesFunnelResult>> {
    const start = Date.now();
    try {
      const etapas: SalesFunnelStage[] = [
        {
          etapa: 'Topo do Funil (Visitantes / Alcance)',
          volumeMensalEstimado: 3500,
          taxaConversaoPct: 100,
          acoesChave: ['Artigos no blog', 'Anúncios de conscientização de dor', 'Vídeos explicativos']
        },
        {
          etapa: 'Meio do Funil (Leads Qualificados)',
          volumeMensalEstimado: 420,
          taxaConversaoPct: 12,
          acoesChave: ['Calculadora gratuita de viabilidade', 'Diagnóstico online', 'E-book de boas práticas']
        },
        {
          etapa: 'Fundo do Funil (Oportunidades em Negociação)',
          volumeMensalEstimado: 140,
          taxaConversaoPct: 33.3,
          acoesChave: ['Demonstração guiada', 'Proposta personalizada', 'Atendimento via WhatsApp']
        },
        {
          etapa: 'Conversão em Clientes Ativos',
          volumeMensalEstimado: Math.round(140 * 0.45),
          taxaConversaoPct: 45,
          acoesChave: ['Onboarding assistido', 'Checkout transparente', 'Garantia de 7 dias']
        }
      ];

      return {
        agentName: 'sales-funnel',
        success: true,
        data: {
          etapas,
          cacEstimadoBrl: Math.round(ticketMedio * 0.28),
          ticketMedioBrl: ticketMedio
        },
        durationMs: Date.now() - start
      };
    } catch (err: any) {
      return {
        agentName: 'sales-funnel',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const salesFunnelAgent = new SalesFunnelAgent();
