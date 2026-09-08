import { Router, Express } from 'express';
import { authMiddleware, optionalAuthMiddleware } from '../services/authStore';
import { getUserPlans, setUserPlans } from '../services/plansStore';
import { ResearchEngine } from '../../research/ResearchEngine';
import { executarPesquisaUnificada } from '../../automation/aiProviders';
import { SchemaGenerator } from '../../utils/schemaGenerator';

const researchRouter = Router();
const aiRouter = Router();

// ===== RESEARCH API =====
researchRouter.post('/', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  const { planId, prompt, cidadeUf, orcamentoEstimado, publicoAlvo, modeloAprofundado, maxIterations } = req.body || {};

  if (!planId || !prompt?.trim()) {
    return res.status(400).json({ status: 'error', message: 'planId e prompt são obrigatórios' });
  }

  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  try {
    const engine = new ResearchEngine();
    const result = await engine.execute({
      prompt,
      cidadeUf: cidadeUf || 'Brasil / Nacional',
      orcamentoEstimado: Number(orcamentoEstimado) || 100000,
      publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
      modeloAprofundado: !!modeloAprofundado,
      idPlano: planId,
      maxIterations: maxIterations || 3,
    });

    plan.researchStatus = 'completed';
    plan.progress = Math.max(plan.progress, 30);
    plan.updatedAt = new Date().toISOString();
    setUserPlans(user.id, plans);

    res.json({ status: 'ok', report: result.report });
  } catch (err: any) {
    plan.researchStatus = 'failed';
    plan.updatedAt = new Date().toISOString();
    setUserPlans(user.id, plans);
    res.status(500).json({ status: 'error', message: err.message || 'Erro ao executar pesquisa' });
  }
});

researchRouter.get('/:planId', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.planId);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  res.json({
    status: 'ok',
    report: {
      plan: { id: req.params.planId },
      sources: [],
      evidence: [],
      claims: [],
      gaps: [],
      contradictions: [],
      sufficiency: { overall: 0, byCategory: {}, criticalGaps: [], minimumIterations: 2, targetIterations: 3, maximumIterations: 7, canConclude: false },
      canonicalModel: {},
      pnboxCollections: {},
      validation: { valid: true, totalErrors: 0, totalWarnings: 0, detailsByCollection: {}, detailsByTool: {} },
      completedAt: new Date().toISOString(),
    },
  });
});

// ===== AI ROUTES =====
aiRouter.post('/deep-research', optionalAuthMiddleware, async (req, res) => {
  const {
    prompt,
    cidadeUf,
    orcamentoEstimado,
    publicoAlvo,
    modeloAprofundado,
    provider,
    useSearchGrounding,
    nvidiaApiKey,
    nvidiaModel,
    nvidiaAccountSlot,
    geminiModel
  } = req.body || {};

  if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O prompt da ideia de negócio é obrigatório.'
    });
  }

  try {
    const planoGerado = await executarPesquisaUnificada(
      prompt,
      {
        cidadeUf,
        orcamentoEstimado: Number(orcamentoEstimado) || undefined,
        publicoAlvo,
        modeloAprofundado: !!modeloAprofundado,
        provider: provider || 'nvidia',
        useSearchGrounding: !!useSearchGrounding,
        nvidiaApiKey,
        nvidiaModel,
        nvidiaAccountSlot,
        geminiModel
      }
    );
    res.json({
      status: 'ok',
      report: planoGerado,
      plano: planoGerado
    });
  } catch (err: any) {
    console.error('[API /api/ai/deep-research] Erro:', err);
    res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar Deep Research' });
  }
});

aiRouter.post('/deep-research-v2', optionalAuthMiddleware, async (req, res) => {
  const {
    prompt,
    cidadeUf,
    orcamentoEstimado,
    publicoAlvo,
    modeloAprofundado,
    idPlano,
    maxIterations,
    provider,
    nvidiaApiKey,
    nvidiaModel
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

aiRouter.post('/synthesize-plan', optionalAuthMiddleware, async (req, res) => {
  const {
    prompt,
    cidadeUf,
    orcamentoEstimado,
    publicoAlvo,
    modeloAprofundado,
    idPlano,
    maxIterations,
    research,
    provider,
    nvidiaApiKey,
    nvidiaModel
  } = req.body || {};

  const rawIdPlano = idPlano || req.body?.planId || '';
  const effectiveIdPlano = (rawIdPlano && rawIdPlano !== ':idPlano' && !rawIdPlano.startsWith('plano_'))
    ? rawIdPlano
    : '';

  try {
    // Caso 1: Já recebemos o relatório de pesquisa (ex: vindo de /api/ai/deep-research)
    if (research && typeof research === 'object') {
      const dados14 = SchemaGenerator.generateFromResearch(research, effectiveIdPlano);
      return res.json({
        status: 'ok',
        dados14Ferramentas: dados14,
        planData: dados14,
        canonicalModel: (research as any).canonicalModel || null,
        report: research
      });
    }

    // Caso 2: Gerar pesquisa e sintetizar diretamente a partir do prompt
    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        mensagem: 'O prompt da ideia de negócio ou o relatório de pesquisa é obrigatório.'
      });
    }

    const engine = new ResearchEngine();
    const researchResult = await engine.execute({
      prompt,
      cidadeUf: cidadeUf || 'Brasil / Nacional',
      orcamentoEstimado: Number(orcamentoEstimado) || 100000,
      publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
      modeloAprofundado: !!modeloAprofundado,
      idPlano: effectiveIdPlano,
      maxIterations: maxIterations || 3,
    });

    const canonicalModel = researchResult.report.canonicalModel;
    const dados14 = SchemaGenerator.generateFromResearch(researchResult.report, effectiveIdPlano);

    return res.json({
      status: 'ok',
      dados14Ferramentas: dados14,
      planData: dados14,
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
    return res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao sintetizar plano de negócio' });
  }
});

export function registerResearchRoutes(app: Express) {
  app.use('/api/research', researchRouter);
  app.use('/api/ai', aiRouter);
}
