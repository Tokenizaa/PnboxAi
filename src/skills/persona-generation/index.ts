import { aiProvider } from '../../ai/unifiedProvider';

export interface BuyerPersonaDetailed {
  nome: string;
  cargoOcupacao: string;
  faixaEtaria: string;
  rendaMediaMensal: string;
  perfilComportamental: string;
  doresPrincipais: string[];
  desejosObjetivos: string[];
  ondeBuscaInformacao: string[];
  gatilhosDeCompra: string[];
  objecoesFrequentes: string[];
  ticketMedioEsperado: number;
}

export class PersonaGenerationSkill {
  public async generate(
    segmento: string,
    publicoAlvoDescrito: string,
    ticketEstimado?: number
  ): Promise<BuyerPersonaDetailed> {
    const systemPrompt = `Você é um especialista em comportamento do consumidor e marketing do Sebrae.
Gere uma Buyer Persona profunda, realista e aplicável para o mercado brasileiro.
Evite generalismos. Descreva dores concretas e hábitos reais de consumo.`;

    const userPrompt = `Gere a Buyer Persona ideal para o seguinte negócio:
Segmento: "${segmento}"
Público Alvo Informado: "${publicoAlvoDescrito}"
Ticket Médio Estimado: ${ticketEstimado ? `R$ ${ticketEstimado}` : 'A estimar'}

Retorne a persona detalhada em formato JSON.`;

    const schemaDescription = `{
  "nome": "string",
  "cargoOcupacao": "string",
  "faixaEtaria": "string",
  "rendaMediaMensal": "string",
  "perfilComportamental": "string",
  "doresPrincipais": ["dor 1", "dor 2", "dor 3"],
  "desejosObjetivos": ["desejo 1", "desejo 2"],
  "ondeBuscaInformacao": ["canal 1", "canal 2"],
  "gatilhosDeCompra": ["gatilho 1", "gatilho 2"],
  "objecoesFrequentes": ["objeção 1", "objeção 2"],
  "ticketMedioEsperado": 150
}`;

    return await aiProvider.generateStructured<BuyerPersonaDetailed>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );
  }
}

export const personaGenerationSkill = new PersonaGenerationSkill();
