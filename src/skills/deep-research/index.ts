import { webResearchSkill, WebResearchResult } from '../web-research';
import { sourceValidationSkill, ValidatedSource } from '../source-validation';
import { databaseSkill } from '../database';

export interface DeepResearchSkillOptions {
  prompt: string;
  setor?: string;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  userId: string;
  planId: string;
  maxIterations?: number;
}

export interface DeepResearchSkillResult {
  researchId: string;
  planId: string;
  userId: string;
  resumoExecutivo: string;
  oportunidadeMercado: string;
  tendencias: string[];
  fontes: ValidatedSource[];
  fatosVerificados: Array<{ claim: string; evidence: string; sourceUrl: string; confidence: number }>;
  duracaoMs: number;
  concluidoEm: string;
}

export class DeepResearchSkill {
  public async execute(options: DeepResearchSkillOptions): Promise<DeepResearchSkillResult> {
    const inicio = Date.now();
    const researchId = 'res_' + Math.random().toString(36).substring(2, 9);
    const maxIters = options.maxIterations || 2;

    const queries = [
      {
        query: `Panorama de mercado e demanda para ${options.prompt} em ${options.cidadeUf || 'Brasil'}`,
        category: 'market' as const
      },
      {
        query: `Concorrentes e barreiras de entrada para ${options.prompt}`,
        category: 'competitors' as const
      }
    ];

    const allSources: ValidatedSource[] = [];
    const allFacts: Array<{ claim: string; evidence: string; sourceUrl: string; confidence: number }> = [];
    const summaries: string[] = [];

    for (let i = 0; i < Math.min(queries.length, maxIters); i++) {
      const q = queries[i];
      const res: WebResearchResult = await webResearchSkill.search({
        query: q.query,
        category: q.category,
        location: options.cidadeUf,
        industry: options.setor
      });

      summaries.push(res.summary);
      allSources.push(...res.sources);
      allFacts.push(...res.facts);
    }

    // Valida e consolida fontes únicas
    const uniqueSources = sourceValidationSkill.validateBatch(allSources);

const result: DeepResearchSkillResult = {
       researchId,
       planId: options.planId,
       userId: options.userId,
       resumoExecutivo: summaries.length > 0 ? summaries[0] : '',
       oportunidadeMercado: summaries.length > 1 ? summaries[1] : '',
       tendencias: [], // To be derived from research if needed
       fontes: uniqueSources,
       fatosVerificados: allFacts,
       duracaoMs: Date.now() - inicio,
       concluidoEm: new Date().toISOString()
     };

    // Persistência real no banco através da DatabaseSkill
    await databaseSkill.insert('research', {
      id: researchId,
      userId: options.userId,
      planId: options.planId,
      titulo: `Pesquisa: ${options.prompt}`,
      status: 'completed',
      resultado: result,
      fontesCount: uniqueSources.length,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    });

    return result;
  }
}

export const deepResearchSkill = new DeepResearchSkill();
