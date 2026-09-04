import { Router } from 'express';
import { ResearchEngine } from '../../src/research/ResearchEngine.ts';

const router = Router();

// 10.1 IA Deep Research V2 - Research Engine Agentic com Evidence Store
router.post('/ai/deep-research-v2', async (req, res) => {
  const {
    prompt,
    cidadeUf,
    orcamentoEstimado,
    publicoAlvo,
    modeloAprofundado,
    idPlano,
    maxIterations
  } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O prompt da ideia de negócio é obrigatório.'
    });
  }

  // Validate required idPlano for research execution
  if (!idPlano || typeof idPlano !== 'string' || idPlano.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O ID do plano de negócio é obrigatório para execução da pesquisa.'
    });
  }

  try {
    const engine = new ResearchEngine();
    const result = await engine.execute({
      prompt,
      cidadeUf: cidadeUf || 'Brasil / Nacional',
      orcamentoEstimado: Number(orcamentoEstimado) || 100000,
      publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
      modeloAprofundado: !!modeloAprofundado,
      idPlano: idPlano,
      maxIterations: maxIterations || 3,
    });

    res.json({
      status: 'ok',
      iterations: result.iterations,
      durationMs: result.durationMs,
      report: result.report
    });
  } catch (err: any) {
    console.error('[API /api/ai/deep-research-v2] Erro:', err);
    res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar Deep Research V2' });
  }
});

// Contract: synthesize-plan - Integrates with research service to generate canonical business model
router.post('/ai/synthesize-plan', async (req, res) => {
  const {
    prompt,
    cidadeUf,
    orcamentoEstimado,
    publicoAlvo,
    modeloAprofundado,
    idPlano,
    maxIterations
  } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O prompt da ideia de negócio é obrigatório.'
    });
  }

  if (!idPlano || typeof idPlano !== 'string' || idPlano.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O ID do plano de negócio é obrigatório.'
    });
  }

  try {
    // First execute research to gather evidence and claims
    const engine = new ResearchEngine();
    const researchResult = await engine.execute({
      prompt,
      cidadeUf: cidadeUf || 'Brasil / Nacional',
      orcamentoEstimado: Number(orcamentoEstimado) || 100000,
      publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
      modeloAprofundado: !!modeloAprofundado,
      idPlano: idPlano,
      maxIterations: maxIterations || 3,
    });

    // The research result already contains the synthesized canonical model in the report
    // Extract and return the canonical business model
    const canonicalModel = researchResult.report.canonicalModel;

    res.json({
      status: 'ok',
      canonicalModel,
      researchMetadata: {
        iterations: researchResult.iterations,
        durationMs: researchResult.durationMs,
        evidenceCount: researchResult.report.evidence.length,
        claimsCount: researchResult.report.claims.length,
        sourcesCount: researchResult.report.sources.length
      }
    });
  } catch (err: any) {
    console.error('[API /api/ai/synthesize-plan] Erro:', err);
    res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao sintetizar plano de negócio' });
  }
});

// Contract: fill-batch - Process PNBOX form filling with real data
router.post('/automation/fill-batch', async (req, res) => {
  const {
    templateId,
    dados,
    customData,
    idPlano
  } = req.body || {};

  // Validate required fields
  if (!templateId || typeof templateId !== 'string') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O ID do template é obrigatório.'
    });
  }

  if (!idPlano || typeof idPlano !== 'string') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O ID do plano é obrigatório.'
    });
  }

  // Validate dados field - should be an object or array
  if (dados !== undefined && typeof dados !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo dados deve ser um objeto ou array.'
    });
  }

  // Validate customData field - should be an object if provided
  if (customData !== undefined && typeof customData !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo customData deve ser um objeto.'
    });
  }

  try {
    // Import automation utilities
    const { prepararEstruturaExecucao, executarLote } = await import('../../src/automation/realRunner.ts');
    const { TEMPLATES_NEGOCIO } = await import('../../src/automation/businessTemplates.ts');
    const { FERRAMENTAS_PNBOX } = await import('../../src/automation/schemaCatalog.ts');

    // Find the template
    const template = TEMPLATES_NEGOCIO.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({
        status: 'error',
        mensagem: `Template não encontrado: ${templateId}`
      });
    }

    // Prepare execution structure with real data processing
    const batchConfig = prepararEstruturaExecucao(templateId, idPlano);
    
    // Process dados and customData if provided
    let processedData = {};
    if (dados) {
      processedData = { ...processedData, ...dados };
    }
    if (customData) {
      processedData = { ...processedData, ...customData };
    }

    // In a real implementation, we would get the user's authentication context from the request
    // For this example, we'll assume the user has already authenticated and we have their credentials
    // In a production environment, this would come from the JWT token or session
    
    // For now, we'll return an error indicating that authentication is required
    // In a real implementation, we would extract the user ID from the JWT token
    // and use the pnboxOidcLoginViaPlaywright function to get authenticated context
    
    res.status(501).json({
      status: 'error',
      mensagem: 'Autenticação PNBOX necessária. Por favor, conecte-se ao PNBOX primeiro usando o endpoint /api/pnbox/connect'
    });
  } catch (err: any) {
    console.error('[API /api/automation/fill-batch] Erro:', err);
    res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar lote de preenchimento' });
  }
});

export function registerAutomationRoutes(app) {
  app.use('/api/ai', router);
  app.use('/api/automation', router);
}