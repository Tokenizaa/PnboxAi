import { Router } from 'express';
import { ResearchEngine } from '../../research/ResearchEngine.ts';
import { DatabaseSkill } from '../../skills/database/index.ts';
import { prepararEstruturaExecucao, executarLote, BatchExecutionSummary, DdpAuthContext } from '../../automation/realRunner.ts';
import { TEMPLATES_NEGOCIO } from '../../automation/businessTemplates.ts';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from '../../automation/schemaCatalog.ts';
import { obterSessaoUsuario, obterStatusSessaoUsuario, simularExpiracaoSessao, iniciarSessaoPlaywright, globalAuthState } from '../../automation/auth.ts';
import { obterEventosTrafego, limparEventosTrafego } from '../../automation/trafficMonitor.ts';
import { extrairIdPlano } from '../../utils/planUtils.ts';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();
const db = new DatabaseSkill();

// Catalog público de ferramentas PNBOX
router.get('/catalog', (req, res) => {
  res.json({
    status: 'ok',
    idPlanoPadrao: ID_PLANO_PADRAO,
    totalFerramentas: FERRAMENTAS_PNBOX.length,
    ferramentas: FERRAMENTAS_PNBOX
  });
});

// Templates de modelos de negócio prontos
router.get('/templates', (req, res) => {
  res.json({ status: 'ok', templates: TEMPLATES_NEGOCIO });
});

// Status da sessão PNBOX do usuário autenticado
router.get('/auth/status', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  const session = obterStatusSessaoUsuario(userId);
  res.json({
    status: 'ok',
    isOnline: true,
    isExpired: session.isExpired || false,
    session
  });
});

// Marca sessão como expirada (teste de reconexão)
router.post('/auth/expire', authMiddleware, (req, res) => {
  const result = simularExpiracaoSessao();
  res.json({
    status: 'ok',
    mensagem: 'Sessão marcada como expirada para fins de teste de reconexão.',
    session: result
  });
});

// Login oficial PNBOX (Sebrae ID) — SEMPRE LIVE
router.post('/auth/login', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { cpf, password, idPlano, consentimentoAceito } = req.body || {};

  if (!cpf || !password) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'CPF e senha são obrigatórios.'
    });
  }
  if (!consentimentoAceito) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'É necessário aceitar o consentimento de uso das credenciais.'
    });
  }

  const modo: 'DRY_RUN' | 'LIVE' = 'LIVE';
  globalAuthState.modoExecucao = modo;

  const idPlanoNormalizado = extrairIdPlano(idPlano || '') || ID_PLANO_PADRAO;
  const credenciais = {
    cpf: String(cpf).trim(),
    password: String(password),
    idPlano: idPlanoNormalizado
  };

  const sessionResult = await iniciarSessaoPlaywright(credenciais, consentimentoAceito, modo, userId);
  const isAuth = sessionResult.status === 'authenticated';
  res.json({
    status: isAuth ? 'ok' : 'error',
    session: sessionResult,
    mensagem: isAuth
      ? 'Sessão oficial LIVE conectada com sucesso no PNBOX.'
      : (sessionResult.ultimoLog || 'Falha ao autenticar sessão com o Sebrae ID.')
  });
});

// Monitor de tráfego de rede (XHR/Fetch/DDP)
router.get('/traffic', (req, res) => {
  const { tipo, apenasSalvamento, ferramentaId } = req.query;
  const eventos = obterEventosTrafego({
    tipo: tipo ? String(tipo) : undefined,
    apenasSalvamento: apenasSalvamento === 'true',
    ferramentaId: ferramentaId ? String(ferramentaId) : undefined
  });
  res.json({ status: 'ok', total: eventos.length, eventos });
});

// Limpeza do histórico de tráfego
router.post('/traffic/clear', (req, res) => {
  limparEventosTrafego();
  res.json({ status: 'ok', mensagem: 'Histórico de tráfego limpo com sucesso.' });
});

// 10.1 IA Deep Research V2 - Research Engine Agentic com Evidence Store
router.post('/deep-research-v2', async (req, res) => {
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
router.post('/synthesize-plan', async (req, res) => {
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

  if (!idPlano || typeof idPlano !== 'string') {
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
router.post('/fill-batch', async (req, res) => {
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