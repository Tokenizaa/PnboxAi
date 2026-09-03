import { EvidenceStore, evidenceStore } from "./EvidenceStore";
import {
  Source,
  Evidence,
  Claim,
  DataOrigin,
  ResearchCategory,
} from "../types";

export interface ExtractedDataPoint {
  field: string;
  value: unknown;
  unit?: string;
  period?: string;
  context?: string;
  confidence: number;
  excerpt: string;
}

export interface ExtractionResult {
  source: Source;
  dataPoints: ExtractedDataPoint[];
  rawContent: string;
}

export class EvidenceAnalyst {
  private store: EvidenceStore;

  constructor(store: EvidenceStore = evidenceStore) {
    this.store = store;
  }

  async processSource(
    url: string,
    title: string,
    publisher: string,
    content: string,
    category: ResearchCategory,
    questionId: string
  ): Promise<ExtractionResult> {
    const source = this.store.addSource({
      url,
      title,
      publisher,
      metadata: { category },
    } as Omit<Source, "id" | "reliability" | "type" | "retrievedAt"> & { reliability?: number });

    const dataPoints = await this.extractDataPoints(content, source, questionId, category);

    for (const dp of dataPoints) {
      const evidence = this.store.addEvidence({
        sourceId: source.id,
        excerpt: dp.excerpt,
        dataPoint: dp.value,
        unit: dp.unit,
        period: dp.period,
        context: dp.context,
        confidence: dp.confidence,
      });

      const claim = this.store.addClaim({
        questionId,
        statement: `${dp.field}: ${JSON.stringify(dp.value)}`,
        value: dp.value,
        unit: dp.unit,
        period: dp.period,
        evidenceIds: [evidence.id],
        origin: this.determineOrigin(dp, category),
        confidence: dp.confidence,
      });
    }

    return { source, dataPoints, rawContent: content };
  }

  private async extractDataPoints(
    content: string,
    source: Source,
    questionId: string,
    category: ResearchCategory
  ): Promise<ExtractedDataPoint[]> {
    const dataPoints: ExtractedDataPoint[] = [];

    const financialPatterns = [
      { field: "marketSize", regex: /(?:mercado|market|tamanho).{0,50}?(?:R\$\s*|US\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:bi|bilhões?|bi|bn|bilhao|billion)/gi, unit: "BRL", type: "number" },
      { field: "marketSize", regex: /(?:mercado|market|tamanho).{0,50}?(\d+(?:[.,]\d+)?)\s*(?:mi|milhões?|mn|million)/gi, unit: "BRL", type: "number" },
      { field: "capex", regex: /(?:investimento|capex|CAPEX).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:mi|mil|milhões?|k|m)/gi, unit: "BRL", type: "number" },
      { field: "opex", regex: /(?:custo|opex|OPEX|despesa).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:mi|mil|milhões?|k|m)\/mês/gi, unit: "BRL/month", type: "number" },
      { field: "revenue", regex: /(?:faturamento|receita|revenue).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:mi|mil|milhões?|k|m)\/mês/gi, unit: "BRL/month", type: "number" },
      { field: "ticketMedio", regex: /(?:ticket|tíquete|valor médio).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)/gi, unit: "BRL", type: "number" },
      { field: "growthRate", regex: /(?:crescimento|growth).{0,30}?(\d+(?:[.,]\d+)?)\s*%/gi, unit: "%", type: "number" },
      { field: "margin", regex: /(?:margem|margin).{0,30}?(\d+(?:[.,]\d+)?)\s*%/gi, unit: "%", type: "number" },
      { field: "breakEven", regex: /(?:ponto de equilíbrio|break.?even|payback).{0,30}?(\d+(?:[.,]\d+)?)\s*(?:meses?|months?)/gi, unit: "months", type: "number" },
    ];

    for (const pattern of financialPatterns) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        if (match[1]) {
          const rawValue = match[1].replace(",", ".");
          const value = parseFloat(rawValue);
          if (!isNaN(value)) {
            dataPoints.push({
              field: pattern.field,
              value,
              unit: pattern.unit,
              period: this.extractPeriod(content, match.index || 0),
              context: this.getContext(content, match.index || 0),
              confidence: this.calculateConfidence(source, category, pattern.field),
              excerpt: match[0].substring(0, 200),
            });
          }
        }
      }
    }

    const demographicPatterns = [
      { field: "ageRange", regex: /(?:idade|age|faixa etária).{0,30}?(\d+)\s*(?:a|até|-)\s*(\d+)\s*(?:anos?|years?)/gi, type: "string" },
      { field: "incomeRange", regex: /(?:renda|income|salário).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:a|até|-)\s*(?:R\$\s*)?(\d+(?:[.,]\d+)?)/gi, type: "string" },
    ];

    for (const pattern of demographicPatterns) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        if (match[1]) {
          dataPoints.push({
            field: pattern.field,
            value: match[2] ? `${match[1]}-${match[2]}` : match[1],
            unit: "",
            period: "",
            context: this.getContext(content, match.index || 0),
            confidence: this.calculateConfidence(source, category, pattern.field),
            excerpt: match[0].substring(0, 200),
          });
        }
      }
    }

    const competitorPatterns = [
      { field: "competitor", regex: /(?:concorrente|competitor|concorrência).{0,50}?([A-Z][a-zA-Z\s]{2,30})/gi, type: "string" },
    ];

    for (const pattern of competitorPatterns) {
      const matches = content.matchAll(pattern.regex);
      for (const match of matches) {
        if (match[1] && match[1].length > 3) {
          dataPoints.push({
            field: pattern.field,
            value: match[1].trim(),
            unit: "",
            period: "",
            context: this.getContext(content, match.index || 0),
            confidence: this.calculateConfidence(source, category, pattern.field) * 0.7,
            excerpt: match[0].substring(0, 200),
          });
        }
      }
    }

    return dataPoints;
  }

  private determineOrigin(dp: ExtractedDataPoint, category: ResearchCategory): DataOrigin {
    if (category === "financial" && ["marketSize", "capex", "opex", "revenue", "ticketMedio"].includes(dp.field)) {
      return dp.confidence > 0.8 ? "DIRECT_SOURCE" : "INFERRED";
    }
    return dp.confidence > 0.7 ? "DIRECT_SOURCE" : "INFERRED";
  }

  private calculateConfidence(source: Source, category: ResearchCategory, field: string): number {
    let confidence = source.reliability;

    if (["official_gov", "official_org", "academic"].includes(source.type)) {
      confidence += 0.1;
    }

    if (category === "financial" && ["marketSize", "capex", "revenue"].includes(field)) {
      confidence *= 0.9;
    }

    return Math.min(1, Math.max(0.1, confidence));
  }

  private extractPeriod(content: string, index: number): string {
    const before = content.substring(Math.max(0, index - 100), index);
    const yearMatch = before.match(/\b(20\d{2})\b/);
    return yearMatch ? yearMatch[1] : "";
  }

  private getContext(content: string, index: number, radius: number = 150): string {
    const start = Math.max(0, index - radius);
    const end = Math.min(content.length, index + radius);
    return content.substring(start, end).trim();
  }

  createCalculatedClaim(
    questionId: string,
    statement: string,
    value: unknown,
    formula: string,
    inputs: string[],
    evidenceIds: string[],
    unit?: string,
    period?: string
  ): Claim {
    return this.store.addClaim({
      questionId,
      statement,
      value,
      unit,
      period,
      evidenceIds,
      origin: "CALCULATED",
      confidence: 0.9,
      formula,
      inputs,
    });
  }

  createEstimatedClaim(
    questionId: string,
    statement: string,
    value: unknown,
    reasoning: string,
    evidenceIds: string[],
    unit?: string,
    period?: string
  ): Claim {
    return this.store.addClaim({
      questionId,
      statement,
      value,
      unit,
      period,
      evidenceIds,
      origin: "ESTIMATED",
      confidence: 0.4,
      formula: reasoning,
      inputs: [],
    });
  }
}

export const evidenceAnalyst = new EvidenceAnalyst();