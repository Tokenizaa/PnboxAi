import { Router, Express } from 'express';
import {
  supabase,
  getSupabaseUserClient,
  encryptPnboxPassword,
  decryptPnboxPassword,
  authMiddleware
} from '../services/authStore';
import { globalAuthState, iniciarSessaoPlaywright } from '../../automation/auth';
import { extrairIdPlano } from '../../utils/planUtils';

const router = Router();

function requireDatabaseClient(token?: string) {
  const client = getSupabaseUserClient(token) || supabase;
  if (!client || token?.startsWith('local_token_')) {
    throw new Error('Persistência Supabase obrigatória para credenciais PNBOX; fallback local desativado.');
  }
  return client;
}

router.get('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  try {
    const client = requireDatabaseClient(token);
    const { data, error } = await client
      .from('pnbox_credentials')
      .select('cpf, id_plano, updated_at')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return res.status(500).json({ status: 'error', message: `Falha ao consultar credenciais no banco: ${error.message}` });
    if (!data) return res.json({ status: 'ok', configured: false, data: null });
    return res.json({ status: 'ok', configured: true, data: { cpf: data.cpf, idPlano: data.id_plano, updatedAt: data.updated_at } });
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err.message });
  }
});

router.put('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  const { cpf, password, idPlano } = req.body || {};
  if (typeof cpf !== 'string' || !cpf.trim()) return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
  if (typeof password !== 'string' || !password) return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });

  const normalizedPlanId = extrairIdPlano(typeof idPlano === 'string' ? idPlano : '');
  if (!normalizedPlanId) return res.status(400).json({ status: 'error', message: 'ID do plano PNBOX real é obrigatório.' });

  try {
    const client = requireDatabaseClient(token);
    const passwordEnc = encryptPnboxPassword(password);
    const { error } = await client.from('pnbox_credentials').upsert(
      { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc, id_plano: normalizedPlanId },
      { onConflict: 'user_id' }
    );
    if (error) return res.status(500).json({ status: 'error', message: `Falha ao salvar no banco: ${error.message}` });
    return res.json({ status: 'ok', message: 'Credenciais PNBOX salvas no Supabase', idPlano: normalizedPlanId });
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err.message });
  }
});

router.delete('/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  try {
    const client = requireDatabaseClient(token);
    const { error } = await client.from('pnbox_credentials').delete().eq('user_id', userId);
    if (error) return res.status(500).json({ status: 'error', message: `Falha ao remover: ${error.message}` });
    return res.json({ status: 'ok', message: 'Credenciais PNBOX removidas do Supabase' });
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err.message });
  }
});

router.post('/pnbox-credentials/reconnect', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const token = req.headers.authorization?.substring(7);
  try {
    const client = requireDatabaseClient(token);
    const { data, error } = await client
      .from('pnbox_credentials')
      .select('cpf, password_enc, id_plano')
      .eq('user_id', userId)
      .maybeSingle();
    if (error) return res.status(500).json({ status: 'error', message: `Falha ao consultar credenciais: ${error.message}` });
    if (!data?.password_enc) return res.status(400).json({ status: 'error', message: 'Nenhuma credencial PNBOX salva para este usuário' });

    const idPlano = extrairIdPlano(data.id_plano || '');
    if (!idPlano) return res.status(409).json({ status: 'error', code: 'PNBOX_PLAN_REQUIRED', message: 'Reconexão bloqueada: nenhum ID de plano PNBOX real está associado às credenciais.' });

    const modo: 'DRY_RUN' | 'LIVE' = 'LIVE';
    globalAuthState.modoExecucao = modo;
    const sessionResult = await iniciarSessaoPlaywright({ cpf: data.cpf, password: decryptPnboxPassword(data.password_enc), idPlano }, true, modo, userId);
    return res.json({ status: sessionResult.status === 'authenticated' ? 'ok' : 'error', sucesso: sessionResult.status === 'authenticated', tokenMeteor: sessionResult.meteorLoginToken, cpf: sessionResult.cpf, idPlano: sessionResult.idPlano, session: sessionResult });
  } catch (err: any) {
    return res.status(503).json({ status: 'error', message: err?.message || 'Erro ao reconectar' });
  }
});

export function registerPNBoxCredentialsRoutes(app: Express) { app.use('/api/auth', router); }