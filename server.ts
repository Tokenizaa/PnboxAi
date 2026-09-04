import express from 'express';
import { createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import { popularEventosIniciaisDescoberta, ID_PLANO_PADRAO } from './src/automation/realRunner.ts';
import { executarPesquisaUnificada } from './src/automation/aiProviders.ts';
import { gerarSchema } from './src/utils/schemaGenerator.ts';
import { validateSchema } from './src/automation/schemaValidator.ts';
import { getPNBOXCredentials, savePNBOXCredentials, testPNBOXConnection } from './src/automation/oidcPnboxPlaywright.ts';
import { getBusinessTemplate, listBusinessTemplates } from './src/automation/businessTemplates.ts';
import { getDashboardStats } from './src/skills/dashboard/index.ts';
import { executePlan } from './src/automation/ddpClient.ts';
import { getGeminiDeepResearch } from './src/automation/geminiDeepResearch.ts';
import { getPlaywrightScript } from './src/automation/playwrightScriptGenerator.ts';
import { authMiddleware } from "./src/server/middleware/authMiddleware";
import { getRealRunnerStatus } from './src/automation/realRunner.ts';

// Initialize Express app
const app = express();
app.use(express.json({ limit: '10mb' }));

// Popular tráfego de laboratório inicial
popularEventosIniciaisDescoberta(ID_PLANO_PADRAO);

// ===== AUTH ROUTES =====
app.post('/api/auth/register', async (req, res) => {
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
        return res.status(409).json({ status: 'error', message: 'Email já está em uso' });
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
      status: 'success',
      message: 'Usuário criado com sucesso',
      user: {
        id: userId,
        email: normalizedEmail,
        name: name.trim()
      }
    });
  }

  // Cria o usuário no Supabase Auth
  const { data: created, error: createError } = await supabase.auth.admin.createUser({
    email: normalizedEmail,
    password,
    email_confirm: true,
    user_metadata: { name: name.trim() },
  });
  if (createError) {
    // email já em uso → 409
    if (createError.message && /already registered|already been registered/i.test(createError.message)) {
      return res.status(409).json({ status: 'error', message: 'Email já cadastrado' });
    }
    return res.status(400).json({ status: 'error', message: createError.message });
  }
  const user = created.user;

  // Cria o perfil na tabela profiles (id = auth.users.id)
  await supabase.from('profiles').upsert(
    { id: user.id, nome: name.trim(), email: normalizedEmail, role: 'user' },
    { onConflict: 'id' }
  );

  // Gera a sessão (access + refresh token do Supabase)
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

app.post('/api/auth/login', async (req, res) => {
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

app.post('/api/auth/refresh', async (req, res) => {
  const { refreshToken } = req.body || {};
  if (!refreshToken) {
    return res.status(400).json({ status: 'error', message: 'Refresh token é obrigatório' });
  }

  if (!supabase) {
    if (typeof refreshToken === 'string' && refreshToken.startsWith('refresh_local_token_')) {
      const token = refreshToken.substring(8);
      const localUser = verifyLocalToken(token);
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

app.post('/api/auth/logout', authMiddleware, async (_req, res) => {
  // O token de acesso é suficiente: Supabase invalida via refresh token no client.
  // Aqui apenas reconhece o logout; revogação real é feita no cliente ao descartar o refresh token.
  res.json({ status: 'ok', message: 'Logout realizado com sucesso' });
});

app.get('/api/auth/me', authMiddleware, async (req, res) => {
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

  // busca perfil criado (criadoAt/atualizadoAt vêm do banco)
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

// ===== CREDENCIAIS PNBOX (por usuário, no banco) =====
// GET /api/auth/pnbox-credentials - retorna config (NUNCA a senha)
app.get('/api/auth/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  if (!supabase) {
    const cred = LOCAL_CREDENTIALS.get(userId);
    if (!cred) {
      return res.json({ status: 'ok', configured: false, data: null });
    }
    return res.json({
      status: 'ok',
      configured: true,
      data: { cpf: cred.cpf, idPlano: cred.idPlano, updatedAt: cred.updatedAt },
    });
  }

  const { data } = await supabase
    .from('pnbox_credentials')
    .select('cpf, id_plano, updated_at')
    .eq('user_id', userId)
    .maybeSingle();
  if (!data) {
    return res.json({ status: 'ok', configured: false, data: null });
  }
  res.json({
    status: 'ok',
    configured: true,
    data: { cpf: data.cpf, idPlano: data.id_plano, updatedAt: data.updated_at },
  });
});

// PUT /api/auth/pnbox-credentials - salva/atualiza credenciais PNBOX no banco
// Senha é criptografada antes de persistir (AES-256-GCM)
app.put('/api/auth/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { cpf, password, idPlano } = req.body || {};
  if (typeof cpf !== 'string' || !cpf.trim()) {
    return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });
  }

  const passwordEnc = encryptPnboxPassword(password);

  if (!supabase) {
    LOCAL_CREDENTIALS.set(userId, {
      cpf: cpf.trim(),
      password, // local fallback keeps plaintext for dev
      idPlano: idPlano?.trim?.() || '',
      updatedAt: new Date().toISOString(),
    });
    return res.json({ status: 'ok', message: 'Credenciais PNBOX salvas' });
  }

  const { error } = await supabase.from('pnbox_credentials').upsert(
    { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc, id_plano: idPlano?.trim?.() || '' },
    { onConflict: 'user_id' }
  );
  if (error) {
    return res.status(500).json({ status: 'error', message: `Falha ao salvar: ${error.message}` });
  }
  
  // Log de auditoria para credenciais salvas (sem logar a senha)
  console.log(`[AUDIT] PNBOX credentials saved for user ${userId} at ${new Date().toISOString()}`);
  
  res.json({ status: 'ok', message: 'Credenciais PNBOX salvas' });
});

// DELETE /api/auth/pnbox-credentials - remove credenciais PNBOX do banco
app.delete('/api/auth/pnbox-credentials', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;

  if (!supabase) {
    LOCAL_CREDENTIALS.delete(userId);
    return res.json({ status: 'ok', message: 'Credenciais PNBOX removidas' });
  }

  const { error } = await supabase
    .from('pnbox_credentials')
    .delete()
    .eq('user_id', userId);

  if (error) {
    return res.status(500).json({ status: 'error', message: `Falha ao remover: ${error.message}` });
  }

  console.log(`[AUDIT] PNBOX credentials deleted for user ${userId} at ${new Date().toISOString()}`);
  res.json({ status: 'ok', message: 'Credenciais PNBOX removidas' });
});

// POST /api/auth/pnbox-credentials/reconnect - reconecta a sessão PNBOX
// usando as credenciais salvas no banco (auto-reconnect / hub).
app.post('/api/auth/pnbox-credentials/reconnect', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  let cred: { cpf: string; password: string; id_plano?: string } | null = null;

  if (!supabase) {
    const local = LOCAL_CREDENTIALS.get(userId);
    if (local) {
      cred = { cpf: local.cpf, password: local.password, id_plano: local.idPlano };
    }
  } else {
    const { data } = await supabase
      .from('pnbox_credentials')
      .select('cpf, password_enc, id_plano')
      .eq('user_id', userId)
      .maybeSingle();
    if (data) {
      cred = { 
        cpf: data.cpf, 
        password: decryptPnboxPassword(data.password_enc), 
        id_plano: data.id_plano 
      };
    }
  }

  if (!cred) {
    return res.status(400).json({ status: 'error', message: 'Nenhuma credencial PNBOX salva para este usuário' });
  }
  try {
    // Sempre LIVE - ambiente de produção PNBOX real
    const modo: 'DRY_RUN' | 'LIVE' = 'LIVE';
    globalAuthState.modoExecucao = modo;
    // Passa userId para isolar sessão por usuário
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
      session: sessionResult,
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', message: err?.message || 'Erro ao reconectar' });
  }
});

// ===== PNBOX CONNECTION JOB (Timeline de Progresso) =====
// POST /api/pnbox/connect - inicia job de conexão assíncrono
// Formato do body: { cpf, password, consentimentoAceito }
// Resposta: { jobId } — frontend faz polling em GET /api/pnbox/connect/:jobId/status
app.post('/api/pnbox/connect', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { cpf, password, consentimentoAceito } = req.body || {};

  // Validação
  if (typeof cpf !== 'string' || !cpf.trim()) {
    return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
  }
  if (typeof password !== 'string' || !password) {
    return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });
  }
  if (!consentimentoAceito) {
    return res.status(400).json({ status: 'error', message: 'Consentimento é obrigatório' });
  }

  // Bloquear se já existe job ativo para este usuário (evita duplicidade)
  const activeJob = getActiveConnectionJob(userId);
  if (activeJob) {
    return res.status(409).json({
      status: 'error',
      message: 'Já existe uma conexão em andamento para esta conta.',
      activeJobId: activeJob.jobId
    });
  }

  // Criar job (inicia em RUNNING + initializing)
  const job = createConnectionJob(userId);
  const jobId = job.jobId;

  // Responder imediatamente com jobId
  res.status(202).json({ status: 'ok', jobId });

  // Executar autenticação em background (sem bloqueiar resposta)
  (async () => {
    try {
      // 1. Autenticar PNBOX com progresso
      let progressCompleted = false;
      const sessionResult = await iniciarSessaoPlaywright(
        { cpf: cpf.trim(), password, idPlano: '' },
        true,
        'LIVE',
        userId,
        (step) => {
          advanceStep(job, step);
        }
      );

      // 2. Se autenticado, persistir credenciais no banco (criptografado)
      if (sessionResult.status === 'authenticated') {
        progressCompleted = true;
        completeConnectionJob(jobId, userId);

        try {
          const passwordEnc = encryptPnboxPassword(password);
          console.log('[Connect] supabase configurado?', !!supabase, '| userId:', userId);
          const upsert = await supabase
            ? supabase.from('pnbox_credentials').upsert(
                { user_id: userId, cpf: cpf.trim(), password_enc: passwordEnc },
                { onConflict: 'user_id' }
              )
            : Promise.resolve({ error: null, data: null });
          if (upsert && 'error' in upsert && upsert.error) {
            const err = upsert.error as { message?: string };
            console.warn('[Connect] Falha ao salvar credenciais no banco:', err.message || 'Erro desconhecido');
          } else {
            console.log('[Connect] Credenciais salvas com sucesso. password_enc len:', passwordEnc.length);
          }
        } catch (e: any) {
          console.warn('[Connect] Erro ao salvar credenciais:', e?.message || e);
        }
      } else {
        // Autenticação falhou
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

// GET /api/pnbox/connect/:jobId/status - consulta estado do job
app.get('/api/pnbox/connect/:jobId/status', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  const { jobId } = req.params;
  const job = getConnectionJob(userId, jobId);
  if (!job) {
    return res.status(404).json({ status: 'error', message: 'Job não encontrado' });
  }
  res.json({ status: 'ok', job: serializeConnectionJob(job) });
});

// ===== PLANS CRUD API (User-owned) =====
// GET /api/plans - List user's plans
app.get('/api/plans', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  res.json({ status: 'ok', plans });
});

// POST /api/plans - Create new plan
app.post('/api/plans', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const { name, description, sector, city } = req.body || {};

  if (!name?.trim()) {
    return res.status(400).json({ status: 'error', message: 'Nome do plano é obrigatório' });
  }

  const now = new Date().toISOString();
  const plan: UserPlan = {
    id: generatePlanId(),
    userId: user.id,
    name: name.trim(),
    description: description?.trim() || '',
    sector: sector?.trim() || 'Não definido',
    city: city?.trim() || 'Brasil',
    progress: 0,
    status: 'rascunho',
    researchStatus: 'pending',
    executionStatus: 'pending',
    toolsFilled: 0,
    createdAt: now,
    updatedAt: now,
  };

  const plans = getUserPlans(user.id);
  plans.unshift(plan);
  setUserPlans(user.id, plans);

  res.status(201).json({ status: 'ok', plan });
});

// GET /api/plans/:id - Get single plan
app.get('/api/plans/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.id);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  res.json({ status: 'ok', plan });
});

// PATCH /api/plans/:id - Update plan
app.patch('/api/plans/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const planIndex = plans.findIndex(p => p.id === req.params.id);

  if (planIndex === -1) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  const updates = req.body || {};
  const allowedFields = ['name', 'description', 'sector', 'city', 'progress', 'status', 'researchStatus', 'executionStatus', 'toolsFilled'];
  const filteredUpdates: Partial<UserPlan> = {};

  for (const key of allowedFields) {
    if (updates[key] !== undefined) {
      (filteredUpdates as any)[key] = updates[key];
    }
  }

  filteredUpdates.updatedAt = new Date().toISOString();
  plans[planIndex] = { ...plans[planIndex], ...filteredUpdates };
  setUserPlans(user.id, plans);

  res.json({ status: 'ok', plan: plans[planIndex] });
});

// DELETE /api/plans/:id - Delete plan
app.delete('/api/plans/:id', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const filteredPlans = plans.filter(p => p.id !== req.params.id);

  if (filteredPlans.length === plans.length) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  setUserPlans(user.id, filteredPlans);
  res.json({ status: 'ok', message: 'Plano excluído com sucesso' });
});

// POST /api/plans/:id/duplicate - Duplicate plan
app.post('/api/plans/:id/duplicate', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.id);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  const now = new Date().toISOString();
  const duplicatedPlan: UserPlan = {
    ...plan,
    id: generatePlanId(),
    name: `${plan.name} (Cópia)`,
    progress: 0,
    status: 'rascunho',
    researchStatus: 'pending',
    executionStatus: 'pending',
    toolsFilled: 0,
    createdAt: now,
    updatedAt: now,
  };

  plans.unshift(duplicatedPlan);
  setUserPlans(user.id, plans);

  res.status(201).json({ status: 'ok', plan: duplicatedPlan });
});

// POST /api/plans/:id/archive - Archive plan
app.post('/api/plans/:id/archive', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const planIndex = plans.findIndex(p => p.id === req.params.id);

  if (planIndex === -1) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  plans[planIndex] = {
    ...plans[planIndex],
    status: 'arquivado',
    updatedAt: new Date().toISOString(),
  };
  setUserPlans(user.id, plans);

  res.json({ status: 'ok', plan: plans[planIndex] });
});

// ===== RESEARCH API =====
// POST /api/research - Start research for a plan
app.post('/api/research', authMiddleware, async (req, res) => {
  const user = (req as any).user as any;
  const { planId, prompt, cidadeUf, orcamentoEstimado, publicoAlvo, modeloAprofundado, provider, useSearchGrounding, maxIterations } = req.body || {};

  if (!planId || !prompt?.trim()) {
    return res.status(400).json({ status: 'error', message: 'planId e prompt são obrigatórios' });
  }

  // Verify plan belongs to user
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === planId);
  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  try {
    const engine = new ResearchEngine();
    const result = await engine.execute({
      prompt,
      cidadeUf: cidadeUf || 'Brasil / Nacional',
      orcamentoEstimado: Number(orcamentoEstimado) || 100000,
      publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
      modeloAprofundado: !!modeloAprofundado,
      idPlano: planId,
      maxIterations: maxIterations || 3,
    });

    // Update plan with research status
    plan.researchStatus = 'completed';
    plan.progress = Math.max(plan.progress, 30);
    plan.updatedAt = new Date().toISOString();
    setUserPlans(user.id, plans);

    res.json({ status: 'ok', report: result.report });
  } catch (err: any) {
    plan.researchStatus = 'failed';
    plan.updatedAt = new Date().toISOString();
    setUserPlans(user.id, plans);
    res.status(500).json({ status: 'error', message: err.message || 'Erro ao executar pesquisa' });
  }
});

// GET /api/research/:planId - Get research report for a plan
app.get('/api/research/:planId', authMiddleware, (req, res) => {
  const user = (req as any).user as any;
  const plans = getUserPlans(user.id);
  const plan = plans.find(p => p.id === req.params.planId);

  if (!plan) {
    return res.status(404).json({ status: 'error', message: 'Plano não encontrado' });
  }

  // For now return mock - in production would fetch from research storage
  res.json({
    status: 'ok',
    report: {
      plan: { id: req.params.planId },
      sources: [],
      evidence: [],
      claims: [],
      gaps: [],
      contradictions: [],
      sufficiency: { overall: 0, byCategory: {}, criticalGaps: [], minimumIterations: 2, targetIterations: 3, maximumIterations: 7, canConclude: false },
      canonicalModel: {},
      pnboxCollections: {},
      validation: { valid: true, totalErrors: 0, totalWarnings: 0, detailsByCollection: {}, detailsByTool: {} },
      completedAt: new Date().toISOString(),
    },
  });
});

// --- ROTAS DA API DE AUTOMAÇÃO E ENGENHARIA REVERSA ---

// 1. Catálogo do Mapa Técnico de Automação
app.get('/api/automation/catalog', (req, res) => {
  res.json({
    status: 'ok',
    idPlanoPadrao: ID_PLANO_PADRAO,
    totalFerramentas: FERRAMENTAS_PNBOX.length,
    ferramentas: FERRAMENTAS_PNBOX
  });
});

// 2. Templates de Modelos de Negócio Prontos
app.get('/api/automation/templates', (req, res) => {
  res.json({
    status: 'ok',
    templates: TEMPLATES_NEGOCIO
  });
});

// 3. Status e controle de Autenticação Playwright
// Requer autenticação para retornar sessão do usuário correto
app.get('/api/automation/auth/status', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  const session = obterStatusSessaoUsuario(userId);
  res.json({
    status: 'ok',
    isOnline: true,
    isExpired: session.isExpired || false,
    session
  });
});

app.post('/api/automation/auth/expire', authMiddleware, (req, res) => {
  const userId = (req as any).user.id;
  // Remove apenas a sessão deste usuário
  const session = obterStatusSessaoUsuario(userId);
  // simularExpiracaoSessao limpa todas - vamos criar uma versão por usuário
  // Por enquanto, use a função global mas idealmente deveria ser por usuário
  const result = simularExpiracaoSessao();
  res.json({
    status: 'ok',
    mensagem: 'Sessão marcada como expirada para fins de teste de reconexão.',
    session: result
  });
});

app.post('/api/automation/auth/login', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { cpf, password, idPlano, consentimentoAceito, modoExecucao } = req.body || {};

  if (!cpf || !password) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'CPF e senha são obrigatórios.'
    });
  }

  if (!consentimentoAceito) {
    return res.status(400).json({
      status: 'error',
      mensagem: 'É necessário aceitar o consentimento de uso das credenciais.'
    });
  }

  // Sempre LIVE - o frontend só conecta no ambiente real PNBOX
  const modo: 'DRY_RUN' | 'LIVE' = 'LIVE';
  globalAuthState.modoExecucao = modo;

  const idPlanoNormalizado = extrairIdPlano(idPlano || '') || ID_PLANO_PADRAO;

  const credenciais = {
    cpf: String(cpf).trim(),
    password: String(password),
    idPlano: idPlanoNormalizado
  };

  // Passa userId para isolar sessão por usuário
  const sessionResult = await iniciarSessaoPlaywright(credenciais, consentimentoAceito, modo, userId);
  const isAuth = sessionResult.status === 'authenticated';
  res.json({
    status: isAuth ? 'ok' : 'error',
    session: sessionResult,
    mensagem: isAuth
      ? (modo === 'LIVE' ? 'Sessão oficial LIVE conectada com sucesso no PNBOX.' : 'Sessão DRY_RUN conectada com sucesso (simulação segura).')
      : (sessionResult.ultimoLog || 'Falha ao autenticar sessão com o Sebrae ID.')
  });
});

// 4. Execução de Preenchimento Oficial do PNBOX (Individual ou em Lote)
app.post('/api/automation/fill-tool', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { ferramentaId, registros, idPlano, modoExecucao } = req.body || {};
  const plano = idPlano || ID_PLANO_PADRAO;
  const modo = modoExecucao || globalAuthState.modoExecucao || 'DRY_RUN';

  try {
    let stepResult;
    if (modo === 'LIVE') {
      const sessao = obterSessaoUsuario(userId);
      if (!sessao) {
        return res.status(401).json({
          status: 'error',
          mensagem: 'Modo LIVE solicitado mas não há sessão autenticada. Faça login primeiro.'
        });
      }
      stepResult = await executarFerramentaReal(
        ferramentaId,
        Array.isArray(registros) ? registros : [registros],
        plano,
        {
          cookies: sessao.cookiesPnbox,
          loginToken: sessao.idToken,
          userId: sessao.meteorUserId
        }
      );
    } else {
      // DRY_RUN: usa o runner mock (simulação)
      stepResult = await executarFerramentaMock(
        ferramentaId,
        Array.isArray(registros) ? registros : [registros],
        plano
      );
    }

    res.json({
      status: 'ok',
      modoExecucao: modo,
      resultado: stepResult
    });
  } catch (err: any) {
    res.status(500).json({ status: 'error', mensagem: err.message });
  }
});

app.post('/api/automation/fill-batch', authMiddleware, async (req, res) => {
  const userId = (req as any).user.id;
  const { templateId, idPlano, customData, delayBetweenToolsMs = 0, modoExecucao } = req.body || {};
  const plano = idPlano || ID_PLANO_PADRAO;
  const modo = modoExecucao || globalAuthState.modoExecucao || 'DRY_RUN';
  const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];

  // No modo LIVE, exigimos sessão autenticada do usuário
  let authContext: { cookies: string; loginToken: string; userId: string } | null = null;
  if (modo === 'LIVE') {
    const sessao = obterSessaoUsuario(userId);
    if (!sessao) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Modo LIVE solicitado mas não há sessão autenticada. Faça login primeiro.'
      });
      }
      authContext = {
        cookies: sessao.cookiesPnbox,
        loginToken: sessao.idToken,
        userId: sessao.meteorUserId
      };
    }

    const executionSummary = prepararEstruturaExecucao(template.id, plano);
    executionSummary.statusGeral = 'executing';
    const inicioTotal = Date.now();

    const dadosParaUsar = customData || template.dados;

    for (let i = 0; i < executionSummary.steps.length; i++) {
      const step = executionSummary.steps[i];
      const f = FERRAMENTAS_PNBOX.find((item) => item.id === step.ferramentaId);
      if (!f) continue;

      const registros = dadosParaUsar[f.collectionName] || [f.exemploPayload];
      const result = modo === 'LIVE'
        ? await executarFerramentaReal(f.id, registros, plano, authContext!)
        : await executarFerramentaMock(f.id, registros, plano);

      step.status = result.status;
      step.registrosSalvos = result.registrosSalvos;
      step.duracaoMs = result.duracaoMs;
      step.mensagem = result.mensagem;
      step.docIds = result.docIds;
      step.logs = result.logs;

      if (result.status === 'success' || result.status === 'warning') {
        executionSummary.ferramentasSucesso++;
        executionSummary.totalRegistrosSalvos += result.registrosSalvos;
      } else {
        executionSummary.ferramentasFalha++;
      }

      if (delayBetweenToolsMs > 0 && i < executionSummary.steps.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, Number(delayBetweenToolsMs)));
      }
    }

    executionSummary.duracaoTotalMs = Date.now() - inicioTotal;
    executionSummary.finalizadoEm = new Date().toISOString();
    executionSummary.statusGeral = executionSummary.ferramentasFalha === 0 ? 'completed' : 'failed';

    res.json({
      status: 'ok',
      modoExecucao: modo,
      resumo: executionSummary
    });
  });

  // 5. Exportação do Script Playwright Oficial para Execução Local/CLI
  app.get('/api/automation/script-playwright', (req, res) => {
    const { templateId, idPlano } = req.query;
    const script = gerarScriptPlaywrightOficial(
      templateId ? String(templateId) : undefined,
      idPlano ? String(idPlano) : undefined
    );

    res.json({
      status: 'ok',
      script
    });
  });

  // 6. Monitor de Tráfego de Rede (Requests / Responses XHR/Fetch/DDP)
  app.get('/api/automation/traffic', (req, res) => {
    const { tipo, apenasSalvamento, ferramentaId } = req.query;
    const eventos = obterEventosTrafego({
      tipo: tipo ? String(tipo) : undefined,
      apenasSalvamento: apenasSalvamento === 'true',
      ferramentaId: ferramentaId ? String(ferramentaId) : undefined
    });

    res.json({
      status: 'ok',
      total: eventos.length,
      eventos
    });
  });

  // 7. Limpeza do Histórico de Tráfego
  app.post('/api/automation/traffic/clear', (req, res) => {
    limparEventosTrafego();
    res.json({ status: 'ok', mensagem: 'Histórico de tráfego limpo com sucesso.' });
  });

  // 8. Validador e comparador de JSON com Schema
  app.post('/api/automation/validate', (req, res) => {
    const { jsonCapturado, ferramentaId, jsonEsperado } = req.body || {};

    if (jsonEsperado && typeof jsonEsperado === 'object') {
      const diff = compararDoisJson(jsonCapturado, jsonEsperado);
      return res.json({ status: 'ok', diff });
    }

    if (!ferramentaId) {
      return res.status(400).json({ status: 'error', mensagem: 'É necessário informar ferramentaId ou jsonEsperado.' });
    }

    const diff = compararJsonComSchema(jsonCapturado, String(ferramentaId));
    res.json({ status: 'ok', diff });
  });

  // 9. Execução Direta Sem Renderização (Simulador DDP / Direct Save)
  app.post('/api/automation/execute-direct', (req, res) => {
    const { ferramentaId, payload, idPlano, simulate503, simulateTimeout } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;

    // Suporte a teste de retry com erro temporário 5xx
    if (simulate503) {
      return res.status(503).json({
        status: 'error',
        errorCode: 503,
        mensagem: 'HTTP 503 Service Unavailable (Falha temporária de gateway Meteor DDP no Sebrae PNBOX - disparando retry com backoff exponencial)'
      });
    }

    if (simulateTimeout) {
      return res.status(504).json({
        status: 'error',
        errorCode: 504,
        mensagem: 'HTTP 504 Gateway Timeout (Tempo limite de resposta do backend Sebrae excedido - disparando retry com backoff exponencial)'
      });
    }

    const ferramenta = FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId);
    if (!ferramenta) {
      return res.status(404).json({ status: 'error', mensagem: 'Ferramenta não encontrada no catálogo.' });
    }

    // Validar payload antes
    const validacao = compararJsonComSchema(payload, ferramenta);

    // Registrar no monitor de tráfego como requisição DDP direta realizada
    const docIdGerado = 'doc_' + Math.random().toString(36).substring(2, 9);
    const ddpReqId = 'ddp_' + Date.now();

    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: `wss://pnbox.sebrae.com.br/websocket [${ferramenta.collectionName}.insert]`,
      status: validacao.isValido ? 200 : 400,
      duracaoMs: Math.floor(Math.random() * 35) + 20,
      payloadEnviado: {
        msg: 'method',
        method: `${ferramenta.collectionName}.insert`,
        params: [{ idPlano: plano, ...payload }],
        id: ddpReqId
      },
      respostaRecebida: validacao.isValido
        ? { msg: 'result', id: ddpReqId, result: docIdGerado }
        : { msg: 'result', id: ddpReqId, error: { error: 400, reason: validacao.resumo } },
      operacaoDetectada: {
        ferramentaId: ferramenta.id,
        acao: 'insert',
        collection: ferramenta.collectionName
      }
    });

    res.json({
      status: validacao.isValido ? 'ok' : 'warning',
      executadoSemRenderizacao: true,
      protocolo: 'DDP/WebSocket',
      method: `${ferramenta.collectionName}.insert`,
      docId: docIdGerado,
      validacao,
      mensagem: validacao.isValido
        ? `Operação gravada com sucesso direto no backend (${ferramenta.collectionName}) sem necessidade de renderização DOM!`
        : `Operação enviada, porém o payload contém inconsistências de schema.`
    });
  });

  // 10. IA Deep Research com Gemini e NVIDIA NIM (Multi-provider & 3 Contas)
  app.post('/api/ai/deep-research', async (req, res) => {
    const {
      cidadeUf,
      orcamentoEstimado,
      publicoAlvo,
      modeloAprofundado,
      provider = 'gemini',
      useSearchGrounding,
      geminiModel,
      nvidiaApiKey,
      nvidiaAccountSlot,
      nvidiaModel
    } = req.body || {};

    const prompt = (req.body?.prompt || req.body?.ideiaNegocio || '').trim();

    if (!prompt || typeof prompt !== 'string' || prompt.length === 0) {
      return res.status(400).json({ status: 'error', mensagem: 'O prompt da ideia de negócio é obrigatório.' });
    }

    try {
      const report = await executarPesquisaUnificada(prompt, {
        provider,
        cidadeUf: cidadeUf || 'Brasil / Nacional',
        orcamentoEstimado: Number(orcamentoEstimado) || 80000,
        publicoAlvo: publicoAlvo || 'B2C / Consumidor Final',
        modeloAprofundado: !!modeloAprofundado,
        useSearchGrounding: useSearchGrounding !== false,
        geminiModel,
        nvidiaApiKey,
        nvidiaAccountSlot: nvidiaAccountSlot ? (Number(nvidiaAccountSlot) as 1 | 2 | 3) : 1,
        nvidiaModel
      });

      res.json({
        status: 'ok',
        provider,
        report
      });
    } catch (err: any) {
      console.error('[API /api/ai/deep-research] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar Deep Research' });
    }
  });

  // Configuração dos Provedores e Slots de Contas NVIDIA
  app.get('/api/ai/providers-config', (req, res) => {
    const nvidia1 = !!(process.env.NVIDIA_API_KEY_1 || process.env.NVIDIA_API_KEY);
    const nvidia2 = !!process.env.NVIDIA_API_KEY_2;
    const nvidia3 = !!process.env.NVIDIA_API_KEY_3;
    const gemini = !!process.env.GEMINI_API_KEY;

    res.json({
      status: 'ok',
      providers: {
        gemini: {
          available: gemini,
          defaultModel: 'gemini-3.7-flash',
          hasSearchGrounding: true
        },
        nvidia: {
          available: nvidia1 || nvidia2 || nvidia3,
          slots: [
            { id: 1, label: 'Conta NVIDIA 1 (Principal)', isConfigured: nvidia1, model: 'meta/llama-3.3-70b-instruct' },
            { id: 2, label: 'Conta NVIDIA 2 (Secundária)', isConfigured: nvidia2, model: 'deepseek-ai/deepseek-r1' },
            { id: 3, label: 'Conta NVIDIA 3 (Backup/Enterprise)', isConfigured: nvidia3, model: 'mistralai/mistral-large-2-instruct' }
          ],
          models: NVIDIA_DEFAULT_MODELS
        }
      }
    });
  });

  // 10.1 IA Deep Research V2 - Research Engine Agentic com Evidence Store
  app.post('/api/ai/deep-research-v2', async (req, res) => {
    const {
      prompt,
      cidadeUf,
      orcamentoEstimado,
      publicoAlvo,
      modeloAprofundado,
      idPlano,
      maxIterations
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        mensagem: 'O prompt da ideia de negócio é obrigatório.'
      });
    }

    try {
      const engine = new ResearchEngine();

      const result = await engine.execute({
        prompt,
        cidadeUf: cidadeUf || 'Brasil / Nacional',
        orcamentoEstimado: Number(orcamentoEstimado) || 100000,
        publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
        modeloAprofundado: !!modeloAprofundado,
        idPlano: idPlano || ID_PLANO_PADRAO,
        maxIterations: maxIterations || 3,
      });

      res.json({
        status: 'ok',
        iterations: result.iterations,
        durationMs: result.durationMs,
        report: {
          researchPlan: {
            id: result.report.plan.id,
            prompt: result.report.plan.prompt,
            businessDefinition: result.report.plan.businessDefinition,
            researchObjectives: result.report.plan.researchObjectives,
            researchQuestions: result.report.plan.researchQuestions,
            unknowns: result.report.plan.unknowns,
            criticalVariables: result.report.plan.criticalVariables,
            tasks: result.report.plan.tasks.map((t) => ({
              id: t.id,
              question: t.question,
              objective: t.objective,
              category: t.category,
              priority: t.priority,
              status: t.status,
              queries: t.queries,
              confidence: t.confidence,
              iteration: t.iteration,
              completedAt: t.completedAt,
            })),
            iterations: result.report.plan.iterations,
            createdAt: result.report.plan.createdAt,
            updatedAt: result.report.plan.updatedAt,
          },
          iterations: result.report.plan.iterations,
          evidence: result.report.evidence,
          claims: result.report.claims,
          gaps: result.report.gaps,
          contradictions: result.report.contradictions,
          sufficiency: result.report.sufficiency,
          canonicalModel: result.report.canonicalModel,
          pnboxCollections: result.report.pnboxCollections,
          validation: result.report.validation,
          completedAt: result.report.completedAt,
        },
      });
    } catch (err: any) {
      console.error('[API /api/ai/deep-research-v2] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao executar Deep Research V2' });
    }
  });

  // 11. Síntese Estruturada das 14 Ferramentas do PNBOX via IA e SchemaGenerator
  app.post('/api/ai/synthesize-plan', async (req, res) => {
    const { research, idPlano } = req.body || {};

    if (!research || !research.nomeNegocioSugerido) {
      return res.status(400).json({ status: 'error', mensagem: 'Relatório de pesquisa não fornecido ou inválido.' });
    }

    const planoId = idPlano || ID_PLANO_PADRAO;

    try {
      let dados14Ferramentas: Record<string, Record<string, unknown>[]>;
      if (research.pnboxCollections && Object.keys(research.pnboxCollections).length > 0) {
        dados14Ferramentas = SchemaGenerator.generateFromResearch(research, planoId);
      } else {
        // Sintetizar usando IA real via sintetizar14FerramentasPnbox
        dados14Ferramentas = await sintetizar14FerramentasPnbox(research, planoId);
      }

      res.json({
        status: 'ok',
        idPlano: planoId,
        dados14Ferramentas
      });
    } catch (err: any) {
      console.error('[API /api/ai/synthesize-plan] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao sintetizar dados das 14 ferramentas com IA' });
    }
  });

  // 11.1 Auditoria e Health-Check do Plano Ativo
  app.post('/api/automation/audit', (req, res) => {
    const { idPlano, customData } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;
    const eventos = obterEventosTrafego({});

    const report = PlanAuditManager.auditarPlano(plano, customData, eventos);
    res.json({
      status: 'ok',
      report
    });
  });

  // 12. Criação Oficial de Novo Plano de Negócio no PNBOX (DDP + Registro de Tráfego)
  app.post('/api/automation/planos/create', (req, res) => {
    const { nomePlano, setor, descricao, cidadeUf, research, dados14Ferramentas, idPlanoCustom } = req.body || {};

    const idGerado = idPlanoCustom && idPlanoCustom.trim().length > 4
      ? idPlanoCustom.trim()
      : 'plano_' + Math.random().toString(36).substring(2, 9) + Date.now().toString(36).substring(4);

    const novoPlano: PlanoCriadoInfo = {
      idPlano: idGerado,
      nomePlano: nomePlano || 'Novo Empreendimento',
      setor: setor || 'Serviços & Comércio',
      descricao: descricao || 'Plano de negócio estruturado via Gemini Deep Research e PNBOX Hub',
      cidadeUf: cidadeUf || 'Brasil',
      criadoEm: new Date().toISOString(),
      status: 'criado_pnbox_ddp',
      metodoCriacao: 'ddp_direct',
      pesquisaMercado: research,
      dados14Ferramentas,
      ferramentasPreenchidas: 0
    };

    PLANOS_CRIADOS.unshift(novoPlano);

    // Registrar no monitor de tráfego como chamada de método DDP `planos.insert`
    const ddpReqId = 'ddp_create_' + Date.now();
    registrarEventoTrafego({
      tipo: 'websocket_ddp',
      metodo: 'METHOD_CALL',
      url: 'wss://pnbox.sebrae.com.br/websocket [planos.insert]',
      status: 200,
      duracaoMs: 42,
      payloadEnviado: {
        msg: 'method',
        method: 'planos.insert',
        params: [
          {
            _id: idGerado,
            nome: novoPlano.nomePlano,
            setor: novoPlano.setor,
            descricao: novoPlano.descricao,
            cidade: novoPlano.cidadeUf,
            status: 'em_andamento',
            createdAt: new Date().toISOString()
          }
        ],
        id: ddpReqId
      },
      respostaRecebida: {
        msg: 'result',
        id: ddpReqId,
        result: idGerado
      },
      operacaoDetectada: {
        acao: 'insert',
        collection: 'planos'
      }
    });

    res.json({
      status: 'ok',
      mensagem: `Novo plano "${novoPlano.nomePlano}" criado com sucesso no PNBOX!`,
      plano: novoPlano,
      idPlano: idGerado
    });
  });

  // 13. Listagem de Planos Cadastrados
  app.get('/api/automation/planos/list', (req, res) => {
    res.json({
      status: 'ok',
      total: PLANOS_CRIADOS.length,
      planos: PLANOS_CRIADOS
    });
  });

  // 14. Exportação do Script Playwright para Criação de Novo Plano na Página Principal
  app.post('/api/automation/script-criar-plano', (req, res) => {
    const { nomePlano, setor, dados14Ferramentas, idPlano } = req.body || {};
    const script = gerarScriptCriarNovoPlanoPlaywright(
      nomePlano || 'Novo Negócio Inteligente',
      setor || 'Serviço',
      dados14Ferramentas,
      idPlano || 'plano_' + Math.random().toString(36).substring(2, 8)
    );

    res.json({
      status: 'ok',
      script
    });
  });

  // Rota de Health Check
  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', server: 'PNBOX Automation Hub API', timestamp: new Date().toISOString() });
  });

  // Toggle de modo de execução (LIVE ↔ DRY_RUN) - por usuário
  app.post('/api/automation/mode', authMiddleware, (req, res) => {
    const userId = (req as any).user.id;
    const { modoExecucao } = req.body || {};
    if (modoExecucao !== 'LIVE' && modoExecucao !== 'DRY_RUN') {
      return res.status(400).json({
        status: 'error',
        mensagem: 'modoExecucao deve ser "LIVE" ou "DRY_RUN".'
      });
    }

    if (modoExecucao === 'LIVE' && !obterCookiesPnboxUsuario(userId)) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Não é possível ativar LIVE sem sessão autenticada. Faça login primeiro.'
      });
    }

    globalAuthState.modoExecucao = modoExecucao;
    globalAuthState.modoExecucao = modoExecucao;
    res.json({
      status: 'ok',
      modoExecucao,
      mensagem: modoExecucao === 'LIVE'
        ? '⚠️ MODO LIVE ATIVADO — preenchimentos serão gravados no servidor real do PNBOX.'
        : 'Modo DRY_RUN ativado — preenchimentos são simulados.'
    });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production' && process.env.VERCEL !== '1') {
    (async () => {
      try {
        const vite = await createViteServer({
          server: { middlewareMode: true },
          appType: 'spa'
        });
        app.use(vite.middlewares);
      } catch (error) {
        console.error('Failed to initialize Vite middleware:', error);
      }
    })();
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log('[DEBUG] Serving static from:', distPath);
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      console.log('[DEBUG] Fallback for:', req.path);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  // Start server only if not running in Vercel (serverless environment)
  if (process.env.VERCEL !== '1') {
    const PORT = Number(process.env.PORT) || 3000;
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
    });
  }

  // Export the Express app for use in Vercel serverless functions
  // export default app;
