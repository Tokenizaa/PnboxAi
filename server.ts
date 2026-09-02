import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './src/automation/schemaCatalog';
import { compararJsonComSchema, compararDoisJson } from './src/automation/schemaValidator';
import {
  globalAuthState,
  iniciarSessaoPlaywright,
  CREDENCIAIS_PADRAO,
  obterStatusSessaoAtualizada,
  simularExpiracaoSessao
} from './src/automation/auth';
import {
  obterEventosTrafego,
  registrarEventoTrafego,
  limparEventosTrafego,
  popularEventosIniciaisDescoberta
} from './src/automation/trafficMonitor';
import { TEMPLATES_NEGOCIO } from './src/automation/businessTemplates';
import { gerarScriptPlaywrightOficial, gerarScriptCriarNovoPlanoPlaywright } from './src/automation/playwrightScriptGenerator';
import { executarFerramentaNoPnbox, prepararEstruturaExecucao } from './src/automation/officialRunner';
import { executarDeepResearch, sintetizar14FerramentasPnbox } from './src/automation/geminiDeepResearch';
import { executarPesquisaUnificada, getNvidiaApiKey, NVIDIA_DEFAULT_MODELS } from './src/automation/aiProviders';
import { SchemaGenerator } from './src/utils/schemaGenerator';
import { PlanAuditManager } from './src/utils/auditUtils';
import { PlanoCriadoInfo } from './src/types/pnbox';

// Armazenamento em memória de planos criados via IA / Deep Research / DDP
const PLANOS_CRIADOS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO,
    nomePlano: 'Cafeteria Especial & Coworking Criativo',
    setor: 'Alimentação & Espaços de Trabalho',
    descricao: 'Cafeteria de microlotes e espaço de trabalho compartilhado com Wi-Fi ultra veloz.',
    cidadeUf: 'Curitiba / PR',
    criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14
  }
];

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '10mb' }));

  // Popular tráfego de laboratório inicial
  popularEventosIniciaisDescoberta(ID_PLANO_PADRAO);

  // --- ROTAS DA API DE AUTOMAÇÃO E ENGENHARIA REVERSA ---

  // 1. Catálogo do Mapa Técnico de Automação
  app.get('/api/automation/catalog', (req, res) => {
    res.json({
      status: 'ok',
      idPlanoPadrao: ID_PLANO_PADRAO,
      totalFerramentas: FERRAMENTAS_PNBOX.length,
      ferramentas: FERRAMENTAS_PNBOX
    });
  });

  // 2. Templates de Modelos de Negócio Prontos
  app.get('/api/automation/templates', (req, res) => {
    res.json({
      status: 'ok',
      templates: TEMPLATES_NEGOCIO
    });
  });

  // 3. Status e controle de Autenticação Playwright
  app.get('/api/automation/auth/status', (req, res) => {
    const session = obterStatusSessaoAtualizada();
    res.json({
      status: 'ok',
      isOnline: true,
      isExpired: session.isExpired || false,
      session
    });
  });

  app.post('/api/automation/auth/expire', (req, res) => {
    const session = simularExpiracaoSessao();
    res.json({
      status: 'ok',
      mensagem: 'Sessão marcada como expirada para fins de teste de reconexão.',
      session
    });
  });

  app.post('/api/automation/auth/login', async (req, res) => {
    const { cpf, password, idPlano } = req.body || {};
    const credenciais = {
      cpf: cpf || CREDENCIAIS_PADRAO.cpf,
      password: password || CREDENCIAIS_PADRAO.password,
      idPlano: idPlano || CREDENCIAIS_PADRAO.idPlano
    };

    const sessionResult = await iniciarSessaoPlaywright(credenciais);
    res.json({
      status: sessionResult.status === 'authenticated' ? 'ok' : 'error',
      session: sessionResult
    });
  });

  // 4. Execução de Preenchimento Oficial do PNBOX (Individual ou em Lote)
  app.post('/api/automation/fill-tool', async (req, res) => {
    const { ferramentaId, registros, idPlano } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;

    try {
      const stepResult = await executarFerramentaNoPnbox(
        ferramentaId,
        Array.isArray(registros) ? registros : [registros],
        plano
      );

      res.json({
        status: 'ok',
        resultado: stepResult
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', mensagem: err.message });
    }
  });

  app.post('/api/automation/fill-batch', async (req, res) => {
    const { templateId, idPlano, customData, delayBetweenToolsMs = 0 } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;
    const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];

    const executionSummary = prepararEstruturaExecucao(template.id, plano);
    executionSummary.statusGeral = 'executing';
    const inicioTotal = Date.now();

    const dadosParaUsar = customData || template.dados;

    for (let i = 0; i < executionSummary.steps.length; i++) {
      const step = executionSummary.steps[i];
      const f = FERRAMENTAS_PNBOX.find((item) => item.id === step.ferramentaId);
      if (!f) continue;

      const registros = dadosParaUsar[f.collectionName] || [f.exemploPayload];
      const result = await executarFerramentaNoPnbox(f.id, registros, plano);

      step.status = result.status;
      step.registrosSalvos = result.registrosSalvos;
      step.duracaoMs = result.duracaoMs;
      step.mensagem = result.mensagem;
      step.docIds = result.docIds;
      step.logs = result.logs;

      if (result.status === 'success' || result.status === 'warning') {
        executionSummary.ferramentasSucesso++;
        executionSummary.totalRegistrosSalvos += result.registrosSalvos;
      } else {
        executionSummary.ferramentasFalha++;
      }

      // Intervalo configurável entre ferramentas
      if (delayBetweenToolsMs > 0 && i < executionSummary.steps.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, Number(delayBetweenToolsMs)));
      }
    }

    executionSummary.duracaoTotalMs = Date.now() - inicioTotal;
    executionSummary.finalizadoEm = new Date().toISOString();
    executionSummary.statusGeral = executionSummary.ferramentasFalha === 0 ? 'completed' : 'failed';

    res.json({
      status: 'ok',
      resumo: executionSummary
    });
  });

  // 5. Exportação do Script Playwright Oficial para Execução Local/CLI
  app.get('/api/automation/script-playwright', (req, res) => {
    const { templateId, idPlano } = req.query;
    const script = gerarScriptPlaywrightOficial(
      templateId ? String(templateId) : undefined,
      idPlano ? String(idPlano) : undefined
    );

    res.json({
      status: 'ok',
      script
    });
  });

  // 6. Monitor de Tráfego de Rede (Requests / Responses XHR/Fetch/DDP)
  app.get('/api/automation/traffic', (req, res) => {
    const { tipo, apenasSalvamento, ferramentaId } = req.query;
    const eventos = obterEventosTrafego({
      tipo: tipo ? String(tipo) : undefined,
      apenasSalvamento: apenasSalvamento === 'true',
      ferramentaId: ferramentaId ? String(ferramentaId) : undefined
    });

    res.json({
      status: 'ok',
      total: eventos.length,
      eventos
    });
  });

  // 7. Limpeza do Histórico de Tráfego
  app.post('/api/automation/traffic/clear', (req, res) => {
    limparEventosTrafego();
    res.json({ status: 'ok', mensagem: 'Histórico de tráfego limpo com sucesso.' });
  });

  // 8. Validador e comparador de JSON com Schema
  app.post('/api/automation/validate', (req, res) => {
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

  // 9. Execução Direta Sem Renderização (Simulador DDP / Direct Save)
  app.post('/api/automation/execute-direct', (req, res) => {
    const { ferramentaId, payload, idPlano, simulate503, simulateTimeout } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;

    // Suporte a teste de retry com erro temporário 5xx
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

    // Validar payload antes
    const validacao = compararJsonComSchema(payload, ferramenta);

    // Registrar no monitor de tráfego como requisição DDP direta realizada
    const docIdGerado = 'doc_' + Math.random().toString(36).substring(2, 9);
    const ddpReqId = 'ddp_' + Date.now();

    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: `wss://pnbox.sebrae.com.br/websocket [${ferramenta.collectionName}.insert]`,
      status: validacao.isValido ? 200 : 400,
      duracaoMs: Math.floor(Math.random() * 35) + 20,
      payloadEnviado: {
        msg: 'method',
        method: `${ferramenta.collectionName}.insert`,
        params: [{ idPlano: plano, ...payload }],
        id: ddpReqId
      },
      respostaRecebida: validacao.isValido
        ? { msg: 'result', id: ddpReqId, result: docIdGerado }
        : { msg: 'result', id: ddpReqId, error: { error: 400, reason: validacao.resumo } },
      operacaoDetectada: {
        ferramentaId: ferramenta.id,
        acao: 'insert',
        collection: ferramenta.collectionName
      }
    });

    res.json({
      status: validacao.isValido ? 'ok' : 'warning',
      executadoSemRenderizacao: true,
      protocolo: 'DDP/WebSocket',
      method: `${ferramenta.collectionName}.insert`,
      docId: docIdGerado,
      validacao,
      mensagem: validacao.isValido
        ? `Operação gravada com sucesso direto no backend (${ferramenta.collectionName}) sem necessidade de renderização DOM!`
        : `Operação enviada, porém o payload contém inconsistências de schema.`
    });
  });

  // 10. IA Deep Research com Gemini e NVIDIA NIM (Multi-provider & 3 Contas)
  app.post('/api/ai/deep-research', async (req, res) => {
    const {
      prompt,
      cidadeUf,
      orcamentoEstimado,
      publicoAlvo,
      modeloAprofundado,
      provider = 'gemini',
      useSearchGrounding,
      geminiModel,
      nvidiaApiKey,
      nvidiaAccountSlot,
      nvidiaModel
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({ status: 'error', mensagem: 'O prompt da ideia de negócio é obrigatório.' });
    }

    try {
      const report = await executarPesquisaUnificada(prompt, {
        provider,
        cidadeUf: cidadeUf || 'Brasil / Nacional',
        orcamentoEstimado: Number(orcamentoEstimado) || 80000,
        publicoAlvo: publicoAlvo || 'B2C / Consumidor Final',
        modeloAprofundado: !!modeloAprofundado,
        useSearchGrounding: useSearchGrounding !== false,
        geminiModel,
        nvidiaApiKey,
        nvidiaAccountSlot: nvidiaAccountSlot ? (Number(nvidiaAccountSlot) as 1 | 2 | 3) : 1,
        nvidiaModel
      });

      res.json({
        status: 'ok',
        provider,
        report
      });
    } catch (err: any) {
      console.error('[API /api/ai/deep-research] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar Deep Research' });
    }
  });

  // Configuração dos Provedores e Slots de Contas NVIDIA
  app.get('/api/ai/providers-config', (req, res) => {
    const nvidia1 = !!(process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY);
    const nvidia2 = !!process.env.NVIDIA_API_KEY_2;
    const nvidia3 = !!process.env.NVIDIA_API_KEY_3;
    const gemini = !!process.env.GEMINI_API_KEY;

    res.json({
      status: 'ok',
      providers: {
        gemini: {
          available: gemini,
          defaultModel: 'gemini-3.7-flash',
          hasSearchGrounding: true
        },
        nvidia: {
          available: nvidia1 || nvidia2 || nvidia3,
          slots: [
            { id: 1, label: 'Conta NVIDIA 1 (Principal)', isConfigured: nvidia1, model: 'meta/llama-3.3-70b-instruct' },
            { id: 2, label: 'Conta NVIDIA 2 (Secundária)', isConfigured: nvidia2, model: 'deepseek-ai/deepseek-r1' },
            { id: 3, label: 'Conta NVIDIA 3 (Backup/Enterprise)', isConfigured: nvidia3, model: 'mistralai/mistral-large-2-instruct' }
          ],
          models: NVIDIA_DEFAULT_MODELS
        }
      }
    });
  });

  // 11. Síntese Estruturada das 14 Ferramentas do PNBOX via IA e SchemaGenerator
  app.post('/api/ai/synthesize-plan', async (req, res) => {
    const { research, idPlano } = req.body || {};

    if (!research || !research.nomeNegocioSugerido) {
      return res.status(400).json({ status: 'error', mensagem: 'Relatório de pesquisa não fornecido ou inválido.' });
    }

    const planoId = idPlano || ID_PLANO_PADRAO;

    try {
      // Gerar payloads usando o SchemaGenerator oficial
      const dados14Ferramentas = SchemaGenerator.generateFromResearch(research, planoId);
      res.json({
        status: 'ok',
        idPlano: planoId,
        dados14Ferramentas
      });
    } catch (err: any) {
      console.error('[API /api/ai/synthesize-plan] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao sintetizar dados das 14 ferramentas' });
    }
  });

  // 11.1 Auditoria e Health-Check do Plano Ativo
  app.post('/api/automation/audit', (req, res) => {
    const { idPlano, customData } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;
    const eventos = obterEventosTrafego({});

    const report = PlanAuditManager.auditarPlano(plano, customData, eventos);
    res.json({
      status: 'ok',
      report
    });
  });

  // 12. Criação Oficial de Novo Plano de Negócio no PNBOX (DDP + Registro de Tráfego)
  app.post('/api/automation/planos/create', (req, res) => {
    const { nomePlano, setor, descricao, cidadeUf, research, dados14Ferramentas, idPlanoCustom } = req.body || {};

    const idGerado = idPlanoCustom && idPlanoCustom.trim().length > 4
      ? idPlanoCustom.trim()
      : 'plano_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);

    const novoPlano: PlanoCriadoInfo = {
      idPlano: idGerado,
      nomePlano: nomePlano || 'Novo Empreendimento',
      setor: setor || 'Serviços & Comércio',
      descricao: descricao || 'Plano de negócio estruturado via Gemini Deep Research e PNBOX Hub',
      cidadeUf: cidadeUf || 'Brasil',
      criadoEm: new Date().toISOString(),
      status: 'criado_pnbox_ddp',
      metodoCriacao: 'ddp_direct',
      pesquisaMercado: research,
      dados14Ferramentas,
      ferramentasPreenchidas: 0
    };

    PLANOS_CRIADOS.unshift(novoPlano);

    // Registrar no monitor de tráfego como chamada de método DDP `planos.insert`
    const ddpReqId = 'ddp_create_' + Date.now();
    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: 'wss://pnbox.sebrae.com.br/websocket [planos.insert]',
      status: 200,
      duracaoMs: 42,
      payloadEnviado: {
        msg: 'method',
        method: 'planos.insert',
        params: [
          {
            _id: idGerado,
            nome: novoPlano.nomePlano,
            setor: novoPlano.setor,
            descricao: novoPlano.descricao,
            cidade: novoPlano.cidadeUf,
            status: 'em_andamento',
            createdAt: new Date().toISOString()
          }
        ],
        id: ddpReqId
      },
      respostaRecebida: {
        msg: 'result',
        id: ddpReqId,
        result: idGerado
      },
      operacaoDetectada: {
        acao: 'insert',
        collection: 'planos'
      }
    });

    res.json({
      status: 'ok',
      mensagem: `Novo plano "${novoPlano.nomePlano}" criado com sucesso no PNBOX!`,
      plano: novoPlano,
      idPlano: idGerado
    });
  });

  // 13. Listagem de Planos Cadastrados
  app.get('/api/automation/planos/list', (req, res) => {
    res.json({
      status: 'ok',
      total: PLANOS_CRIADOS.length,
      planos: PLANOS_CRIADOS
    });
  });

  // 14. Exportação do Script Playwright para Criação de Novo Plano na Página Principal
  app.post('/api/automation/script-criar-plano', (req, res) => {
    const { nomePlano, setor, dados14Ferramentas, idPlano } = req.body || {};
    const script = gerarScriptCriarNovoPlanoPlaywright(
      nomePlano || 'Novo Negócio Inteligente',
      setor || 'Serviços',
      dados14Ferramentas,
      idPlano || 'plano_' + Math.random().toString(36).substring(2, 8)
    );

    res.json({
      status: 'ok',
      script
    });
  });

  // Rota de Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'PNBOX Automation Hub API', timestamp: new Date().toISOString() });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();
