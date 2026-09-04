/**
 * PnboxConnectionJob — Timeline de progresso em tempo real para conexão PNBOX.
 *
 * Cada job pertence a um usuário (userId) e acompanha os estados reais
 * do fluxo Playwright/OIDC. Frontend faz polling via GET /api/pnbox/connect/:jobId/status.
 *
 * Isolamento: job é armazenado em Map por userId + jobId. Usuário só acessa o próprio job.
 * Sem segredos (senha/cookie/token) expostos ao frontend.
 */

export type PnboxConnectionStep =
  | 'initializing'
  | 'opening_pnbox'
  | 'waiting_login'
  | 'login_detected'
  | 'submitting_credentials'
  | 'authenticating'
  | 'obtaining_session'
  | 'validating_connection'
  | 'completed'
  | 'failed';

export type PnboxConnectionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

export interface PnboxConnectionStepState {
  step: PnboxConnectionStep;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  message: string;
  timestamp: string;
}

export interface PnboxConnectionJob {
  jobId: string;
  userId: string;
  status: PnboxConnectionStatus;
  currentStep: PnboxConnectionStep | null;
  steps: PnboxConnectionStepState[];
  errorCode?: string;
  errorMessage?: string;
  technicalMessage?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Definir etapa e mensagem amigável para o frontend
const STEP_LABELS: Record<PnboxConnectionStep, { running: string; done: string }> = {
  initializing: { running: 'Preparando conexão...', done: 'Conexão preparada' },
  opening_pnbox: { running: 'Abrindo o PNBOX...', done: 'PNBOX acessado' },
  waiting_login: { running: 'Localizando autenticação...', done: 'Autenticação localizada' },
  login_detected: { running: 'Tela de login encontrada', done: 'Tela de login encontrada' },
  submitting_credentials: { running: 'Enviando credenciais...', done: 'Credenciais enviadas' },
  authenticating: { running: 'Validando com o Sebrae ID...', done: 'Autenticação confirmada' },
  obtaining_session: { running: 'Obtendo sessão...', done: 'Sessão obtida' },
  validating_connection: { running: 'Validando acesso...', done: 'Acesso validado' },
  completed: { running: 'Concluído', done: 'Concluído' },
  failed: { running: 'Falha', done: 'Falha' },
};

const STEP_ORDER: PnboxConnectionStep[] = [
  'initializing',
  'opening_pnbox',
  'waiting_login',
  'login_detected',
  'submitting_credentials',
  'authenticating',
  'obtaining_session',
  'validating_connection',
  'completed',
  'failed',
];

/** Map: userId -> Map<jobId, job> */
const jobsByUser = new Map<string, Map<string, PnboxConnectionJob>>();

function uid(): string {
  return `job_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
}

export function createConnectionJob(userId: string): PnboxConnectionJob {
  const jobId = uid();
  const now = new Date().toISOString();
  const job: PnboxConnectionJob = {
    jobId,
    userId,
    status: 'RUNNING',
    currentStep: null,
    steps: [],
    startedAt: now,
    updatedAt: now,
  };
  let userJobs = jobsByUser.get(userId);
  if (!userJobs) {
    userJobs = new Map();
    jobsByUser.set(userId, userJobs);
  }
  userJobs.set(jobId, job);
  // Marcar etapa inicial
  advanceStep(job, 'initializing');
  return job;
}

export function getConnectionJob(userId: string, jobId: string): PnboxConnectionJob | null {
  const userJobs = jobsByUser.get(userId);
  if (!userJobs) return null;
  return userJobs.get(jobId) || null;
}

export function getActiveConnectionJob(userId: string): PnboxConnectionJob | null {
  const userJobs = jobsByUser.get(userId);
  if (!userJobs) return null;
  // Retorna o job mais recente ainda em execução
  let active: PnboxConnectionJob | null = null;
  for (const job of userJobs.values()) {
    if (job.status === 'RUNNING' || job.status === 'PENDING') {
      if (!active || job.startedAt > active.startedAt) active = job;
    }
  }
  return active;
}

export function markStepCompleted(jobId: string, userId: string, step: PnboxConnectionStep): void {
  const job = getConnectionJob(userId, jobId);
  if (!job) return;
  // Marca a etapa atual como COMPLETED e move para a próxima
  const existing = job.steps.find(s => s.step === step);
  if (existing) {
    existing.status = 'COMPLETED';
    existing.timestamp = new Date().toISOString();
  }
  job.updatedAt = new Date().toISOString();
}

export function advanceStep(job: PnboxConnectionJob, step: PnboxConnectionStep): void {
  // Marca etapa atual como COMPLETED se existir e não for a nova
  if (job.currentStep && job.currentStep !== step) {
    const cur = job.steps.find(s => s.step === job.currentStep);
    if (cur && cur.status === 'RUNNING') {
      cur.status = 'COMPLETED';
      cur.timestamp = new Date().toISOString();
    }
  }

  const now = new Date().toISOString();
  const existing = job.steps.find(s => s.step === step);
  if (existing) {
    existing.status = 'RUNNING';
    existing.timestamp = now;
  } else {
    job.steps.push({
      step,
      status: 'RUNNING',
      message: STEP_LABELS[step].running,
      timestamp: now,
    });
  }
  job.currentStep = step;
  job.updatedAt = now;
}

export function failConnectionJob(
  jobId: string,
  userId: string,
  errorCode: string,
  errorMessage: string,
  technicalMessage?: string
): void {
  const job = getConnectionJob(userId, jobId);
  if (!job) return;
  // Marca etapa atual se existir
  if (job.currentStep) {
    const cur = job.steps.find(s => s.step === job.currentStep);
    if (cur && cur.status === 'RUNNING') {
      cur.status = 'FAILED';
      cur.timestamp = new Date().toISOString();
      cur.message = STEP_LABELS[job.currentStep].running;
    }
  }
  job.status = 'FAILED';
  job.currentStep = 'failed';
  job.steps.push({
    step: 'failed',
    status: 'FAILED',
    message: errorMessage,
    timestamp: new Date().toISOString(),
  });
  job.errorCode = errorCode;
  job.errorMessage = errorMessage;
  job.technicalMessage = technicalMessage;
  job.updatedAt = new Date().toISOString();
  job.completedAt = job.updatedAt;
}

export function completeConnectionJob(jobId: string, userId: string): void {
  const job = getConnectionJob(userId, jobId);
  if (!job) return;
  // Marca validação/obtenção de sessão como concluído
  for (const step of job.steps) {
    if (step.status === 'RUNNING') {
      step.status = 'COMPLETED';
    }
  }
  // Garante que 'completed' esteja presente
  if (!job.steps.find(s => s.step === 'completed')) {
    job.steps.push({
      step: 'completed',
      status: 'COMPLETED',
      message: STEP_LABELS.completed.done,
      timestamp: new Date().toISOString(),
    });
  }
  job.currentStep = 'completed';
  job.status = 'COMPLETED';
  job.updatedAt = new Date().toISOString();
  job.completedAt = job.updatedAt;
}

/** Serializa job para resposta da API (sem segredos) */
export function serializeConnectionJob(job: PnboxConnectionJob): Omit<PnboxConnectionJob, 'userId'> {
  const { userId: _userId, ...rest } = job;
  return rest;
}
