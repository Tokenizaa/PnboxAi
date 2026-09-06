import { Router, Express } from 'express';
import { authMiddleware } from '../services/authStore';
import { listarPlanosPnbox, carregarDocumentosFerramentaPnbox, salvarOuAtualizarRegistroFerramentaPnbox, DdpAuthContext } from '../../automation/realRunner';
import { obterSessaoUsuario, atualizarPlanosSessao } from '../../automation/auth';
import { FERRAMENTAS_PNBOX } from '../../automation/schemaCatalog';
import { PlanoCriadoInfo } from '../../types/pnbox';

const plansRouter = Router();
const pnboxPlansRouter = Router();

function requirePnboxSession(userId: string) {
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) throw new Error('Sessão PNBOX não autenticada');
  return {
    sessao,
    authContext: {
      cookies: sessao.cookiesPnbox,
      loginToken: sessao.idToken,
      userId: sessao.meteorUserId || userId,
    } as DdpAuthContext,
  };
}

function pnboxToUserPlan(plano: PlanoCriadoInfo) {
  return {
    id: plano.idPlano,
    name: plano.nomePlano,
    description: plano.descricao,
    sector: plano.setor,
    city: plano.cidadeUf,
    progress: Math.min(100, Math.max(0, Number(plano.ferramentasPreenchidas || 0) / FERRAMENTAS_PNBOX.length * 100)),
    status: plano.status === 'preenchido_completo' ? 'pronto' : 'rascunho',
    researchStatus: 'pending',
    executionStatus: 'pending',
    toolsFilled: Number(plano.ferramentasPreenchidas || 0),
    createdAt: plano.criadoEm,
    updatedAt: plano.ultimaSincronizacao || plano.criadoEm,
    sincronizadoPnbox: true,
  };
}

async function listPlans(req: any, res: any) {
  const userId = req.user.id;
  try {
    const { authContext } = requirePnboxSession(userId);
    const planos = await listarPlanosPnbox(authContext);
    atualizarPlanosSessao(userId, planos);
    return res.json({ status: 'ok', plans: planos.map(pnboxToUserPlan), planos });
  } catch (err: any) {
    return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message });
  }
}

function creationNotConfirmed(_req: any, res: any) {
  return res.status(501).json({
    status: 'error',
    code: 'PNBOX_CREATE_CONTRACT_UNVERIFIED',
    message: 'Criação automática bloqueada: o método oficial de criação do PNBOX ainda não foi confirmado por tráfego DDP real. Nenhum plano local ou ID sintético será criado.',
  });
}

plansRouter.get('/', authMiddleware, listPlans);
plansRouter.post('/', authMiddleware, creationNotConfirmed);
plansRouter.patch('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Alteração de plano bloqueada: método oficial ainda não confirmado.' }));
plansRouter.delete('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Exclusão de plano bloqueada: método oficial ainda não confirmado.' }));
plansRouter.post('/:id/archive', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Arquivamento bloqueado: método oficial ainda não confirmado.' }));
plansRouter.post('/:id/duplicate', authMiddleware, creationNotConfirmed);

pnboxPlansRouter.get('/plans', authMiddleware, listPlans);
pnboxPlansRouter.post('/plans', authMiddleware, creationNotConfirmed);
const automationPlansRouter = Router();
automationPlansRouter.get('/planos/list', authMiddleware, listPlans);
automationPlansRouter.post('/planos/create', authMiddleware, creationNotConfirmed);

pnboxPlansRouter.get('/plans/:id/pull-all', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    const dados14: Record<string, Record<string, unknown>[]> = {};
    const erros: Record<string, string> = {};
    for (const ferramenta of FERRAMENTAS_PNBOX) {
      try {
        const docs = await carregarDocumentosFerramentaPnbox(req.params.id, ferramenta.id, authContext);
        if (docs.length) dados14[ferramenta.id] = docs;
      } catch (e: any) {
        erros[ferramenta.id] = e.message;
      }
    }
    const failed = Object.keys(erros).length;
    return res.status(failed ? 207 : 200).json({ status: failed ? 'partial' : 'ok', idPlano: req.params.id, dados14Ferramentas: dados14, totalFerramentasPreenchidas: Object.keys(dados14).length, erros: failed ? erros : undefined });
  } catch (err: any) {
    return res.status(502).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/push-all', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    const resultados: Record<string, any[]> = {};
    let totalSalvos = 0;
    let totalFalhas = 0;
    for (const [ferramentaId, itens] of Object.entries(req.body?.dados14Ferramentas || {})) {
      if (!Array.isArray(itens) || !itens.length) continue;
      resultados[ferramentaId] = [];
      for (const item of itens) {
        try {
          const r = await salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId, item as Record<string, unknown>, req.params.id, authContext);
          resultados[ferramentaId].push(r);
          if (r.confirmed) totalSalvos++; else totalFalhas++;
        } catch (e: any) {
          totalFalhas++;
          resultados[ferramentaId].push({ status: 'SAVE_FAILED', confirmed: false, mensagem: e.message });
        }
      }
    }
    return res.status(totalFalhas ? 207 : 200).json({ status: totalFalhas ? 'partial' : 'ok', idPlano: req.params.id, totalSalvos, totalFalhas, resultados });
  } catch (err: any) {
    return res.status(502).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.get('/plans/:id/tools/:ferramentaId', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    const documentos = await carregarDocumentosFerramentaPnbox(req.params.id, req.params.ferramentaId, authContext);
    return res.json({ status: 'ok', documentos });
  } catch (err: any) {
    return res.status(502).json({ status: '502', code: 'PNBOX_TOOL_READ_FAILED', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/tools/:ferramentaId/item', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    const resultado = await salvarOuAtualizarRegistroFerramentaPnbox(req.params.ferramentaId, req.body || {}, req.params.id, authContext);
    return resultado.confirmed
      ? res.json({ status: 'ok', resultado })
      : res.status(502).json({ status: 'error', code: 'PNBOX_TOOL_SAVE_UNCONFIRMED', resultado });
  } catch (err: any) {
    return res.status(502).json({ status: 'error', message: err.message });
  }
});

export function registerPlansRoutes(app: Express) {
  app.use('/api/plans', plansRouter);
  app.use('/api/pnbox', pnboxPlansRouter);
  app.use('/api/automation', automationPlansRouter);
}
