import { Source, SourceType, ResearchCategory } from "../types";
import { getSourceReliability, classifySourceType, SOURCE_TYPE_KEYWORDS } from "../policies";
import { evidenceStore } from "../evidence";

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

export interface SourceEngineConfig {
  searchProvider: "tavily" | "brave" | "serpapi" | "custom";
  apiKey?: string;
  maxResultsPerQuery: number;
  fetchTimeoutMs: number;
  enableCache: boolean;
  minReliability: number;
}

const DEFAULT_CONFIG: SourceEngineConfig = {
  searchProvider: "custom",
  maxResultsPerQuery: 10,
  fetchTimeoutMs: 15000,
  enableCache: true,
  minReliability: 0.4,
};

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
  private config: SourceEngineConfig;
  private cache = new Map<string, FetchResult>();

  constructor(config: Partial<SourceEngineConfig> = {}) {
    this.config = { ...DEFAULT_CONFIG, ...config };
  }

  async search(query: string, category: ResearchCategory): Promise<SearchResult[]> {
    const expandedQueries = this.expandQueries(query, category);
    const allResults: SearchResult[] = [];

    for (const eq of expandedQueries) {
      const results = await this.executeSearch(eq);
      allResults.push(...results);
    }

    const deduplicated = this.deduplicateResults(allResults);
    const filtered = deduplicated.filter((r) => this.estimateReliability(r) >= this.config.minReliability);

    return filtered.slice(0, this.config.maxResultsPerQuery);
  }

  private expandQueries(query: string, category: ResearchCategory): string[] {
    const templates = SEARCH_QUERY_TEMPLATES[category] || ["{query} Brasil"];
    return templates.map((t) => t.replace("{query}", query));
  }

  private async executeSearch(query: string): Promise<SearchResult[]> {
    if (this.config.searchProvider === "tavily" && this.config.apiKey) {
      return this.searchTavily(query);
    }
    if (this.config.searchProvider === "brave" && this.config.apiKey) {
      return this.searchBrave(query);
    }
    if (this.config.searchProvider === "serpapi" && this.config.apiKey) {
      return this.searchSerpApi(query);
    }

    return this.searchCustom(query);
  }

  private async searchTavily(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch("https://api.tavily.com/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${this.config.apiKey}`,
        },
        body: JSON.stringify({
          query,
          search_depth: "advanced",
          max_results: this.config.maxResultsPerQuery,
          include_domains: [],
          exclude_domains: ["wikipedia.org", "quora.com", "reddit.com"],
        }),
      });

      if (!response.ok) throw new Error(`Tavily search failed: ${response.status}`);
      const data = await response.json();

      return (data.results || []).map((r: any) => ({
        url: r.url,
        title: r.title,
        snippet: r.content,
        publisher: new URL(r.url).hostname.replace("www.", ""),
      }));
    } catch (error) {
      console.warn("[SourceEngine] Tavily search failed, falling back:", error);
      return this.searchCustom(query);
    }
  }

  private async searchBrave(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`https://api.search.brave.com/res/v1/web/search?q=${encodeURIComponent(query)}&count=${this.config.maxResultsPerQuery}`, {
        headers: {
          "Accept": "application/json",
          "X-Subscription-Token": this.config.apiKey!,
        },
      });

      if (!response.ok) throw new Error(`Brave search failed: ${response.status}`);
      const data = await response.json();

      return (data.web?.results || []).map((r: any) => ({
        url: r.url,
        title: r.title,
        snippet: r.description,
        publisher: r.meta_url?.hostname || new URL(r.url).hostname.replace("www.", ""),
      }));
    } catch (error) {
      console.warn("[SourceEngine] Brave search failed, falling back:", error);
      return this.searchCustom(query);
    }
  }

  private async searchSerpApi(query: string): Promise<SearchResult[]> {
    try {
      const response = await fetch(`https://serpapi.com/search.json?q=${encodeURIComponent(query)}&num=${this.config.maxResultsPerQuery}&api_key=${this.config.apiKey}`);

      if (!response.ok) throw new Error(`SerpAPI search failed: ${response.status}`);
      const data = await response.json();

      return (data.organic_results || []).map((r: any) => ({
        url: r.link,
        title: r.title,
        snippet: r.snippet,
        publisher: r.source || new URL(r.link).hostname.replace("www.", ""),
      }));
    } catch (error) {
      console.warn("[SourceEngine] SerpAPI search failed, falling back:", error);
      return this.searchCustom(query);
    }
  }

  private async searchCustom(query: string): Promise<SearchResult[]> {
    const mockResults: SearchResult[] = [
      { url: "https://sebrae.com.br/estudo-mercado", title: "Sebrae - Estudo de Mercado", snippet: "Dados oficiais do Sebrae sobre mercado...", publisher: "sebrae.com.br" },
      { url: "https://ibge.gov.br/estatisticas", title: "IBGE - Estatísticas Oficiais", snippet: "Estatísticas oficiais do IBGE...", publisher: "ibge.gov.br" },
      { url: "https://valor.globo.com/negocios", title: "Valor Econômico - Negócios", snippet: "Análise de mercado do Valor...", publisher: "valor.globo.com" },
      { url: "https://exame.com/negocios", title: "Exame - Negócios", snippet: "Reportagem sobre setor...", publisher: "exame.com" },
    ];

    return mockResults.map((r) => ({ ...r, snippet: `${r.snippet} [query: ${query}]` }));
  }

  private estimateReliability(result: SearchResult): number {
    return getSourceReliability(classifySourceType(result.url, result.title));
  }

  private deduplicateResults(results: SearchResult[]): SearchResult[] {
    const seen = new Set<string>();
    const unique: SearchResult[] = [];

    for (const r of results) {
      const normalized = this.normalizeUrl(r.url);
      if (!seen.has(normalized)) {
        seen.add(normalized);
        unique.push(r);
      }
    }

    return unique.sort((a, b) => this.estimateReliability(b) - this.estimateReliability(a));
  }

  private normalizeUrl(url: string): string {
    try {
      const u = new URL(url);
      u.hash = "";
      u.searchParams.sort();
      return u.toString();
    } catch {
      return url;
    }
  }

  async fetch(url: string): Promise<FetchResult | null> {
    if (this.config.enableCache && this.cache.has(url)) {
      return this.cache.get(url)!;
    }

    try {
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), this.config.fetchTimeoutMs);

      const response = await fetch(url, {
        signal: controller.signal,
        headers: {
          "User-Agent": "PNBOXAI-ResearchBot/1.0 (+https://pnboxai.com/bot)",
          "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });

      clearTimeout(timeout);

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const html = await response.text();
      const { title, content, publishedAt } = this.extractContent(html, url);

      const result: FetchResult = {
        url,
        title,
        content,
        publisher: new URL(url).hostname.replace("www.", ""),
        publishedAt,
        metadata: { fetchedAt: new Date().toISOString() },
      };

      if (this.config.enableCache) {
        this.cache.set(url, result);
      }

      return result;
    } catch (error) {
      console.warn(`[SourceEngine] Fetch failed for ${url}:`, error);
      return null;
    }
  }

  private extractContent(html: string, url: string): { title: string; content: string; publishedAt?: string } {
    const titleMatch = html.match(/<title[^>]*>([^<]+)<\/title>/i);
    const title = titleMatch ? titleMatch[1].trim() : new URL(url).hostname;

    let content = html
      .replace(/<script[^>]*>[\s\S]*?<\/script>/gi, "")
      .replace(/<style[^>]*>[\s\S]*?<\/style>/gi, "")
      .replace(/<nav[^>]*>[\s\S]*?<\/nav>/gi, "")
      .replace(/<footer[^>]*>[\s\S]*?<\/footer>/gi, "")
      .replace(/<aside[^>]*>[\s\S]*?<\/aside>/gi, "")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim();

    content = content.substring(0, 50000);

    const dateMatch = html.match(/<meta[^>]*property="article:published_time"[^>]*content="([^"]+)"/i) ||
                      html.match(/<meta[^>]*name="pubdate"[^>]*content="([^"]+)"/i) ||
                      html.match(/<time[^>]*datetime="([^"]+)"/i);
    const publishedAt = dateMatch ? dateMatch[1] : undefined;

    return { title, content, publishedAt };
  }

  async searchAndFetch(query: string, category: ResearchCategory): Promise<FetchResult[]> {
    const searchResults = await this.search(query, category);
    const fetchResults: FetchResult[] = [];

    for (const result of searchResults) {
      const fetched = await this.fetch(result.url);
      if (fetched) {
        fetchResults.push(fetched);
      }
    }

    return fetchResults;
  }

  async processTaskQueries(task: { queries: string[]; category: ResearchCategory }): Promise<Source[]> {
    const allSources: Source[] = [];

    for (const query of task.queries) {
      const fetchResults = await this.searchAndFetch(query, task.category);

      for (const fr of fetchResults) {
        const source = evidenceStore.addSource({
          url: fr.url,
          title: fr.title,
          publisher: fr.publisher,
          type: classifySourceType(fr.url, fr.title),
          reliability: getSourceReliability(classifySourceType(fr.url, fr.title)),
          metadata: {
            fetchedAt: fr.metadata?.fetchedAt,
            publishedAt: fr.publishedAt,
            contentLength: fr.content.length,
          },
        } as any);
        allSources.push(source);
      }
    }

    return allSources;
  }

  getConfig(): SourceEngineConfig {
    return { ...this.config };
  }

  updateConfig(config: Partial<SourceEngineConfig>): void {
    this.config = { ...this.config, ...config };
  }

  clearCache(): void {
    this.cache.clear();
  }
}

export const sourceEngine = new SourceEngine();