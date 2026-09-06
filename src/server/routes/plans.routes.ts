import { Router, Express } from 'express';
import { authMiddleware } from '../services/authStore';
import { UserPlan, getUserPlans, setUserPlans } from '../services/plansStore';
import { listarPlanosPnbox, carregarDocumentosFerramentaPnbox, salvarOuAtualizarRegistroFerramentaPnbox, criarPlanoPnboxDdp, DdpAuthContext } from '../../automation/realRunner';
import { obterSessaoUsuario, atualizarPlanosSessao } from '../../automation/auth';
import { FERRAMENTAS_PNBOX } from '../../automation/schemaCatalog';
import { PlanoCriadoInfo } from '../../types/pnbox';

const plansRouter = Router();
const pnboxPlansRouter = Router();

function requirePnboxSession(userId: string): { sessao: NonNullable<ReturnType<typeof obterSessaoUsuario>>; authContext: DdpAuthContext } {
  const sessao = obterSessaoUsuario(userId);
  if (!sessao) throw new Error('Sessão PNBOX não autenticada');
  return { sessao, authContext: { cookies: sessao.cookiesPnbox, loginToken: sessao.idToken, userId: sessao.meteorUserId || userId } };
}

function pnboxToUserPlan(userId: string, plano: PlanoCriadoInfo): UserPlan {
  return {
    id: plano.idPlano,
    userId,
    name: plano.nomePlano,
    description: plano.descricao,
    sector: plano.setor,
    city: plano.cidadeUf,
    progress: Math.min(100, Math.max(0, Number(plano.ferramentasPreenchidas || 0) / FERRAMENTAS_PNBOX.length * 100)),
    status: plano.status === 'preenchido_completo' ? 'pronto' : 'rascunho',
    researchStatus: 'pending', executionStatus: 'pending',
    toolsFilled: Number(plano.ferramentasPreenchidas || 0),
    createdAt: plano.criadoEm,
    updatedAt: plano.ultimaSincronizacao || plano.criadoEm,
  };
}

function syncResearchCache(userId: string, planos: PlanoCriadoInfo[]): UserPlan[] {
  const existingById = new Map(getUserPlans(userId).map(p => [p.id, p]));
  const mapped = planos.map(p => ({ ...(existingById.get(p.id) || {}), ...pnboxToUserPlan(userId, p) }));
  setUserPlans(userId, mapped);
  return mapped;
}

// ===== PLANS API — PNBOX IS THE SOURCE OF TRUTH =====
plansRouter.get('/', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const { authContext } = requirePnboxSession(userId);
    const planos = await listarPlanosPnbox(authContext);
    if (!planos || planos.length === 0) return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: 'O PNBOX não retornou planos. Nenhum plano local/cache pode ser usado como substituto.' });
    syncResearchCache(userId, planos); atualizarPlanosSessao(userId, planos);
    return res.json({ status: 'ok', plans: planos.map(p => pnboxToUserPlan(userId, p)), planos });
  } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); }
});

plansRouter.post('/', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { name, description, sector, city } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' });
  try {
    const { sessao, authContext } = requirePnboxSession(userId);
    const plano = await criarPlanoPnboxDdp({ nome: name.trim(), descricao: description?.trim() || '', setor: sector?.trim() || 'Não definido', cidadeUf: city?.trim() || 'Brasil', categoriaObjetivo: 'Criar um novo negócio' }, authContext);
    if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'O PNBOX não confirmou um ID real para o novo plano; criação local não permitida.' });
    const all = [plano, ...(sessao.planosPnbox || []).filter(p => p.idPlano !== plano.idPlano)];
    atualizarPlanosSessao(userId, all); syncResearchCache(userId, all);
    const userPlan = pnboxToUserPlan(userId, plano);
    return res.status(201).json({ status: 'ok', plan: userPlan, plano });
  } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_FAILED', message: err.message }); }
});

// Never mutate the local cache as if it were PNBOX. Only confirmed Meteor methods may be added here.
plansRouter.patch('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Alteração de plano bloqueada: método oficial do PNBOX ainda não confirmado.' }));
plansRouter.delete('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Exclusão de plano bloqueada: método oficial do PNBOX ainda não confirmado.' }));
plansRouter.post('/:id/archive', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Arquivamento bloqueado: método oficial do PNBOX ainda não confirmado.' }));

plansRouter.post('/:id/duplicate', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try {
    const { sessao, authContext } = requirePnboxSession(userId);
    const original = (sessao.planosPnbox || []).find(p => p.idPlano === req.params.id);
    if (!original) return res.status(404).json({ status: 'error', message: 'Plano PNBOX não encontrado na sessão.' });
    const plano = await criarPlanoPnboxDdp({ nome: `${original.nomePlano} (Cópia)`, descricao: original.descricao, setor: original.setor, cidadeUf: original.cidadeUf, categoriaObjetivo: original.categoriaObjetivo }, authContext);
    if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'Duplicação não confirmada pelo PNBOX.' });
    const all = [plano, ...(sessao.planosPnbox || [])]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all);
    return res.status(201).json({ status: 'ok', plan: pnboxToUserPlan(userId, plano), plano });
  } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_DUPLICATE_FAILED', message: err.message }); }
});

// ===== PNBOX DIRECT PLANS INTEGRATION =====
pnboxPlansRouter.get('/plans', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try { const { authContext } = requirePnboxSession(userId); const planos = await listarPlanosPnbox(authContext); if (!planos?.length) return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: 'PNBOX não retornou planos.' }); atualizarPlanosSessao(userId, planos); syncResearchCache(userId, planos); return res.json({ status: 'ok', planos }); }
  catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); }
});

pnboxPlansRouter.post('/plans', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { nome, setor, descricao, cidadeUf, categoriaObjetivo } = req.body || {};
  try { const { sessao, authContext } = requirePnboxSession(userId); const novoPlano = await criarPlanoPnboxDdp({ nome: nome || 'Novo Plano de Negócio', setor: setor || 'Geral', descricao: descricao || '', cidadeUf: cidadeUf || 'Brasil', categoriaObjetivo: categoriaObjetivo || 'Criar um novo negócio' }, authContext); if (!novoPlano.idPlano || novoPlano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'O PNBOX não confirmou um ID real para o novo plano.' }); const all = [novoPlano, ...(sessao.planosPnbox || [])]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plano: novoPlano }); }
  catch (err: any) { return res.status(502).json({ status: 'error', message: err.message }); }
});

// Legacy frontend paths are aliases to the same real PNBOX source; they do not have a local implementation.
const automationPlansRouter = Router();
automationPlansRouter.get('/planos/list', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try { const { authContext } = requirePnboxSession(userId); const planos = await listarPlanosPnbox(authContext); if (!planos?.length) return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: 'PNBOX não retornou planos.' }); atualizarPlanosSessao(userId, planos); syncResearchCache(userId, planos); return res.json({ status: 'ok', planos }); }
  catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); }
});
automationPlansRouter.post('/planos/create', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { nome, name, setor, descricao, cidadeUf, cidade, categoriaObjetivo } = req.body || {};
  try { const { sessao, authContext } = requirePnboxSession(userId); const plano = await criarPlanoPnboxDdp({ nome: String(nome || name || 'Novo Plano de Negócio'), setor, descricao, cidadeUf: cidadeUf || cidade, categoriaObjetivo }, authContext); if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'O PNBOX não confirmou um ID real para o novo plano.' }); const all = [plano, ...(sessao.planosPnbox || [])]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plano }); }
  catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_FAILED', message: err.message }); }
});

pnboxPlansRouter.get('/plans/:id/pull-all', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { id: idPlano } = req.params;
  try { const { authContext } = requirePnboxSession(userId); const dados14: Record<string, Record<string, unknown>[]> = {}; const erros: Record<string, string> = {}; for (const ferramenta of FERRAMENTAS_PNBOX) { try { const docs = await carregarDocumentosFerramentaPnbox(idPlano, ferramenta.id, authContext); if (docs.length) dados14[ferramenta.id] = docs; } catch (e: any) { erros[ferramenta.id] = e.message; } } return res.json({ status: 'ok', idPlano, dados14Ferramentas: dados14, totalFerramentasPreenchidas: Object.keys(dados14).length, erros: Object.keys(erros).length ? erros : undefined }); }
  catch (err: any) { return res.status(502).json({ status: 'error', message: err.message }); }
});

pnboxPlansRouter.post('/plans/:id/push-all', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { id: idPlano } = req.params; const { dados14Ferramentas } = req.body || {};
  try { const { authContext } = requirePnboxSession(userId); const resultados: Record<string, any[]> = {}; let totalSalvos = 0; for (const [ferramentaId, itens] of Object.entries(dados14Ferramentas || {})) { if (!Array.isArray(itens) || !itens.length) continue; resultados[ferramentaId] = []; for (const item of itens) { try { const r = await salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId, item as Record<string, unknown>, idPlano, authContext); resultados[ferramentaId].push(r); if (r.confirmed) totalSalvos++; } catch (e: any) { resultados[ferramentaId].push({ status: 'SAVE_FAILED', mensagem: e.message }); } } } return res.json({ status: 'ok', idPlano, totalSalvos, resultados }); }
  catch (err: any) { return res.status(502).json({ status: 'error', message: err.message }); }
});

pnboxPlansRouter.get('/plans/:id/tools/:ferramentaId', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { id: idPlano, ferramentaId } = req.params;
  try { const { authContext } = requirePnboxSession(userId); const documentos = await carregarDocumentosFerramentaPnbox(idPlano, ferramentaId, authContext); return res.json({ status: 'ok', documentos }); }
  catch (err: any) { return res.status(502).json({ status: 'error', message: err.message }); }
});

pnboxPlansRouter.post('/plans/:id/tools/:ferramentaId/item', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { id: idPlano, ferramentaId } = req.params;
  try { const { authContext } = requirePnboxSession(userId); const resultado = await salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId, req.body || {}, idPlano, authContext); return res.json({ status: 'ok', resultado }); }
  catch (err: any) { return res.status(502).json({ status: 'error', message: err.message }); }
});

export function registerPlansRoutes(app: Express) {
  app.use('/api/plans', plansRouter);
  app.use('/api/pnbox', pnboxPlansRouter);
  app.use('/api/automation', automationPlansRouter);
}
