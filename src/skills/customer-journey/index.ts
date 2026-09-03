import { aiProvider } from '../../ai/unifiedProvider';

export interface JourneyStage {
  fase: 'descoberta' | 'consideracao' | 'decisao' | 'retencao' | 'recomendacao';
  tituloFase: string;
  pontoContato: string;
  pensamentoCliente: string;
  acaoCliente: string;
  oportunidadeEmpresa: string;
  indicadorSucesso: string;
}

export interface CustomerJourneyResult {
  resumoJornada: string;
  estagios: JourneyStage[];
}

export class CustomerJourneySkill {
  public async mapJourney(
    propostaValor: string,
    personaNome: string,
    setor: string
  ): Promise<CustomerJourneyResult> {
    const systemPrompt = `Você é um especialista em experiência do cliente (CX) e jornada de compra do Sebrae.
Mapeie a jornada do cliente completa em 5 estágios essenciais com pontos de contato reais no Brasil.`;

    const userPrompt = `Mapeie a jornada do cliente para:
Setor: "${setor}"
Persona: "${personaNome}"
Proposta de Valor: "${propostaValor}"

Retorne os 5 estágios em formato JSON estruturado.`;

    const schemaDescription = `{
  "resumoJornada": "string",
  "estagios": [
    {
      "fase": "descoberta | consideracao | decisao | retencao | recomendacao",
      "tituloFase": "string",
      "pontoContato": "string",
      "pensamentoCliente": "string",
      "acaoCliente": "string",
      "oportunidadeEmpresa": "string",
      "indicadorSucesso": "string"
    }
  ]
}`;

    return await aiProvider.generateStructured<CustomerJourneyResult>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );
  }
}

export const customerJourneySkill = new CustomerJourneySkill();
