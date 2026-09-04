import { GoogleGenAI } from '@google/genai';

export type SupportedAiProvider = 'nvidia' | 'gemini';

export interface AiMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface AiRequestOptions {
  provider?: SupportedAiProvider;
  model?: string;
  temperature?: number;
  maxTokens?: number;
  nvidiaAccountSlot?: 1 | 2 | 3;
  customApiKey?: string;
  fallbackToAlternative?: boolean;
}

export interface ProviderDiagnostic {
  primaryProvider: SupportedAiProvider;
  isNvidiaConfigured: boolean;
  isGeminiConfigured: boolean;
  activeModel: string;
  availableNvidiaSlots: number[];
}

export const NVIDIA_MODELS = {
  LLAMA_3_3_70B: 'meta/llama-3.3-70b-instruct',
  NEMOTRON_70B: 'nvidia/llama-3.1-nemotron-70b-instruct',
  DEEPSEEK_R1: 'deepseek-ai/deepseek-r1',
  MISTRAL_LARGE: 'mistralai/mistral-large-2-instruct',
  QWEN_2_5_72B: 'qwen/qwen2.5-72b-instruct',
};

export class UnifiedAiProvider {
  private static instance: UnifiedAiProvider;

  private constructor() {}

  public static getInstance(): UnifiedAiProvider {
    if (!UnifiedAiProvider.instance) {
      UnifiedAiProvider.instance = new UnifiedAiProvider();
    }
    return UnifiedAiProvider.instance;
  }

  /**
   * Determina o provedor primário configurado no ambiente (NVIDIA por padrão)
   */
  public getPrimaryProvider(): SupportedAiProvider {
    const envProvider = (process.env.AI_PROVIDER || 'nvidia').toLowerCase();
    if (envProvider === 'gemini') {
      return 'gemini';
    }
    return 'nvidia';
  }

  /**
   * Obtém a chave da NVIDIA configurada para o slot ou token manual
   */
  public getNvidiaApiKey(slot: 1 | 2 | 3 = 1, customToken?: string): string | null {
    if (customToken && customToken.trim().length > 5) {
      return customToken.trim();
    }

    if (slot === 1) {
      return process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY || null;
    }
    if (slot === 2) {
      return process.env.NVIDIA_API_KEY_2 || null;
    }
    if (slot === 3) {
      return process.env.NVIDIA_API_KEY_3 || null;
    }

    return process.env.NVIDIA_API_KEY || null;
  }

  /**
   * Obtém diagnóstico da infraestrutura de IA
   */
  public getDiagnostics(): ProviderDiagnostic {
    const nvidia1 = !!(process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY);
    const nvidia2 = !!process.env.NVIDIA_API_KEY_2;
    const nvidia3 = !!process.env.NVIDIA_API_KEY_3;
    const gemini = !!process.env.GEMINI_API_KEY;

    const slots: number[] = [];
    if (nvidia1) slots.push(1);
    if (nvidia2) slots.push(2);
    if (nvidia3) slots.push(3);

    return {
      primaryProvider: this.getPrimaryProvider(),
      isNvidiaConfigured: slots.length > 0,
      isGeminiConfigured: gemini,
      activeModel: process.env.NVIDIA_DEFAULT_MODEL || NVIDIA_MODELS.LLAMA_3_3_70B,
      availableNvidiaSlots: slots,
    };
  }

  /**
   * Executa chamada de chat com o provedor unificado (NVIDIA primário, SEM fallback silencioso)
   * Fallback explícito deve ser tratado pelo chamador se necessário
   */
  public async chat(messages: AiMessage[], options: AiRequestOptions = {}): Promise<string> {
    const provider = options.provider || this.getPrimaryProvider();

    if (provider === 'nvidia') {
      try {
        return await this.callNvidia(messages, options);
      } catch (nvidiaError: any) {
        console.error(`[AI Provider] Falha na chamada NVIDIA: ${nvidiaError.message}`);
        // Não fazer fallback silencioso - lançar erro para chamador tratar explicitamente
        throw new Error(`NVIDIA provider failed: ${nvidiaError.message}. Configure fallback explicitly if needed.`);
      }
    } else {
      try {
        return await this.callGemini(messages, options);
      } catch (geminiError: any) {
        console.error(`[AI Provider] Falha na chamada Gemini: ${geminiError.message}`);
        throw new Error(`Gemini provider failed: ${geminiError.message}. Configure fallback explicitly if needed.`);
      }
    }
  }

  /**
   * Executa geração estruturada (JSON) com validação estrita, sem inventar dados
   */
  public async generateStructured<T = unknown>(
    prompt: string,
    systemInstruction: string,
    schemaFormatDescription: string,
    options: AiRequestOptions = {}
  ): Promise<T> {
    const messages: AiMessage[] = [
      {
        role: 'system',
        content: `${systemInstruction}\n\nATENÇÃO: Responda EXCLUSIVAMENTE em formato JSON estrito e válido de acordo com a especificação abaixo. Não adicione saudações, introduções ou blocos explicativos fora do JSON.\n\nFORMATO ESPERADO:\n${schemaFormatDescription}`
      },
      {
        role: 'user',
        content: prompt
      }
    ];

    const rawResponse = await this.chat(messages, {
      ...options,
      temperature: options.temperature ?? 0.2
    });

    const parsed = this.parseJsonSafe<T>(rawResponse);
    if (!parsed) {
      throw new Error(`[AI Provider] Falha ao parsear resposta estruturada JSON da IA. Conteúdo retornado: ${rawResponse.substring(0, 300)}...`);
    }

    return parsed;
  }

  /**
   * Chamada direta para NVIDIA NIM API (OpenAI compatible)
   */
  private async callNvidia(messages: AiMessage[], options: AiRequestOptions): Promise<string> {
    const slot = options.nvidiaAccountSlot || 1;
    const apiKey = this.getNvidiaApiKey(slot, options.customApiKey);

    if (!apiKey) {
      throw new Error(`Chave de API NVIDIA não configurada (Slot ${slot}). Configure NVIDIA_API_KEY_${slot} ou passe customApiKey.`);
    }

    const model = options.model || process.env.NVIDIA_DEFAULT_MODEL || NVIDIA_MODELS.LLAMA_3_3_70B;
    const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

    console.log(`[UnifiedAiProvider] Chamando NVIDIA NIM (${model}) via Slot ${slot}...`);

    const response = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        temperature: options.temperature ?? 0.2,
        top_p: 0.7,
        max_tokens: options.maxTokens ?? 4096,
        stream: false
      })
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`NVIDIA NIM API error (${response.status}): ${errorText}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    if (!content) {
      throw new Error('[UnifiedAiProvider] Resposta vazia recebida da NVIDIA NIM API.');
    }

    return content;
  }

  /**
   * Chamada direta para Gemini API (@google/genai)
   */
  private async callGemini(messages: AiMessage[], options: AiRequestOptions): Promise<string> {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY não configurada no ambiente.');
    }

    const ai = new GoogleGenAI({
      apiKey,
      httpOptions: { headers: { 'User-Agent': 'aistudio-build' } }
    });

    const model = options.model || 'gemini-2.5-flash';
    const systemMessage = messages.find(m => m.role === 'system')?.content;
    const conversation = messages
      .filter(m => m.role !== 'system')
      .map(m => `${m.role === 'user' ? 'Usuário' : 'Assistente'}: ${m.content}`)
      .join('\n\n');

    console.log(`[UnifiedAiProvider] Chamando Gemini (${model})...`);

    const response = await ai.models.generateContent({
      model,
      contents: conversation || messages[messages.length - 1].content,
      config: {
        systemInstruction: systemMessage,
        temperature: options.temperature ?? 0.2,
      }
    });

    const text = response.text;
    if (!text) {
      throw new Error('[UnifiedAiProvider] Resposta vazia recebida da Gemini API.');
    }

    return text;
  }

  /**
   * Helper seguro para extrair JSON de markdown ou texto bruto
   */
  private parseJsonSafe<T>(raw: string): T | null {
    if (!raw) return null;
    const clean = raw
      .replace(/```json/gi, '')
      .replace(/```/g, '')
      .trim();

    try {
      return JSON.parse(clean) as T;
    } catch {
      // Tenta encontrar bloco JSON entre chaves ou colchetes
      const jsonMatch = clean.match(/(\{[\s\S]*\}|\[[\s\S]*\])/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[0]) as T;
        } catch {
          return null;
        }
      }
      return null;
    }
  }
}

export const aiProvider = UnifiedAiProvider.getInstance();
