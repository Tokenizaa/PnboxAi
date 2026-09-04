import { GoogleGenAI } from '@google/genai';
import { DeepResearchReport, AiProviderType } from '../types/pnbox';

export interface NvidiaRequestOptions {
  apiKey?: string;
  accountSlot?: 1 | 2 | 3;
  model?: string;
}

export interface UnifiedAiOptions {
  provider: AiProviderType;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
  useSearchGrounding?: boolean;
  geminiModel?: string;
  nvidiaApiKey?: string;
  nvidiaAccountSlot?: 1 | 2 | 3;
  nvidiaModel?: string;
}

export const NVIDIA_DEFAULT_MODELS = [
  {
    id: 'meta/llama-3.3-70b-instruct',
    nome: 'Meta Llama 3.3 70B Instruct',
    descricao: 'Alta velocidade, raciocínio apurado e excelente suporte a português brasileiro.'
  },
  {
    id: 'deepseek-ai/deepseek-r1',
    nome: 'DeepSeek R1 (Reasoning)',
    descricao: 'Modelo de raciocínio profundo e planejamento estratégico estruturado.'
  },
  {
    id: 'mistralai/mistral-large-2-instruct',
    nome: 'Mistral Large 2 Instruct',
    descricao: 'Raciocínio corporativo avançado e alta fidelidade a schemas JSON.'
  },
  {
    id: 'nvidia/llama-3.1-nemotron-70b-instruct',
    nome: 'NVIDIA Nemotron 70B Instruct',
    descricao: 'Otimizado pela NVIDIA com alta precisão factual e síntese de negócios.'
  },
  {
    id: 'qwen/qwen2.5-72b-instruct',
    nome: 'Qwen 2.5 72B Instruct',
    descricao: 'Excelente capacidade multilíngue e estruturação analítica.'
  }
];

/**
 * Recupera o token NVIDIA configurado para o slot ou variável de ambiente
 */
export function getNvidiaApiKey(slot: 1 | 2 | 3 = 1, customToken?: string): string | null {
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
 * Chamada à API NVIDIA NIM (OpenAI-compatible)
 */
async function callNvidiaNimChat(
  messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }>,
  options: NvidiaRequestOptions = {}
): Promise<string> {
  const model = options.model || 'meta/llama-3.3-70b-instruct';
  const apiKey = options.apiKey || getNvidiaApiKey(options.accountSlot || 1);

  if (!apiKey) {
    throw new Error(
      `Token da Conta NVIDIA ${options.accountSlot || 1} não foi fornecido. Configure NVIDIA_API_KEY_${options.accountSlot || 1} nas variáveis de ambiente ou cole o token no painel.`
    );
  }

  const endpoint = 'https://integrate.api.nvidia.com/v1/chat/completions';

  console.log(`[NVIDIA NIM] Chamando modelo ${model} via Conta ${options.accountSlot || 1}...`);

  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model,
      messages,
      temperature: 0.2,
      top_p: 0.7,
      max_tokens: 4096,
      stream: false
    })
  });

  if (!response.ok) {
    const errorBody = await response.text();
    throw new Error(`Erro na API NVIDIA NIM (${response.status}): ${errorBody}`);
  }

  const data = await response.json();
  const text = data.choices?.[0]?.message?.content || '';
  return text;
}

/**
 * Executa pesquisa de mercado Deep Research unificada (Gemini ou NVIDIA NIM)
 */
export async function executarPesquisaUnificada(
  promptNegocio: string,
  options: UnifiedAiOptions
): Promise<DeepResearchReport> {
  const provider = options.provider || 'gemini';
  const cidadeUf = options.cidadeUf || 'Brasil / Nacional';
  const orcamentoEstimado = options.orcamentoEstimado || 80000;
  const publicoAlvo = options.publicoAlvo || 'B2C e Consumidores Finais';

  const promptInvestigacao = `
Você é um consultor sênior do Sebrae especializado em inteligência de mercado e modelagem de novos negócios no Brasil.
Realize um Deep Research (Pesquisa de Mercado Aprofundada) completo e realista para a seguinte ideia de negócio:

PROMPT DA IDEIA: "${promptNegocio}"
LOCALIZAÇÃO: "${cidadeUf}"
ORÇAMENTO ESTIMADO: R$ ${orcamentoEstimado.toLocaleString('pt-BR')}
PÚBLICO-ALVO: "${publicoAlvo}"

Instruções da Pesquisa de Mercado:
1. Analise o mercado brasileiro no setor correspondente, tendências para 2025/2026, demanda e comportamento de consumo.
2. Identifique concorrentes reais ou arquétipos competitivos diretos e indiretos, seus diferenciais e brechas de mercado.
3. Defina a Buyer Persona detalhada com dores, desejos e ticket médio.
4. Estruture a estimativa de investimentos (CAPEX inicial, OPEX mensal, margem média e ponto de equilíbrio).
5. Sugira CNAE provável, regime tributário (Simples Nacional vs Lucro Presumido) e exigências regulatórias.
6. Dê um nome comercial moderno e chamativo para a nova empresa.

RETORNE ESTRITAMENTE UM JSON VÁLIDO no seguinte formato (sem blocos de texto extras):
{
  "nomeNegocioSugerido": "Nome Comercial Criativo e Profissional",
  "setor": "Segmento / Ramo de Atividade",
  "cidadeUf": "${cidadeUf}",
  "resumoExecutivo": "Resumo de 3 a 4 parágrafos concisos com proposta de valor, mercado e estratégia.",
  "oportunidadeMercado": "Análise detalhada da oportunidade no Brasil e diferenciais.",
  "tendencias2025_2026": [
    "Tendência 1",
    "Tendência 2",
    "Tendência 3",
    "Tendência 4"
  ],
  "concorrentesMapeados": [
    {
      "nome": "Concorrente 1",
      "pontosFortes": "Pontos fortes",
      "pontosFracos": "Pontos fracos",
      "diferenciacao": "Diferencial de superação"
    },
    {
      "nome": "Concorrente 2",
      "pontosFortes": "Pontos fortes",
      "pontosFracos": "Pontos fracos",
      "diferenciacao": "Diferencial de superação"
    },
    {
      "nome": "Concorrente 3",
      "pontosFortes": "Pontos fortes",
      "pontosFracos": "Pontos fracos",
      "diferenciacao": "Diferencial de superação"
    }
  ],
  "buyerPersona": {
    "nome": "Nome Fictício",
    "idade": "28 a 45 anos",
    "perfil": "Descrição demográfica e comportamental",
    "dores": ["Dor 1", "Dor 2", "Dor 3"],
    "desejos": ["Desejo 1", "Desejo 2", "Desejo 3"],
    "ticketMedio": 180
  },
  "investimentoEstimado": {
    "capexTotal": 75000,
    "opexMensal": 18500,
    "pontoEquilibrioMeses": 14,
    "faturamentoEstimadoMensal": 32000
  },
  "aspectosLegaisTributarios": {
    "cnaeSugerido": "Código e Descrição CNAE",
    "regimeTributario": "Simples Nacional",
    "licencasExigidas": ["Alvará de Funcionamento", "Vigilância Sanitária", "AVCB Bombeiros"]
  }
}
`;

  let responseText = '';
  let fontesPesquisa: Array<{ titulo: string; uri: string }> = [];

  if (provider === 'nvidia') {
    const nvidiaKey = options.nvidiaApiKey || getNvidiaApiKey(options.nvidiaAccountSlot || 1);
    const text = await callNvidiaNimChat(
      [
        {
          role: 'system',
          content:
            'Você é um consultor sênior de negócios do Sebrae e especialista em planejamento estratégico. Responda apenas com JSON estruturado e válido.'
        },
        { role: 'user', content: promptInvestigacao }
      ],
      {
        apiKey: nvidiaKey || undefined,
        accountSlot: options.nvidiaAccountSlot || 1,
        model: options.nvidiaModel || 'meta/llama-3.3-70b-instruct'
      }
    );
    responseText = text;
    fontesPesquisa.push({
      titulo: `NVIDIA NIM AI (${options.nvidiaModel || 'meta/llama-3.3-70b-instruct'})`,
      uri: 'https://build.nvidia.com'
    });
  } else {
    // Provider Gemini (com Google Search Grounding)
    const apiKey = process.env.GEMINI_API_KEY;
    if (apiKey) {
      const ai = new GoogleGenAI({ apiKey, httpOptions: { headers: { 'User-Agent': 'aistudio-build' } } });
      const geminiResponse = await ai.models.generateContent({
        model: options.geminiModel || 'gemini-3.7-flash',
        contents: promptInvestigacao,
        config: {
          systemInstruction: 'Você é um consultor sênior de negócios do Sebrae e especialista em planejamento estratégico.',
          tools: options.useSearchGrounding !== false ? [{ googleSearch: {} }] : undefined
        }
      });

      responseText = geminiResponse.text || '';

      const groundingChunks = (geminiResponse as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk.web?.uri && chunk.web?.title) {
            fontesPesquisa.push({
              titulo: chunk.web.title,
              uri: chunk.web.uri
            });
          }
        }
      }
    }
  }

  // Parsear JSON
  let parsed: any = null;
  if (responseText) {
    try {
      const cleanJson = responseText
        .replace(/```json/gi, '')
        .replace(/```/g, '')
        .trim();
      parsed = JSON.parse(cleanJson);
    } catch (e) {
      console.warn('[AI Deep Research] Falha no parse direto do JSON, tentando extração por regex:', e);
      const match = responseText.match(/\{[\s\S]*\}/);
      if (match) {
        try {
          parsed = JSON.parse(match[0]);
        } catch (innerErr) {
          console.error('[AI Deep Research] Falha ao extrair bloco JSON:', innerErr);
        }
      }
    }
  }

  // Se IA falhou em retornar JSON válido, lançar erro explícito - NÃO gerar dados fake
  if (!parsed || !parsed.nomeNegocioSugerido) {
    throw new Error(
      `[AI Deep Research] Falha ao obter resposta válida da IA (provider: ${provider}). ` +
      `Resposta recebida: ${responseText.substring(0, 500)}... ` +
      `Não é permitido gerar dados fictícios como fallback. Verifique a chave de API e tente novamente.`
    );
  }

  // Validar que fontes de pesquisa reais foram obtidas (nao apenas as hardcoded)
  const realSources = fontesPesquisa.filter((f) =>
    f.uri.includes('google.com') ||
    f.uri.includes('ibge.gov') ||
    f.uri.includes('sebrae.com') || f.uri.includes('.gov.br')
  );
  if (realSources.length === 0 && provider !== 'nvidia') {
    console.warn('[AI Deep Research] Nenhuma fonte de pesquisa real detectada na resposta');
  }

// Validate all required fields are present and of correct type
   if (typeof parsed.setor !== 'string') throw new Error('Campo "setor" ausente ou inválido na resposta da IA');
   if (typeof parsed.cidadeUf !== 'string') throw new Error('Campo "cidadeUf" ausente ou inválido na resposta da IA');
   if (typeof parsed.resumoExecutivo !== 'string') throw new Error('Campo "resumoExecutivo" ausente ou inválido na resposta da IA');
   if (typeof parsed.oportunidadeMercado !== 'string') throw new Error('Campo "oportunidadeMercado" ausente ou inválido na resposta da IA');
   if (!Array.isArray(parsed.tendencias2025_2026) || !parsed.tendencias2025_2026.every(t => typeof t === 'string')) throw new Error('Campo "tendencias2025_2026" ausente ou inválido na resposta da IA');
   if (!Array.isArray(parsed.concorrentesMapeados) || !parsed.concorrentesMapeados.every(c => c && typeof c.nome === 'string' && typeof c.pontosFortes === 'string' && typeof c.pontosFracos === 'string' && typeof c.diferenciacao === 'string')) throw new Error('Campo "concorrentesMapeados" ausente ou inválido na resposta da IA');
   if (!parsed.buyerPersona || typeof parsed.buyerPersona.nome !== 'string' || typeof parsed.buyerPersona.idade !== 'string' || typeof parsed.buyerPersona.perfil !== 'string' || !Array.isArray(parsed.buyerPersona.dores) || !parsed.buyerPersona.dores.every(d => typeof d === 'string') || !Array.isArray(parsed.buyerPersona.desejos) || !parsed.buyerPersona.desejos.every(d => typeof d === 'string') || typeof parsed.buyerPersona.ticketMedio !== 'number') throw new Error('Campo "buyerPersona" ausente ou inválido na resposta da IA');
   if (!parsed.investimentoEstimado || typeof parsed.investimentoEstimado.capexTotal !== 'number' || typeof parsed.investimentoEstimado.opexMensal !== 'number' || typeof parsed.investimentoEstimado.pontoEquilibrioMeses !== 'number' || typeof parsed.investimentoEstimado.faturamentoEstimadoMensal !== 'number') throw new Error('Campo "investimentoEstimado" ausente ou inválido na resposta da IA');
   if (!parsed.aspectosLegaisTributarios || typeof parsed.aspectosLegaisTributarios.cnaeSugerido !== 'string' || typeof parsed.aspectosLegaisTributarios.regimeTributario !== 'string' || !Array.isArray(parsed.aspectosLegaisTributarios.licencasExigidas) || !parsed.aspectosLegaisTributarios.licencasExigidas.every(l => typeof l === 'string')) throw new Error('Campo "aspectosLegaisTributarios" ausente ou inválido na resposta da IA');

   return {
     promptOriginal: promptNegocio,
     nomeNegocioSugerido: parsed.nomeNegocioSugerido,
     setor: parsed.setor,
     cidadeUf: parsed.cidadeUf,
     resumoExecutivo: parsed.resumoExecutivo,
     oportunidadeMercado: parsed.oportunidadeMercado,
     tendencias2025_2026: parsed.tendencias2025_2026,
     concorrentesMapeados: parsed.concorrentesMapeados,
     buyerPersona: parsed.buyerPersona,
     investimentoEstimado: parsed.investimentoEstimado,
     aspectosLegaisTributarios: parsed.aspectosLegaisTributarios,
     fontesPesquisa,
     geradoEm: new Date().toISOString()
   };
}
