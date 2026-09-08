import { Router, Express, Response } from 'express';
import { supabase, isSupabaseConfigured, authMiddleware, getSupabaseUserClient } from '../services/authStore';

const router = Router();

function requireSupabase(res: Response): boolean {
  if (!isSupabaseConfigured || !supabase) {
    res.status(503).json({ status: 'error', message: 'Serviço de autenticação indisponível' });
    return false;
  }
  return true;
}

router.post('/register', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { name, email, password, confirmPassword } = req.body || {};
  if (!name?.trim() || !email?.trim() || !password || !confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'Todos os campos são obrigatórios' });
  }
  if (password !== confirmPassword) {
    return res.status(400).json({ status: 'error', message: 'As senhas não conferem' });
  }
  if (password.length < 6) {
    return res.status(400).json({ status: 'error', message: 'Senha deve ter pelo menos 6 caracteres' });
  }
  if (!/^([^\s@]+)@([^\s@]+)\.([^\s@]+)$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Email inválido' });
  }

  const normalizedEmail = email.toLowerCase().trim();
  const { data: created, error: createError } = await supabase!.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });

  if (createError) {
    if (/already registered|already been registered/i.test(createError.message || '')) {
      return res.status(409).json({ status: 'error', message: 'Email já cadastrado' });
    }
    return res.status(400).json({ status: 'error', message: createError.message });
  }

  const user = created.user;
  const { error: profileError } = await supabase!.from('profiles').upsert(
    { id: user.id, nome: name.trim(), email: normalizedEmail, role: 'user' },
    { onConflict: 'id' }
  );

  if (profileError) {
    return res.status(500).json({ status: 'error', message: 'Conta criada, mas não foi possível concluir o perfil' });
  }

  const { data: signInData, error: signInError } = await supabase!.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });

  if (signInError || !signInData.session) {
    return res.status(201).json({
      status: 'ok',
      message: 'Conta criada. Faça login para obter o token.',
      user: { id: user.id, email: user.email, name: name.trim() },
      accessToken: null,
      refreshToken: null,
      expiresIn: 0,
    });
  }

  return res.status(201).json({
    status: 'ok',
    user: { id: user.id, email: user.email, name: name.trim() },
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    expiresIn: signInData.session.expires_in || 3600,
  });
});

router.post('/login', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { email, password } = req.body || {};
  if (!email?.trim() || !password) {
    return res.status(400).json({ status: 'error', message: 'Email e senha são obrigatórios' });
  }

  const { data, error } = await supabase!.auth.signInWithPassword({
    email: email.toLowerCase().trim(),
    password,
  });
  if (error || !data.session) {
    return res.status(401).json({ status: 'error', message: 'Credenciais inválidas' });
  }

  const user = data.user;
  return res.json({
    status: 'ok',
    user: {
      id: user.id,
      email: user.email,
      name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
    },
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in || 3600,
  });
});

router.post('/refresh', async (req, res) => {
  if (!requireSupabase(res)) return;

  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ status: 'error', message: 'Refresh token é obrigatório' });
  }

  const { data, error } = await supabase!.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return res.status(401).json({ status: 'error', message: 'Refresh token inválido ou expirado' });
  }

  return res.json({
    status: 'ok',
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in || 3600,
  });
});

router.post('/logout', authMiddleware, async (req, res) => {
  if (!requireSupabase(res)) return;
  const token = req.headers.authorization?.substring(7);
  const client = getSupabaseUserClient(token);
  if (!client) {
    return res.status(503).json({ status: 'error', message: 'Sessão Supabase indisponível para logout' });
  }
  const { error } = await client.auth.signOut();
  if (error) {
    return res.status(502).json({ status: 'error', message: 'Não foi possível revogar a sessão' });
  }
  return res.json({ status: 'ok', message: 'Logout realizado com sucesso' });
});

router.get('/me', authMiddleware, async (req, res) => {
  if (!requireSupabase(res)) return;

  const user = (req as any).user;
  const { data: profile } = await supabase!.from('profiles')
    .select('id, nome, email, created_at, updated_at')
    .eq('id', user.id)
    .single();

  return res.json({
    status: 'ok',
    user: {
      id: user.id,
      email: user.email,
      name: profile?.nome || user.name,
      createdAt: profile?.created_at,
      updatedAt: profile?.updated_at,
    },
  });
});

export function registerAuthRoutes(app: Express) {
  app.use('/api/auth', router);
}
