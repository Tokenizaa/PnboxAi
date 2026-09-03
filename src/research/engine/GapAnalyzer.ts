import { ResearchPlan, ResearchTask, ResearchGap, ResearchCategory, GapSeverity, Claim } from "../types";
import { RESEARCH_POLICIES, calculateSufficiency } from "../policies";
import { evidenceStore } from "../evidence";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

const REQUIRED_EVIDENCE_BY_CATEGORY: Record<ResearchCategory, string[]> = {
  market: ["market_size", "growth_rate", "trends", "geographic_breakdown"],
  customer: ["demographics", "psychographics", "pain_points", "purchase_behavior", "journey_stages"],
  competition: ["competitor_list", "market_share", "swot", "pricing", "differentiation"],
  pricing: ["price_points", "elasticity", "competitor_pricing", "value_metrics"],
  operations: ["processes", "resources", "suppliers", "partnerships", "capacity"],
  financial: ["capex", "opex", "revenue_model", "unit_economics", "cash_flow", "break_even"],
  regulatory: ["cnae", "tax_regime", "licenses", "compliance_requirements"],
  strategy: ["swot", "risks", "opportunities", "marketing_channels", "kpis"],
};

const CRITICAL_QUESTIONS_BY_CATEGORY: Record<ResearchCategory, string[]> = {
  market: ["market_size", "growth_rate"],
  customer: ["customer_segments", "pain_points", "average_ticket"],
  competition: ["competitor_list", "competitive_gaps"],
  pricing: ["pricing_strategy", "price_elasticity"],
  operations: ["key_processes", "resource_requirements"],
  financial: ["capex_total", "opex_monthly", "revenue_projection", "break_even", "payback"],
  regulatory: ["cnae", "required_licenses"],
  strategy: ["key_risks", "marketing_strategy"],
};

export class GapAnalyzer {
  analyze(plan: ResearchPlan): ResearchGap[] {
    const gaps: ResearchGap[] = [];
    const claims = evidenceStore.getAllClaims();
    const claimsByCategory = this.groupClaimsByCategory(claims, plan);

    for (const category of Object.keys(REQUIRED_EVIDENCE_BY_CATEGORY) as ResearchCategory[]) {
      const categoryGaps = this.analyzeCategory(category, plan, claimsByCategory[category] || []);
      gaps.push(...categoryGaps);
    }

    const criticalVariableGaps = this.checkCriticalVariables(plan, claimsByCategory);
    gaps.push(...criticalVariableGaps);

    const missingQuestions = this.checkMissingQuestions(plan, claimsByCategory);
    gaps.push(...missingQuestions);

    return gaps;
  }

  private groupClaimsByCategory(claims: Claim[], plan: ResearchPlan): Record<ResearchCategory, Claim[]> {
    const result: Record<ResearchCategory, Claim[]> = {
      market: [], customer: [], competition: [], pricing: [],
      operations: [], financial: [], regulatory: [], strategy: [],
    };

    for (const claim of claims) {
      const question = plan.researchQuestions.find((q) => q.id === claim.questionId);
      if (question) {
        result[question.category].push(claim);
      }
    }

    return result;
  }

  private analyzeCategory(
    category: ResearchCategory,
    plan: ResearchPlan,
    claims: Claim[]
  ): ResearchGap[] {
    const gaps: ResearchGap[] = [];
    const requiredEvidence = REQUIRED_EVIDENCE_BY_CATEGORY[category] || [];
    const categoryTasks = plan.tasks.filter((t) => t.category === category);
    const completedTasks = categoryTasks.filter((t) => t.status === "completed");

    for (const evidenceType of requiredEvidence) {
      const hasEvidence = claims.some((c) =>
        c.statement.toLowerCase().includes(evidenceType.toLowerCase()) ||
        c.evidenceIds.some((eid) => {
          const ev = evidenceStore.getEvidence(eid);
          return ev?.context?.toLowerCase().includes(evidenceType.toLowerCase());
        })
      );

      if (!hasEvidence) {
        const severity = CRITICAL_QUESTIONS_BY_CATEGORY[category]?.includes(evidenceType) ? "critical" : "high";
        gaps.push(this.createGap(plan, category, evidenceType, severity, []));
      }
    }

    const lowConfidenceClaims = claims.filter((c) => c.confidence < 0.5);
    if (lowConfidenceClaims.length > 0) {
      gaps.push({
        id: generateId("gap"),
        questionId: category,
        description: `${lowConfidenceClaims.length} claims com confiança baixa (< 0.5) em ${category}`,
        severity: "medium",
        missingEvidence: lowConfidenceClaims.map((c) => c.id),
        suggestedQueries: this.generateQueriesForCategory(category, "confidence"),
        suggestedTasks: this.generateTasksForCategory(category, "confidence", plan),
        createdAt: new Date().toISOString(),
      });
    }

    const tasksWithoutResults = categoryTasks.filter((t) => t.status === "completed" && (!t.results || t.results.claims.length === 0));
    if (tasksWithoutResults.length > 0) {
      gaps.push({
        id: generateId("gap"),
        questionId: category,
        description: `${tasksWithoutResults.length} tasks completadas sem resultados em ${category}`,
        severity: "high",
        missingEvidence: tasksWithoutResults.map((t) => t.id),
        suggestedQueries: tasksWithoutResults.flatMap((t) => t.queries),
        suggestedTasks: tasksWithoutResults.map((t) => ({
          question: t.question,
          objective: t.objective,
          category: t.category,
          priority: t.priority,
          dependencies: t.dependencies,
          queries: t.queries,
          requiredEvidence: t.requiredEvidence,
        })),
        createdAt: new Date().toISOString(),
      });
    }

    return gaps;
  }

  private checkCriticalVariables(plan: ResearchPlan, claimsByCategory: Record<ResearchCategory, Claim[]>): ResearchGap[] {
    const gaps: ResearchGap[] = [];

    for (const variable of plan.criticalVariables) {
      const found = this.findClaimForVariable(variable, claimsByCategory);
      if (!found) {
        gaps.push({
          id: generateId("gap"),
          questionId: "critical_variable",
          description: `Variável crítica não pesquisada: ${variable}`,
          severity: "critical",
          missingEvidence: [variable],
          suggestedQueries: [`${variable} Brasil 2024 2025`, `benchmark ${variable} setor`],
          suggestedTasks: [{
            question: `Determinar ${variable} para o negócio`,
            objective: `Obter valor confiável para ${variable} com fonte`,
            category: this.inferCategoryFromVariable(variable),
            priority: "critical",
            dependencies: [],
            queries: [`${variable} Brasil 2024`, `benchmark ${variable} ${plan.businessDefinition.sector}`],
            requiredEvidence: [variable],
          }],
          createdAt: new Date().toISOString(),
        });
      }
    }

    return gaps;
  }

  private findClaimForVariable(variable: string, claimsByCategory: Record<ResearchCategory, Claim[]>): Claim | undefined {
    for (const claims of Object.values(claimsByCategory)) {
      const found = claims.find((c) =>
        c.statement.toLowerCase().includes(variable.toLowerCase()) ||
        c.id.includes(variable)
      );
      if (found) return found;
    }
    return undefined;
  }

  private checkMissingQuestions(plan: ResearchPlan, claimsByCategory: Record<ResearchCategory, Claim[]>): ResearchGap[] {
    const gaps: ResearchGap[] = [];

    for (const question of plan.researchQuestions) {
      const claims = claimsByCategory[question.category] || [];
      const relevantClaims = claims.filter((c) => c.questionId === question.id);

      if (relevantClaims.length === 0) {
        const severity = question.priority === "critical" ? "critical" : "high";
        gaps.push({
          id: generateId("gap"),
          questionId: question.id,
          description: `Pergunta de pesquisa sem resposta: ${question.question}`,
          severity,
          missingEvidence: question.requiredEvidenceTypes,
          suggestedQueries: this.generateQueriesForCategory(question.category, question.question),
          suggestedTasks: [{
            question: question.question,
            objective: question.requiredEvidenceTypes.join(", "),
            category: question.category,
            priority: question.priority,
            dependencies: [],
            queries: this.generateQueriesForCategory(question.category, question.question),
            requiredEvidence: question.requiredEvidenceTypes,
          }],
          createdAt: new Date().toISOString(),
        });
      }
    }

    return gaps;
  }

  private generateQueriesForCategory(category: ResearchCategory, focus: string): string[] {
    const baseQueries: Record<ResearchCategory, string[]> = {
      market: [`tamanho mercado ${focus} Brasil 2024`, `crescimento setor ${focus} IBGE`, `tendências ${focus} 2025`],
      customer: [`perfil cliente ${focus} Brasil`, `comportamento consumidor ${focus}`, `dores ${focus} pesquisa`],
      competition: [`concorrentes ${focus} Brasil`, `market share ${focus}`, `análise competitiva ${focus}`],
      pricing: [`precificação ${focus} Brasil`, `price elasticity ${focus}`, `ticket médio ${focus}`],
      financial: [`investimento ${focus} Brasil`, `custos ${focus} OPEX`, `faturamento ${focus} benchmark`],
      regulatory: [`CNAE ${focus} Brasil`, `licenças ${focus} alvarás`, `regime tributário ${focus}`],
      operations: [`processos ${focus} Brasil`, `fornecedores ${focus}`, `recursos ${focus} necessários`],
      strategy: [`riscos ${focus} Brasil`, `oportunidades ${focus}`, `SWOT ${focus}`],
    };

    return baseQueries[category] || [`${focus} Brasil 2024`];
  }

  private generateTasksForCategory(category: ResearchCategory, focus: string, plan: ResearchPlan) {
    return [{
      question: `Completar ${focus} em ${category}`,
      objective: `Obter evidências para ${focus}`,
      category,
      priority: "high" as const,
      dependencies: [],
      queries: this.generateQueriesForCategory(category, focus),
      requiredEvidence: REQUIRED_EVIDENCE_BY_CATEGORY[category] || [],
    }];
  }

  private inferCategoryFromVariable(variable: string): ResearchCategory {
    const mapping: Record<string, ResearchCategory> = {
      market_size: "market",
      growth_rate: "market",
      customer_acquisition_cost: "customer",
      average_ticket: "customer",
      monthly_churn_rate: "customer",
      gross_margin: "financial",
      fixed_costs_monthly: "financial",
      variable_cost_per_unit: "financial",
      conversion_rate: "customer",
      regulatory_timeline: "regulatory",
      seasonality_factor: "market",
    };
    return mapping[variable] || "market";
  }

  createGap(
    plan: ResearchPlan,
    category: ResearchCategory,
    evidenceType: string,
    severity: GapSeverity,
    existingEvidence: string[]
  ): ResearchGap {
    return {
      id: generateId("gap"),
      questionId: category,
      description: `Evidência ausente: ${evidenceType} em ${category}`,
      severity,
      missingEvidence: [evidenceType, ...existingEvidence],
      suggestedQueries: this.generateQueriesForCategory(category, evidenceType),
      suggestedTasks: this.generateTasksForCategory(category, evidenceType, plan),
      createdAt: new Date().toISOString(),
    };
  }
}

export const gapAnalyzer = new GapAnalyzer();