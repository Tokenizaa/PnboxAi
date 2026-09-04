export interface SearchResultItem {
  url: string;
  title: string;
  snippet: string;
}

export interface SearchService {
  /**
   * Performs a search and returns raw results (URL, title, snippet).
   * This service should NOT involve any LLM or AI reasoning - it should return
   * direct search results from a search API (e.g., Google Custom Search).
   */
  search(query: string, options?: { numResults?: number }): Promise<SearchResultItem[]>;
}

/**
 * Google Custom Search API implementation.
 * Requires GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID environment variables.
 */
export class GoogleCustomSearchService implements SearchService {
  private apiKey: string;
  private searchEngineId: string;

  constructor() {
    this.apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY || '';
    this.searchEngineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID || '';

    if (!this.apiKey || !this.searchEngineId) {
      throw new Error(
        'Google Custom Search API credentials not configured. ' +
        'Set GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID environment variables.'
      );
    }
  }

  async search(query: string, options: { numResults?: number } = {}): Promise<SearchResultItem[]> {
    const numResults = options.numResults ?? 10;
    const startIndex = 1; // Google Custom Search API uses 1-based index

    const url = new URL('https://www.googleapis.com/customsearch/v1');
    url.searchParams.set('key', this.apiKey);
    url.searchParams.set('cx', this.searchEngineId);
    url.searchParams.set('q', query);
    url.searchParams.set('num', Math.min(numResults, 10).toString()); // max 10 per request
    url.searchParams.set('start', startIndex.toString());

    try {
      const response = await fetch(url.toString());
      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`Google Custom Search API error: ${response.status} - ${errorText}`);
      }

      const data = await response.json();

      const items = data.items || [];
      return items.map(item => ({
        url: item.link || '',
        title: item.title || '',
        snippet: item.snippet || ''
      }));
    } catch (error) {
      console.error('[GoogleCustomSearchService] Search failed:', error);
      throw new Error(`Failed to perform search: ${error.message}`);
    }
  }
}

/**
 * Stub implementation for development and testing when real API is not available.
 * MUST be replaced with GoogleCustomSearchService in production.
 */
export class StubSearchService implements SearchService {
  async search(query: string, options: { numResults?: number } = {}): Promise<SearchResultItem[]> {
    const num = options.numResults ?? 10;
    return Array.from({ length: num }, (_, i) => ({
      url: `https://example.com/result/${i}`,
      title: `Mock Result ${i} for: "${query}"`,
      snippet: `This is a mock snippet for result ${i} related to the query "${query}". ` +
               "Replace this stub with a real search API implementation (GoogleCustomSearchService).",
    }));
  }
}

/**
 * Factory to create the appropriate search service based on environment.
 * Use GOOGLE_CUSTOM_SEARCH_API_KEY and GOOGLE_CUSTOM_SEARCH_ENGINE_ID to enable real search.
 * If either is missing, returns StubSearchService (useful for development).
 */
export function createSearchService(): SearchService {
  const apiKey = process.env.GOOGLE_CUSTOM_SEARCH_API_KEY;
  const engineId = process.env.GOOGLE_CUSTOM_SEARCH_ENGINE_ID;

  if (apiKey && engineId) {
    return new GoogleCustomSearchService();
  } else {
    // Log warning in development
    if (process.env.NODE_ENV !== 'production') {
      console.warn('[SearchService] Google Custom Search API not configured. Using stub search service.');
    }
    return new StubSearchService();
  }
}