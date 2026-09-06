import { Router, Express } from 'express';
import { authMiddleware } from '../services/authStore';
import {
  UserPlan,
  generatePlanId,
  getUserPlans,
  setUserPlans
} from '../services/plansStore';
import {
  listarPlanosPnbox,
  carregarDocumentosFerramentaPnbox,
  salvarOuAtualizarRegistroFerramentaPnbox,
  criarPlanoPnboxDdp,
  DdpAuthContext
} from '../../automation/realRunner';
import { obterSessaoUsuario, atualizarPlanosSessao } from '../../automation/auth';
import { FERRAMENTAS_PNBOX } from '../../automation/schemaCatalog';

const plansRouter = Router();
const pnboxPlansRouter = Router();

// ===== PLANS CRUD API (User-owned) =====
plansRouter.get('/', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  res.json({ status: 'ok', plans });
});

plansRouter.post('/', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const { name, description, sector, city } = req.body || {};

  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' });
  }

  const now = new Date().toISOString();
  const plan: UserPlan = {
    id: generatePlanId(),
    userId: user.id,
    name: name.trim(),
    description: description?.trim() || '',
    sector: sector?.trim() || 'Não definido',
    city: city?.trim() || 'Brasil',
    progress: 0,
    status: 'rascunho',
    researchStatus: 'pending',
    executionStatus: 'pending',
    toolsFilled: 0,
    createdAt: now,
    updatedAt: now,
  };

  const plans = getUserPlans(user.id);
  plans.unshift(plan);
  setUserPlans(user.id, plans);

  res.status(201).json({ status: 'ok', plan });
});

plansRouter.get('/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.id);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  res.json({ status: 'ok', plan });
});

plansRouter.patch('/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const planIndex = plans.findIndex(p => p.id === req.params.id);

  if (planIndex === -1) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  const updates = req.body || {};
  const allowedFields = ['name', 'description', 'sector', 'city', 'progress', 'status', 'researchStatus', 'executionStatus', 'toolsFilled'];
  const filteredUpdates: Partial<UserPlan> = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      (filteredUpdates as any)[key] = updates[key];
    }
  }

  filteredUpdates.updatedAt = new Date().toISOString();
  plans[planIndex] = { ...plans[planIndex], ...filteredUpdates };
  setUserPlans(user.id, plans);

  res.json({ status: 'ok', plan: plans[planIndex] });
});

plansRouter.delete('/:id', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const filteredPlans = plans.filter(p => p.id !== req.params.id);

  if (filteredPlans.length === plans.length) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  setUserPlans(user.id, filteredPlans);
  res.json({ status: 'ok', message: 'Plano excluído com sucesso' });
});

plansRouter.post('/:id/duplicate', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.id);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  const now = new Date().toISOString();
  const duplicatedPlan: UserPlan = {
    ...plan,
    id: generatePlanId(),
    name: `${plan.name} (Cópia)`,
    progress: 0,
    status: 'rascunho',
    researchStatus: 'pending',
    executionStatus: 'pending',
    toolsFilled: 0,
    createdAt: now,
    updatedAt: now,
  };

  plans.unshift(duplicatedPlan);
  setUserPlans(user.id, plans);

  res.status(201).json({ status: 'ok', plan: duplicatedPlan });
});

plansRouter.post('/:id/archive', authMiddleware, (req, res) => {
  const user = (req as any).user;
  const plans = getUserPlans(user.id);
  const planIndex = plans.findIndex(p => p.id === req.params.id);

  if (planIndex === -1) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  plans[planIndex] = {
    ...plans[planIndex],
    status: 'arquivado',
    updatedAt: new Date().toISOString(),
  };
  setUserPlans(user.id, plans);

  res.json({ status: 'ok', plan: plans[planIndex] });
});

// ===== PNBOX DIRECT PLANS INTEGRATION =====
pnboxPlansRouter.get('/plans', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const planos = await listarPlanosPnbox(authContext, sessao.planosPnbox);
    if (planos && planos.length > 0) {
      atualizarPlanosSessao(userId, planos);
    }
    res.json({ status: 'ok', planos });
  } catch (err: any) {
    if (sessao.planosPnbox && sessao.planosPnbox.length > 0) {
      return res.json({ status: 'ok', planos: sessao.planosPnbox });
    }
    res.status(500).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.post('/plans', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { nome, setor, descricao, cidadeUf, categoriaObjetivo } = req.body || {};
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const novoPlano = await criarPlanoPnboxDdp({
      nome: nome || 'Novo Plano de Negócio',
      setor: setor || 'Geral',
      descricao: descricao || '',
      cidadeUf: cidadeUf || 'Brasil',
      categoriaObjetivo: categoriaObjetivo || 'Criar um novo negócio'
    }, authContext);

    const planosAtuais = sessao.planosPnbox || [];
    atualizarPlanosSessao(userId, [novoPlano, ...planosAtuais]);

    res.json({ status: 'ok', plano: novoPlano });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.get('/plans/:id/pull-all', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { id: idPlano } = req.params;
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const dados14: Record<string, Record<string, unknown>[]> = {};
    const erros: Record<string, string> = {};

    for (const ferramenta of FERRAMENTAS_PNBOX) {
      try {
        const docs = await carregarDocumentosFerramentaPnbox(idPlano, ferramenta.id, authContext);
        if (docs && docs.length > 0) {
          dados14[ferramenta.id] = docs;
        }
      } catch (fErr: any) {
        erros[ferramenta.id] = fErr.message;
      }
    }

    res.json({
      status: 'ok',
      idPlano,
      dados14Ferramentas: dados14,
      totalFerramentasPreenchidas: Object.keys(dados14).length,
      erros: Object.keys(erros).length > 0 ? erros : undefined
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/push-all', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { id: idPlano } = req.params;
  const { dados14Ferramentas } = req.body || {};
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const resultados: Record<string, any[]> = {};
    let totalSalvos = 0;

    for (const [ferramentaId, itens] of Object.entries(dados14Ferramentas || {})) {
      if (!Array.isArray(itens) || itens.length === 0) continue;
      resultados[ferramentaId] = [];
      for (const item of itens) {
        try {
          const resSave = await salvarOuAtualizarRegistroFerramentaPnbox(
            ferramentaId,
            item as Record<string, unknown>,
            idPlano,
            authContext
          );
          resultados[ferramentaId].push(resSave);
          if (resSave.confirmed) totalSalvos++;
        } catch (itemErr: any) {
          resultados[ferramentaId].push({
            status: 'SAVE_FAILED',
            mensagem: itemErr.message
          });
        }
      }
    }

    res.json({
      status: 'ok',
      idPlano,
      totalSalvos,
      resultados
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.get('/plans/:id/tools/:ferramentaId', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { id: idPlano, ferramentaId } = req.params;
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const documentos = await carregarDocumentosFerramentaPnbox(idPlano, ferramentaId, authContext);
    res.json({ status: 'ok', documentos });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/tools/:ferramentaId/item', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { id: idPlano, ferramentaId } = req.params;
  const item = req.body || {};
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    return res.status(401).json({ status: 'error', message: 'Sessão PNBOX não autenticada' });
  }

  const authContext: DdpAuthContext = {
    cookies: sessao.cookiesPnbox,
    loginToken: sessao.idToken,
    userId: sessao.meteorUserId || userId
  };

  try {
    const resultado = await salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId, item, idPlano, authContext);
    res.json({ status: 'ok', resultado });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err.message });
  }
});

export function registerPlansRoutes(app: Express) {
  app.use('/api/plans', plansRouter);
  app.use('/api/pnbox', pnboxPlansRouter);
}
