import { Router, Express } from 'express';
import {
  supabase,
  getSupabaseUserClient,
  LOCAL_CREDENTIALS,
  encryptPnboxPassword,
  decryptPnboxPassword,
  authMiddleware
} from '../services/authStore';
import { globalAuthState, iniciarSessaoPlaywright } from '../../automation/auth';
import { extrairIdPlano } from '../../utils/planUtils';
import { ID_PLANO_PADRAO } from '../../automation/schemaCatalog';

const router = Router();

router.get('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  const client = getSupabaseUserClient(token) || supabase;

  if (client && (!token || !token.startsWith('local_token_'))) {
    const { data, error } = await client
      .from('pnbox_credentials')
      .select('cpf, id_plano, updated_at')
      .eq('user_id', userId)
      .maybeSingle();

    if (!error && data) {
      return res.json({
        status: 'ok',
        configured: true,
        data: { cpf: data.cpf, idPlano: data.id_plano, updatedAt: data.updated_at },
      });
    }
  }

  const cred = LOCAL_CREDENTIALS.get(userId);
  if (!cred) {
    return res.json({ status: 'ok', configured: false, data: null });
  }
  return res.json({
    status: 'ok',
    configured: true,
    data: { cpf: cred.cpf, idPlano: cred.idPlano, updatedAt: cred.updatedAt },
  });
});

router.put('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  const { cpf, password, idPlano } = req.body || {};

  if (typeof cpf !== 'string' || !cpf.trim()) {
    return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });
  }

  const passwordEnc = encryptPnboxPassword(password);
  const updatedAt = new Date().toISOString();

  // Cache local em memória por usuário
  LOCAL_CREDENTIALS.set(userId, {
    cpf: cpf.trim(),
    password,
    idPlano: idPlano?.trim?.() || '',
    updatedAt,
  });

  const client = getSupabaseUserClient(token) || supabase;
  if (client && (!token || !token.startsWith('local_token_'))) {
    const { error } = await client.from('pnbox_credentials').upsert(
      { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc, id_plano: idPlano?.trim?.() || '' },
      { onConflict: 'user_id' }
    );
    if (error) {
      console.error('[pnbox-credentials] Erro ao salvar no Supabase:', error.message);
      return res.status(500).json({ status: 'error', message: `Falha ao salvar no banco: ${error.message}` });
    }
  }

  console.log(`[AUDIT] PNBOX credentials saved for user ${userId} at ${updatedAt}`);
  res.json({ status: 'ok', message: 'Credenciais PNBOX salvas' });
});

router.delete('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);

  LOCAL_CREDENTIALS.delete(userId);

  const client = getSupabaseUserClient(token) || supabase;
  if (client && (!token || !token.startsWith('local_token_'))) {
    const { error } = await client
      .from('pnbox_credentials')
      .delete()
      .eq('user_id', userId);

    if (error) {
      console.error('[pnbox-credentials] Erro ao remover do Supabase:', error.message);
      return res.status(500).json({ status: 'error', message: `Falha ao remover: ${error.message}` });
    }
  }

  console.log(`[AUDIT] PNBOX credentials deleted for user ${userId} at ${new Date().toISOString()}`);
  res.json({ status: 'ok', message: 'Credenciais PNBOX removidas' });
});

router.post('/pnbox-credentials/reconnect', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  let cred: { cpf: string; password: string; id_plano?: string } | null = null;

  const client = getSupabaseUserClient(token) || supabase;
  if (client && (!token || !token.startsWith('local_token_'))) {
    const { data } = await client
      .from('pnbox_credentials')
      .select('cpf, password_enc, id_plano')
      .eq('user_id', userId)
      .maybeSingle();
    if (data && data.password_enc) {
      cred = {
        cpf: data.cpf,
        password: decryptPnboxPassword(data.password_enc),
        id_plano: data.id_plano
      };
    }
  }

  if (!cred) {
    const local = LOCAL_CREDENTIALS.get(userId);
    if (local) {
      cred = { cpf: local.cpf, password: local.password, id_plano: local.idPlano };
    }
  }

  if (!cred) {
    return res.status(400).json({ status: 'error', message: 'Nenhuma credencial PNBOX salva para este usuário' });
  }

  try {
    const modo: 'DRY_RUN' | 'LIVE' = 'LIVE';
    globalAuthState.modoExecucao = modo;
    const sessionResult = await iniciarSessaoPlaywright(
      {
        cpf: cred.cpf,
        password: cred.password,
        idPlano: extrairIdPlano(cred.id_plano || '') || ID_PLANO_PADRAO
      },
      true,
      modo,
      userId
    );
    res.json({
      status: sessionResult.status === 'authenticated' ? 'ok' : 'error',
      sucesso: sessionResult.status === 'authenticated',
      tokenMeteor: sessionResult.meteorLoginToken,
      cpf: sessionResult.cpf,
      idPlano: sessionResult.idPlano,
      session: sessionResult,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err?.message || 'Erro ao reconectar' });
  }
});

export function registerPNBoxCredentialsRoutes(app: Express) {
  app.use('/api/auth', router);
}
