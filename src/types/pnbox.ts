export interface FerramentaInfo {
  id: string;
  nome: string;
  bloco: 'CLIENTE_MERCADO' | 'PROBLEMA_SOLUCAO' | 'ESTRATEGIA' | 'FINANCAS' | 'COMPLEMENTARES';
  blocoLabel: string;
  collectionName: string;
  metodosDDP: string[];
  endpointHttp?: string;
  metodoHttp?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE' | 'WS/DDP';
  rotaInterface: string;
  descricao: string;
  statusDescoberta: 'mapeado' | 'em_analise' | 'validado_direto';
  camposSchema: SchemaField[];
  exemploPayload: Record<string, unknown>;
  respostaEsperada: Record<string, unknown>;
  suportaExecucaoSemRenderizacao: boolean;
}

export interface SchemaField {
  nome: string;
  tipo: 'string' | 'number' | 'boolean' | 'array' | 'object' | 'date';
  obrigatorio: boolean;
  descricao: string;
  exemplo?: unknown;
}

export type CampoSchemaInfo = SchemaField;

export interface InterceptedTrafficEvent {
  id: string;
  timestamp: string;
  tipo: 'fetch' | 'xhr' | 'websocket_ddp' | 'document' | 'other';
  metodo: string;
  url: string;
  status?: number;
  duracaoMs?: number;
  headers?: Record<string, string>;
  payloadEnviado?: unknown;
  respostaRecebida?: unknown;
  operacaoDetectada?: {
    ferramentaId?: string;
    acao?: 'insert' | 'update' | 'remove' | 'sub' | 'login' | 'statusConclusao' | 'save';
    collection?: string;
  };
}

export interface JsonDiffResult {
  isValido: boolean;
  conformidadePercentual: number;
  camposCorretos: string[];
  camposFaltantes: string[];
  camposExtras: string[];
  errosDeTipo: Array<{
    campo: string;
    esperado: string;
    recebido: string;
    valorRecebido: unknown;
  }>;
  resumo: string;
  detalhes: Array<{
    campo: string;
    status: 'ok' | 'missing' | 'type_mismatch' | 'unexpected';
    mensagem: string;
  }>;
}

export interface AuthSessionState {
  status: 'idle' | 'authenticating' | 'authenticated' | 'failed' | 'expired' | 'reconnecting';
  cpf: string;
  modoExecucao: 'DRY_RUN' | 'LIVE'; // Indica se execuções tocam servidor real ou são simuladas
  idPlano: string;
  meteorLoginToken?: string;
  meteorUserId?: string;
  ultimoLog?: string;
  logs: Array<{ timestamp: string; mensagem: string; level: 'info' | 'warn' | 'error' | 'success' }>;
  cookiesCount?: number;
  autenticadoEm?: string;
  expiresAt?: string;
  isExpired?: boolean;
  tempoRestanteMinutos?: number;
  isOnline?: boolean;
  ultimoPing?: string;
}

export interface BatchQueueItem {
  id: string;
  ferramentaId: string;
  ferramentaNome: string;
  collectionName: string;
  blocoLabel: string;
  selected: boolean;
  order: number;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error' | 'skipped';
  totalRegistros: number;
  registrosSalvos: number;
  duracaoMs: number;
  mensagem?: string;
  docIds?: string[];
  erroDetalhe?: string;
  tentativas?: number;
  rotaOficial?: string;
}

export interface BatchQueueConfig {
  delayBetweenToolsMs: number;
  stopOnError: boolean;
  templateId: string;
  idPlano: string;
  useCustomData?: boolean;
  customData?: Record<string, Record<string, unknown>[]>;
}

export interface BatchReportSummary {
  idExecucao: string;
  templateNome: string;
  idPlano: string;
  iniciadoEm: string;
  finalizadoEm: string;
  duracaoTotalMs: number;
  delayConfiguradoMs: number;
  totalFerramentas: number;
  ferramentasSucesso: number;
  ferramentasAviso: number;
  ferramentasFalha: number;
  ferramentasIgnoradas: number;
  taxaSucessoPercent: number;
  totalRegistrosSalvos: number;
  totalRegistrosEsperados: number;
  tempoMedioPorFerramentaMs: number;
  statusGeral: 'success' | 'warning' | 'error' | 'cancelled';
  items: BatchQueueItem[];
}

export interface DeepResearchReport {
  promptOriginal: string;
  nomeNegocioSugerido: string;
  setor: string;
  cidadeUf: string;
  resumoExecutivo: string;
  oportunidadeMercado: string;
  tendencias2025_2026: string[];
  concorrentesMapeados: Array<{
    nome: string;
    pontosFortes: string;
    pontosFracos: string;
    diferenciacao: string;
  }>;
  buyerPersona: {
    nome: string;
    idade: string;
    perfil: string;
    dores: string[];
    desejos: string[];
    ticketMedio: number;
  };
  investimentoEstimado: {
    capexTotal: number;
    opexMensal: number;
    pontoEquilibrioMeses: number;
    faturamentoEstimadoMensal: number;
  };
  aspectosLegaisTributarios: {
    cnaeSugerido: string;
    regimeTributario: string;
    licencasExigidas: string[];
  };
  fontesPesquisa: Array<{ titulo: string; uri: string }>;
  geradoEm: string;
}

export interface PlanoCriadoInfo {
  idPlano: string;
  nomePlano: string;
  setor: string;
  descricao: string;
  cidadeUf: string;
  criadoEm: string;
  status: 'criado_local' | 'criado_pnbox_ddp' | 'preenchido_completo';
  metodoCriacao: 'ddp_direct' | 'playwright_browser';
  pesquisaMercado?: DeepResearchReport;
  dados14Ferramentas?: Record<string, Record<string, unknown>[]>;
  ferramentasPreenchidas?: number;
}

// Provedores de IA
export type AiProviderType = 'gemini' | 'nvidia';

export interface NvidiaAccountSlot {
  id: 1 | 2 | 3;
  label: string;
  tokenMascarado?: string;
  tokenCustomizado?: string;
  isConfigured: boolean;
  model: string;
}

export interface AiResearchConfig {
  provider: AiProviderType;
  geminiModel?: string;
  nvidiaAccountSlot?: 1 | 2 | 3;
  nvidiaToken?: string;
  nvidiaModel?: string;
  useSearchGrounding?: boolean;
}

// Status de Auditoria e Sincronização das 14 Ferramentas
export interface ToolAuditStatus {
  ferramentaId: string;
  nome: string;
  collectionName: string;
  bloco: string;
  blocoLabel: string;
  status: 'synced' | 'pending' | 'warning';
  totalRegistros: number;
  camposPreenchidos: number;
  totalCamposObrigatorios: number;
  camposFaltantes: string[];
  ultimaSincronizacao?: string;
  docIds: string[];
  origem: 'template' | 'deep_research' | 'ddp_traffic' | 'manual';
}

export interface PlanAuditReport {
  idPlano: string;
  totalFerramentas: number;
  ferramentasSincronizadas: number;
  ferramentasPendentes: number;
  porcentagemSincronizada: number;
  saudeGeral: 'excelente' | 'parcial' | 'critica';
  tempoUltimaAuditoria: string;
  ferramentas: ToolAuditStatus[];
}
