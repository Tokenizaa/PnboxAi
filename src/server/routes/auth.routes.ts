import { Router, Express } from 'express';
import {
  supabase,
  LOCAL_USERS,
  createLocalToken,
  LocalUserAccount,
  authMiddleware
} from '../services/authStore';

const router = Router();

router.post('/register', async (req, res) => {
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

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
    return res.status(400).json({ status: 'error', message: 'Email inválido' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!supabase) {
    for (const u of LOCAL_USERS.values()) {
      if (u.email === normalizedEmail) {
        return res.status(409).json({ status: 'error', message: 'Email já cadastrado' });
      }
    }
    const userId = 'usr_' + Math.random().toString(36).substring(2, 11);
    const now = new Date().toISOString();
    const localUser: LocalUserAccount = {
      id: userId,
      email: normalizedEmail,
      name: name.trim(),
      passwordHash: password,
      createdAt: now,
      updatedAt: now,
    };
    LOCAL_USERS.set(userId, localUser);
    const accessToken = createLocalToken(userId, normalizedEmail);
    const refreshToken = 'refresh_' + accessToken;
    return res.status(201).json({
      status: 'ok',
      user: { id: userId, email: normalizedEmail, name: name.trim() },
      accessToken,
      refreshToken,
      expiresIn: 86400,
    });
  }

  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });
  if (createError) {
    if (createError.message && /already registered|already been registered/i.test(createError.message)) {
      return res.status(409).json({ status: 'error', message: 'Email já cadastrado' });
    }
    return res.status(400).json({ status: 'error', message: createError.message });
  }
  const user = created.user;

  await supabase.from('profiles').upsert(
    { id: user.id, nome: name.trim(), email: normalizedEmail, role: 'user' },
    { onConflict: 'id' }
  );

  const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({
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

  res.status(201).json({
    status: 'ok',
    user: { id: user.id, email: user.email, name: name.trim() },
    accessToken: signInData.session.access_token,
    refreshToken: signInData.session.refresh_token,
    expiresIn: signInData.session.expires_in || 3600,
  });
});

router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};

  if (!email?.trim() || !password) {
    return res.status(400).json({ status: 'error', message: 'Email e senha são obrigatórios' });
  }

  const normalizedEmail = email.toLowerCase().trim();

  if (!supabase) {
    let matchedUser: LocalUserAccount | null = null;
    for (const u of LOCAL_USERS.values()) {
      if (u.email === normalizedEmail && u.passwordHash === password) {
        matchedUser = u;
        break;
      }
    }
    if (!matchedUser) {
      return res.status(401).json({ status: 'error', message: 'Credenciais inválidas' });
    }
    const accessToken = createLocalToken(matchedUser.id, matchedUser.email);
    const refreshToken = 'refresh_' + accessToken;
    return res.json({
      status: 'ok',
      user: {
        id: matchedUser.id,
        email: matchedUser.email,
        name: matchedUser.name,
      },
      accessToken,
      refreshToken,
      expiresIn: 86400,
    });
  }

  const { data, error } = await supabase.auth.signInWithPassword({
    email: normalizedEmail,
    password,
  });
  if (error || !data.session) {
    return res.status(401).json({ status: 'error', message: 'Credenciais inválidas' });
  }
  const user = data.user;

  res.json({
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
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ status: 'error', message: 'Refresh token é obrigatório' });
  }

  if (!supabase) {
    if (typeof refreshToken === 'string' && refreshToken.startsWith('refresh_local_token_')) {
      const token = refreshToken.substring(8);
      const userPart = token.split('_')[2];
      const localUser = LOCAL_USERS.get(userPart);
      if (!localUser) {
        return res.status(401).json({ status: 'error', message: 'Refresh token inválido ou expirado' });
      }
      const newAccess = createLocalToken(localUser.id, localUser.email);
      return res.json({
        status: 'ok',
        accessToken: newAccess,
        refreshToken: 'refresh_' + newAccess,
        expiresIn: 86400,
      });
    }
    return res.status(401).json({ status: 'error', message: 'Refresh token inválido' });
  }

  const { data, error } = await supabase.auth.refreshSession({ refresh_token: refreshToken });
  if (error || !data.session) {
    return res.status(401).json({ status: 'error', message: 'Refresh token inválido ou expirado' });
  }

  res.json({
    status: 'ok',
    accessToken: data.session.access_token,
    refreshToken: data.session.refresh_token,
    expiresIn: data.session.expires_in || 3600,
  });
});

router.post('/logout', authMiddleware, async (_req, res) => {
  res.json({ status: 'ok', message: 'Logout realizado com sucesso' });
});

router.get('/me', authMiddleware, async (req, res) => {
  const user = (req as any).user;
  if (!supabase) {
    const localUser = LOCAL_USERS.get(user.id);
    return res.json({
      status: 'ok',
      user: {
        id: user.id,
        email: user.email,
        name: localUser?.name || user.name,
        createdAt: localUser?.createdAt || new Date().toISOString(),
        updatedAt: localUser?.updatedAt || new Date().toISOString(),
      },
    });
  }

  const { data: profile } = await supabase
    .from('profiles')
    .select('id, nome, email, created_at, updated_at')
    .eq('id', user.id)
    .single();
  res.json({
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
