import { FERRAMENTAS_PNBOX } from './schemaCatalog';
import { TEMPLATES_NEGOCIO } from './businessTemplates';
import { registrarEventoTrafego } from './trafficMonitor';
import { DdpClient } from './ddpClient';
import { PlanoCriadoInfo } from '../types/pnbox';

export interface DdpAuthContext { cookies?: string; loginToken?: string; meteorUserId?: string; userId?: string; }
let ddpConectado: DdpClient | null = null;
let ddpContextKey = '';
function contextoValido(a: DdpAuthContext) { return !!a?.cookies; }
async function obterDdpConectado(a: DdpAuthContext) {
  if (!contextoValido(a)) throw new Error('Sessão PNBOX não autenticada.');
  const key = JSON.stringify({ cookies: a.cookies || '', user: a.meteorUserId || a.userId || '' });
  if (ddpConectado?.isConnected() && ddpContextKey === key) return ddpConectado;
  if (ddpConectado) { try { ddpConectado.close(); } catch {} }
  ddpConectado = new DdpClient({ url: 'wss://pnbox.sebrae.com.br/websocket', cookies: a.cookies });
  ddpContextKey = key;
  await ddpConectado.connect();
  return ddpConectado;
}

export interface ExecutionStepResult { ferramentaId: string; ferramentaNome: string; bloco: string; collection: string; metodo: string; status: 'pending'|'running'|'success'|'warning'|'error'; totalRegistros: number; registrosSalvos: number; duracaoMs: number; mensagem: string; docIds: string[]; rotaOficial: string; logs: string[]; }
export interface BatchExecutionSummary { idExecucao: string; templateId: string; idPlano: string; iniciadoEm: string; finalizadoEm?: string; duracaoTotalMs: number; totalFerramentas: number; ferramentasSucesso: number; ferramentasFalha: number; totalRegistrosSalvos: number; steps: ExecutionStepResult[]; statusGeral: 'idle'|'executing'|'completed'|'failed'; }

function requirePlan(id: string) {
  const value = id?.trim();
  if (!value || value === ':idPlano' || value.startsWith('plano_')) throw new Error('ID do plano PNBOX real é obrigatório.');
}

function validarRegistro(d: Record<string, unknown>, f: typeof FERRAMENTAS_PNBOX[number]) {
  const req = f.camposSchema.filter(c => c.obrigatorio).map(c => c.nome);
  const miss = req.filter(c => d[c] === undefined || d[c] === null || d[c] === '');
  return { isValido: miss.length === 0, resumo: miss.length ? `Campos obrigatórios ausentes: ${miss.join(', ')}` : 'JSON compatível com schema.' };
}

export function prepararEstruturaExecucao(templateId: string, idPlano: string): BatchExecutionSummary {
  requirePlan(idPlano);
  const template = TEMPLATES_NEGOCIO.find(t => t.id === templateId);
  if (!template) throw new Error(`Template ${templateId} não encontrado.`);
  const steps = FERRAMENTAS_PNBOX.map(f => ({ ferramentaId: f.id, ferramentaNome: f.nome, bloco: f.blocoLabel, collection: f.collectionName, metodo: `${f.collectionName}.insert`, status: 'pending' as const, totalRegistros: 0, registrosSalvos: 0, duracaoMs: 0, mensagem: 'Aguardando execução contra PNBOX real.', docIds: [], rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${f.id}`, logs: [] }));
  return { idExecucao: `exec_${Date.now()}`, templateId: template.id, idPlano, iniciadoEm: new Date().toISOString(), duracaoTotalMs: 0, totalFerramentas: steps.length, ferramentasSucesso: 0, ferramentasFalha: 0, totalRegistrosSalvos: 0, steps, statusGeral: 'idle' };
}

export async function executarFerramentaNoPnbox(ferramentaId: string, registros: Record<string, unknown>[], idPlano: string, authContext?: DdpAuthContext, metodoOverride?: string): Promise<ExecutionStepResult> {
  requirePlan(idPlano);
  const f = FERRAMENTAS_PNBOX.find(x => x.id === ferramentaId);
  if (!f) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  const step: ExecutionStepResult = { ferramentaId: f.id, ferramentaNome: f.nome, bloco: f.blocoLabel, collection: f.collectionName, metodo: metodoOverride || `${f.collectionName}.insert`, status: 'running', totalRegistros: registros.length, registrosSalvos: 0, duracaoMs: 0, mensagem: 'Conectando ao DDP real do PNBOX...', docIds: [], rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${f.id}`, logs: [] };
  if (!contextoValido(authContext || {})) { step.status = 'error'; step.mensagem = 'Sessão não autenticada.'; return step; }
  const inicio = Date.now();
  let ddp: DdpClient;
  try { ddp = await obterDdpConectado(authContext!); } catch (e: any) { step.status = 'error'; step.mensagem = `Falha ao conectar DDP: ${e.message}`; step.duracaoMs = Date.now() - inicio; return step; }

  for (let i = 0; i < registros.length; i++) {
    const payload = { ...registros[i], idPlano };
    const validacao = validarRegistro(payload, f);
    const reqId = `ddp_req_${Date.now()}_${i}`;
    if (!validacao.isValido) {
      step.logs.push(`Registro #${i + 1} bloqueado: ${validacao.resumo}`);
      continue;
    }
    try {
      const result = await ddp.call(step.metodo, [payload]);
      const docId = String(typeof result === 'string' ? result : result?._id || result?.id || '').trim();
      if (!docId) throw new Error(`Método ${step.metodo} não retornou identificador do documento.`);
      step.registrosSalvos++;
      step.docIds.push(docId);
      step.logs.push(`Registro #${i + 1} persistido no PNBOX real (Doc ID: ${docId})`);
      registrarEventoTrafego({ tipo: 'websocket_ddp', metodo: 'METHOD_CALL', url: `wss://pnbox.sebrae.com.br/websocket [${step.metodo}]`, status: 200, duracaoMs: 0, payloadEnviado: { msg: 'method', method: step.metodo, params: [payload], id: reqId }, respostaRecebida: { msg: 'result', id: reqId, result: docId }, operacaoDetectada: { ferramentaId: f.id, acao: 'insert', collection: f.collectionName } });
    } catch (e: any) {
      step.logs.push(`Falha registro #${i + 1}: ${e.message}`);
    }
  }
  step.duracaoMs = Date.now() - inicio;
  step.status = step.registrosSalvos === step.totalRegistros ? 'success' : step.registrosSalvos ? 'warning' : 'error';
  step.mensagem = step.status === 'success' ? `Concluído: ${step.registrosSalvos}/${step.totalRegistros} registros gravados no PNBOX real.` : `${step.registrosSalvos}/${step.totalRegistros} registros confirmados no PNBOX real.`;
  return step;
}

function mapPlanoReal(doc: any): PlanoCriadoInfo {
  const idPlano = String(doc._id || doc.id || '').trim();
  const nomePlano = String(doc.nomePlano || doc.nome || doc.titulo || '').trim();
  if (!idPlano || idPlano === ':idPlano' || idPlano.startsWith('plano_')) throw new Error('PNBOX retornou um plano sem identificador real.');
  if (!nomePlano) throw new Error(`PNBOX retornou o plano ${idPlano} sem nome verificável.`);
  const criadoEmRaw = doc.createdAt || doc.criadoEm;
  if (!criadoEmRaw) throw new Error(`PNBOX retornou o plano ${idPlano} sem data de criação verificável.`);
  const criadoEm = new Date(criadoEmRaw).toISOString();
  return {
    idPlano,
    nomePlano,
    setor: String(doc.setor || doc.ramoAtividade || '').trim(),
    descricao: String(doc.descricao || doc.apresentacao || '').trim(),
    cidadeUf: String(doc.cidadeUf || doc.cidade || doc.municipio || '').trim(),
    criadoEm,
    status: 'criado_pnbox_ddp',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: Number(doc.ferramentasPreenchidas || 0),
    categoriaObjetivo: String(doc.categoriaObjetivo || '').trim(),
    sincronizadoPnbox: true,
    ultimaSincronizacao: new Date().toISOString(),
  };
}

export async function listarPlanosPnbox(auth: DdpAuthContext, _cached?: PlanoCriadoInfo[]): Promise<PlanoCriadoInfo[]> {
  if (!contextoValido(auth)) throw new Error('Sessão PNBOX não autenticada.');
  const ddp = await obterDdpConectado(auth);
  const pubs = ['planoNegocio.default','planoNegocio.meusPlanos','planoNegocio.user','planoNegocio','planos.default','planos.user','planos.meusPlanos','planos'];
  let docs: any[] = [];
  let source = '';
  for (const p of pubs) {
    try { const d = await ddp.subscribeAndCollect(p, [], '', 5000); if (d.length) { docs = d; source = p; break; } } catch {}
  }
  if (!docs.length) {
    for (const m of ['planoNegocio.meusPlanos','planos.meusPlanos','planoNegocio.listar','planos.listar']) {
      try { const r = await ddp.call(m, []); if (Array.isArray(r)) { docs = r; source = `method:${m}`; break; } } catch {}
    }
  }
  if (!source) throw new Error('Não foi possível confirmar a listagem de planos diretamente no PNBOX via DDP.');
  return docs.map(mapPlanoReal);
}

export async function criarPlanoPnboxDdp(payload: { nome: string; setor?: string; descricao?: string; cidadeUf?: string; categoriaObjetivo?: string }, auth: DdpAuthContext): Promise<PlanoCriadoInfo> {
  if (!payload.nome?.trim()) throw new Error('Nome do plano é obrigatório.');
  if (!contextoValido(auth)) throw new Error('Sessão PNBOX não autenticada.');
  const ddp = await obterDdpConectado(auth);
  const dados = { nome: payload.nome.trim(), nomePlano: payload.nome.trim(), ...(payload.setor ? { setor: payload.setor } : {}), ...(payload.descricao ? { descricao: payload.descricao } : {}), ...(payload.cidadeUf ? { cidade: payload.cidadeUf } : {}), ...(payload.categoriaObjetivo ? { categoriaObjetivo: payload.categoriaObjetivo } : {}), status: 'em_andamento' };
  for (const m of ['planoNegocio.insert','planos.insert','plano.insert']) {
    try {
      const r = await ddp.call(m, [dados]);
      const id = String(typeof r === 'string' ? r : r?._id || r?.id || '').trim();
      if (id && !id.startsWith('plano_')) {
        return mapPlanoReal({ ...dados, ...((r && typeof r === 'object') ? r : {}), _id: id, createdAt: r?.createdAt || new Date().toISOString() });
      }
    } catch (e: any) { console.warn(`[realRunner] ${m}:`, e.message); }
  }
  throw new Error('PNBOX não confirmou a criação do plano via método DDP conhecido. Nenhum ID local foi fabricado.');
}

export async function carregarDocumentosFerramentaPnbox(idPlano: string, ferramentaId: string, auth: DdpAuthContext): Promise<Record<string, unknown>[]> {
  requirePlan(idPlano);
  const f = FERRAMENTAS_PNBOX.find(x => x.id === ferramentaId);
  if (!f) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  const ddp = await obterDdpConectado(auth);
  for (const params of [[{ idPlano }], [idPlano]]) {
    try { return await ddp.subscribeAndCollect(`${f.collectionName}.default`, params, f.collectionName, 8000); } catch {}
  }
  throw new Error(`Falha ao consultar ${f.collectionName} no PNBOX.`);
}

export interface SaveToolResult { docId: string; acao: 'insert'|'update'; confirmed: boolean; status: 'SAVE_CONFIRMED'|'SAVE_FAILED'; mensagem: string; detalhes?: any; }
export async function salvarOuAtualizarRegistroFerramentaPnbox(ferramentaId: string, item: Record<string, unknown>, idPlano: string, auth: DdpAuthContext): Promise<SaveToolResult> {
  requirePlan(idPlano);
  const f = FERRAMENTAS_PNBOX.find(x => x.id === ferramentaId);
  if (!f) throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  const ddp = await obterDdpConectado(auth);
  const existing = String(item._id || item.id || '');
  const acao: 'insert'|'update' = existing ? 'update' : 'insert';
  const metodo = `${f.collectionName}.${acao}`;
  const params = acao === 'insert' ? [{ ...item, idPlano }] : [{ _id: existing }, { $set: { ...Object.fromEntries(Object.entries(item).filter(([k]) => k !== '_id' && k !== 'id')), idPlano } }];
  try {
    const r = await ddp.call(metodo, params);
    const docId = acao === 'insert' ? String(typeof r === 'string' ? r : r?._id || r?.id || '').trim() : existing;
    if (!docId) throw new Error(`Método ${metodo} não retornou identificador.`);
    const docs = await carregarDocumentosFerramentaPnbox(idPlano, ferramentaId, auth);
    const confirmed = docs.some((d: any) => String(d._id || d.id) === docId);
    return { docId, acao, confirmed, status: confirmed ? 'SAVE_CONFIRMED' : 'SAVE_FAILED', mensagem: confirmed ? 'Operação confirmada por releitura do PNBOX.' : 'Operação enviada mas não confirmada por releitura.' };
  } catch (e: any) {
    return { docId: existing, acao, confirmed: false, status: 'SAVE_FAILED', mensagem: `Falha ao persistir no PNBOX: ${e.message}` };
  }
}

export async function executarLote(templateId: string, dados: Record<string, Record<string, unknown>[]>, idPlano: string, auth?: DdpAuthContext): Promise<BatchExecutionSummary> {
  if (!auth?.cookies) throw new Error('Sessão PNBOX não autenticada.');
  const batch = prepararEstruturaExecucao(templateId, idPlano);
  const steps: ExecutionStepResult[] = [];
  let ok = 0, fail = 0, total = 0;
  for (const cfg of batch.steps) {
    const toolData = dados[cfg.ferramentaId] || dados[cfg.collection] || [];
    const result = await executarFerramentaNoPnbox(cfg.ferramentaId, toolData, idPlano, auth);
    steps.push(result);
    if (result.status === 'success') ok++; else fail++;
    total += result.registrosSalvos;
  }
  const end = new Date();
  return { ...batch, steps, finalizadoEm: end.toISOString(), duracaoTotalMs: end.getTime() - new Date(batch.iniciadoEm).getTime(), totalFerramentas: steps.length, ferramentasSucesso: ok, ferramentasFalha: fail, totalRegistrosSalvos: total, statusGeral: fail === 0 && ok > 0 ? 'completed' : ok === 0 ? 'failed' : 'completed' };
}
