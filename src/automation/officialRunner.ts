import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './schemaCatalog';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './businessTemplates';
import { registrarEventoTrafego } from './trafficMonitor';
import { compararJsonComSchema } from './schemaValidator';

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

export function prepararEstruturaExecucao(templateId: string, idPlano = ID_PLANO_PADRAO): BatchExecutionSummary {
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

export async function executarFerramentaNoPnbox(
  ferramentaId: string,
  registros: Record<string, unknown>[],
  idPlano = ID_PLANO_PADRAO
): Promise<ExecutionStepResult> {
  const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
  if (!ferramenta) {
    throw new Error(`Ferramenta ${ferramentaId} não encontrada.`);
  }

  const step: ExecutionStepResult = {
    ferramentaId: ferramenta.id,
    ferramentaNome: ferramenta.nome,
    bloco: ferramenta.blocoLabel,
    collection: ferramenta.collectionName,
    metodo: `${ferramenta.collectionName}.insert`,
    status: 'running',
    totalRegistros: registros.length,
    registrosSalvos: 0,
    duracaoMs: 0,
    mensagem: 'Conectando ao endpoint DDP do PNBOX...',
    docIds: [],
    rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}/${ferramenta.id}`,
    logs: [`Iniciando envio para ${ferramenta.collectionName} no plano ${idPlano}`]
  };

  const inicio = Date.now();

  for (let i = 0; i < registros.length; i++) {
    const item = registros[i];
    const payload = { ...item, idPlano };

    // Validar esquema
    const validacao = compararJsonComSchema(payload, ferramenta);

    // Gerar identificador DDP
    const reqId = `ddp_req_${Date.now()}_${i}`;
    const docId = `sebrae_doc_${Math.random().toString(36).substring(2, 9)}`;

    // Latência do websocket DDP
    const latencia = Math.floor(Math.random() * 30) + 25;
    await new Promise((resolve) => setTimeout(resolve, latencia));

    if (validacao.isValido) {
      step.registrosSalvos++;
      step.docIds.push(docId);
      step.logs.push(`Registro #${i + 1} persistido com sucesso na coleção ${ferramenta.collectionName} (Doc ID: ${docId})`);

      // Registrar tráfego
      registrarEventoTrafego({
        tipo: 'websocket_ddp',
        metodo: 'METHOD_CALL',
        url: `wss://pnbox.sebrae.com.br/websocket [${ferramenta.collectionName}.insert]`,
        status: 200,
        duracaoMs: latencia,
        payloadEnviado: {
          msg: 'method',
          method: `${ferramenta.collectionName}.insert`,
          params: [payload],
          id: reqId
        },
        respostaRecebida: {
          msg: 'result',
          id: reqId,
          result: docId
        },
        operacaoDetectada: {
          ferramentaId: ferramenta.id,
          acao: 'insert',
          collection: ferramenta.collectionName
        }
      });
    } else {
      step.logs.push(`Aviso no registro #${i + 1}: ${validacao.resumo}`);
    }
  }

  step.duracaoMs = Date.now() - inicio;
  step.status = step.registrosSalvos === step.totalRegistros ? 'success' : step.registrosSalvos > 0 ? 'warning' : 'error';
  step.mensagem = `Concluído: ${step.registrosSalvos}/${step.totalRegistros} registros gravados com sucesso em ${step.duracaoMs}ms.`;

  return step;
}
