import { aiProvider } from '../../ai/unifiedProvider';

export interface ValuePropositionResult {
  headline: string;
  subheadline: string;
  doresAliviadas: string[];
  ganhosCriados: string[];
  produtosServicosPrincipais: string[];
  diferencialUnico: string;
  razaoParaAcreditar: string;
}

export class ValuePropositionSkill {
  public async generate(
    ideiaNegocio: string,
    setor: string,
    doresPersona: string[],
    desejosPersona: string[]
  ): Promise<ValuePropositionResult> {
    const systemPrompt = `Você é um consultor de estratégia do Sebrae especialista no Value Proposition Canvas (Alexander Osterwalder).
Crie uma Proposta de Valor irrecusável e de alto impacto no mercado brasileiro.`;

    const userPrompt = `Construa a Proposta de Valor para:
Ideia: "${ideiaNegocio}"
Setor: "${setor}"
Dores da Persona: ${JSON.stringify(doresPersona)}
Desejos da Persona: ${JSON.stringify(desejosPersona)}

Retorne em formato JSON estruturado.`;

    const schemaDescription = `{
  "headline": "Frase de impacto principal",
  "subheadline": "Explicação concisa de como e para quem",
  "doresAliviadas": ["Alívio 1", "Alívio 2"],
  "ganhosCriados": ["Ganho 1", "Ganho 2"],
  "produtosServicosPrincipais": ["Serviço A", "Serviço B"],
  "diferencialUnico": "O que nenhuma outra empresa do setor entrega",
  "razaoParaAcreditar": "Fatos ou métricas que comprovam a promessa"
}`;

    return await aiProvider.generateStructured<ValuePropositionResult>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );
  }
}

export const valuePropositionSkill = new ValuePropositionSkill();
