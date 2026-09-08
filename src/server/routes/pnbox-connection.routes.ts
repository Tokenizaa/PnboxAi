import { Router, Express } from 'express';
import { authMiddleware, supabase, getSupabaseUserClient, encryptPnboxPassword } from '../services/authStore';
import {
  createConnectionJob,
  getConnectionJob,
  getActiveConnectionJob,
  serializeConnectionJob,
  advanceStep,
  failConnectionJob,
  completeConnectionJob
} from '../../automation/connectionJob';
import { iniciarSessaoPlaywright } from '../../automation/auth';

const router = Router();

router.post('/connect', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const userToken = req.headers.authorization?.substring(7);
  const { cpf, password, consentimentoAceito } = req.body || {};

  if (typeof cpf !== 'string' || !cpf.trim()) {
    return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });
  }
  if (!consentimentoAceito) {
    return res.status(400).json({ status: 'error', message: 'Consentimento é obrigatório' });
  }
  if (!supabase || !userToken) {
    return res.status(503).json({ status: 'error', message: 'Persistência segura de credenciais indisponível' });
  }

  const activeJob = getActiveConnectionJob(userId);
  if (activeJob) {
    return res.status(409).json({
      status: 'error',
      message: 'Já existe uma conexão em andamento para esta conta.',
      activeJobId: activeJob.jobId
    });
  }

  const job = createConnectionJob(userId);
  const jobId = job.jobId;
  res.status(202).json({ status: 'ok', jobId });

  (async () => {
    try {
      const sessionResult = await iniciarSessaoPlaywright(
        { cpf: cpf.trim(), password, idPlano: '' },
        true,
        'LIVE',
        userId,
        (step) => advanceStep(job, step)
      );

      if (sessionResult.status === 'authenticated') {
        try {
          const passwordEnc = encryptPnboxPassword(password);
          const client = getSupabaseUserClient(userToken);
          if (!client) {
            throw new Error('Sessão Supabase do usuário indisponível');
          }

          const { error: upsertErr } = await client.from('pnbox_credentials').upsert(
            { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc },
            { onConflict: 'user_id' }
          );
          if (upsertErr) throw new Error(`Falha ao persistir credenciais PNBOX: ${upsertErr.message}`);

          completeConnectionJob(jobId, userId);
        } catch (e: any) {
          failConnectionJob(
            jobId,
            userId,
            'CREDENTIAL_PERSISTENCE_FAILED',
            'A autenticação foi concluída, mas não foi possível persistir as credenciais com segurança.',
            e?.message || String(e)
          );
        }
      } else {
        const loggedErr = sessionResult.ultimoLog || 'Falha na autenticação';
        const isInvalidCreds = /incorret|senha|usuário/i.test(loggedErr);
        failConnectionJob(
          jobId,
          userId,
          isInvalidCreds ? 'AUTH_INVALID_CREDENTIALS' : 'AUTH_FAILED',
          isInvalidCreds
            ? 'O Sebrae ID recusou as credenciais informadas. Verifique o CPF e a senha e tente novamente.'
            : 'Não foi possível autenticar no Sebrae ID.',
          loggedErr
        );
      }
    } catch (err: any) {
      const msg = err?.message || 'Erro desconhecido';
      const isUnavailable = /não foi possível|unavailable|network|timeout|falha ao|não carregou/i.test(msg);
      failConnectionJob(
        jobId,
        userId,
        isUnavailable ? 'PNBOX_UNAVAILABLE' : 'AUTH_FAILED',
        isUnavailable
          ? 'O PNBOX está temporariamente indisponível. Tente novamente em instantes.'
          : 'Não foi possível concluir a conexão. Verifique suas informações e tente novamente.',
        msg
      );
    }
  })();
});

router.get('/connect/:jobId/status', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  const { jobId } = req.params;
  const job = getConnectionJob(userId, jobId);
  if (!job) {
    return res.status(404).json({ status: 'error', message: 'Job não encontrado' });
  }
  return res.json({ status: 'ok', job: serializeConnectionJob(job) });
});

export function registerPNBoxConnectionRoutes(app: Express) {
  app.use('/api/pnbox', router);
}
