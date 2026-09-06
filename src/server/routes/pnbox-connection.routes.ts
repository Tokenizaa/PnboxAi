import { Router, Express } from 'express';
import { authMiddleware, supabase, getSupabaseUserClient, LOCAL_CREDENTIALS, encryptPnboxPassword } from '../services/authStore';
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
        (step) => {
          advanceStep(job, step);
        }
      );

      if (sessionResult.status === 'authenticated') {
        completeConnectionJob(jobId, userId);

        try {
          const passwordEnc = encryptPnboxPassword(password);
          LOCAL_CREDENTIALS.set(userId, {
            cpf: cpf.trim(),
            password,
            idPlano: '',
            updatedAt: new Date().toISOString()
          });

          const client = getSupabaseUserClient(userToken) || supabase;
          if (client && (!userToken || !userToken.startsWith('local_token_'))) {
            const { error: upsertErr } = await client.from('pnbox_credentials').upsert(
              { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc },
              { onConflict: 'user_id' }
            );
            if (upsertErr) {
              console.error('[PNBoxConnection] Erro ao salvar credenciais no Supabase:', upsertErr.message);
            } else {
              console.log(`[PNBoxConnection] Credenciais persistidas no Supabase com sucesso para o usuário ${userId}`);
            }
          }
        } catch (e: any) {
          console.error('[PNBoxConnection] Falha ao persistir credenciais:', e?.message || e);
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
  res.json({ status: 'ok', job: serializeConnectionJob(job) });
});

export function registerPNBoxConnectionRoutes(app: Express) {
  app.use('/api/pnbox', router);
}
