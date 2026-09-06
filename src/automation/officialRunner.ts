import { FERRAMENTAS_PNBOX } from './schemaCatalog';

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

function disabled(): never {
  throw new Error('Executor simulado PNBOX desativado. Use o executor LIVE em realRunner.ts com sessão autenticada.');
}

export function prepararEstruturaExecucao(_templateId: string, _idPlano: string): BatchExecutionSummary { return disabled(); }
export async function executarFerramentaNoPnbox(_ferramentaId: string, _registros: Record<string, unknown>[], _idPlano: string): Promise<ExecutionStepResult> { return disabled(); }

export { FERRAMENTAS_PNBOX };
