import { ResearchPlan, ResearchSufficiency, ResearchCategory, ResearchGap, Contradiction, Claim } from "../types";
import { RESEARCH_POLICIES, calculateSufficiency } from "../policies";
import { evidenceStore } from "../evidence";

export class ResearchSufficiencyAnalyzer {
  analyze(plan: ResearchPlan, gaps: ResearchGap[], contradictions: Contradiction[]): ResearchSufficiency {
    const claims = evidenceStore.getAllClaims();
    const claimsByCategory = this.groupClaimsByCategory(claims, plan);

    const baseSufficiency = calculateSufficiency(claimsByCategory, gaps, contradictions);

    const iterationBonus = Math.min(0.05 * (plan.iterations.length - 1), 0.15);
    const evidenceBonus = this.calculateEvidenceBonus(claims);
    const sourceDiversityBonus = this.calculateSourceDiversityBonus();

    const adjustedOverall = Math.min(1, baseSufficiency.overall + iterationBonus + evidenceBonus + sourceDiversityBonus);

    const adjustedByCategory: Record<ResearchCategory, number> = {} as Record<ResearchCategory, number>;
    for (const cat of Object.keys(baseSufficiency.byCategory) as ResearchCategory[]) {
      adjustedByCategory[cat] = Math.min(1, baseSufficiency.byCategory[cat] + iterationBonus * 0.5);
    }

    const criticalGaps = gaps.filter((g) => g.severity === "critical");
    const unresolvedContradictions = contradictions.filter((c) => c.status === "unresolved");
    const criticalContradictions = this.getCriticalContradictions(contradictions);

    const canConclude =
      adjustedOverall >= RESEARCH_POLICIES.sufficiency.globalThreshold &&
      criticalGaps.length === 0 &&
      criticalContradictions.length === 0 &&
      plan.iterations.length >= RESEARCH_POLICIES.iterations.minimum;

    return {
      overall: Math.round(adjustedOverall * 100) / 100,
      byCategory: adjustedByCategory,
      criticalGaps,
      minimumIterations: RESEARCH_POLICIES.iterations.minimum,
      targetIterations: RESEARCH_POLICIES.iterations.target,
      maximumIterations: RESEARCH_POLICIES.iterations.maximum,
      canConclude,
    };
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

  private calculateEvidenceBonus(claims: Claim[]): number {
    if (claims.length === 0) return 0;
    const avgEvidencePerClaim = claims.reduce((sum, c) => sum + c.evidenceIds.length, 0) / claims.length;
    return Math.min(0.1, (avgEvidencePerClaim - 1) * 0.03);
  }

  private calculateSourceDiversityBonus(): number {
    const sources = evidenceStore.getAllSources();
    if (sources.length === 0) return 0;

    const types = new Set(sources.map((s) => s.type));
    const publishers = new Set(sources.map((s) => s.publisher));

    let bonus = 0;
    if (types.size >= 4) bonus += 0.05;
    if (publishers.size >= 5) bonus += 0.03;
    if (sources.some((s) => s.type === "official_gov")) bonus += 0.02;
    if (sources.some((s) => s.type === "academic")) bonus += 0.02;

    return bonus;
  }

  private getCriticalContradictions(contradictions: Contradiction[]): Contradiction[] {
    const financialFields = ["capex", "opex", "revenue", "faturamento", "ticket", "margem", "break_even", "payback", "market_size", "tamanho"];
    return contradictions.filter((c) =>
      financialFields.some((f) =>
        c.claimA.statement.toLowerCase().includes(f) || c.claimB.statement.toLowerCase().includes(f)
      )
    );
  }

  getCategoryStatus(
    sufficiency: ResearchSufficiency,
    category: ResearchCategory
  ): "sufficient" | "needs_work" | "critical" {
    const score = sufficiency.byCategory[category] || 0;
    const threshold = RESEARCH_POLICIES.sufficiency.categoryWeights[category] * RESEARCH_POLICIES.sufficiency.globalThreshold;

    if (score >= threshold * 1.2) return "sufficient";
    if (score >= threshold * 0.7) return "needs_work";
    return "critical";
  }

  getMissingEvidenceSummary(gaps: ResearchGap[]): Record<ResearchCategory, string[]> {
    const summary: Record<ResearchCategory, string[]> = {
      market: [], customer: [], competition: [], pricing: [],
      operations: [], financial: [], regulatory: [], strategy: [],
    };

    for (const gap of gaps) {
      if (gap.severity === "critical" || gap.severity === "high") {
        const cat = this.inferCategoryFromGap(gap);
        if (cat && summary[cat] && !summary[cat].includes(gap.description)) {
          summary[cat].push(gap.description);
        }
      }
    }

    return summary;
  }

  private inferCategoryFromGap(gap: ResearchGap): ResearchCategory | null {
    if (gap.questionId && Object.keys(summary).includes(gap.questionId)) {
      return gap.questionId as ResearchCategory;
    }

    const text = gap.description.toLowerCase();
    if (text.includes("mercado") || text.includes("tamanho") || text.includes("crescimento")) return "market";
    if (text.includes("cliente") || text.includes("persona") || text.includes("jornada")) return "customer";
    if (text.includes("concorrente") || text.includes("competitiv")) return "competition";
    if (text.includes("preço") || text.includes("precifica") || text.includes("ticket")) return "pricing";
    if (text.includes("processo") || text.includes("operac") || text.includes("recurso")) return "operations";
    if (text.includes("financeir") || text.includes("capex") || text.includes("opex") || text.includes("faturament")) return "financial";
    if (text.includes("regulat") || text.includes("cnae") || text.includes("licen")) return "regulatory";
    if (text.includes("estratég") || text.includes("risco") || text.includes("marketing")) return "strategy";

    return null;
  }

  generateRecommendations(sufficiency: ResearchSufficiency, gaps: ResearchGap[], plan: ResearchPlan): string[] {
    const recommendations: string[] = [];

    if (!sufficiency.canConclude) {
      if (sufficiency.criticalGaps.length > 0) {
        recommendations.push(`Resolver ${sufficiency.criticalGaps.length} gap(s) crítico(s) antes de concluir`);
      }

      const lowCategories = Object.entries(sufficiency.byCategory)
        .filter(([, score]) => score < 0.5)
        .map(([cat]) => cat);

      if (lowCategories.length > 0) {
        recommendations.push(`Aprofundar pesquisa em: ${lowCategories.join(", ")}`);
      }

      if (plan.iterations.length < RESEARCH_POLICIES.iterations.target) {
        recommendations.push(`Executar mais ${RESEARCH_POLICIES.iterations.target - plan.iterations.length} iteração(ões) de pesquisa`);
      }
    } else {
      recommendations.push("Pesquisa suficiente para síntese. Proceder com ResearchSynthesizer.");
    }

    return recommendations;
  }
}

export const researchSufficiency = new ResearchSufficiencyAnalyzer();