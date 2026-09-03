import { aiProvider } from '../../ai/unifiedProvider';

export interface CompetitorProfile {
  nome: string;
  tipo: 'direto' | 'indireto' | 'substituto';
  pontosFortes: string;
  pontosFracos: string;
  precoEstimado: string;
  diferencialSuperacao: string;
  presencaMercado: string;
}

export interface CompetitorAnalysisResult {
  segmento: string;
  concorrentes: CompetitorProfile[];
  oportunidadesVazias: string[];
  vantagemCompetitivaSugerida: string;
}

export class CompetitorAnalysisSkill {
  public async analyze(
    segmento: string,
    proposta: string,
    cidadeUf: string = 'Brasil'
  ): Promise<CompetitorAnalysisResult> {
    const systemPrompt = `Você é um analista sênior de inteligência competitiva do Sebrae.
Mapeie o cenário de concorrência real para um novo negócio em ${cidadeUf}.
Identifique concorrentes reais ou arquétipos predominantes do mercado brasileiro.`;

    const userPrompt = `Analise a concorrência para:
Segmento: "${segmento}"
Proposta de Valor: "${proposta}"
Localização: "${cidadeUf}"

Retorne a matriz competitiva detalhada em formato JSON.`;

    const schemaDescription = `{
  "segmento": "string",
  "concorrentes": [
    {
      "nome": "string",
      "tipo": "direto | indireto | substituto",
      "pontosFortes": "string",
      "pontosFracos": "string",
      "precoEstimado": "string",
      "diferencialSuperacao": "string",
      "presencaMercado": "string"
    }
  ],
  "oportunidadesVazias": ["string"],
  "vantagemCompetitivaSugerida": "string"
}`;

    return await aiProvider.generateStructured<CompetitorAnalysisResult>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );
  }
}

export const competitorAnalysisSkill = new CompetitorAnalysisSkill();
