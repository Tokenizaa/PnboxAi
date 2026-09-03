import { BuyerPersonaDetailed } from '../persona-generation';
import { ValuePropositionResult } from '../value-proposition';
import { CompetitorAnalysisResult } from '../competitor-analysis';
import { FinancialPlanMetrics } from '../financial-analysis';
import { CustomerJourneyResult } from '../customer-journey';

export interface CanonicalBusinessPlan {
  id: string;
  userId: string;
  nome: string;
  setor: string;
  cidadeUf: string;
  resumoExecutivo: string;
  propostaValor: ValuePropositionResult;
  persona: BuyerPersonaDetailed;
  jornadaCliente: CustomerJourneyResult;
  concorrencia: CompetitorAnalysisResult;
  financeiro: FinancialPlanMetrics;
  canaisAquisicao: string[];
  canaisVenda: string[];
  swot: {
    forcas: string[];
    fraquezas: string[];
    oportunidades: string[];
    ameacas: string[];
  };
  aspectosLegais: {
    cnae: string;
    regimeTributario: string;
    licencas: string[];
  };
  fontesConsultadas: Array<{ url: string; title: string; publisher: string; reliability: number }>;
  criadoEm: string;
  atualizadoEm: string;
}

export class BusinessPlanSkill {
  public assemblePlan(params: {
    id: string;
    userId: string;
    nome: string;
    setor: string;
    cidadeUf: string;
    resumoExecutivo: string;
    propostaValor: ValuePropositionResult;
    persona: BuyerPersonaDetailed;
    jornadaCliente: CustomerJourneyResult;
    concorrencia: CompetitorAnalysisResult;
    financeiro: FinancialPlanMetrics;
    canaisAquisicao?: string[];
    canaisVenda?: string[];
    fontesConsultadas?: Array<{ url: string; title: string; publisher: string; reliability: number }>;
  }): CanonicalBusinessPlan {
    const now = new Date().toISOString();

    return {
      id: params.id,
      userId: params.userId,
      nome: params.nome,
      setor: params.setor,
      cidadeUf: params.cidadeUf,
      resumoExecutivo: params.resumoExecutivo,
      propostaValor: params.propostaValor,
      persona: params.persona,
      jornadaCliente: params.jornadaCliente,
      concorrencia: params.concorrencia,
      financeiro: params.financeiro,
      canaisAquisicao: params.canaisAquisicao || [
        'Marketing de Busca (Google Ads & SEO Local)',
        'Redes Sociais (Instagram e LinkedIn)',
        'Parcerias Estratégicas B2B'
      ],
      canaisVenda: params.canaisVenda || [
        'Plataforma Digital / Web App',
        'Atendimento Consultivo via WhatsApp Business',
        'Vendas Diretas / Inside Sales'
      ],
      swot: {
        forcas: [
          'Atendimento ágil com tecnologia proprietária',
          'Proposta de valor altamente diferenciada',
          'Baixo custo fixo inicial'
        ],
        fraquezas: [
          'Marca nova ainda sem reconhecimento nacional',
          'Equipe inicial enxuta com necessidade de automação'
        ],
        oportunidades: [
          'Mercado em rápida digitalização e demanda latente',
          'Possibilidade de escala para outras regiões',
          'Parcerias com entidades de classe e associações'
        ],
        ameacas: [
          'Entrada de novos concorrentes digitais',
          'Mudanças na legislação ou regulação do setor'
        ]
      },
      aspectosLegais: {
        cnae: '6201-5/01 - Desenvolvimento e consultoria em TI',
        regimeTributario: 'Simples Nacional',
        licencas: ['Alvará Municipal de Funcionamento', 'Inscrição Municipal']
      },
      fontesConsultadas: params.fontesConsultadas || [],
      criadoEm: now,
      atualizadoEm: now
    };
  }
}

export const businessPlanSkill = new BusinessPlanSkill();
