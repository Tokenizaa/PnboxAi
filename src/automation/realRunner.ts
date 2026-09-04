import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './schemaCatalog';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './businessTemplates';
import { registrarEventoTrafego } from './trafficMonitor';
import { compararJsonComSchema } from './schemaValidator';
import { DdpClient } from './ddpClient';

/**
 * Runner REAL — substitui o mock oficialRunner.ts.
 *
 * Usa o cliente DDP Meteor real contra o servidor PNBOX do Sebrae.
 * Requer sessão autenticada (cookies OIDC).
 * 
 * IMPORTANTE: Não usa singleton global. Cada usuário deve ter sua própria conexão DDP
 * isolada via authContext (cookies, loginToken, userId) passado explicitamente.
 */

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
  // Opcional: identifier for connection pooling per user
  connectionId?: string;
}

const DDP_CONNECTION_TTL_MS = 50 * 60 * 1000; // 50 minutos

/**
 * Cache de conexões DDP por usuário (connectionId).
 * Não é global - cada chamada passa seu authContext explicitamente.
 * Para uso em server.ts, o cache pode ser mantido em memória por processo,
 * mas a chave inclui userId para isolamento.
 */
const ddpConnectionCache = new Map<string, {
  client: DdpClient;
  authContext: DdpAuthContext;
  createdAt: number;
}>();

/**
 * Gera chave de cache única por usuário/sessão.
 */
function getCacheKey(authContext: DdpAuthContext): string {
  return `${authContext.userId}:${authContext.connectionId || authContext.loginToken.substring(0, 16)}`;
}

/**
 * Obtém ou cria uma conexão DDP autenticada para o contexto do usuário.
 * Cache é por usuário (não global) - evita compartilhamento entre usuários.
 *
 * @param authContext Contexto de autenticação do usuário (cookies, loginToken, userId)
 */
export async function obterDdpConectado(authContext: DdpAuthContext): Promise<DdpClient> {
  const agora = Date.now();
  const cacheKey = getCacheKey(authContext);

  // Verificar cache existente para ESTE usuário
  const cached = ddpConnectionCache.get(cacheKey);
  if (
    cached &&
    cached.authContext.loginToken === authContext.loginToken &&
    (agora - cached.createdAt) < DDP_CONNECTION_TTL_MS &&
    cached.client.isConnected()
  ) {
    return cached.client;
  }

// Fechar conexão antiga se existir
   if (cached) {
     try { cached.client.close(); } catch (err: any) {
       console.error('[realRunner] obterDdpConectado: Failed to close cached client:', err.message, err.stack);
     }
     ddpConnectionCache.delete(cacheKey);
   }

  // Criar nova conexão
  const client = new DdpClient({
    url: 'wss://pnbox.sebrae.com.br/websocket',
    cookies: authContext.cookies,
    heartbeatMs: 25000,
    timeoutMs: 30000
  });

  const sessionId = await client.connect();
  console.log(`[DDP] conectado ao PNBOX — user ${authContext.userId} session ${sessionId.substring(0, 8)}...`);

  // Restaurar sessão Meteor via loginWithToken
  try {
    const loginResult = await client.call('login', [{
      resume: authContext.loginToken
    }]);
    console.log(`[DDP] Meteor.loginWithToken OK — userId: ${loginResult?.id || authContext.userId}`);
  } catch (err: any) {
    console.error('[DDP] Falha no Meteor.loginWithToken:', err.message);
    try { client.close(); } catch (closeErr: any) {
      console.error('[realRunner] obterDdpConectado: Failed to close client after login error:', closeErr.message, closeErr.stack);
    }
    throw new Error(`Falha ao autenticar DDP com Meteor token: ${err.message}`);
  }

  // Armazenar no cache por usuário
  ddpConnectionCache.set(cacheKey, {
    client,
    authContext,
    createdAt: agora
  });

  return client;
}

/**
 * Encerra a conexão DDP de um usuário específico.
 */
export function fecharDdp(authContext?: DdpAuthContext) {
  if (authContext) {
    const cacheKey = getCacheKey(authContext);
    const cached = ddpConnectionCache.get(cacheKey);
    if (cached) {
      try { cached.client.close(); } catch (err: any) {
        console.error('[realRunner] fecharDdp: Failed to close client for user:', authContext.userId, err.message, err.stack);
      }
      ddpConnectionCache.delete(cacheKey);
    }
  } else {
    // Fechar todas (apenas para shutdown do servidor)
    for (const [_, cached] of ddpConnectionCache) {
      try { cached.client.close(); } catch (err: any) {
        console.error('[realRunner] fecharDdp: Failed to close client during shutdown:', err.message, err.stack);
      }
    }
    ddpConnectionCache.clear();
  }
}

/**
 * Prepara a estrutura de batch com steps vazios.
 * (Mantido exportado para compatibilidade com server.ts)
 */
export function prepararEstruturaExecucao(
  templateId: string,
  idPlano = ID_PLANO_PADRAO
): BatchExecutionSummary {
  const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];

  const steps: ExecutionStepResult[] = FERRAMENTAS_PNBOX.map((f) => {
    const dados = template.dados[f.collectionName] || [f.exemploPayload];
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
      mensagem: 'Aguardando execução no pipeline DDP...',
      docIds: [],
      rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${f.id}`,
      logs: []
    };
  });

  return {
    idExecucao: 'exec_' + Date.now(),
    templateId: template.id,
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

/**
 * Executa UMA ferramenta no PNBOX REAL via DDP.
 *
 * @param ferramentaId ID da ferramenta
 * @param registros Array de payloads a inserir
 * @param idPlano ID do plano de negócio
 * @param authContext Contexto de autenticação do usuário (cookies, loginToken, userId)
 * @param metodoOverride Permite forçar outro método DDP além de `${collection}.insert`
 */
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

    // Validação local de schema (defesa em profundidade — servidor real também valida)
    const validacao = compararJsonComSchema(payload, ferramenta);
    const reqId = `ddp_req_${Date.now()}_${i}`;

    try {
      // CHAMADA REAL — DDP method call ao servidor Meteor do PNBOX
      const result = await ddp.call(metodo, [payload]);

      // O servidor Meteor retorna o _id do documento inserido
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
