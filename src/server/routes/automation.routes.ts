import { Router } from 'express';
import { ResearchEngine } from '../../src/research/ResearchEngine.ts';
import { DatabaseSkill } from '../../src/skills/database/index.ts';
import { prepararEstruturaExecucao, executarLote, BatchExecutionSummary, DdpAuthContext } from '../../src/automation/realRunner.ts';
import { TEMPLATES_NEGOCIO } from '../../src/automation/businessTemplates.ts';
import { FERRAMENTAS_PNBOX } from '../../src/automation/schemaCatalog.ts';
import { obterSessaoUsuario } from '../../src/automation/auth.ts';

const router = Router();
const db = new DatabaseSkill();

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

  // Validate dados field - should be a non-null object or array
  if (dados !== null && dados !== undefined && typeof dados !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo dados deve ser um objeto ou array.'
    });
  }

  // Validate customData field - should be a non-null object if provided
  if (customData !== null && customData !== undefined && typeof customData !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo customData deve ser um objeto.'
    });
  }

  try {
    // Get user ID from JWT token (set by authMiddleware)
    const userId = req.user?.id;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Usuário não autenticado. Token JWT inválido ou ausente.'
      });
    }

    // Find the template
    const template = TEMPLATES_NEGOCIO.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({
        status: 'error',
        mensagem: `Template não encontrado: ${templateId}`
      });
    }

    // Get user's PNBOX session
    const sessao = obterSessaoUsuario(userId);
    
    // Check if we have a valid session
    if (!sessao) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Sessão PNBOX não encontrada. Por favor, conecte-se ao PNBOX primeiro usando o endpoint /api/pnbox/connect'
      });
    }
    
    // Check if session is expired
    if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Sessão PNBOX expirada. Por favor, reconecte-se ao PNBOX usando o endpoint /api/pnbox/connect'
      });
    }

    // Process dados and customData if provided
    let processedData = {};
    if (dados) {
      processedData = { ...processedData, ...dados };
    }
    if (customData) {
      processedData = { ...processedData, ...customData };
    }

    // Create DDP authentication context from PNBOX session
    const authContext: DdpAuthContext = {
      cookies: sessao.cookiesPnbox,
      loginToken: sessao.idToken,
      userId: sessao.meteorUserId || userId, // Use meteorUserId if available, fallback to platform userId
      connectionId: `${userId}_pnbox_${Date.now()}`
    };

    // Execute the batch with real PNBOX connection
    const result: BatchExecutionSummary = await executarLote(
      templateId,
      processedData,
      idPlano,
      authContext
    );

    // Return the actual execution results
    res.json({
      status: 'ok',
      data: result
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