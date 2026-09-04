import { Source, SourceType, ResearchCategory } from "../types";
import { getSourceReliability, classifySourceType } from "../policies";
import { InternalResearchProvider, ResearchSearchRequest } from "./InternalResearchProvider";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface SearchResult {
  url: string;
  title: string;
  snippet: string;
  publisher: string;
}

export interface FetchResult {
  url: string;
  title: string;
  content: string;
  publisher: string;
  publishedAt?: string;
  metadata?: Record<string, unknown>;
}

const SEARCH_QUERY_TEMPLATES: Record<ResearchCategory, string[]> = {
  market: [
    "{query} mercado Brasil 2024 2025 tamanho crescimento",
    "{query} TAM SAM SOM Brasil IBGE Sebrae",
    "{query} tendências setor Brasil 2024 estatísticas",
  ],
  customer: [
    "{query} perfil cliente Brasil comportamento consumo",
    "{query} dores necessidades cliente Brasil pesquisa",
    "{query} jornada compra consumidor Brasil",
  ],
  competition: [
    "{query} principais concorrentes Brasil market share",
    "{query} análise competitiva setor Brasil",
    "{query} precificação concorrentes Brasil",
  ],
  pricing: [
    "{query} estratégia precificação Brasil valor percebido",
    "{query} price elasticity {query} Brasil",
    "{query} ticket médio {query} Brasil",
  ],
  financial: [
    "{query} investimento inicial CAPEX Brasil",
    "{query} custos operacionais OPEX Brasil",
    "{query} faturamento médio {query} Brasil",
  ],
  regulatory: [
    "{query} CNAE licenças alvarás Brasil",
    "{query} regime tributário {query} Simples Nacional",
    "{query} regulamentação {query} ANVISA vigilância sanitária",
  ],
  operations: [
    "{query} processos operacionais {query} Brasil",
    "{query} fornecedores {query} Brasil cadeia suprimentos",
    "{query} recursos necessários {query} Brasil",
  ],
  strategy: [
    "{query} riscos oportunidades {query} Brasil SWOT",
    "{query} estratégia entrada mercado Brasil",
    "{query} canais marketing {query} Brasil CAC",
  ],
};

export class SourceEngine {
  private provider: InternalResearchProvider;
  private fetchCache = new Map<string, FetchResult>();
  private maxResultsPerQuery: number = 10;
  private minReliability: number = 0.4;

  constructor(config?: { maxResultsPerQuery?: number; minReliability?: number }) {
    this.provider = new InternalResearchProvider();
    this.maxResultsPerQuery = config?.maxResultsPerQuery ?? 10;
    this.minReliability = config?.minReliability ?? 0.4;
  }

  async search(query: string, category: ResearchCategory): Promise<SearchResult[]> {
    const expandedQueries = this.expandQueries(query, category);
    const allResults: SearchResult[] = [];

    for (const eq of expandedQueries) {
      const request: ResearchSearchRequest = {
        query: eq,
        category,
      };
      const result = await this.provider.search(request);
      
      for (const src of result.sources) {
        const reliability = getSourceReliability(classifySourceType(src.url, src.title));
        if (reliability >= this.minReliability) {
          allResults.push({
            url: src.url,
            title: src.title,
            snippet: src.snippet || '',
            publisher: new URL(src.url).hostname,
          });
        }
      }
    }

    const deduplicated = this.deduplicateResults(allResults);
    return deduplicated.slice(0, this.maxResultsPerQuery);
  }

  async processTaskQueries(params: { queries: string[]; category: ResearchCategory }): Promise<Source[]> {
    const allSources: Source[] = [];
    const seenUrls = new Set<string>();

    for (const query of params.queries) {
      const searchResults = await this.search(query, params.category);
      
      for (const sr of searchResults) {
        if (seenUrls.has(sr.url.toLowerCase())) continue;
        seenUrls.add(sr.url.toLowerCase());

        const source: Source = {
          id: generateId("src"),
          url: sr.url,
          title: sr.title,
          publisher: sr.publisher,
          type: classifySourceType(sr.url, sr.title),
          reliability: getSourceReliability(classifySourceType(sr.url, sr.title)),
          retrievedAt: new Date().toISOString(),
          metadata: {
            snippet: sr.snippet,
          },
        };
        allSources.push(source);
      }
    }

    return allSources;
  }

  async fetch(url: string): Promise<FetchResult | null> {
    if (this.fetchCache.has(url)) {
      return this.fetchCache.get(url)!;
    }

    try {
      const response = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; PNBOXAI/1.0; +https://pnbox.ai)',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        },
        signal: AbortSignal.timeout(15000),
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const html = await response.text();
      const title = this.extractTitle(html) || new URL(url).hostname;
      const content = this.extractContent(html);

      const result: FetchResult = {
        url,
        title,
        content,
        publisher: new URL(url).hostname,
        metadata: {
          fetchedAt: new Date().toISOString(),
          contentLength: content.length,
        },
      };

      this.fetchCache.set(url, result);
      return result;
    } catch (error) {
      console.error(`[SourceEngine] Fetch failed for ${url}:`, error);
      return null;
    }
  }

  async searchAndFetch(
    query: string,
    category: ResearchCategory
  ): Promise<Source[]> {
    const searchResults = await this.search(query, category);
    const allSources: Source[] = [];

    for (const sr of searchResults) {
      const fetchResult = await this.fetch(sr.url);
      if (fetchResult) {
        const source: Source = {
          id: generateId("src"),
          url: fetchResult.url,
          title: fetchResult.title,
          publisher: fetchResult.publisher,
          type: classifySourceType(fetchResult.url, fetchResult.title),
          reliability: getSourceReliability(classifySourceType(fetchResult.url, fetchResult.title)),
          retrievedAt: new Date().toISOString(),
          metadata: {
            fetchedAt: fetchResult.metadata?.fetchedAt,
            contentLength: fetchResult.content.length,
            snippet: sr.snippet,
          },
        };
        allSources.push(source);
      }
    }

    return allSources;
  }

  private expandQueries(query: string, category: ResearchCategory): string[] {
    const templates = SEARCH_QUERY_TEMPLATES[category] || ["{query} Brasil"];
    return templates.map((t) => t.replace("{query}", query));
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    return results.filter((r) => {
      const key = r.url.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  private extractTitle(html: string): string | null {
    const match = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    return match ? match[1].trim() : null;
  }

  private extractContent(html: string): string {
    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, '')
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, '')
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, '')
      .replace(/<header[^>]*>[\s\S]*?<\/header>/gi, '')
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, '')
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, '')
      .replace(/<[^>]+>/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();
    return content.substring(0, 50000);
  }

  getConfig(): { maxResultsPerQuery: number; minReliability: number } {
    return {
      maxResultsPerQuery: this.maxResultsPerQuery,
      minReliability: this.minReliability,
    };
  }

  updateConfig(config: { maxResultsPerQuery?: number; minReliability?: number }): void {
    if (config.maxResultsPerQuery !== undefined) {
      this.maxResultsPerQuery = config.maxResultsPerQuery;
    }
    if (config.minReliability !== undefined) {
      this.minReliability = config.minReliability;
    }
  }

  clearCache(): void {
    this.fetchCache.clear();
  }
}

export const sourceEngine = new SourceEngine();