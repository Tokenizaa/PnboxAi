import { Source, SourceType, ResearchCategory } from "../types";
import { getSourceReliability, classifySourceType } from "../policies";

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

export class InternalResearchProvider {
  private geminiApiKey: string;
  private model: string;

  constructor() {
    this.geminiApiKey = process.env.GEMINI_API_KEY || '';
    this.model = process.env.GEMINI_RESEARCH_MODEL || 'gemini-2.5-flash';
    
    if (!this.geminiApiKey) {
      throw new Error(
        "GEMINI_API_KEY is required for internal research provider. " +
        "Configure GEMINI_API_KEY in environment variables."
      );
    }
  }

  async search(request: ResearchSearchRequest): Promise<ResearchSearchResult> {
    const { GoogleGenAI } = await import('@google/genai');
    
    const ai = new GoogleGenAI({
      apiKey: this.geminiApiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const systemPrompt = `Você é um pesquisador sênior de inteligência de mercado do Sebrae.
Sua missão é fornecer dados factuais, realistas e verificáveis sobre o mercado brasileiro.
Use a ferramenta de busca do Google para encontrar fontes reais e atuais.
Nunca invente dados fictícios. Indique fontes reais do ecossistema brasileiro (como Sebrae, IBGE, Banco Central, Associações Setoriais, etc.).`;

    const userPrompt = `Realize uma pesquisa aprofundada sobre a seguinte questão:
"${request.query}"
Setor: ${request.industry || 'Geral'}
Região: ${request.location || 'Brasil / Nacional'}
Categoria: ${request.category}

Responda em JSON com fatos concretos e fontes de referência:
{
  "answer": "Resumo analítico dos dados encontrados...",
  "facts": [
    {
      "claim": "Fato ou estatística confirmada",
      "evidence": "Trecho ou evidência numérica que sustenta a afirmação",
      "sourceUrl": "https://url-real-da-fonte.com.br",
      "sourceTitle": "Nome da Publicação / Instituição",
      "confidence": 0.9
    }
  ],
  "sources": [
    {
      "url": "https://sebrae.com.br/...",
      "title": "Título da publicação",
      "publisher": "Sebrae Nacional"
    }
  ]
}`;

    const response = await ai.models.generateContent({
      model: this.model,
      contents: userPrompt,
      config: {
        systemInstruction: systemPrompt,
        tools: [{ googleSearch: {} }],
        temperature: 0.2,
        topP: 0.7,
      }
    });

    const answer = response.text || '';
    const sources: Array<{ url: string; title: string; snippet?: string }> = [];

    const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
    if (Array.isArray(groundingChunks)) {
      for (const chunk of groundingChunks) {
        if (chunk.web?.uri && chunk.web?.title) {
          sources.push({
            url: chunk.web.uri,
            title: chunk.web.title,
          });
        }
      }
    }

    const groundingSupports = (response as any).candidates?.[0]?.groundingMetadata?.groundingSupports;
    const snippets: Record<string, string> = {};
    if (Array.isArray(groundingSupports)) {
      for (const support of groundingSupports) {
        const segment = support.segment?.text || '';
        const chunkIndices = support.groundingChunkIndices || [];
        for (const idx of chunkIndices) {
          if (groundingChunks[idx]?.web?.uri) {
            const uri = groundingChunks[idx].web.uri;
            if (!snippets[uri]) {
              snippets[uri] = segment.substring(0, 500);
            }
          }
        }
      }
    }

    for (const source of sources) {
      source.snippet = snippets[source.url] || '';
    }

    return {
      answer,
      sources,
      groundingMetadata: (response as any).candidates?.[0]?.groundingMetadata,
    };
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
          groundingMetadata: null,
        });
      }
    }

    return results;
  }

  getConfig(): { model: string; hasApiKey: boolean } {
    return {
      model: this.model,
      hasApiKey: !!this.geminiApiKey,
    };
  }
}

export const internalResearchProvider = new InternalResearchProvider();