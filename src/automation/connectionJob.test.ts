/**
 * Self-check do connectionJob — verifica o funcionamento do ciclo de vida do job.
 * Rodar: npx tsx src/automation/connectionJob.test.ts
 */
import {
  createConnectionJob,
  advanceStep,
  completeConnectionJob,
  failConnectionJob,
  getConnectionJob,
  serializeConnectionJob,
} from './connectionJob';

function assert(cond: boolean, msg: string): void {
  if (!cond) {
    console.error('❌ FAIL:', msg);
    process.exitCode = 1;
  } else {
    console.log('✓', msg);
  }
}

// Teste 1: ciclo completo de sucesso
{
  const userId = 'user_A';
  const job = createConnectionJob(userId);
  assert(job.status === 'RUNNING', '1a: job inicia RUNNING');
  assert(job.currentStep === 'initializing', '1b: primeira etapa = initializing');
  assert(job.steps.length === 1, '1c: 1 passo inicial');
  assert(job.steps[0].status === 'RUNNING', '1d: initializing RUNNING');

  // Avança por etapas reais
  advanceStep(job, 'opening_pnbox');
  advanceStep(job, 'waiting_login');
  advanceStep(job, 'login_detected');
  advanceStep(job, 'submitting_credentials');
  advanceStep(job, 'authenticating');
  advanceStep(job, 'obtaining_session');
  advanceStep(job, 'validating_connection');

  assert(job.currentStep === 'validating_connection', '1e: etapa atual = validating_connection');
  assert(job.steps.filter(s => s.status === 'COMPLETED').length === 7, '1f: 7 etapas concluídas');

  completeConnectionJob(job.jobId, userId);
  assert(job.status === 'COMPLETED', '1g: job COMPLETED');
  assert(job.steps.some(s => s.step === 'completed' && s.status === 'COMPLETED'), '1h: etapa completed presente');

  // Serialização não expõe userId
  const serialized = serializeConnectionJob(job) as any;
  assert(!('userId' in serialized), '1i: userId não é serializado');
  assert(serialized.jobId === job.jobId, '1j: jobId preservado');

  // Isolamento: outro usuário não acessa
  const other = getConnectionJob('user_B', job.jobId);
  assert(other === null, '1k: user B não acessa job de user A');
}

// Teste 2: falha por credenciais inválidas
{
  const userId = 'user_B';
  const job = createConnectionJob(userId);
  advanceStep(job, 'opening_pnbox');
  advanceStep(job, 'waiting_login');
  advanceStep(job, 'login_detected');
  advanceStep(job, 'submitting_credentials');
  advanceStep(job, 'authenticating');

  failConnectionJob(job.jobId, userId, 'AUTH_INVALID_CREDENTIALS', 'O Sebrae recusou as credenciais.', 'technical');
  assert(job.status === 'FAILED', '2a: job FAILED');
  assert(job.errorCode === 'AUTH_INVALID_CREDENTIALS', '2b: errorCode correto');
  assert(job.steps.some(s => s.step === 'authenticating' && s.status === 'FAILED'), '2c: etapa authenticating marcada FAILED');
  assert(job.completedAt !== undefined, '2d: completedAt definido');
  assert(job.errorMessage, '2e: errorMessage amigável presente');
}

console.log('\nDone.');
