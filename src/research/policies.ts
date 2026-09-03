import {
  ResearchCategory,
  DataOrigin,
  SourceType,
  ContradictionStatus,
  GapSeverity,
  ResearchSufficiency,
  ResearchGap,
  Contradiction,
  Claim,
  Source,
  Evidence,
  ResearchTask,
} from "./types";

export const RESEARCH_POLICIES = {
  iterations: {
    minimum: 2,
    target: 3,
    maximum: 7,
  },
  sufficiency: {
    globalThreshold: 0.75,
    criticalGapThreshold: 0.85,
    categoryWeights: {
      market: 0.2,
      customer: 0.15,
      competition: 0.15,
      pricing: 0.1,
      operations: 0.1,
      financial: 0.15,
      regulatory: 0.1,
      strategy: 0.05,
    } as Record<ResearchCategory, number>,
  },
  execution: {
    maxParallelTasks: 4,
    defaultTimeoutMs: 60000,
    retryAttempts: 2,
    retryBackoffMs: 2000,
  },
  sources: {
    minSourcesPerClaim: 2,
    preferredTypes: [
      "official_gov",
      "official_org",
      "academic",
      "industry_report",
    ] as SourceType[],
    reliabilityThreshold: 0.6,
    deduplication: {
      enabled: true,
      similarityThreshold: 0.85,
    },
  },
  evidence: {
    minConfidence: 0.5,
    maxAgeDays: 730,
    requireProvenance: true,
  },
  claims: {
    neverInventFinancials: true,
    neverPresentEstimateAsFact: true,
    requireOrigin: true,
    trackCalculations: true,
  },
  contradictions: {
    autoResolve: false,
    resolutionPriority: [
      "resolved_methodological",
      "resolved_primary",
      "resolved_recent",
      "resolved_specific",
    ] as ContradictionStatus[],
  },
  gaps: {
    criticalSeverityCreatesTasks: true,
    maxNewTasksPerIteration: 5,
  },
  financials: {
    forbiddenHardcodedRatios: [
      { name: "opexRatio", value: 0.22, field: "opexMensal" },
      { name: "revenueRatio", value: 0.45, field: "faturamentoEstimadoMensal" },
      { name: "ticketMedioDefault", value: 160, field: "ticketMedio" },
      { name: "breakEvenDefault", value: 14, field: "pontoEquilibrioMeses" },
    ],
    requireSourceFor: [
      "capexTotal",
      "opexMensal",
      "faturamentoEstimadoMensal",
      "ticketMedio",
      "pontoEquilibrioMeses",
      "margemLucro",
      "marketSize",
    ],
  },
  pnbox: {
    useSchemaCatalogOnly: true,
    validateBeforeExecution: true,
    neverDuplicateSchemas: true,
  },
} as const;

export type ResearchPolicies = typeof RESEARCH_POLICIES;

export function getSufficiencyThreshold(category: ResearchCategory): number {
  const weights = RESEARCH_POLICIES.sufficiency.categoryWeights;
  return weights[category] * RESEARCH_POLICIES.sufficiency.globalThreshold;
}

export function isForbiddenFinancialRatio(field: string, value: number): boolean {
  return RESEARCH_POLICIES.financials.forbiddenHardcodedRatios.some(
    (r) => r.field === field && Math.abs(r.value - value) < 0.01
  );
}

export function isFinancialFieldRequiringSource(field: string): boolean {
  return RESEARCH_POLICIES.financials.requireSourceFor.includes(field);
}

export function calculateSufficiency(
  claimsByCategory: Record<ResearchCategory, Claim[]>,
  gaps: ResearchGap[],
  contradictions: Contradiction[]
): ResearchSufficiency {
  const categories: ResearchCategory[] = [
    "market",
    "customer",
    "competition",
    "pricing",
    "operations",
    "financial",
    "regulatory",
    "strategy",
  ];

  const byCategory: Record<ResearchCategory, number> = {} as Record<
    ResearchCategory,
    number
  >;

  for (const cat of categories) {
    const claims = claimsByCategory[cat] || [];
    const catGaps = gaps.filter((g) => g.severity === "critical" || g.severity === "high");
    const catContradictions = contradictions.filter((c) => c.status === "unresolved");

    let score = 0;
    if (claims.length > 0) {
      const avgConfidence =
        claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
      const coverage = Math.min(1, claims.length / 5);
      score = avgConfidence * 0.7 + coverage * 0.3;
    }

    const gapPenalty = catGaps.length * 0.15;
    const contradictionPenalty = catContradictions.length * 0.1;

    byCategory[cat] = Math.max(0, Math.min(1, score - gapPenalty - contradictionPenalty));
  }

  const weights = RESEARCH_POLICIES.sufficiency.categoryWeights;
  let overall = 0;
  for (const cat of categories) {
    overall += byCategory[cat] * weights[cat];
  }

  const criticalGaps = gaps.filter((g) => g.severity === "critical");
  const canConclude =
    overall >= RESEARCH_POLICIES.sufficiency.globalThreshold &&
    criticalGaps.length === 0;

  return {
    overall: Math.round(overall * 100) / 100,
    byCategory,
    criticalGaps,
    minimumIterations: RESEARCH_POLICIES.iterations.minimum,
    targetIterations: RESEARCH_POLICIES.iterations.target,
    maximumIterations: RESEARCH_POLICIES.iterations.maximum,
    canConclude,
  };
}

export function validateClaimOrigin(
  claim: Claim,
  fieldName: string
): { valid: boolean; errors: string[] } {
  const errors: string[] = [];

  if (RESEARCH_POLICIES.claims.neverInventFinancials && isFinancialFieldRequiringSource(fieldName)) {
    if (claim.origin === "ESTIMATED" || claim.origin === "INFERRED") {
      if (!claim.sourceIds || claim.sourceIds.length === 0) {
        errors.push(
          `Campo financeiro "${fieldName}" requer origem DIRECT_SOURCE ou CALCULATED com sources, mas tem origem ${claim.origin} sem fontes`
        );
      }
    }
  }

  if (RESEARCH_POLICIES.claims.neverPresentEstimateAsFact) {
    if (claim.origin === "ESTIMATED" && claim.confidence > 0.7) {
      errors.push(
        `Claim com origem ESTIMATED não pode ter confiança > 0.7 (atual: ${claim.confidence})`
      );
    }
  }

  if (isForbiddenFinancialRatio(fieldName, Number(claim.value))) {
    errors.push(
      `Valor ${claim.value} para "${fieldName}" corresponde a ratio hardcoded proibido`
    );
  }

  return { valid: errors.length === 0, errors };
}

export function getSourceReliability(type: SourceType): number {
  const baseReliability: Record<SourceType, number> = {
    official_gov: 0.98,
    official_org: 0.92,
    academic: 0.88,
    industry_report: 0.82,
    corporate: 0.7,
    specialized_press: 0.65,
    blog: 0.4,
    secondary: 0.3,
  };
  return baseReliability[type] || 0.5;
}

export const SOURCE_TYPE_KEYWORDS: Record<SourceType, string[]> = {
  official_gov: ["gov.br", "ibge.gov", "sebrae.com.br", "receita.fazenda", "inpi.gov"],
  official_org: ["sebrae", "fiesp", "fiergs", "confederação", "associação", "sindicato"],
  academic: ["usp.br", "unicamp.br", "ufrgs.br", "scielo", "periodicos.capes", "doi.org"],
  industry_report: ["relatório", "estudo de mercado", "pesquisa setorial", "análise setorial"],
  corporate: ["investidor", "earnings", "resultados", "anual", "balanço", "demonstração"],
  specialized_press: ["valor econômico", "exame", "época negócios", "istoé dinheiro", "conjur"],
  blog: ["medium.com", "blogspot", "wordpress", "linkedin.com/pulse"],
  secondary: ["wikipedia", "quora", "reddit", "yahoo respostas"],
};

export function classifySourceType(url: string, title: string): SourceType {
  const text = `${url} ${title}`.toLowerCase();

  for (const [type, keywords] of Object.entries(SOURCE_TYPE_KEYWORDS)) {
    if (keywords.some((k) => text.includes(k.toLowerCase()))) {
      return type as SourceType;
    }
  }

  return "secondary";
}