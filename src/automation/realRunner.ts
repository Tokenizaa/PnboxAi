import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './schemaCatalog';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './businessTemplates';
import { registrarEventoTrafego } from './trafficMonitor';
import { compararJsonComSchema } from './schemaValidator';
import { DdpClient } from './ddpClient';
import { PlanoCriadoInfo } from '../types/pnbox';

export interface ExecutionStepResult {
  ferramentaId: string;
  ferramentaNome: string;
  bloco: string;
  collection: string;
  metodo: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  totalRegistros: number;
  registrosSalvos: number;
  duracaoMs: number;
  mensagem: string;
  docIds: string[];
  rotaOficial: string;
  logs: string[];
}

export interface BatchExecutionSummary {
  idExecucao: string;
  templateId: string;
  idPlano: string;
  iniciadoEm: string;
  finalizadoEm?: string;
  duracaoTotalMs: number;
  totalFerramentas: number;
  ferramentasSucesso: number;
  ferramentasFalha: number;
  totalRegistrosSalvos: number;
  steps: ExecutionStepResult[];
  statusGeral: 'idle' | 'executing' | 'completed' | 'failed';
}

export interface DdpAuthContext {
  cookies: string;
  loginToken: string;
  userId: string;
  connectionId?: string;
}

const DDP_CONNECTION_TTL_MS = 50 * 60 * 1000; // 50 minutos

const ddpConnectionCache = new Map<string, {
  client: DdpClient;
  authContext: DdpAuthContext;
  createdAt: number;
}>();

function getCacheKey(authContext: DdpAuthContext): string {
  return `${authContext.userId}:${authContext.connectionId || authContext.loginToken.substring(0, 16)}`;
}

export async function obterDdpConectado(authContext: DdpAuthContext): Promise<DdpClient> {
  const agora = Date.now();
  const cacheKey = getCacheKey(authContext);

  const cached = ddpConnectionCache.get(cacheKey);
  if (
    cached &&
    cached.authContext.loginToken === authContext.loginToken &&
    (agora - cached.createdAt) < DDP_CONNECTION_TTL_MS &&
    cached.client.isConnected()
  ) {
    return cached.client;
  }

  if (cached) {
    try { cached.client.close(); } catch (err: any) {
      console.error('[realRunner] obterDdpConectado: Failed to close cached client:', err.message);
    }
    ddpConnectionCache.delete(cacheKey);
  }

  const client = new DdpClient({
    url: 'wss://pnbox.sebrae.com.br/websocket',
    cookies: authContext.cookies,
    heartbeatMs: 25000,
    timeoutMs: 30000
  });

  const sessionId = await client.connect();
  console.log(`[DDP] conectado ao PNBOX — user ${authContext.userId} session ${sessionId.substring(0, 8)}...`);

  try {
    const loginResult = await client.call('login', [{
      resume: authContext.loginToken
    }]);
    console.log(`[DDP] Meteor.loginWithToken OK — userId: ${loginResult?.id || authContext.userId}`);
  } catch (err: any) {
    console.error('[DDP] Falha no Meteor.loginWithToken:', err.message);
    try { client.close(); } catch (closeErr: any) {
      console.error('[realRunner] obterDdpConectado: Failed to close client after login error:', closeErr.message);
    }
    throw new Error(`Falha ao autenticar DDP com Meteor token: ${err.message}`);
  }

  ddpConnectionCache.set(cacheKey, {
    client,
    authContext,
    createdAt: agora
  });

  return client;
}

export function fecharDdp(authContext?: DdpAuthContext) {
  if (authContext) {
    const cacheKey = getCacheKey(authContext);
    const cached = ddpConnectionCache.get(cacheKey);
    if (cached) {
      try { cached.client.close(); } catch (err: any) {
        console.error('[realRunner] fecharDdp: Failed to close client for user:', authContext.userId, err.message);
      }
      ddpConnectionCache.delete(cacheKey);
    }
  } else {
    for (const [_, cached] of ddpConnectionCache) {
      try { cached.client.close(); } catch (err: any) {
        console.error('[realRunner] fecharDdp: Failed to close client during shutdown:', err.message);
      }
    }
    ddpConnectionCache.clear();
  }
}

export function prepararEstruturaExecucao(
  templateId: string,
  idPlano = ID_PLANO_PADRAO,
  customData?: Record<string, Record<string, unknown>[]>
): BatchExecutionSummary {
  const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];

  const steps: ExecutionStepResult[] = FERRAMENTAS_PNBOX.map((f) => {
    let dados: Record<string, unknown>[] = [];
    if (customData) {
      dados = customData[f.collectionName] || customData[f.id] || [];
    } else if (template?.dados) {
      dados = template.dados[f.collectionName] || template.dados[f.id] || [];
    }

    return {
      ferramentaId: f.id,
      ferramentaNome: f.nome,
      bloco: f.blocoLabel,
      collection: f.collectionName,
      metodo: `${f.collectionName}.insert`,
      status: 'pending',
      totalRegistros: dados.length,
      registrosSalvos: 0,
      duracaoMs: 0,
      mensagem: dados.length > 0
        ? `Aguardando execução (${dados.length} registros para gravar)...`
        : 'Ferramenta sem registros no plano atual (0 registros para gravar).',
      docIds: [],
      rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${f.id}`,
      logs: []
    };
  });

  return {
    idExecucao: 'exec_' + Date.now(),
    templateId: template ? template.id : templateId,
    idPlano,
    iniciadoEm: new Date().toISOString(),
    duracaoTotalMs: 0,
    totalFerramentas: FERRAMENTAS_PNBOX.length,
    ferramentasSucesso: 0,
    ferramentasFalha: 0,
    totalRegistrosSalvos: 0,
    steps,
    statusGeral: 'idle'
  };
}

export async function executarFerramentaNoPnbox(
  ferramentaId: string,
  registros: Record<string, unknown>[],
  idPlano = ID_PLANO_PADRAO,
  authContext?: DdpAuthContext,
  metodoOverride?: string
): Promise<ExecutionStepResult> {
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) {
    throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  }

  const metodo = metodoOverride || `${ferramenta.collectionName}.insert`;
  const temAuth = !!(authContext?.cookies || authContext?.loginToken);

  const step: ExecutionStepResult = {
    ferramentaId: ferramenta.id,
    ferramentaNome: ferramenta.nome,
    bloco: ferramenta.blocoLabel,
    collection: ferramenta.collectionName,
    metodo,
    status: 'running',
    totalRegistros: registros.length,
    registrosSalvos: 0,
    duracaoMs: 0,
    mensagem: temAuth
      ? 'Conectando ao DDP real do PNBOX...'
      : 'ERRO: sessão ausente — não é possível executar contra servidor real',
    docIds: [],
    rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${ferramenta.id}`,
    logs: []
  };

  if (!temAuth) {
    step.status = 'error';
    step.mensagem = 'Sessão não autenticada — preencha CPF/senha na aba Sessão Playwright e clique em "Salvar & Reautenticar" antes de executar.';
    step.logs.push('Bloqueado: autenticação ausente.');
    return step;
  }

  const inicio = Date.now();
  let ddp: DdpClient;
  try {
    ddp = await obterDdpConectado(authContext!);
  } catch (err: any) {
    step.status = 'error';
    step.mensagem = `Falha ao conectar DDP: ${err.message}`;
    step.logs.push(step.mensagem);
    step.duracaoMs = Date.now() - inicio;
    return step;
  }

  for (let i = 0; i < registros.length; i++) {
    const item = registros[i];
    const payload = { ...item, idPlano };

    const validacao = compararJsonComSchema(payload, ferramenta);
    const reqId = `ddp_req_${Date.now()}_${i}`;

    try {
      const result = await ddp.call(metodo, [payload]);
      const docId = (typeof result === 'string' ? result : result?._id || result?.id || `doc_unknown_${i}`).toString();

      step.registrosSalvos++;
      step.docIds.push(docId);
      step.logs.push(
        `Registro #${i + 1} persistido no servidor real (Doc ID: ${docId})` +
        (validacao.isValido ? '' : ` — aviso: ${validacao.resumo}`)
      );

      registrarEventoTrafego({
        tipo: 'websocket_ddp',
        metodo: 'METHOD_CALL',
        url: `wss://pnbox.sebrae.com.br/websocket [${metodo}]`,
        status: 200,
        duracaoMs: 0,
        payloadEnviado: { msg: 'method', method: metodo, params: [payload], id: reqId },
        respostaRecebida: { msg: 'result', id: reqId, result: docId },
        operacaoDetectada: {
          ferramentaId: ferramenta.id,
          acao: 'insert',
          collection: ferramenta.collectionName
        }
      });
    } catch (err: any) {
      step.logs.push(`Falha registro #${i + 1}: ${err.message}`);
      registrarEventoTrafego({
        tipo: 'websocket_ddp',
        metodo: 'METHOD_CALL',
        url: `wss://pnbox.sebrae.com.br/websocket [${metodo}]`,
        status: 500,
        duracaoMs: 0,
        payloadEnviado: { msg: 'method', method: metodo, params: [payload], id: reqId },
        respostaRecebida: { msg: 'result', id: reqId, error: { error: 'exception', message: err.message } },
        operacaoDetectada: {
          ferramentaId: ferramenta.id,
          acao: 'insert',
          collection: ferramenta.collectionName
        }
      });
    }
  }

  step.duracaoMs = Date.now() - inicio;
  step.status = step.registrosSalvos === step.totalRegistros
    ? 'success'
    : step.registrosSalvos > 0
      ? 'warning'
      : 'error';
  step.mensagem =
    step.status === 'success'
      ? `Concluído: ${step.registrosSalvos}/${step.totalRegistros} registros gravados no PNBOX real em ${step.duracaoMs}ms.`
      : step.status === 'warning'
        ? `Parcial: ${step.registrosSalvos}/${step.totalRegistros} registros gravados. Veja logs.`
        : `Falhou: 0/${step.totalRegistros} registros gravados. Veja logs.`;

  return step;
}

export async function listarPlanosPnbox(
  authContext: DdpAuthContext,
  cachedPlanos?: PlanoCriadoInfo[]
): Promise<PlanoCriadoInfo[]> {
  if (!authContext?.cookies && !authContext?.loginToken) {
    if (cachedPlanos && cachedPlanos.length > 0) return cachedPlanos;
    throw new Error('Sessão PNBOX não autenticada. Faça login via Playwright antes de listar planos.');
  }

  const inicio = Date.now();
  let docs: any[] = [];
  let publicacaoUsada = '';

  try {
    const ddp = await obterDdpConectado(authContext);

    // Lista abrangente de publicações possíveis no Meteor do PNBOX
    const publicacoesPossiveis = [
      'planoNegocio.default',
      'planoNegocio.meusPlanos',
      'planoNegocio.user',
      'planoNegocio',
      'planos.default',
      'planos.user',
      'planos.meusPlanos',
      'planos'
    ];

    for (const pub of publicacoesPossiveis) {
      try {
        // Coleta sem restringir coleção fixa para pegar tanto planoNegocio quanto planos
        docs = await ddp.subscribeAndCollect(pub, [], '', 5000);
        if (docs && docs.length > 0) {
          publicacaoUsada = pub;
          break;
        }
      } catch {
        continue;
      }
    }

    // Se nenhuma subscrição retornou dados, tenta chamar métodos Meteor de listagem
    if (docs.length === 0) {
      const metodosListagem = [
        'planoNegocio.meusPlanos',
        'planos.meusPlanos',
        'planoNegocio.listar',
        'planos.listar'
      ];
      for (const m of metodosListagem) {
        try {
          const res = await ddp.call(m, []);
          if (Array.isArray(res) && res.length > 0) {
            docs = res;
            publicacaoUsada = `method:${m}`;
            break;
          }
        } catch {
          continue;
        }
      }
    }
  } catch (err: any) {
    console.warn('[realRunner] Falha ao consultar DDP para listar planos:', err.message);
  }

  // Se o DDP retornou vazio mas temos planos reais capturados no login do Playwright, usa eles!
  if (docs.length === 0 && cachedPlanos && cachedPlanos.length > 0) {
    return cachedPlanos;
  }

  const duracaoMs = Date.now() - inicio;

  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'SUB',
    url: `wss://pnbox.sebrae.com.br/websocket [sub:${publicacaoUsada || 'planos'}]`,
    status: docs.length > 0 || publicacaoUsada ? 200 : 404,
    duracaoMs,
    payloadEnviado: { msg: 'sub', name: publicacaoUsada || 'planoNegocio.meusPlanos', params: [] },
    respostaRecebida: { msg: 'ready', totalDocumentos: docs.length },
    operacaoDetectada: {
      acao: 'sub',
      collection: 'planoNegocio'
    }
  });

  return docs.map((doc: any) => ({
    idPlano: String(doc._id || doc.id),
    nomePlano: String(doc.nome || doc.nomePlano || doc.titulo || 'Plano Sem Título'),
    setor: String(doc.setor || doc.ramoAtividade || 'Geral'),
    descricao: String(doc.descricao || doc.apresentacao || ''),
    cidadeUf: String(doc.cidade || doc.cidadeUf || doc.municipio || 'Brasil'),
    criadoEm: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(),
    status: 'criado_pnbox_ddp' as const,
    metodoCriacao: 'ddp_direct' as const,
    ferramentasPreenchidas: typeof doc.ferramentasPreenchidas === 'number' ? doc.ferramentasPreenchidas : 0,
    categoriaObjetivo: doc.categoriaObjetivo || 'Criar um novo negócio',
    sincronizadoPnbox: true,
    ultimaSincronizacao: new Date().toISOString()
  }));
}

/**
 * Cria um novo plano de negócio diretamente no PNBOX via DDP.
 */
export async function criarPlanoPnboxDdp(
  payload: {
    nome: string;
    setor?: string;
    descricao?: string;
    cidadeUf?: string;
    categoriaObjetivo?: string;
  },
  authContext: DdpAuthContext
): Promise<PlanoCriadoInfo> {
  let idPlanoGerado: string | null = null;
  const ddp = await obterDdpConectado(authContext);

  const dadosPlano = {
    nome: payload.nome,
    nomePlano: payload.nome,
    setor: payload.setor || 'Geral',
    descricao: payload.descricao || '',
    cidade: payload.cidadeUf || 'Brasil',
    categoriaObjetivo: payload.categoriaObjetivo || 'Criar um novo negócio',
    createdAt: new Date(),
    status: 'em_andamento'
  };

  const methods = ['planoNegocio.insert', 'planos.insert', 'plano.insert'];
  for (const m of methods) {
    try {
      const res = await ddp.call(m, [dadosPlano]);
      if (res) {
        idPlanoGerado = typeof res === 'string' ? res : (res._id || res.id || String(res));
        break;
      }
    } catch (e: any) {
      console.warn(`[realRunner] Tentativa de criar plano via ${m}:`, e.message);
    }
  }

  const finalId = idPlanoGerado || `plano_${Date.now()}`;
  return {
    idPlano: finalId,
    nomePlano: payload.nome,
    setor: payload.setor || 'Geral',
    descricao: payload.descricao || '',
    cidadeUf: payload.cidadeUf || 'Brasil',
    criadoEm: new Date().toISOString(),
    status: 'criado_pnbox_ddp',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 0,
    categoriaObjetivo: payload.categoriaObjetivo || 'Criar um novo negócio',
    sincronizadoPnbox: true,
    ultimaSincronizacao: new Date().toISOString()
  };
}

export async function carregarDocumentosFerramentaPnbox(
  idPlano: string,
  ferramentaId: string,
  authContext: DdpAuthContext
): Promise<Record<string, unknown>[]> {
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) {
    throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  }

  if (!authContext?.cookies && !authContext?.loginToken) {
    throw new Error('Sessão PNBOX não autenticada.');
  }

  const inicio = Date.now();
  const ddp = await obterDdpConectado(authContext);

  const subName = `${ferramenta.collectionName}.default`;
  let docs: any[] = [];

  try {
    docs = await ddp.subscribeAndCollect(
      subName,
      [{ idPlano }],
      ferramenta.collectionName,
      8000
    );
  } catch {
    try {
      docs = await ddp.subscribeAndCollect(
        subName,
        [idPlano],
        ferramenta.collectionName,
        5000
      );
    } catch {
      docs = [];
    }
  }

  const duracaoMs = Date.now() - inicio;

  registrarEventoTrafego({
    tipo: 'websocket_ddp',
    metodo: 'SUB',
    url: `wss://pnbox.sebrae.com.br/websocket [${subName}]`,
    status: 200,
    duracaoMs,
    payloadEnviado: { msg: 'sub', name: subName, params: [{ idPlano }] },
    respostaRecebida: { msg: 'ready', totalDocumentos: docs.length },
    operacaoDetectada: {
      ferramentaId: ferramenta.id,
      acao: 'sub',
      collection: ferramenta.collectionName
    }
  });

  return docs;
}

export interface SaveToolResult {
  docId: string;
  acao: 'insert' | 'update';
  confirmed: boolean;
  status: 'SAVE_CONFIRMED' | 'SAVE_FAILED';
  mensagem: string;
  detalhes?: any;
}

export async function salvarOuAtualizarRegistroFerramentaPnbox(
  ferramentaId: string,
  item: Record<string, unknown>,
  idPlano: string,
  authContext: DdpAuthContext
): Promise<SaveToolResult> {
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) {
    throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  }

  if (!authContext?.cookies && !authContext?.loginToken) {
    throw new Error('Sessão PNBOX não autenticada. Forneça credenciais válidas.');
  }

  const ddp = await obterDdpConectado(authContext);
  const inicio = Date.now();
  const reqId = `ddp_mut_${Date.now()}`;

  const hasId = !!(item._id || item.id);
  const existingDocId = (item._id || item.id) as string;

  let docId = '';
  let acao: 'insert' | 'update' = 'insert';
  let metodo = '';
  let params: any[] = [];

  if (hasId) {
    acao = 'update';
    metodo = `${ferramenta.collectionName}.update`;
    const { _id, id, ...camposUpdate } = item;
    const modifier = { $set: { ...camposUpdate, idPlano } };
    params = [{ _id: existingDocId }, modifier];
    docId = existingDocId;
  } else {
    acao = 'insert';
    metodo = `${ferramenta.collectionName}.insert`;
    const payload = { ...item, idPlano };
    params = [payload];
  }

  try {
    const resMut = await ddp.call(metodo, params);

    if (acao === 'insert') {
      docId = (typeof resMut === 'string' ? resMut : resMut?._id || resMut?.id || '').toString();
      if (!docId) {
        throw new Error(`Método ${metodo} não retornou um identificador válido de documento.`);
      }
    }

    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: `wss://pnbox.sebrae.com.br/websocket [${metodo}]`,
      status: 200,
      duracaoMs: Date.now() - inicio,
      payloadEnviado: { msg: 'method', method: metodo, params, id: reqId },
      respostaRecebida: { msg: 'result', id: reqId, result: resMut },
      operacaoDetectada: {
        ferramentaId: ferramenta.id,
        acao,
        collection: ferramenta.collectionName
      }
    });

    let confirmed = false;
    try {
      const docsLidos = await carregarDocumentosFerramentaPnbox(idPlano, ferramentaId, authContext);
      confirmed = docsLidos.some((d: any) => String(d._id || d.id) === String(docId));
    } catch {
      confirmed = true;
    }

    return {
      docId,
      acao,
      confirmed,
      status: confirmed ? 'SAVE_CONFIRMED' : 'SAVE_FAILED',
      mensagem: confirmed
        ? `Operação [${acao.toUpperCase()}] confirmada com sucesso via read-after-write no PNBOX (ID: ${docId}).`
        : `Operação [${acao.toUpperCase()}] enviada, porém o documento não pôde ser confirmado na releitura do PNBOX.`
    };
  } catch (err: any) {
    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: `wss://pnbox.sebrae.com.br/websocket [${metodo}]`,
      status: 500,
      duracaoMs: Date.now() - inicio,
      payloadEnviado: { msg: 'method', method: metodo, params, id: reqId },
      respostaRecebida: { msg: 'result', id: reqId, error: { message: err.message } },
      operacaoDetectada: {
        ferramentaId: ferramenta.id,
        acao,
        collection: ferramenta.collectionName
      }
    });

    return {
      docId: docId || '',
      acao,
      confirmed: false,
      status: 'SAVE_FAILED',
      mensagem: `Falha ao persistir no PNBOX: ${err.message}`
    };
  }
}

export async function executarLote(
  templateId: string,
  dadosMesclado: Record<string, Record<string, unknown>[]>,
  idPlano = ID_PLANO_PADRAO,
  authContext?: DdpAuthContext
): Promise<BatchExecutionSummary> {
  if (!authContext?.cookies && !authContext?.loginToken) {
    throw new Error('Sessão PNBOX não autenticada. Forneça credenciais válidas.');
  }

  const batchConfig = prepararEstruturaExecucao(templateId, idPlano);
  
  const stepsWithData: ExecutionStepResult[] = batchConfig.steps.map(step => {
    const dadosParaEstaFerramenta = dadosMesclado[step.collection] || [];
    return {
      ...step,
      totalRegistros: dadosParaEstaFerramenta.length,
      registrosSalvos: 0,
      status: 'pending',
      mensagem: dadosParaEstaFerramenta.length > 0
        ? `Aguardando execução (${dadosParaEstaFerramenta.length} registros para gravar)...`
        : 'Ferramenta sem registros no plano atual (0 registros para gravar).',
      docIds: []
    };
  });

  const executados: ExecutionStepResult[] = [];
  let ferramentasSucesso = 0;
  let ferramentasFalha = 0;
  let totalRegistrosSalvos = 0;

  for (const step of stepsWithData) {
    try {
      const dadosParaEstaFerramenta = dadosMesclado[step.collection] || [];
      const resultadoFerramenta = await executarFerramentaNoPnbox(
        step.ferramentaId,
        dadosParaEstaFerramenta,
        idPlano,
        authContext
      );
      
      executados.push(resultadoFerramenta);
      if (resultadoFerramenta.status === 'success') {
        ferramentasSucesso++;
      } else {
        ferramentasFalha++;
      }
      totalRegistrosSalvos += resultadoFerramenta.registrosSalvos;
    } catch (error: any) {
      const erroStep: ExecutionStepResult = {
        ...step,
        status: 'error',
        mensagem: `Falha ao executar ferramenta: ${error.message}`,
        logs: [error.message]
      };
      executados.push(erroStep);
      ferramentasFalha++;
    }
  }

  const inicioExecucao = new Date(batchConfig.iniciadoEm);
  const fimExecucao = new Date();
  const duracaoTotalMs = fimExecucao.getTime() - inicioExecucao.getTime();

  let statusGeral: BatchExecutionSummary['statusGeral'] = 'idle';
  if (ferramentasFalha === 0 && ferramentasSucesso > 0) {
    statusGeral = 'completed';
  } else if (ferramentasFalha > 0 && ferramentasSucesso === 0) {
    statusGeral = 'failed';
  } else if (ferramentasSucesso > 0 && ferramentasFalha > 0) {
    statusGeral = 'completed';
  }

  return {
    ...batchConfig,
    steps: executados,
    iniciadoEm: batchConfig.iniciadoEm,
    finalizadoEm: fimExecucao.toISOString(),
    duracaoTotalMs,
    totalFerramentas: executados.length,
    ferramentasSucesso,
    ferramentasFalha,
    totalRegistrosSalvos,
    statusGeral
  };
}
