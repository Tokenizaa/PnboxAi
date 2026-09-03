import { AgentContext, AgentExecutionResult } from '../types';
import { businessPlanSkill, CanonicalBusinessPlan } from '../../skills/business-plan';
import { BuyerPersonaDetailed } from '../../skills/persona-generation';
import { ValuePropositionResult } from '../../skills/value-proposition';
import { CompetitorAnalysisResult } from '../../skills/competitor-analysis';
import { FinancialPlanMetrics } from '../../skills/financial-analysis';
import { CustomerJourneyResult } from '../../skills/customer-journey';
import { databaseSkill } from '../../skills/database';

export interface PlanBuilderInputs {
  persona: BuyerPersonaDetailed;
  propostaValor: ValuePropositionResult;
  concorrencia: CompetitorAnalysisResult;
  financeiro: FinancialPlanMetrics;
  jornada: CustomerJourneyResult;
  canaisAquisicao?: string[];
  canaisVenda?: string[];
  fontesConsultadas?: Array<{ url: string; title: string; publisher: string; reliability: number }>;
}

export class PlanBuilderAgent {
  public async execute(
    inputs: PlanBuilderInputs,
    context: AgentContext
  ): Promise<AgentExecutionResult<CanonicalBusinessPlan>> {
    const start = Date.now();
    try {
      const plan = businessPlanSkill.assemblePlan({
        id: context.planId,
        userId: context.userId,
        nome: context.projectName || 'Plano de Negócio Sebrae',
        setor: context.sector || 'Serviços Especializados',
        cidadeUf: context.city || 'Brasil',
        resumoExecutivo: `Plano estratégico estruturado para o setor de ${context.sector || 'serviços'}, com investimento total de R$ ${inputs.financeiro.investimentoTotalInicial.toLocaleString('pt-BR')} e retorno estimado em ${inputs.financeiro.pontoEquilibrioMesesPayback} meses.`,
        propostaValor: inputs.propostaValor,
        persona: inputs.persona,
        jornadaCliente: inputs.jornada,
        concorrencia: inputs.concorrencia,
        financeiro: inputs.financeiro,
        canaisAquisicao: inputs.canaisAquisicao,
        canaisVenda: inputs.canaisVenda,
        fontesConsultadas: inputs.fontesConsultadas
      });

      // Persistência real na tabela canônica
      await databaseSkill.insert('canonical_business_models', {
        id: plan.id,
        userId: context.userId,
        nome: plan.nome,
        setor: plan.setor,
        cidadeUf: plan.cidadeUf,
        modeloCompleto: plan,
        createdAt: plan.criadoEm,
        updatedAt: plan.atualizadoEm
      });

      return {
        agentName: 'plan-builder',
        success: true,
        data: plan,
        durationMs: Date.now() - start,
        persistedId: plan.id
      };
    } catch (err: any) {
      return {
        agentName: 'plan-builder',
        success: false,
        data: null as any,
        durationMs: Date.now() - start,
        error: err.message
      };
    }
  }
}

export const planBuilderAgent = new PlanBuilderAgent();
