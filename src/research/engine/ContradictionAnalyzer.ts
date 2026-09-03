import { Claim, Contradiction, ContradictionStatus, Source } from "../types";
import { evidenceStore } from "../evidence";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

interface ComparableClaim {
  claim: Claim;
  numericValue?: number;
  unit?: string;
  period?: string;
}

export class ContradictionAnalyzer {
  analyze(claims: Claim[]): Contradiction[] {
    const contradictions: Contradiction[] = [];
    const groupedClaims = this.groupComparableClaims(claims);

    for (const [key, claimList] of groupedClaims.entries()) {
      if (claimList.length < 2) continue;

      const pairs = this.getPairs(claimList);
      for (const [a, b] of pairs) {
        const contradiction = this.compareClaims(a, b);
        if (contradiction) {
          contradictions.push(contradiction);
        }
      }
    }

    return contradictions;
  }

  private groupComparableClaims(claims: Claim[]): Map<string, ComparableClaim[]> {
    const groups = new Map<string, ComparableClaim[]>();

    for (const claim of claims) {
      const key = this.extractComparisonKey(claim);
      if (!key) continue;

      const numericValue = this.extractNumericValue(claim);
      const comparable: ComparableClaim = {
        claim,
        numericValue,
        unit: claim.unit,
        period: claim.period,
      };

      const existing = groups.get(key) || [];
      existing.push(comparable);
      groups.set(key, existing);
    }

    return groups;
  }

  private extractComparisonKey(claim: Claim): string | null {
    const statement = claim.statement.toLowerCase();

    const financialKeys = [
      "market_size", "tamanho_mercado", "tam",
      "capex", "investimento_inicial",
      "opex", "custo_operacional", "custo_mensal",
      "revenue", "faturamento", "receita",
      "ticket_medio", "ticket", "valor_medio",
      "margin", "margem", "margem_lucro",
      "break_even", "ponto_equilibrio", "payback",
      "growth_rate", "crescimento", "cagr",
      "market_share", "participacao_mercado",
      "cac", "custo_aquisicao",
      "ltv", "lifetime_value",
    ];

    for (const key of financialKeys) {
      if (statement.includes(key)) {
        return key;
      }
    }

    const words = statement.split(/\s+/).filter((w) => w.length > 3).slice(0, 3).join("_");
    return words || null;
  }

  private extractNumericValue(claim: Claim): number | undefined {
    if (typeof claim.value === "number") return claim.value;
    if (typeof claim.value === "string") {
      const match = claim.value.match(/(\d+(?:[.,]\d+)?)/);
      if (match) return parseFloat(match[1].replace(",", "."));
    }
    return undefined;
  }

  private getPairs<T>(arr: T[]): Array<[T, T]> {
    const pairs: Array<[T, T]> = [];
    for (let i = 0; i < arr.length; i++) {
      for (let j = i + 1; j < arr.length; j++) {
        pairs.push([arr[i], arr[j]]);
      }
    }
    return pairs;
  }

  private compareClaims(a: ComparableClaim, b: ComparableClaim): Contradiction | null {
    if (a.numericValue === undefined || b.numericValue === undefined) {
      return this.compareQualitative(a, b);
    }

    if (!this.unitsCompatible(a, b)) return null;
    if (!this.periodsCompatible(a, b)) return null;

    const diff = Math.abs(a.numericValue - b.numericValue);
    const avg = (a.numericValue + b.numericValue) / 2;
    const relativeDiff = avg > 0 ? diff / avg : 0;

    if (relativeDiff < 0.1) return null;

    const sourceA = evidenceStore.getSource(a.claim.evidenceIds[0]);
    const sourceB = evidenceStore.getSource(b.claim.evidenceIds[0]);

    return {
      id: generateId("ctr"),
      claimA: a.claim,
      claimB: b.claim,
      sources: [sourceA, sourceB].filter(Boolean) as Source[],
      difference: `${a.claim.statement} (${a.numericValue} ${a.unit || ""}) vs ${b.claim.statement} (${b.numericValue} ${b.unit || ""}) - diferença relativa: ${(relativeDiff * 100).toFixed(1)}%`,
      possibleReason: this.inferReason(a, b, relativeDiff),
      status: "unresolved",
      confidence: Math.min(a.claim.confidence, b.claim.confidence),
      createdAt: new Date().toISOString(),
    };
  }

  private compareQualitative(a: ComparableClaim, b: ComparableClaim): Contradiction | null {
    const textA = a.claim.statement.toLowerCase();
    const textB = b.claim.statement.toLowerCase();

    const contradictions = [
      { a: "cresce", b: "cai" },
      { a: "aumenta", b: "diminui" },
      { a: "alto", b: "baixo" },
      { a: "caro", b: "barato" },
      { a: "forte", b: "fraco" },
      { a: "oportunidade", b: "ameaça" },
      { a: "força", b: "fraqueza" },
      { a: "sim", b: "não" },
      { a: "obrigatório", b: "opcional" },
    ];

    for (const { a: wordA, b: wordB } of contradictions) {
      if (textA.includes(wordA) && textB.includes(wordB)) {
        const sourceA = evidenceStore.getSource(a.claim.evidenceIds[0]);
        const sourceB = evidenceStore.getSource(b.claim.evidenceIds[0]);

        return {
          id: generateId("ctr"),
          claimA: a.claim,
          claimB: b.claim,
          sources: [sourceA, sourceB].filter(Boolean) as Source[],
          difference: `Contradição qualitativa: "${a.claim.statement}" vs "${b.claim.statement}"`,
          possibleReason: "Fontes com perspectivas ou metodologias diferentes",
          status: "unresolved",
          confidence: Math.min(a.claim.confidence, b.claim.confidence) * 0.8,
          createdAt: new Date().toISOString(),
        };
      }
    }

    return null;
  }

  private unitsCompatible(a: ComparableClaim, b: ComparableClaim): boolean {
    if (!a.unit || !b.unit) return true;

    const normalize = (u: string) => u.toLowerCase().replace(/[^a-z%]/g, "");
    return normalize(a.unit) === normalize(b.unit);
  }

  private periodsCompatible(a: ComparableClaim, b: ComparableClaim): boolean {
    if (!a.period || !b.period) return true;
    return a.period === b.period;
  }

  private inferReason(a: ComparableClaim, b: ComparableClaim, relativeDiff: number): string {
    const sourceA = evidenceStore.getSource(a.claim.evidenceIds[0]);
    const sourceB = evidenceStore.getSource(b.claim.evidenceIds[0]);

    const reasons: string[] = [];

    if (sourceA && sourceB) {
      if (sourceA.publishedAt && sourceB.publishedAt) {
        const dateA = new Date(sourceA.publishedAt).getTime();
        const dateB = new Date(sourceB.publishedAt).getTime();
        if (Math.abs(dateA - dateB) > 365 * 24 * 60 * 60 * 1000) {
          reasons.push("Fontes de períodos diferentes");
        }
      }

      if (sourceA.type !== sourceB.type) {
        reasons.push(`Tipos de fonte diferentes: ${sourceA.type} vs ${sourceB.type}`);
      }

      if (sourceA.publisher !== sourceB.publisher) {
        reasons.push(`Publicadores diferentes: ${sourceA.publisher} vs ${sourceB.publisher}`);
      }
    }

    if (relativeDiff > 0.5) {
      reasons.push("Diferença maior que 50% - possível erro metodológico ou definições diferentes");
    } else if (relativeDiff > 0.2) {
      reasons.push("Diferença entre 20-50% - possíveis escopos ou amostras diferentes");
    }

    return reasons.join("; ") || "Motivo não identificado";
  }

  resolveContradiction(
    contradiction: Contradiction,
    strategy: "primary" | "recent" | "specific" | "methodological" | "average" | "manual",
    manualResolution?: string
  ): { status: ContradictionStatus; resolution: string } {
    const sourceA = evidenceStore.getSource(contradiction.claimA.evidenceIds[0]);
    const sourceB = evidenceStore.getSource(contradiction.claimB.evidenceIds[0]);

    switch (strategy) {
      case "primary": {
        const primary = [sourceA, sourceB].find((s) => s?.type === "official_gov" || s?.type === "official_org");
        if (primary) {
          return {
            status: "resolved_primary",
            resolution: `Fonte primária escolhida: ${primary.publisher} (${primary.type})`,
          };
        }
        break;
      }

      case "recent": {
        if (sourceA?.publishedAt && sourceB?.publishedAt) {
          const recent = new Date(sourceA.publishedAt) > new Date(sourceB.publishedAt) ? sourceA : sourceB;
          return {
            status: "resolved_recent",
            resolution: `Fonte mais recente escolhida: ${recent.publisher} (${recent.publishedAt})`,
          };
        }
        break;
      }

      case "specific": {
        const specific = [sourceA, sourceB].find((s) => s?.type === "academic" || s?.type === "industry_report");
        if (specific) {
          return {
            status: "resolved_specific",
            resolution: `Fonte mais específica/especializada: ${specific.publisher} (${specific.type})`,
          };
        }
        break;
      }

      case "methodological": {
        if (sourceA && sourceB) {
          const reliabilityDiff = (sourceA.reliability || 0) - (sourceB.reliability || 0);
          if (Math.abs(reliabilityDiff) > 0.1) {
            const better = reliabilityDiff > 0 ? sourceA : sourceB;
            return {
              status: "resolved_methodological",
              resolution: `Fonte com maior confiabilidade metodológica: ${better.publisher} (reliability: ${better.reliability})`,
            };
          }
        }
        break;
      }

      case "average": {
        if (contradiction.claimA.value !== undefined && contradiction.claimB.value !== undefined) {
          const avg = (Number(contradiction.claimA.value) + Number(contradiction.claimB.value)) / 2;
          return {
            status: "partial",
            resolution: `Média das duas fontes: ${avg.toFixed(2)}`,
          };
        }
        break;
      }

      case "manual": {
        return {
          status: "partial",
          resolution: manualResolution || "Resolução manual aplicada",
        };
      }
    }

    return { status: "unresolved", resolution: "Não foi possível resolver automaticamente" };
  }

  getContradictionsByStatus(contradictions: Contradiction[], status: ContradictionStatus): Contradiction[] {
    return contradictions.filter((c) => c.status === status);
  }

  getUnresolvedCount(contradictions: Contradiction[]): number {
    return contradictions.filter((c) => c.status === "unresolved").length;
  }

  getCriticalContradictions(contradictions: Contradiction[]): Contradiction[] {
    return contradictions.filter((c) => {
      const financialFields = ["capex", "opex", "revenue", "ticket", "margin", "break_even", "market_size"];
      return financialFields.some((f) =>
        c.claimA.statement.toLowerCase().includes(f) || c.claimB.statement.toLowerCase().includes(f)
      );
    });
  }
}

export const contradictionAnalyzer = new ContradictionAnalyzer();