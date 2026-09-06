import { Router, Express } from 'express';
import { DatabaseSkill } from '../../skills/database/index';
import { executarLote, executarFerramentaNoPnbox as executarFerramentaReal, BatchExecutionSummary, DdpAuthContext } from '../../automation/realRunner';
import { TEMPLATES_NEGOCIO } from '../../automation/businessTemplates';
import { FERRAMENTAS_PNBOX } from '../../automation/schemaCatalog';
import { obterStatusSessaoUsuario, obterSessaoUsuario, removerSessaoUsuario, iniciarSessaoPlaywright, globalAuthState } from '../../automation/auth';
import { obterEventosTrafego, limparEventosTrafego } from '../../automation/trafficMonitor';
import { compararJsonComSchema, compararDoisJson } from '../../automation/schemaValidator';
import { extrairIdPlano } from '../../utils/planUtils';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

router.get('/catalog', (_req, res) => res.json({ status: 'ok', totalFerramentas: FERRAMENTAS_PNBOX.length, ferramentas: FERRAMENTAS_PNBOX }));
router.get('/templates', (_req, res) => res.json({ status: 'ok', templates: TEMPLATES_NEGOCIO }));

router.get('/auth/status', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  const session = obterStatusSessaoUsuario(userId);
  const isOnline = session.isOnline && session.status === 'authenticated' && !session.isExpired;
  res.json({
    status: 'ok',
    isOnline,
    isExpired: Boolean(session.isExpired),
    modoExecucao: 'LIVE',
    session: { ...session, isOnline, modoExecucao: 'LIVE' },
  });
});

router.post('/auth/expire', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  removerSessaoUsuario(userId);
  res.json({ status: 'ok', mensagem: 'Sessão PNBOX encerrada.', session: obterStatusSessaoUsuario(userId) });
});

router.post('/auth/login', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { cpf, password, idPlano, consentimentoAceito } = req.body || {};
  if (!cpf || !password) return res.status(400).json({ status: 'error', mensagem: 'CPF e senha são obrigatórios.' });
  if (!consentimentoAceito) return res.status(400).json({ status: 'error', mensagem: 'É necessário aceitar o consentimento de uso das credenciais.' });

  const modo: 'LIVE' = 'LIVE';
  globalAuthState.modoExecucao = modo;
  const idPlanoNormalizado = extrairIdPlano(idPlano || '');
  if (!idPlanoNormalizado) return res.status(400).json({ status: 'error', mensagem: 'ID do plano PNBOX é obrigatório e deve ser real; não existe plano padrão local.' });

  const sessionResult = await iniciarSessaoPlaywright(
    { cpf: String(cpf).trim(), password: String(password), idPlano: idPlanoNormalizado },
    consentimentoAceito,
    modo,
    userId,
  );
  const isAuth = sessionResult.status === 'authenticated';
  res.json({ status: isAuth ? 'ok' : 'error', session: sessionResult, mensagem: isAuth ? 'Sessão oficial LIVE conectada com sucesso no PNBOX.' : (sessionResult.ultimoLog || 'Falha ao autenticar sessão com o Sebrae ID.') });
});

router.post('/fill-tool', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { ferramentaId, registros, idPlano, modoExecucao } = req.body || {};
  const normalizedPlanId = typeof idPlano === 'string' ? extrairIdPlano(idPlano) : '';
  if (!normalizedPlanId) return res.status(400).json({ status: 'error', mensagem: 'ID do plano PNBOX real é obrigatório.' });
  if (modoExecucao !== 'LIVE') return res.status(409).json({ status: 'error', mensagem: 'Execução simulada/desenvolvimento não está disponível nesta rota. Use o executor LIVE do PNBOX.' });

  try {
    const sessao = obterSessaoUsuario(userId);
    if (!sessao) return res.status(401).json({ status: 'error', mensagem: 'Modo LIVE solicitado mas não há sessão autenticada.' });
    if (sessao.idPlano !== normalizedPlanId) return res.status(403).json({ status: 'error', mensagem: 'O plano solicitado não corresponde ao plano da sessão PNBOX autenticada.' });

    const registrosNormalizados = Array.isArray(registros) ? registros : [registros];
    if (registrosNormalizados.length === 0 || registrosNormalizados.some((item) => !item || typeof item !== 'object')) {
      return res.status(400).json({ status: 'error', mensagem: 'Registros reais são obrigatórios.' });
    }

    const stepResult = await executarFerramentaReal(
      ferramentaId,
      registrosNormalizados,
      normalizedPlanId,
      { cookies: sessao.cookiesPnbox, loginToken: sessao.idToken, userId: sessao.meteorUserId },
    );
    res.json({ status: 'ok', modoExecucao: 'LIVE', resultado: stepResult });
  } catch (err: any) {
    res.status(500).json({ status: 'error', mensagem: err.message });
  }
});

router.get('/traffic', (req, res) => {
  const { tipo, apenasSalvamento, ferramentaId } = req.query;
  const eventos = obterEventosTrafego({ tipo: tipo ? String(tipo) : undefined, apenasSalvamento: apenasSalvamento === 'true', ferramentaId: ferramentaId ? String(ferramentaId) : undefined });
  res.json({ status: 'ok', total: eventos.length, eventos });
});

router.post('/traffic/clear', (req, res) => {
  limparEventosTrafego();
  res.json({ status: 'ok', mensagem: 'Histórico de tráfego limpo com sucesso.' });
});

router.post('/validate', (req, res) => {
  const { jsonCapturado, ferramentaId, jsonEsperado } = req.body || {};
  if (jsonEsperado && typeof jsonEsperado === 'object') return res.json({ status: 'ok', diff: compararDoisJson(jsonCapturado, jsonEsperado) });
  if (!ferramentaId) return res.status(400).json({ status: 'error', mensagem: 'É necessário informar ferramentaId ou jsonEsperado.' });
  return res.json({ status: 'ok', diff: compararJsonComSchema(jsonCapturado, String(ferramentaId)) });
});

router.post('/execute-direct', (_req, res) => res.status(410).json({ status: 'error', errorCode: 'SIMULATION_DISABLED', mensagem: 'Execução DDP simulada desativada. Use /api/automation/fill-tool em modo LIVE com sessão PNBOX autenticada.' }));

router.post('/fill-batch', authMiddleware, async (req, res) => {
  const { templateId, dados, customData, idPlano } = req.body || {};
  if (!templateId || typeof templateId !== 'string') return res.status(400).json({ status: 'error', mensagem: 'O ID do template é obrigatório.' });
  const normalizedPlanId = typeof idPlano === 'string' ? extrairIdPlano(idPlano) : '';
  if (!normalizedPlanId) return res.status(400).json({ status: 'error', mensagem: 'O ID do plano real é obrigatório.' });
  if (dados !== null && dados !== undefined && typeof dados !== 'object') return res.status(400).json({ status: 'error', mensagem: 'O campo dados deve ser um objeto ou array.' });
  if (customData !== null && customData !== undefined && typeof customData !== 'object') return res.status(400).json({ status: 'error', mensagem: 'O campo customData deve ser um objeto.' });

  try {
    const userId = (req as any).user?.id;
    if (!userId) return res.status(401).json({ status: 'error', mensagem: 'Usuário não autenticado.' });
    const sessao = obterSessaoUsuario(userId);
    if (!sessao) return res.status(401).json({ status: 'error', mensagem: 'Sessão PNBOX não encontrada.' });
    if (new Date(sessao.expiraEm).getTime() <= Date.now()) return res.status(401).json({ status: 'error', mensagem: 'Sessão PNBOX expirada.' });
    if (sessao.idPlano !== normalizedPlanId) return res.status(403).json({ status: 'error', mensagem: 'O plano solicitado não corresponde ao plano da sessão PNBOX autenticada.' });

    const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId);
    if (!template) return res.status(404).json({ status: 'error', mensagem: `Template não encontrado: ${templateId}` });

    const processedData = { ...(dados || {}), ...(customData || {}) };
    const authContext: DdpAuthContext = { cookies: sessao.cookiesPnbox, loginToken: sessao.idToken, userId: sessao.meteorUserId || userId };
    const result: BatchExecutionSummary = await executarLote(templateId, processedData as Record<string, Record<string, unknown>[]>, normalizedPlanId, authContext);
    const failed = result.ferramentasFalha;
    return res.status(failed ? 207 : 200).json({ status: failed ? 'partial' : 'ok', data: result });
  } catch (err: any) {
    console.error('[API /api/automation/fill-batch] Erro:', err);
    return res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar lote' });
  }
});

export function registerAutomationRoutes(app: Express) {
  app.use('/api/automation', router);
}
