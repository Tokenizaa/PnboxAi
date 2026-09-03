import { AgentContext, FullOrchestrationResult } from '../types';
import { researchAgent } from '../research';
import { marketResearchAgent } from '../market-research';
import { competitorResearchAgent } from '../competitor-research';
import { personaAgent } from '../persona';
import { valuePropositionAgent } from '../value-proposition';
import { customerJourneyAgent } from '../customer-journey';
import { channelsAgent } from '../channels';
import { salesFunnelAgent } from '../sales-funnel';
import { financialAgent } from '../financial';
import { planBuilderAgent } from '../plan-builder';
import { pnboxAgent } from '../pnbox';
import { validatorAgent } from '../validator';
import { databaseSkill } from '../../skills/database';

export interface OrchestratorRunOptions {
  userId: string;
  planId: string;
  projectName: string;
  sector: string;
  city: string;
  estimatedBudget: number;
  objectivePrompt: string;
}

export class OrchestratorAgent {
  /**
   * Orquestra todo o fluxo de Deep Research -> Modelagem -> Validação -> PNBOX
   */
  public async buildCompletePlan(options: OrchestratorRunOptions): Promise<FullOrchestrationResult> {
    const startTime = Date.now();
    const context: AgentContext = {
      userId: options.userId,
      planId: options.planId,
      projectName: options.projectName,
      sector: options.sector,
      city: options.city,
      estimatedBudget: options.estimatedBudget
    };

    console.log(`[Orchestrator] Iniciando orquestração para plano ${options.planId} (${options.projectName})...`);

    // 1. Pesquisa Profunda com Fontes Verificadas (Research Agent)
    const researchRes = await researchAgent.execute(
      options.objectivePrompt || `Plano de negócio para ${options.projectName} no setor de ${options.sector} em ${options.city}`,
      context
    );

    if (!researchRes.success || !researchRes.data) {
      throw new Error(`Falha no Research Agent: ${researchRes.error}`);
    }
    context.existingResearch = researchRes.data;

    // 2. Análise de Mercado e Concorrência em Paralelo
    const [marketRes, compRes] = await Promise.all([
      marketResearchAgent.execute(context),
      competitorResearchAgent.execute(context)
    ]);

    // 3. Buyer Persona e Proposta de Valor
    const personaRes = await personaAgent.execute(context);
    const valPropRes = await valuePropositionAgent.execute(
      context,
      personaRes.data?.doresPrincipais,
      personaRes.data?.desejosObjetivos
    );

    // 4. Jornada do Cliente, Canais e Funil de Vendas
    const [journeyRes, channelsRes, funnelRes] = await Promise.all([
      customerJourneyAgent.execute(
        context,
        valPropRes.data?.headline || options.projectName,
        personaRes.data?.nome || 'Consumidor Ideal'
      ),
      channelsAgent.execute(context),
      salesFunnelAgent.execute(context, personaRes.data?.ticketMedioEsperado || 180)
    ]);

    // 5. Planejamento Financeiro, DRE e Ponto de Equilíbrio
    const financialRes = await financialAgent.execute(
      context,
      personaRes.data?.ticketMedioEsperado || 180
    );

    // 6. Síntese do Plano Canônico de Negócio
    const planBuilderRes = await planBuilderAgent.execute(
      {
        persona: personaRes.data,
        propostaValor: valPropRes.data,
        concorrencia: compRes.data,
        financeiro: financialRes.data,
        jornada: journeyRes.data,
        canaisAquisicao: channelsRes.data?.aquisicao,
        canaisVenda: channelsRes.data?.vendas,
        fontesConsultadas: researchRes.data.fontes
      },
      context
    );

    if (!planBuilderRes.success || !planBuilderRes.data) {
      throw new Error(`Falha no Plan Builder Agent: ${planBuilderRes.error}`);
    }
    const canonicalPlan = planBuilderRes.data;
    context.existingPlan = canonicalPlan;

    // 7. Mapeamento Canônico para as 14 Ferramentas PNBOX Oficiais
    const pnboxRes = await pnboxAgent.execute(canonicalPlan, context);
    if (!pnboxRes.success || !pnboxRes.data) {
      throw new Error(`Falha no PNBOX Agent: ${pnboxRes.error}`);
    }
    context.existingPnboxTools = pnboxRes.data;

    // 8. Auditoria de Validação Final (Validator Agent)
    const validatorRes = await validatorAgent.execute(canonicalPlan, context);

    // 9. Atualização do status do plano mestre no banco
    await databaseSkill.update('plans', options.planId, {
      progress: 100,
      status: 'pronto',
      researchStatus: 'completed',
      executionStatus: 'completed',
      toolsFilled: 14,
      updatedAt: new Date().toISOString()
    });

    const durationTotalMs = Date.now() - startTime;
    console.log(`[Orchestrator] Concluído em ${durationTotalMs}ms. Score de validação: ${validatorRes.data?.scoreQualidade ?? 100}/100.`);

    return {
      planId: options.planId,
      userId: options.userId,
      research: researchRes.data,
      plan: canonicalPlan,
      pnbox: pnboxRes.data,
      validation: validatorRes.data,
      durationTotalMs,
      status: 'completed'
    };
  }
}

export const orchestratorAgent = new OrchestratorAgent();
