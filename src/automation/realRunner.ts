import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './schemaCatalog';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './businessTemplates';
import { registrarEventoTrafego } from './trafficMonitor';
import { DdpAuthContext, DdpClient } from './ddpClient';
import { PlanoCriadoInfo } from '../types/pnbox';

let ddpConectado: DdpClient | null = null;
let ddpContextKey = '';

function contextoValido(authContext: DdpAuthContext): boolean {
  return !!(authContext?.cookies || authContext?.loginToken);
}

async function obterDdpConectado(authContext: DdpAuthContext): Promise<DdpClient> {
  if (!contextoValido(authContext)) throw new Error('Sessão PNBOX não autenticada.');
  const key = JSON.stringify({ cookies: authContext.cookies || '', loginToken: authContext.loginToken || '', meteorUserId: authContext.meteorUserId || '' });
  if (ddpConectado && ddpContextKey === key) return ddpConectado;
  if (ddpConectado) {
    try { ddpConectado.close(); } catch { /* ignore */ }
  }
  ddpConectado = new DdpClient({ url: 'wss://pnbox.sebrae.com.br/websocket', auth: authContext });
  ddpContextKey = key;
  await ddpConectado.connect();
  return ddpConectado;
}

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

function compararJsonComSchema(dados: Record<string, unknown>, ferramenta: typeof FERRAMENTAS_PNBOX[number]): { isValido: boolean; resumo: string } {
  const obrigatorios = ferramenta.camposSchema.filter((c) => c.obrigatorio).map((c) => c.nome);
  const faltantes = obrigatorios.filter((campo) => dados[campo] === undefined || dados[campo] === null || dados[campo] === '');
  return {
    isValido: faltantes.length === 0,
    resumo: faltantes.length === 0 ? 'JSON compatível com schema.' : `Campos obrigatórios ausentes: ${faltantes.join(', ')}`
  };
}

export function prepararEstruturaExecucao(templateId: string, idPlano: string): BatchExecutionSummary {
  if (!idPlano || !idPlano.trim()) throw new Error('ID do plano PNBOX é obrigatório para preparar a execução.');
  const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId);
  if (!template) throw new Error(`Template ${templateId} não encontrado.`);
  const steps: ExecutionStepResult[] = FERRAMENTAS_PNBOX.map((f) => ({
    ferramentaId: f.id,
    ferramentaNome: f.nome,
    bloco: f.blocoLabel,
    collection: f.collectionName,
    metodo: `${f.collectionName}.insert`,
    status: 'pending',
    totalRegistros: 0,
    registrosSalvos: 0,
    duracaoMs: 0,
    mensagem: 'Aguardando execução contra PNBOX real.',
    docIds: [],
    rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${f.id}`,
    logs: []
  }));
  return {
    idExecucao: `exec_${Date.now()}`,
    templateId: template.id,
    idPlano,
    iniciadoEm: new Date().toISOString(),
    duracaoTotalMs: 0,
    totalFerramentas: steps.length,
    ferramentasSucesso: 0,
    ferramentasFalha: 0,
    totalRegistrosSalvos: 0,
    steps,
    statusGeral: 'idle'
  };
}

export async function executarFerramentaNoPnbox(ferramentaId: string, registros: Record<string, unknown>[], idPlano: string, authContext?: DdpAuthContext, metodoOverride?: string): Promise<ExecutionStepResult> {
  if (!idPlano || !idPlano.trim()) throw new Error('ID do plano PNBOX é obrigatório.');
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  const temAuth = !!(authContext?.cookies || authContext?.loginToken);
  const step: ExecutionStepResult = { ferramentaId: ferramenta.id, ferramentaNome: ferramenta.nome, bloco: ferramenta.blocoLabel, collection: ferramenta.collectionName, metodo: metodoOverride || `${ferramenta.collectionName}.insert`, status: 'running', totalRegistros: registros.length, registrosSalvos: 0, duracaoMs: 0, mensagem: temAuth ? 'Conectando ao DDP real do PNBOX...' : 'ERRO: sessão ausente — não é possível executar contra servidor real', docIds: [], rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${ferramenta.id}`, logs: [] };
  if (!temAuth) { step.status = 'error'; step.mensagem = 'Sessão não autenticada.'; step.logs.push('Bloqueado: autenticação ausente.'); return step; }
  const inicio = Date.now();
  let ddp: DdpClient;
  try { ddp = await obterDdpConectado(authContext!); } catch (err: any) { step.status = 'error'; step.mensagem = `Falha ao conectar DDP: ${err.message}`; step.logs.push(step.mensagem); step.duracaoMs = Date.now() - inicio; return step; }
  for (let i = 0; i < registros.length; i++) {
    const item = registros[i];
    const payload = { ...item, idPlano };
    const validacao = compararJsonComSchema(payload, ferramenta);
    const reqId = `ddp_req_${Date.now()}_${i}`;
    try {
      const result = await ddp.call(step.metodo, [payload]);
      const docId = (typeof result === 'string' ? result : result?._id || result?.id || '').toString();
      if (!docId) throw new Error(`Método ${step.metodo} não retornou identificador do documento.`);
      step.registrosSalvos++; step.docIds.push(docId);
      step.logs.push(`Registro #${i + 1} persistido no servidor real (Doc ID: ${docId})` + (validacao.isValido ? '' : ` — aviso: ${validacao.resumo}`));
      registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'METHOD_CALL', url: `wss://pnbox.sebrae.com.br/websocket [${step.metodo}]`, status: 200, duracaoMs: 0, payloadEnviado: { msg: 'method', method: step.metodo, params: [payload], id: reqId }, respostaRecebida: { msg: 'result', id: reqId, result: docId }, operacaoDetectada: { ferramentaId: ferramenta.id, acao: 'insert', collection: ferramenta.collectionName } });
    } catch (err: any) {
      step.logs.push(`Falha registro #${i + 1}: ${err.message}`);
      registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'METHOD_CALL', url: `wss://pnbox.sebrae.com.br/websocket [${step.metodo}]`, status: 500, duracaoMs: 0, payloadEnviado: { msg: 'method', method: step.metodo, params: [payload], id: reqId }, respostaRecebida: { msg: 'result', id: reqId, error: { error: 'exception', message: err.message } }, operacaoDetectada: { ferramentaId: ferramenta.id, acao: 'insert', collection: ferramenta.collectionName } });
    }
  }
  step.duracaoMs = Date.now() - inicio;
  step.status = step.registrosSalvos === step.totalRegistros ? 'success' : step.registrosSalvos > 0 ? 'warning' : 'error';
  step.mensagem = step.status === 'success' ? `Concluído: ${step.registrosSalvos}/${step.totalRegistros} registros gravados no PNBOX real em ${step.duracaoMs}ms.` : step.status === 'warning' ? `Parcial: ${step.registrosSalvos}/${step.totalRegistros} registros gravados. Veja logs.` : `Falhou: 0/${step.totalRegistros} registros gravados. Veja logs.`;
  return step;
}

export async function listarPlanosPnbox(authContext: DdpAuthContext, _cachedPlanos?: PlanoCriadoInfo[]): Promise<PlanoCriadoInfo[]> {
  if (!contextoValido(authContext)) throw new Error('Sessão PNBOX não autenticada. Faça login via Playwright antes de listar planos.');
  const inicio = Date.now();
  let docs: any[] = [];
  let publicacaoUsada = '';
  let consultaFalhou = false;
  try {
    const ddp = await obterDdpConectado(authContext);
    const publicacoesPossiveis = ['planoNegocio.default', 'planoNegocio.meusPlanos', 'planoNegocio.user', 'planoNegocio', 'planos.default', 'planos.user', 'planos.meusPlanos', 'planos'];
    for (const pub of publicacoesPossiveis) {
      try {
        const tentativa = await ddp.subscribeAndCollect(pub, [], '', 5000);
        if (tentativa.length > 0) { docs = tentativa; publicacaoUsada = pub; break; }
      } catch { /* try next known contract candidate */ }
    }
    if (docs.length === 0) {
      for (const m of ['planoNegocio.meusPlanos', 'planos.meusPlanos', 'planoNegocio.listar', 'planos.listar']) {
        try {
          const res = await ddp.call(m, []);
          if (Array.isArray(res)) { docs = res; publicacaoUsada = `method:${m}`; break; }
        } catch { /* try next known contract candidate */ }
      }
    }
    if (!publicacaoUsada) consultaFalhou = true;
  } catch (err: any) {
    consultaFalhou = true;
    registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'SUB', url: 'wss://pnbox.sebrae.com.br/websocket', status: 500, duracaoMs: Date.now() - inicio, payloadEnviado: {}, respostaRecebida: { error: err.message }, operacaoDetectada: { acao: 'sub', collection: 'planoNegocio' } });
  }
  if (consultaFalhou) throw new Error('Não foi possível confirmar a listagem de planos diretamente no PNBOX via DDP. Nenhum cache local será usado como substituto.');
  const duracaoMs = Date.now() - inicio;
  registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'SUB', url: `wss://pnbox.sebrae.com.br/websocket [sub:${publicacaoUsada}]`, status: 200, duracaoMs, payloadEnviado: { msg: 'sub', name: publicacaoUsada, params: [] }, respostaRecebida: { msg: 'ready', totalDocumentos: docs.length }, operacaoDetectada: { acao: 'sub', collection: 'planoNegocio' } });
  return docs.map((doc: any) => {
    const idPlano = String(doc._id || doc.id || '').trim();
    if (!idPlano) throw new Error('PNBOX retornou um plano sem identificador real.');
    return { idPlano, nomePlano: String(doc.nome || doc.nomePlano || doc.titulo || 'Plano Sem Título'), setor: String(doc.setor || doc.ramoAtividade || 'Geral'), descricao: String(doc.descricao || doc.apresentacao || ''), cidadeUf: String(doc.cidade || doc.cidadeUf || doc.municipio || 'Brasil'), criadoEm: doc.createdAt ? new Date(doc.createdAt).toISOString() : new Date().toISOString(), status: 'criado_pnbox_ddp' as const, metodoCriacao: 'ddp_direct' as const, ferramentasPreenchidas: typeof doc.ferramentasPreenchidas === 'number' ? doc.ferramentasPreenchidas : 0, categoriaObjetivo: doc.categoriaObjetivo || 'Criar um novo negócio', sincronizadoPnbox: true, ultimaSincronizacao: new Date().toISOString() };
  });
}

export async function criarPlanoPnboxDdp(payload: { nome: string; setor?: string; descricao?: string; cidadeUf?: string; categoriaObjetivo?: string }, authContext: DdpAuthContext): Promise<PlanoCriadoInfo> {
  if (!payload.nome?.trim()) throw new Error('Nome do plano é obrigatório.');
  if (!contextoValido(authContext)) throw new Error('Sessão PNBOX não autenticada.');
  const ddp = await obterDdpConectado(authContext);
  const dadosPlano = { nome: payload.nome, nomePlano: payload.nome, setor: payload.setor || 'Geral', descricao: payload.descricao || '', cidade: payload.cidadeUf || 'Brasil', categoriaObjetivo: payload.categoriaObjetivo || 'Criar um novo negócio', createdAt: new Date(), status: 'em_andamento' };
  const methods = ['planoNegocio.insert', 'planos.insert', 'plano.insert'];
  let idPlanoGerado = '';
  let metodoCriacao = '';
  for (const m of methods) {
    try {
      const res = await ddp.call(m, [dadosPlano]);
      const id = typeof res === 'string' ? res : res?._id || res?.id || '';
      if (id && String(id).trim()) { idPlanoGerado = String(id).trim(); metodoCriacao = m; break; }
    } catch (e: any) { console.warn(`[realRunner] Tentativa de criar plano via ${m}:`, e.message); }
  }
  if (!idPlanoGerado) throw new Error('PNBOX não confirmou a criação do plano via nenhum método DDP conhecido. Nenhum ID local será fabricado.');
  return { idPlano: idPlanoGerado, nomePlano: payload.nome, setor: payload.setor || 'Geral', descricao: payload.descricao || '', cidadeUf: payload.cidadeUf || 'Brasil', criadoEm: new Date().toISOString(), status: 'criado_pnbox_ddp', metodoCriacao: 'ddp_direct', ferramentasPreenchidas: 0, categoriaObjetivo: payload.categoriaObjetivo || 'Criar um novo negócio', sincronizadoPnbox: true, ultimaSincronizacao: new Date().toISOString() };
}

export async function carregarDocumentosFerramentaPnbox(idPlano: string, ferramentaId: string, authContext: DdpAuthContext): Promise<Record<string, unknown>[]> {
  if (!idPlano?.trim()) throw new Error('ID do plano PNBOX é obrigatório.');
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  if (!contextoValido(authContext)) throw new Error('Sessão PNBOX não autenticada.');
  const inicio = Date.now();
  const ddp = await obterDdpConectado(authContext);
  const subName = `${ferramenta.collectionName}.default`;
  let docs: any[] = [];
  try { docs = await ddp.subscribeAndCollect(subName, [{ idPlano }], ferramenta.collectionName, 8000); } catch { try { docs = await ddp.subscribeAndCollect(subName, [idPlano], ferramenta.collectionName, 5000); } catch (err: any) { throw new Error(`Falha ao consultar ${ferramenta.collectionName} no PNBOX: ${err.message}`); } }
  registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'SUB', url: `wss://pnbox.sebrae.com.br/websocket [${subName}]`, status: 200, duracaoMs: Date.now() - inicio, payloadEnviado: { msg: 'sub', name: subName, params: [{ idPlano }] }, respostaRecebida: { msg: 'ready', totalDocumentos: docs.length }, operacaoDetectada: { ferramentaId: ferramenta.id, acao: 'sub', collection: ferramenta.collectionName } });
  return docs;
}

export interface SaveToolResult { docId: string; acao: 'insert' | 'update'; confirmed: boolean; status: 'SAVE_CONFIRMED' | 'SAVE_FAILED'; mensagem: string; detalhes?: any; }

export async function salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId: string, item: Record<string, unknown>, idPlano: string, authContext: DdpAuthContext): Promise<SaveToolResult> {
  if (!idPlano?.trim()) throw new Error('ID do plano PNBOX é obrigatório.');
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  if (!contextoValido(authContext)) throw new Error('Sessão PNBOX não autenticada.');
  const ddp = await obterDdpConectado(authContext); const inicio = Date.now(); const reqId = `ddp_mut_${Date.now()}`;
  const hasId = !!(item._id || item.id); const existingDocId = String(item._id || item.id || '');
  const acao: 'insert' | 'update' = hasId ? 'update' : 'insert'; const metodo = `${ferramenta.collectionName}.${acao === 'update' ? 'update' : 'insert'}`;
  const params = acao === 'update' ? [{ _id: existingDocId }, { $set: { ...Object.fromEntries(Object.entries(item).filter(([k]) => k !== '_id' && k !== 'id')), idPlano } }] : [{ ...item, idPlano }];
  let docId = existingDocId;
  try {
    const resMut = await ddp.call(metodo, params);
    if (acao === 'insert') { docId = String(typeof resMut === 'string' ? resMut : resMut?._id || resMut?.id || '').trim(); if (!docId) throw new Error(`Método ${metodo} não retornou identificador de documento.`); }
    registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'METHOD_CALL', url: `wss://pnbox.sebrae.com.br/websocket [${metodo}]`, status: 200, duracaoMs: Date.now() - inicio, payloadEnviado: { msg: 'method', method: metodo, params, id: reqId }, respostaRecebida: { msg: 'result', id: reqId, result: resMut }, operacaoDetectada: { ferramentaId: ferramenta.id, acao, collection: ferramenta.collectionName } });
    let confirmed = false;
    try { const docsLidos = await carregarDocumentosFerramentaPnbox(idPlano, ferramentaId, authContext); confirmed = docsLidos.some((d: any) => String(d._id || d.id) === docId); } catch { confirmed = false; }
    return { docId, acao, confirmed, status: confirmed ? 'SAVE_CONFIRMED' : 'SAVE_FAILED', mensagem: confirmed ? `Operação [${acao.toUpperCase()}] confirmada via read-after-write no PNBOX (ID: ${docId}).` : `Operação [${acao.toUpperCase()}] enviada, mas não foi confirmada na releitura do PNBOX.` };
  } catch (err: any) {
    registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'METHOD_CALL', url: `wss://pnbox.sebrae.sebrae.com.br/websocket [${metodo}]`, status: 500, duracaoMs: Date.now() - inicio, payloadEnviado: { msg: 'method', method: metodo, params, id: reqId }, respostaRecebida: { msg: 'result', id: reqId, error: { message: err.message } }, operacaoDetectada: { ferramentaId: ferramenta.id, acao, collection: ferramenta.collectionName } });
    return { docId, acao, confirmed: false, status: 'SAVE_FAILED', mensagem: `Falha ao persistir no PNBOX: ${err.message}` };
  }
}

export async function executarLote(templateId: string, dadosMesclado: Record<string, Record<string, unknown>[]>, idPlano: string, authContext?: DdpAuthContext): Promise<BatchExecutionSummary> {
  if (!authContext?.cookies && !authContext?.loginToken) throw new Error('Sessão PNBOX não autenticada.');
  const batchConfig = prepararEstruturaExecucao(templateId, idPlano);
  const executados: ExecutionStepResult[] = [];
  let ferramentasSucesso = 0, ferramentasFalha = 0, totalRegistrosSalvos = 0;
  for (const step of batchConfig.steps) {
    const dados = dadosMesclado[step.collection] || [];
    try { const resultado = await executarFerramentaNoPnbox(step.ferramentaId, dados, idPlano, authContext); executados.push(resultado); if (resultado.status === 'success') ferramentasSucesso++; else ferramentasFalha++; totalRegistrosSalvos += resultado.registrosSalvos; }
    catch (error: any) { executados.push({ ...step, status: 'error', mensagem: `Falha ao executar ferramenta: ${error.message}`, logs: [error.message] }); ferramentasFalha++; }
  }
  const fim = new Date(); const duracaoTotalMs = fim.getTime() - new Date(batchConfig.iniciadoEm).getTime();
  const statusGeral: BatchExecutionSummary['statusGeral'] = ferramentasFalha === 0 && ferramentasSucesso > 0 ? 'completed' : ferramentasSucesso === 0 ? 'failed' : 'completed';
  return { ...batchConfig, steps: executados, finalizadoEm: fim.toISOString(), duracaoTotalMs, totalFerramentas: executados.length, ferramentasSucesso, ferramentasFalha, totalRegistrosSalvos, statusGeral };
}
