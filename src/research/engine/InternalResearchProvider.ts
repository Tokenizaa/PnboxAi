import { Source, SourceType, ResearchCategory } from "../types";
import { getSourceReliability, classifySourceType } from "../policies";
import { UnifiedAiProvider, AiMessage, AiRequestOptions } from "../../ai/unifiedProvider";
import { SearchService, SearchResultItem, createSearchService } from "./SearchService";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface ResearchSearchRequest {
  query: string;
  category: ResearchCategory;
  location?: string;
  industry?: string;
}

export interface ResearchSearchResult {
  answer: string;
  sources: Array<{
    url: string;
    title: string;
    snippet?: string;
  }>;
  groundingMetadata?: any;
}

/**
 * Internal research provider that uses:
 *   - A search service (via createSearchService factory) for source gathering
 *   - UnifiedAiProvider (with NVIDIA as primary) for reasoning and answer generation
 * 
 * This provider does NOT use Gemini for any task. It uses NVIDIA as the primary AI provider
 * for reasoning, and a separate search service for source gathering.
 */
export class InternalResearchProvider {
  private searchService: SearchService;
  private unifiedAiProvider: UnifiedAiProvider;

  constructor(searchService?: SearchService) {
    // Use injected search service or default to factory-created service (real or stub based on env)
    this.searchService = searchService ?? createSearchService();
    this.unifiedAiProvider = UnifiedAiProvider.getInstance();
  }

  async search(request: ResearchSearchRequest): Promise<ResearchSearchResult> {
    try {
      // Step 1: Gather raw search results using the search service (no LLM involved)
      const rawResults = await this.searchService.search(request.query, {
        numResults: 10
      });

      // Step 2: Use UnifiedAiProvider (NVIDIA) to generate an answer based on the search results
      const answer = await this.generateAnswerFromResults(request, rawResults);

      // Format sources to match the expected interface
      const sources = rawResults.map(result => ({
        url: result.url,
        title: result.title,
        snippet: result.snippet
      }));

      return {
        answer,
        sources,
        groundingMetadata: null // We don't have grounding metadata from this approach
      };
    } catch (error) {
      console.error(`[InternalResearchProvider] Search failed for "${request.query}":`, error);
      throw new Error(`Internal research provider failed: ${error.message}`);
    }
  }

  /**
   * Generates an answer using the UnifiedAiProvider (NVIDIA) based on the search results.
   * This is where NVIDIA is used as the primary AI provider for reasoning.
   */
  private async generateAnswerFromResults(
    request: ResearchSearchRequest,
    results: SearchResultItem[]
  ): Promise<string> {
    // Prepare context from search results
    const context = results
      .map((r, index) => `${index + 1}. Title: ${r.title}\nURL: ${r.url}\nSnippet: ${r.snippet}`)
      .join("\n\n");

    // Create messages for the AI provider
    const messages: AiMessage[] = [
      {
        role: "system",
        content: `Você é um pesquisador sênior de inteligência de mercado do Sebrae.
        Sua missão é fornecer dados factuais, realistas e verificáveis sobre o mercado brasileiro.
        Use APENAS as informações fornecidas nos resultados da pesquisa abaixo para formular sua resposta.
        Nunca invente dados fictícios. Se as informações forem insuficientes, indique claramente isso.
        Fonte das informações: resultados de pesquisa web (não especifique o mecanismo de busca).`
      },
      {
        role: "user",
        content: `Realize uma pesquisa aprofundada sobre a seguinte questão:
        "${request.query}"
        Setor: ${request.industry || 'Geral'}
        Região: ${request.location || 'Brasil / Nacional'}
        Categoria: ${request.category}

        Resultados da pesquisa:
        ${context}

        Responda em Portuguese com um resumo analítico dos dados encontrados, basado exclusivamente nos resultados fornecidos.
        Se houver informações conflitantes, destaque-as. Se os dados forem insuficientes para responder completamente, indique isso claramente.`
      }
    ];

    // Call UnifiedAiProvider with NVIDIA as primary (no silent fallback)
    const options: AiRequestOptions = {
      provider: 'nvidia', // Explicitly request NVIDIA as primary
      temperature: 0.2,
      maxTokens: 1024
    };

    return await this.unifiedAiProvider.chat(messages, options);
  }

  async searchMultiple(requests: ResearchSearchRequest[]): Promise<ResearchSearchResult[]> {
    const results: ResearchSearchResult[] = [];
    
    for (const request of requests) {
      try {
        const result = await this.search(request);
        results.push(result);
      } catch (error) {
        console.error(`[InternalResearchProvider] Search failed for "${request.query}":`, error);
        results.push({
          answer: '',
          sources: [],
          groundingMetadata: null
        });
      }
    }
    
    return results;
  }

  getConfig(): { 
    searchService: string; 
    hasNvidiaConfigured: boolean; 
  } {
    // Determine if we are using real or stub service
    let serviceType = 'unknown';
    if (this.searchService.constructor.name === 'GoogleCustomSearchService') {
      serviceType = 'real';
    } else if (this.searchService.constructor.name === 'StubSearchService') {
      serviceType = 'stub';
    } else {
      serviceType = this.searchService.constructor.name;
    }

    return {
      searchService: serviceType,
      hasNvidiaConfigured: !!this.unifiedAiProvider.getDiagnostics().isNvidiaConfigured
    };
  }
}

export const internalResearchProvider = new InternalResearchProvider();