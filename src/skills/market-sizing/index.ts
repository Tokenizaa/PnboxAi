import { aiProvider } from '../../ai/unifiedProvider';

export interface MarketSizingResult {
  tamDescricao: string;
  tamValorBrl: number;
  samDescricao: string;
  samValorBrl: number;
  somDescricao: string;
  somValorBrl: number;
  crescimentoAnualPct: number;
  fatoresImpulsionadores: string[];
  riscosMercado: string[];
}

export class MarketSizingSkill {
  public async calculate(
    setor: string,
    cidadeUf: string,
    publicoAlvo: string
  ): Promise<MarketSizingResult> {
    const systemPrompt = `Você é um economista sênior do Sebrae e especialista em dimensionamento de mercado (TAM, SAM, SOM) no Brasil.
Baseie-se em dados macroeconômicos reais do IBGE, CNC e estudos setoriais.`;

    const userPrompt = `Calcule o dimensionamento de mercado (TAM / SAM / SOM) para:
Setor: "${setor}"
Região: "${cidadeUf}"
Público-Alvo: "${publicoAlvo}"

Responda em formato JSON estruturado com estimativas numéricas em Reais (BRL).`;

    const schemaDescription = `{
  "tamDescricao": "Total Addressable Market (Mercado Total Brasil)",
  "tamValorBrl": 5000000000,
  "samDescricao": "Serviceable Available Market (Mercado Atendível Regional)",
  "samValorBrl": 85000000,
  "somDescricao": "Serviceable Obtainable Market (Participação Inicial Viável)",
  "somValorBrl": 1200000,
  "crescimentoAnualPct": 8.5,
  "fatoresImpulsionadores": ["fator 1", "fator 2"],
  "riscosMercado": ["risco 1", "risco 2"]
}`;

    return await aiProvider.generateStructured<MarketSizingResult>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );
  }
}

export const marketSizingSkill = new MarketSizingSkill();
