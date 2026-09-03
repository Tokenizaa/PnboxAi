import {
  CanonicalBusinessModel,
  BusinessCore,
  MarketAnalysis,
  CustomerAnalysis,
  CompetitionAnalysis,
  ValueProposition,
  SwotAnalysis,
  MarketingPlan,
  OperationsPlan,
  FinancialModel,
  ViabilityAnalysis,
  RegulatoryAnalysis,
  ProvenanceMap,
  Claim,
  Source,
  Evidence,
  ResearchPlan,
} from "../types";
import { evidenceStore } from "../evidence";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface SynthesisContext {
  plan: ResearchPlan;
  claims: Claim[];
  evidence: Evidence[];
  sources: Source[];
  useAIAssistance?: boolean;
}

export interface SynthesisOptions {
  useLLMForSynthesis?: boolean;
  preserveUnknowns?: boolean;
  minimumConfidence?: number;
}

export class ResearchSynthesizer {
  async synthesize(
    context: SynthesisContext,
    options: SynthesisOptions = {}
  ): Promise<CanonicalBusinessModel> {
    const claimsByField = this.groupClaimsByField(context.claims);
    const minConfidence = options.minimumConfidence || 0.5;

    const business = this.synthesizeBusinessCore(context.plan);
    const market = this.synthesizeMarket(context.plan, claimsByField, minConfidence);
    const customer = this.synthesizeCustomer(context.plan, claimsByField, minConfidence);
    const competition = this.synthesizeCompetition(context.plan, claimsByField, minConfidence);
    const valueProposition = this.synthesizeValueProposition(context.plan, claimsByField);
    const swot = this.synthesizeSWOT(context.plan, claimsByField);
    const marketing = this.synthesizeMarketing(context.plan, claimsByField);
    const operations = this.synthesizeOperations(context.plan, claimsByField);
    const financials = this.synthesizeFinancials(context.plan, claimsByField, minConfidence);
    const viability = this.synthesizeViability(context.plan, claimsByField);
    const regulatory = this.synthesizeRegulatory(context.plan, claimsByField);
    const provenance = this.buildProvenance(context);

    return {
      business,
      market,
      customer,
      competition,
      valueProposition,
      swot,
      marketing,
      operations,
      financials,
      viability,
      regulatory,
      provenance,
    };
  }

  private synthesizeBusinessCore(plan: ResearchPlan): BusinessCore {
    return {
      name: this.extractBusinessName(plan),
      sector: plan.businessDefinition.sector,
      location: plan.businessDefinition.location,
      description: plan.businessDefinition.concept,
      businessModel: plan.businessDefinition.businessModel || "Não especificado",
      estimatedBudget: plan.businessDefinition.estimatedBudget,
      targetAudience: plan.businessDefinition.targetAudience,
    };
  }

  private extractBusinessName(plan: ResearchPlan): string {
    const nameClaim = evidenceStore.getAllClaims().find(
      (c) => c.statement.toLowerCase().includes("nome") || c.statement.toLowerCase().includes("name")
    );
    if (nameClaim && typeof nameClaim.value === "string") {
      return nameClaim.value;
    }
    return `${plan.businessDefinition.sector} em ${plan.businessDefinition.location}`;
  }

  private synthesizeMarket(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>,
    minConfidence: number
  ): MarketAnalysis {
    const marketClaims = this.filterClaimsByField(claims, ["market_size", "tamanho", "TAM", "SAM", "SOM"]);
    const trendsClaims = this.filterClaimsByField(claims, ["trend", "tendência"]);
    const demandClaims = this.filterClaimsByField(claims, ["demanda", "demand"]);

    const marketSizeClaim = marketClaims
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)[0];

    const size = marketSizeClaim
      ? {
          total: Number(marketSizeClaim.value) || 0,
          unit: marketSizeClaim.unit || "BRL",
          year: parseInt(marketSizeClaim.period || new Date().getFullYear().toString()),
          sourceIds: this.getSourceIdsFromClaim(marketSizeClaim),
          origin: marketSizeClaim.origin,
          confidence: marketSizeClaim.confidence,
        }
      : {
          total: 0,
          unit: "BRL",
          year: new Date().getFullYear(),
          sourceIds: [],
          origin: "ESTIMATED" as const,
          confidence: 0,
        };

    const trends: MarketAnalysis["trends"] = trendsClaims
      .filter((c) => c.confidence >= minConfidence && typeof c.value === "string")
      .map((c, i) => ({
        id: generateId("trend"),
        description: String(c.value),
        impact: (c.statement.toLowerCase().includes("alto") ? "high" : c.statement.toLowerCase().includes("baixo") ? "low" : "medium") as "high" | "medium" | "low",
        timeframe: c.period || "2024-2026",
        sourceIds: this.getSourceIdsFromClaim(c),
        confidence: c.confidence,
      }));

    const demandClaim = demandClaims[0];
    const demand = demandClaim
      ? {
          description: String(demandClaim.value),
          drivers: this.extractList(demandClaim, ["driver"]),
          barriers: this.extractList(demandClaim, ["barrier"]),
          sourceIds: this.getSourceIdsFromClaim(demandClaim),
          confidence: demandClaim.confidence,
        }
      : {
          description: "Demanda não caracterizada com evidência suficiente",
          drivers: [],
          barriers: [],
          sourceIds: [],
          confidence: 0,
        };

    return { size, trends, demand };
  }

  private synthesizeCustomer(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>,
    minConfidence: number
  ): CustomerAnalysis {
    const segments: CustomerAnalysis["segments"] = [];
    const personas: CustomerAnalysis["personas"] = [];
    const journey: CustomerAnalysis["journey"] = [];
    const painPoints: string[] = [];
    const buyingBehavior: CustomerAnalysis["buyingBehavior"] = {
      decisionProcess: "",
      frequency: "",
      averageTicket: 0,
      paymentPreferences: [],
      sourceIds: [],
      confidence: 0,
    };

    const segmentClaims = this.filterClaimsByField(claims, ["segment", "cliente", "target"]);
    const personaClaims = this.filterClaimsByField(claims, ["persona", "perfil"]);
    const ticketClaims = this.filterClaimsByField(claims, ["ticket", "valor_medio"]);

    for (let i = 0; i < Math.min(segmentClaims.length, 3); i++) {
      const c = segmentClaims[i];
      if (c.confidence < minConfidence) continue;
      segments.push({
        id: generateId("seg"),
        name: typeof c.value === "string" ? c.value : `Segmento ${i + 1}`,
        description: c.statement,
        demographics: this.extractDemographics(c),
        behaviors: this.extractList(c, ["comportamento"]),
        needs: this.extractList(c, ["need"]),
        sourceIds: this.getSourceIdsFromClaim(c),
        confidence: c.confidence,
      });
    }

    for (let i = 0; i < Math.min(personaClaims.length, 3); i++) {
      const c = personaClaims[i];
      if (c.confidence < minConfidence) continue;
      personas.push({
        id: generateId("persona"),
        name: typeof c.value === "string" ? c.value : `Persona ${i + 1}`,
        age: "Não especificado",
        profession: "Não especificado",
        education: "Não especificado",
        income: "Não especificado",
        habits: c.statement,
        painPoints: this.extractList(c, ["dor"]),
        goals: this.extractList(c, ["objetivo", "goal"]),
        informationSources: this.extractList(c, ["info_source"]),
        sourceIds: this.getSourceIdsFromClaim(c),
        confidence: c.confidence,
      });
    }

    const ticketClaim = ticketClaims
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)[0];

    if (ticketClaim) {
      buyingBehavior.averageTicket = Number(ticketClaim.value) || 0;
      buyingBehavior.sourceIds = this.getSourceIdsFromClaim(ticketClaim);
      buyingBehavior.confidence = ticketClaim.confidence;
      buyingBehavior.decisionProcess = "Não caracterizado";
      buyingBehavior.frequency = "Não caracterizado";
      buyingBehavior.paymentPreferences = [];
    }

    return { segments, personas, journey, painPoints, buyingBehavior };
  }

  private synthesizeCompetition(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>,
    minConfidence: number
  ): CompetitionAnalysis {
    const competitorClaims = this.filterClaimsByField(claims, ["concorrente", "competitor", "competição"]);

    const competitors: CompetitionAnalysis["competitors"] = [];
    for (const c of competitorClaims.slice(0, 10)) {
      if (c.confidence < minConfidence || typeof c.value !== "string") continue;
      competitors.push({
        id: generateId("comp"),
        name: c.value,
        type: "direct",
        strengths: [],
        weaknesses: [],
        pricing: "Não caracterizado",
        differentiators: [],
        sourceIds: this.getSourceIdsFromClaim(c),
        confidence: c.confidence,
      });
    }

    return {
      competitors,
      competitiveLandscape: "Não caracterizado com evidência suficiente",
      marketGaps: [],
      sourceIds: competitors.flatMap((c) => c.sourceIds),
    };
  }

  private synthesizeValueProposition(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): ValueProposition {
    return {
      customerJobs: [],
      pains: [],
      gains: [],
      productsServices: [],
      painRelievers: [],
      gainCreators: [],
      sourceIds: [],
    };
  }

  private synthesizeSWOT(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): SwotAnalysis {
    return {
      strengths: [],
      weaknesses: [],
      opportunities: [],
      threats: [],
      strategies: {
        development: "A definir após pesquisa",
        maintenance: "A definir após pesquisa",
        survival: "A definir após pesquisa",
      },
      sourceIds: [],
    };
  }

  private synthesizeMarketing(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): MarketingPlan {
    return {
      channels: [],
      budget: 0,
      kpis: [],
      sourceIds: [],
    };
  }

  private synthesizeOperations(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): OperationsPlan {
    return {
      processes: [],
      resources: [],
      keyPartners: [],
      sourceIds: [],
    };
  }

  private synthesizeFinancials(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>,
    minConfidence: number
  ): FinancialModel {
    const capexClaims = this.filterClaimsByField(claims, ["capex", "investimento_inicial"]);
    const opexClaims = this.filterClaimsByField(claims, ["opex", "custo_operacional"]);
    const revenueClaims = this.filterClaimsByField(claims, ["revenue", "faturamento"]);

    const capexClaim = capexClaims
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)[0];

    const opexClaim = opexClaims
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)[0];

    const revenueClaim = revenueClaims
      .filter((c) => c.confidence >= minConfidence)
      .sort((a, b) => b.confidence - a.confidence)[0];

    return {
      investment: {
        fixed: [],
        preOperational: [],
        initialStock: [],
        workingCapital: 0,
        total: capexClaim ? Number(capexClaim.value) || 0 : plan.businessDefinition.estimatedBudget,
        sourceIds: capexClaim ? this.getSourceIdsFromClaim(capexClaim) : [],
      },
      costs: {
        fixed: [],
        variable: [],
        monthlyTotal: opexClaim ? Number(opexClaim.value) || 0 : 0,
        sourceIds: opexClaim ? this.getSourceIdsFromClaim(opexClaim) : [],
      },
      revenue: {
        products: [],
        monthlyTotal: revenueClaim ? Number(revenueClaim.value) || 0 : 0,
        sourceIds: revenueClaim ? this.getSourceIdsFromClaim(revenueClaim) : [],
      },
      projections: [],
      sourceIds: [
        ...(capexClaim ? this.getSourceIdsFromClaim(capexClaim) : []),
        ...(opexClaim ? this.getSourceIdsFromClaim(opexClaim) : []),
        ...(revenueClaim ? this.getSourceIdsFromClaim(revenueClaim) : []),
      ],
    };
  }

  private synthesizeViability(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): ViabilityAnalysis {
    return {
      breakEven: {
        monthlyRevenue: 0,
        monthlyCosts: 0,
        months: 0,
        origin: "ESTIMATED",
        sourceIds: [],
      },
      roi: {
        percentage: 0,
        timeframe: "12 meses",
        origin: "ESTIMATED",
        sourceIds: [],
      },
      payback: {
        months: 0,
        origin: "ESTIMATED",
        sourceIds: [],
      },
      riskFactors: [],
      sourceIds: [],
    };
  }

  private synthesizeRegulatory(
    plan: ResearchPlan,
    claims: Map<string, Claim[]>
  ): RegulatoryAnalysis {
    return {
      cnae: {
        code: "Não definido",
        description: "Não definido",
        confidence: 0,
        sourceIds: [],
      },
      taxRegime: "Simples Nacional (recomendação padrão)",
      licenses: [],
      compliance: [],
      sourceIds: [],
    };
  }

  private buildProvenance(context: SynthesisContext): ProvenanceMap {
    const fieldToClaim: Record<string, string> = {};
    const claimToEvidence: Record<string, string[]> = {};
    const evidenceToSource: Record<string, string> = {};

    for (const claim of context.claims) {
      fieldToClaim[claim.statement] = claim.id;
      claimToEvidence[claim.id] = claim.evidenceIds;
    }

    for (const evidence of context.evidence) {
      evidenceToSource[evidence.id] = evidence.sourceId;
    }

    return { fieldToClaim, claimToEvidence, evidenceToSource };
  }

  private groupClaimsByField(claims: Claim[]): Map<string, Claim[]> {
    const groups = new Map<string, Claim[]>();
    for (const claim of claims) {
      const key = this.extractFieldKey(claim);
      const existing = groups.get(key) || [];
      existing.push(claim);
      groups.set(key, existing);
    }
    return groups;
  }

  private filterClaimsByField(claims: Map<string, Claim[]>, keywords: string[]): Claim[] {
    const result: Claim[] = [];
    for (const [key, claimList] of claims.entries()) {
      if (keywords.some((k) => key.toLowerCase().includes(k.toLowerCase()))) {
        result.push(...claimList);
      }
    }
    return result;
  }

  private extractFieldKey(claim: Claim): string {
    const statement = claim.statement.toLowerCase();
    const match = statement.match(/^([a-z_]+):/);
    if (match) return match[1];
    return statement.split(/\s+/).slice(0, 3).join("_");
  }

  private getSourceIdsFromClaim(claim: Claim): string[] {
    const sourceIds: string[] = [];
    for (const evidenceId of claim.evidenceIds) {
      const evidence = evidenceStore.getEvidence(evidenceId);
      if (evidence) {
        sourceIds.push(evidence.sourceId);
      }
    }
    return [...new Set(sourceIds)];
  }

  private extractDemographics(claim: Claim): { ageRange?: string; incomeRange?: string } {
    const text = (typeof claim.value === "string" ? claim.value : claim.statement).toLowerCase();
    const demo: { ageRange?: string; incomeRange?: string } = {};

    const ageMatch = text.match(/(\d+)\s*(?:a|até|-)\s*(\d+)\s*anos?/);
    if (ageMatch) demo.ageRange = `${ageMatch[1]}-${ageMatch[2]} anos`;

    const incomeMatch = text.match(/(?:renda|income).{0,20}?(\d+k?\s*(?:a|até|-)\s*\d+k?)/);
    if (incomeMatch) demo.incomeRange = incomeMatch[1];

    return demo;
  }

  private extractList(claim: Claim, fieldNames: string | string[]): string[] {
    const text = claim.statement;
    const names = Array.isArray(fieldNames) ? fieldNames : [fieldNames];
    for (const fieldName of names) {
      const pattern = new RegExp(`${fieldName}[s]?[:\\s]+([^.;]+)`, "i");
      const match = text.match(pattern);
      if (match) {
        return match[1].split(/[,;]/).map((s) => s.trim()).filter(Boolean);
      }
    }
    return [];
  }
}

export const researchSynthesizer = new ResearchSynthesizer();