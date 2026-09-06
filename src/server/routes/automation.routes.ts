import { Router, Express } from 'express';
import { ResearchEngine } from '../../research/ResearchEngine';
import { DatabaseSkill } from '../../skills/database/index';
import {
  prepararEstruturaExecucao,
  executarLote,
  executarFerramentaNoPnbox as executarFerramentaReal,
  BatchExecutionSummary,
  DdpAuthContext
} from '../../automation/realRunner';
import { executarFerramentaNoPnbox as executarFerramentaMock } from '../../automation/officialRunner';
import { TEMPLATES_NEGOCIO } from '../../automation/businessTemplates';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from '../../automation/schemaCatalog';
import {
  obterSessaoUsuario,
  obterStatusSessaoUsuario,
  removerSessaoUsuario,
  simularExpiracaoSessao,
  iniciarSessaoPlaywright,
  globalAuthState
} from '../../automation/auth';
import { obterEventosTrafego, registrarEventoTrafego, limparEventosTrafego } from '../../automation/trafficMonitor';
import { compararJsonComSchema, compararDoisJson } from '../../automation/schemaValidator';
import { gerarScriptPlaywrightOficial } from '../../automation/playwrightScriptGenerator';
import { extrairIdPlano } from '../../utils/planUtils';
import { authMiddleware } from '../middleware/authMiddleware';

const router = Router();

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
  const isOnline = session.isOnline && session.status === 'authenticated' && !session.isExpired;
  res.json({
    status: 'ok',
    isOnline,
    isExpired: session.isExpired || false,
    modoExecucao: isOnline ? (session.modoExecucao || 'LIVE') : 'DRY_RUN',
    session: {
      ...session,
      isOnline,
      modoExecucao: isOnline ? (session.modoExecucao || 'LIVE') : 'DRY_RUN'
    }
  });
});

// Encerra sessão do usuário
router.post('/auth/expire', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  removerSessaoUsuario(userId);
  const session = obterStatusSessaoUsuario(userId);
  res.json({
    status: 'ok',
    mensagem: 'Sessão PNBOX encerrada.',
    session
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

// Execução de Preenchimento Individual de Ferramenta
router.post('/fill-tool', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { ferramentaId, registros, idPlano, modoExecucao } = req.body || {};
  const plano = idPlano || ID_PLANO_PADRAO;
  const modo = modoExecucao || globalAuthState.modoExecucao || 'DRY_RUN';

  try {
    let stepResult;
    if (modo === 'LIVE') {
      const sessao = obterSessaoUsuario(userId);
      if (!sessao) {
        return res.status(401).json({
          status: 'error',
          mensagem: 'Modo LIVE solicitado mas não há sessão autenticada. Faça login primeiro.'
        });
      }
      stepResult = await executarFerramentaReal(
        ferramentaId,
        Array.isArray(registros) ? registros : [registros],
        plano,
        {
          cookies: sessao.cookiesPnbox,
          loginToken: sessao.idToken,
          userId: sessao.meteorUserId
        }
      );
    } else {
      stepResult = await executarFerramentaMock(
        ferramentaId,
        Array.isArray(registros) ? registros : [registros],
        plano
      );
    }

    res.json({
      status: 'ok',
      modoExecucao: modo,
      resultado: stepResult
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', mensagem: err.message });
  }
});

// Exportação do script Playwright oficial
router.get('/script-playwright', (req, res) => {
  const { templateId, idPlano } = req.query;
  const script = gerarScriptPlaywrightOficial(
    templateId ? String(templateId) : undefined,
    idPlano ? String(idPlano) : undefined
  );
  res.json({ status: 'ok', script });
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

// Validador e comparador de JSON com Schema
router.post('/validate', (req, res) => {
  const { jsonCapturado, ferramentaId, jsonEsperado } = req.body || {};

  if (jsonEsperado && typeof jsonEsperado === 'object') {
    const diff = compararDoisJson(jsonCapturado, jsonEsperado);
    return res.json({ status: 'ok', diff });
  }

  if (!ferramentaId) {
    return res.status(400).json({ status: 'error', mensagem: 'É necessário informar ferramentaId ou jsonEsperado.' });
  }

  const diff = compararJsonComSchema(jsonCapturado, String(ferramentaId));
  res.json({ status: 'ok', diff });
});

// Execução Direta Sem Renderização (Simulador DDP)
router.post('/execute-direct', (req, res) => {
  const { ferramentaId, payload, idPlano, simulate503, simulateTimeout } = req.body || {};
  const plano = idPlano || ID_PLANO_PADRAO;

  if (simulate503) {
    return res.status(503).json({
      status: 'error',
      errorCode: 503,
      mensagem: 'HTTP 503 Service Unavailable (Falha temporária de gateway Meteor DDP no Sebrae PNBOX - disparando retry com backoff exponencial)'
    });
  }

  if (simulateTimeout) {
    return res.status(504).json({
      status: 'error',
      errorCode: 504,
      mensagem: 'HTTP 504 Gateway Timeout (Tempo limite de resposta do backend Sebrae excedido - disparando retry com backoff exponencial)'
    });
  }

  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) {
    return res.status(404).json({ status: 'error', mensagem: 'Ferramenta não encontrada no catálogo.' });
  }

  const validacao = compararJsonComSchema(payload, ferramenta);
  const mockDocId = 'doc_' + Math.random().toString(36).substring(2, 11);
  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'METHOD_CALL',
    url: `wss://pnbox.sebrae.com.br/websocket [${ferramenta.collectionName}.insert]`,
    status: 200,
    duracaoMs: Math.floor(Math.random() * 80) + 40,
    payloadEnviado: {
      msg: 'method',
      method: `${ferramenta.collectionName}.insert`,
      params: [{ ...payload, idPlano: plano }]
    },
    respostaRecebida: { msg: 'result', result: mockDocId },
    operacaoDetectada: {
      ferramentaId: ferramenta.id,
      acao: 'insert',
      collection: ferramenta.collectionName
    }
  });

  res.json({
    status: 'ok',
    docId: mockDocId,
    validacao,
    mensagem: `Execução simulada com sucesso via DDP direto na collection ${ferramenta.collectionName}.`
  });
});

// Contract: fill-batch - Process PNBOX form filling with real data
router.post('/fill-batch', authMiddleware, async (req, res) => {
  const {
    templateId,
    dados,
    customData,
    idPlano
  } = req.body || {};

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

  if (dados !== null && dados !== undefined && typeof dados !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo dados deve ser um objeto ou array.'
    });
  }

  if (customData !== null && customData !== undefined && typeof customData !== 'object') {
    return res.status(400).json({
      status: 'error',
      mensagem: 'O campo customData deve ser um objeto.'
    });
  }

  try {
    const userId = (req as any).user?.id;
    if (!userId) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Usuário não autenticado. Token JWT inválido ou ausente.'
      });
    }

    const template = TEMPLATES_NEGOCIO.find(t => t.id === templateId);
    if (!template) {
      return res.status(404).json({
        status: 'error',
        mensagem: `Template não encontrado: ${templateId}`
      });
    }

    const sessao = obterSessaoUsuario(userId);
    if (!sessao) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Sessão PNBOX não encontrada. Por favor, conecte-se ao PNBOX primeiro usando o endpoint /api/pnbox/connect'
      });
    }

    if (new Date(sessao.expiraEm).getTime() <= Date.now()) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Sessão PNBOX expirada. Por favor, reconecte-se ao PNBOX usando o endpoint /api/pnbox/connect'
      });
    }

    let processedData = {};
    if (dados) {
      processedData = { ...processedData, ...dados };
    }
    if (customData) {
      processedData = { ...processedData, ...customData };
    }

    const authContext: DdpAuthContext = {
      cookies: sessao.cookiesPnbox,
      loginToken: sessao.idToken,
      userId: sessao.meteorUserId || userId,
      connectionId: `${userId}_pnbox_${Date.now()}`
    };

    const result: BatchExecutionSummary = await executarLote(
      templateId,
      processedData as Record<string, Record<string, unknown>[]>,
      idPlano,
      authContext
    );

    res.json({
      status: 'ok',
      data: result
    });
  } catch (err: any) {
    console.error('[API /api/automation/fill-batch] Erro:', err);
    res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar lote de preenchimento' });
  }
});

export function registerAutomationRoutes(app: Express) {
  app.use('/api/automation', router);
}
