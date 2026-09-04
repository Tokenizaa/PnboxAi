import { InternalResearchProvider, internalResearchProvider, ResearchSearchRequest } from '../../research/engine/InternalResearchProvider';
import { sourceValidationSkill, ValidatedSource } from '../source-validation';

export interface WebResearchQuery {
  query: string;
  category: 'market' | 'competitors' | 'legal' | 'financial' | 'pricing';
  location?: string;
  industry?: string;
}

export interface WebResearchResult {
  query: string;
  summary: string;
  sources: ValidatedSource[];
  facts: Array<{
    claim: string;
    evidence: string;
    sourceUrl: string;
    confidence: number;
  }>;
  executedAt: string;
}

export class WebResearchSkill {
  private provider: InternalResearchProvider;

  constructor(provider?: InternalResearchProvider) {
    this.provider = provider || new InternalResearchProvider();
  }

  /**
   * Pesquisa dados reais de mercado para uma questão de negócio
   * Usa pesquisa grounded interna (Gemini + Google Search Grounding)
   */
  public async search(request: WebResearchQuery): Promise<WebResearchResult> {
    const executedAt = new Date().toISOString();
    const location = request.location || 'Brasil / Nacional';

    const researchRequest: ResearchSearchRequest = {
      query: request.query,
      category: request.category as any,
      location,
      industry: request.industry,
    };

    const result = await this.provider.search(researchRequest);

    // Validação estrita de fontes
    const rawSources = Array.isArray(result.sources) ? result.sources : [];
    const validatedSources = sourceValidationSkill.validateBatch(rawSources);

    // Extrair fatos do answer e grounding metadata
    const facts = this.extractFactsFromResult(result, validatedSources);

    return {
      query: request.query,
      summary: result.answer,
      sources: validatedSources,
      facts,
      executedAt,
    };
  }

  private extractFactsFromResult(
    result: { answer: string; sources: Array<{ url: string; title: string; snippet?: string }> },
    validatedSources: ValidatedSource[]
  ): Array<{ claim: string; evidence: string; sourceUrl: string; confidence: number }> {
    const facts: Array<{ claim: string; evidence: string; sourceUrl: string; confidence: number }> = [];
    
    // Use the answer as a claim if it contains substantial content
    if (result.answer && result.answer.length > 50) {
      const primarySource = validatedSources[0];
      if (primarySource) {
        facts.push({
          claim: `Pesquisa sobre: ${result.answer.substring(0, 200)}...`,
          evidence: result.answer.substring(0, 500),
          sourceUrl: primarySource.url,
          confidence: 0.8,
        });
      }
    }

    // Extract facts from source snippets
    for (const source of result.sources) {
      if (source.snippet && source.snippet.length > 30) {
        const validatedSource = validatedSources.find(vs => vs.url === source.url);
        if (validatedSource) {
          facts.push({
            claim: `Fonte: ${source.title}`,
            evidence: source.snippet,
            sourceUrl: source.url,
            confidence: validatedSource.reliability * 0.9,
          });
        }
      }
    }

    return facts;
  }
}

export const webResearchSkill = new WebResearchSkill();