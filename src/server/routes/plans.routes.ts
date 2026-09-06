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
  return { id: plano.idPlano, userId, name: plano.nomePlano, description: plano.descricao, sector: plano.setor, city: plano.cidadeUf, progress: Math.min(100, Math.max(0, Number(plano.ferramentasPreenchidas || 0) / FERRAMENTAS_PNBOX.length * 100)), status: plano.status === 'preenchido_completo' ? 'pronto' : 'rascunho', researchStatus: 'pending', executionStatus: 'pending', toolsFilled: Number(plano.ferramentasPreenchidas || 0), createdAt: plano.criadoEm, updatedAt: plano.ultimaSincronizacao || plano.criadoEm };
}

function syncResearchCache(userId: string, planos: PlanoCriadoInfo[]): UserPlan[] {
  const existingById = new Map(getUserPlans(userId).map(p => [p.id, p]));
  const mapped = planos.map(p => ({ ...(existingById.get(p.idPlano) || {}), ...pnboxToUserPlan(userId, p) }));
  setUserPlans(userId, mapped);
  return mapped;
}

plansRouter.get('/', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  try { const { authContext } = requirePnboxSession(userId); const planos = await listarPlanosPnbox(authContext); if (!planos || planos.length === 0) return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: 'O PNBOX não retornou planos. Nenhum plano local/cache pode ser usado como substituto.' }); syncResearchCache(userId, planos); atualizarPlanosSessao(userId, planos); return res.json({ status: 'ok', plans: planos.map(p => pnboxToUserPlan(userId, p)), planos }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); }
});

plansRouter.post('/', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const { name, description, sector, city } = req.body || {};
  if (!name?.trim()) return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' });
  try { const { sessao, authContext } = requirePnboxSession(userId); const plano = await criarPlanoPnboxDdp({ nome: name.trim(), descricao: description?.trim() || '', setor: sector?.trim() || 'Não definido', cidadeUf: city?.trim() || 'Brasil', categoriaObjetivo: 'Criar um novo negócio' }, authContext); if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'O PNBOX não confirmou um ID real para o novo plano; criação local não permitida.' }); const all = [plano, ...(sessao.planosPnbox || []).filter(p => p.idPlano !== plano.idPlano)]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plan: pnboxToUserPlan(userId, plano), plano }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_FAILED', message: err.message }); }
});

plansRouter.patch('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Alteração de plano bloqueada: método oficial do PNBOX ainda não confirmado.' }));
plansRouter.delete('/:id', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Exclusão de plano bloqueada: método oficial do PNBOX ainda não confirmado.' }));
plansRouter.post('/:id/archive', authMiddleware, (_req, res) => res.status(501).json({ status: 'error', code: 'PNBOX_OPERATION_NOT_MAPPED', message: 'Arquivamento de plano bloqueado: método oficial do PNBOX ainda não confirmado.' }));

plansRouter.post('/:id/duplicate', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id; const originalId = req.params.id;
  try { const { sessao, authContext } = requirePnboxSession(userId); const original = (sessao.planosPnbox || []).find(p => p.idPlano === originalId); if (!original) return res.status(404).json({ status: 'error', message: 'Plano original não encontrado na sessão PNBOX.' }); const plano = await criarPlanoPnboxDdp({ nome: `${original.nomePlano} (cópia)`, descricao: original.descricao, setor: original.setor, cidadeUf: original.cidadeUf, categoriaObjetivo: original.categoriaObjetivo }, authContext); if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_DUPLICATE_UNCONFIRMED', message: 'Duplicação não confirmada pelo PNBOX.' }); const all = [plano, ...(sessao.planosPnbox || []).filter(p => p.idPlano !== plano.idPlano)]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plan: pnboxToUserPlan(userId, plano), plano }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_DUPLICATE_FAILED', message: err.message }); }
});

pnboxPlansRouter.get('/', authMiddleware, async (req, res) => { const userId = (req as any).user.id; try { const { authContext } = requirePnboxSession(userId); const planos = await listarPlanosPnbox(authContext); syncResearchCache(userId, planos); atualizarPlanosSessao(userId, planos); return res.json({ status: 'ok', planos, total: planos.length }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); } });
pnboxPlansRouter.post('/', authMiddleware, async (req, res) => { const userId = (req as any).user.id; const { nome, setor, descricao, cidadeUf, categoriaObjetivo } = req.body || {}; if (!nome?.trim()) return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' }); try { const { sessao, authContext } = requirePnboxSession(userId); const plano = await criarPlanoPnboxDdp({ nome: nome.trim(), setor, descricao, cidadeUf, categoriaObjetivo }, authContext); if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'Criação não confirmada pelo PNBOX.' }); const all = [plano, ...(sessao.planosPnbox || []).filter(p => p.idPlano !== plano.idPlano)]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plano }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_FAILED', message: err.message }); } });

pnboxPlansRouter.get('/:id/tools/:toolId', authMiddleware, async (req, res) => { const userId = (req as any).user.id; try { const { authContext } = requirePnboxSession(userId); const documentos = await carregarDocumentosFerramentaPnbox(req.params.id, req.params.toolId, authContext); return res.json({ status: 'ok', documentos }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_TOOL_READ_FAILED', message: err.message }); } });
pnboxPlansRouter.post('/:id/tools/:toolId', authMiddleware, async (req, res) => { const userId = (req as any).user.id; try { const { authContext } = requirePnboxSession(userId); const result = await salvarOuAtualizarRegistroFerramentaPnbox(req.params.toolId, req.body || {}, req.params.id, authContext); return result.confirmed ? res.json({ status: 'ok', result }) : res.status(502).json({ status: 'error', code: 'PNBOX_TOOL_SAVE_UNCONFIRMED', result }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_TOOL_SAVE_FAILED', message: err.message }); } });

// Legacy compatibility endpoints now use the same real PNBOX gateway.
const legacyAutomationRouter = Router();
legacyAutomationRouter.get('/planos/list', authMiddleware, async (req, res) => { const userId = (req as any).user.id; try { const { authContext } = requirePnboxSession(userId); const planos = await listarPlanosPnbox(authContext); syncResearchCache(userId, planos); atualizarPlanosSessao(userId, planos); return res.json({ status: 'ok', planos, total: planos.length }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_PLANS_UNAVAILABLE', message: err.message }); } });
legacyAutomationRouter.post('/planos/create', authMiddleware, async (req, res) => { const userId = (req as any).user.id; const { nome, setor, descricao, cidadeUf, categoriaObjetivo } = req.body || {}; if (!nome?.trim()) return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' }); try { const { sessao, authContext } = requirePnboxSession(userId); const plano = await criarPlanoPnboxDdp({ nome: nome.trim(), setor, descricao, cidadeUf, categoriaObjetivo }, authContext); if (!plano.idPlano || plano.idPlano.startsWith('plano_')) return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_UNCONFIRMED', message: 'Criação não confirmada pelo PNBOX.' }); const all = [plano, ...(sessao.planosPnbox || []).filter(p => p.idPlano !== plano.idPlano)]; atualizarPlanosSessao(userId, all); syncResearchCache(userId, all); return res.status(201).json({ status: 'ok', plano }); } catch (err: any) { return res.status(502).json({ status: 'error', code: 'PNBOX_CREATE_FAILED', message: err.message }); } });

export function registerPlansRoutes(app: Express) { app.use('/api/plans', plansRouter); app.use('/api/pnbox/plans', pnboxPlansRouter); app.use('/api/automation', legacyAutomationRouter); }
