import { Router, Express } from 'express';
import { authMiddleware } from '../services/authStore';
import {
  listarPlanosPnbox,
  criarPlanoPnboxDdp,
  carregarDocumentosFerramentaPnbox,
  salvarOuAtualizarRegistroFerramentaPnbox,
  DdpAuthContext
} from '../../automation/realRunner';
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

async function requireUserOwnsPlan(userId: string, idPlano: string, authContext: DdpAuthContext): Promise<void> {
  if (!idPlano || idPlano === ':idPlano' || idPlano.startsWith('plano_')) {
    const err: any = new Error('ID de plano PNBOX real é obrigatório.');
    err.statusCode = 400;
    err.code = 'PNBOX_REAL_PLAN_REQUIRED';
    throw err;
  }
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) {
    const err: any = new Error('Sessão PNBOX não autenticada');
    err.statusCode = 401;
    err.code = 'UNAUTHORIZED';
    throw err;
  }
  // 1. Verificar cache da sessão
  if (sessao.planosPnbox && sessao.planosPnbox.length > 0) {
    const exists = sessao.planosPnbox.some((p: any) => p.idPlano === idPlano);
    if (exists) return;
  }
  // 2. Consultar o PNBOX diretamente para validar autorização real
  try {
    const planos = await listarPlanosPnbox(authContext);
    atualizarPlanosSessao(userId, planos);
    const exists = planos.some((p: any) => p.idPlano === idPlano);
    if (exists) return;
  } catch (e: any) {
    const err: any = new Error(`Falha ao verificar autorização do plano no PNBOX: ${e.message}`);
    err.statusCode = 502;
    err.code = 'PNBOX_VERIFY_FAILED';
    throw err;
  }

  const forbiddenErr: any = new Error(`Acesso negado: o plano ${idPlano} não pertence ao usuário autenticado.`);
  forbiddenErr.statusCode = 403;
  forbiddenErr.code = 'FORBIDDEN_PLAN_ACCESS';
  throw forbiddenErr;
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

async function createPlan(req: any, res: any) {
  return res.status(501).json({
    status: 'error',
    code: 'BLOCKED_EXTERNAL_CONTRACT',
    message: 'A criação de novos planos no PNBOX via DDP está congelada (BLOCKED_EXTERNAL_CONTRACT) até comprovação do contrato oficial com o Sebrae. Crie o plano no portal PNBOX e selecione-o para automação com IA.'
  });
}

plansRouter.get('/', authMiddleware, listPlans);
plansRouter.post('/', authMiddleware, createPlan);
plansRouter.patch('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Alteração de plano bloqueada: método oficial ainda não confirmado.' }));
plansRouter.delete('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Exclusão de plano bloqueada: método oficial ainda não confirmado.' }));
plansRouter.post('/:id/archive', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Arquivamento bloqueado: método oficial ainda não confirmado.' }));
plansRouter.post('/:id/duplicate', authMiddleware, createPlan);

pnboxPlansRouter.get('/plans', authMiddleware, listPlans);
pnboxPlansRouter.post('/plans', authMiddleware, createPlan);
const automationPlansRouter = Router();
automationPlansRouter.get('/planos/list', authMiddleware, listPlans);
automationPlansRouter.post('/planos/create', authMiddleware, createPlan);

pnboxPlansRouter.get('/plans/:id/pull-all', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, req.params.id, authContext);
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
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_ERROR', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/push-all', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, req.params.id, authContext);
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
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_ERROR', message: err.message });
  }
});

pnboxPlansRouter.get('/plans/:id/tools/:ferramentaId', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, req.params.id, authContext);
    const documentos = await carregarDocumentosFerramentaPnbox(req.params.id, req.params.ferramentaId, authContext);
    return res.json({ status: 'ok', documentos });
  } catch (err: any) {
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_TOOL_READ_FAILED', message: err.message });
  }
});

pnboxPlansRouter.post('/plans/:id/tools/:ferramentaId/item', authMiddleware, async (req, res) => {
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, req.params.id, authContext);
    const resultado = await salvarOuAtualizarRegistroFerramentaPnbox(req.params.ferramentaId, req.body || {}, req.params.id, authContext);
    return resultado.confirmed
      ? res.json({ status: 'ok', resultado })
      : res.status(502).json({ status: 'error', code: 'PNBOX_TOOL_SAVE_UNCONFIRMED', resultado });
  } catch (err: any) {
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_ERROR', message: err.message });
  }
});

// Sincronização bidirecional completa entre estado local e o PNBOX remoto
pnboxPlansRouter.post('/plans/:id/sync-bidirectional', authMiddleware, async (req, res) => {
  try {
    const idPlano = req.params.id;
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, idPlano, authContext);
    const localDados = req.body?.dados14Ferramentas || {};
    const reconciledDados: Record<string, Record<string, unknown>[]> = {};
    let pulledCount = 0;
    let pushedCount = 0;

    for (const ferramenta of FERRAMENTAS_PNBOX) {
      // 1. Carregar documentos remotos oficiais do PNBOX
      let remoteDocs: Record<string, unknown>[] = [];
      try {
        remoteDocs = await carregarDocumentosFerramentaPnbox(idPlano, ferramenta.id, authContext);
      } catch (e: any) {
        console.warn(`[sync-bidirectional] Falha ao carregar remoto para ${ferramenta.id}:`, e.message);
      }

      // 2. Extrair documentos locais enviados
      const localDocs: Record<string, unknown>[] = Array.isArray(localDados[ferramenta.id])
        ? localDados[ferramenta.id]
        : Array.isArray(localDados[ferramenta.collectionName])
        ? localDados[ferramenta.collectionName]
        : [];

      // 3. Reconciliação com base no PNBOX como fonte da verdade
      const mergedMap = new Map<string, Record<string, unknown>>();
      for (const rDoc of remoteDocs) {
        const docId = String(rDoc._id || rDoc.id || '').trim();
        if (docId) {
          mergedMap.set(docId, { ...rDoc, idPlano });
          pulledCount++;
        }
      }

      // 4. Se houver itens locais que ainda não existem no PNBOX, fazer push
      for (const lDoc of localDocs) {
        const lId = String(lDoc._id || lDoc.id || '').trim();
        const payload = { ...lDoc, idPlano };

        if (!lId || !mergedMap.has(lId)) {
          try {
            const saveRes = await salvarOuAtualizarRegistroFerramentaPnbox(ferramenta.id, payload, idPlano, authContext);
            if (saveRes.confirmed && saveRes.docId) {
              mergedMap.set(saveRes.docId, { ...payload, _id: saveRes.docId });
              pushedCount++;
            }
          } catch (pushErr: any) {
            console.warn(`[sync-bidirectional] Falha ao sincronizar item local para ${ferramenta.id}:`, pushErr.message);
          }
        }
      }

      const finalList = Array.from(mergedMap.values());
      reconciledDados[ferramenta.id] = finalList;
      reconciledDados[ferramenta.collectionName] = finalList;
    }

    const totalFilled = Object.values(reconciledDados).filter(x => Array.isArray(x) && x.length > 0).length;

    return res.json({
      status: 'ok',
      idPlano,
      dados14Ferramentas: reconciledDados,
      totalFerramentasPreenchidas: Math.round(totalFilled / 2),
      pulledCount,
      pushedCount,
      sincronizadoEm: new Date().toISOString(),
    });
  } catch (err: any) {
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_ERROR', message: err.message });
  }
});

// Event stream SSE para notificações em tempo real das coleções DDP do PNBOX
pnboxPlansRouter.get('/plans/:id/stream', authMiddleware, async (req, res) => {
  const idPlano = req.params.id;
  try {
    const { authContext } = requirePnboxSession(req.user.id);
    await requireUserOwnsPlan(req.user.id, idPlano, authContext);

    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    });

    res.write(`data: ${JSON.stringify({ type: 'connected', idPlano, timestamp: new Date().toISOString() })}\n\n`);

    const interval = setInterval(async () => {
      try {
        res.write(`data: ${JSON.stringify({ type: 'ping', idPlano, timestamp: new Date().toISOString() })}\n\n`);
      } catch {
        clearInterval(interval);
      }
    }, 25000);

    req.on('close', () => {
      clearInterval(interval);
    });
  } catch (err: any) {
    return res.status(err.statusCode || 502).json({ status: 'error', code: err.code || 'PNBOX_ERROR', message: err.message });
  }
});

export function registerPlansRoutes(app: Express) {
  app.use('/api/plans', plansRouter);
  app.use('/api/pnbox', pnboxPlansRouter);
  app.use('/api/automation', automationPlansRouter);
}
