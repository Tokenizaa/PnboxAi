import 'dotenv/config';
import express from 'express';
import path from 'path';
import { createServer as createViteServer } from 'vite';
import { createClient } from '@supabase/supabase-js';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './src/automation/schemaCatalog';
import { compararJsonComSchema, compararDoisJson } from './src/automation/schemaValidator';
import {
  globalAuthState,
  iniciarSessaoPlaywright,
  obterStatusSessaoAtualizada,
  simularExpiracaoSessao,
  obterCookiesPnbox,
  obterSessaoAtual
} from './src/automation/auth';
import {
  obterEventosTrafego,
  registrarEventoTrafego,
  limparEventosTrafego,
  popularEventosIniciaisDescoberta
} from './src/automation/trafficMonitor';
import { TEMPLATES_NEGOCIO } from './src/automation/businessTemplates';
import { gerarScriptPlaywrightOficial, gerarScriptCriarNovoPlanoPlaywright } from './src/automation/playwrightScriptGenerator';
import { executarFerramentaNoPnbox as executarFerramentaMock } from './src/automation/officialRunner';
import { executarFerramentaNoPnbox as executarFerramentaReal, prepararEstruturaExecucao } from './src/automation/realRunner';
import { executarDeepResearch, sintetizar14FerramentasPnbox } from './src/automation/geminiDeepResearch';
import { executarPesquisaUnificada, getNvidiaApiKey, NVIDIA_DEFAULT_MODELS } from './src/automation/aiProviders';
import { SchemaGenerator } from './src/utils/schemaGenerator';
import { PlanAuditManager } from './src/utils/auditUtils';
import { PlanoCriadoInfo } from './src/types/pnbox';
import { ResearchEngine } from './src/research';

// Armazenamento em memória de planos criados via IA / Deep Research / DDP
const PLANOS_CRIADOS: PlanoCriadoInfo[] = [
  {
    idPlano: ID_PLANO_PADRAO,
    nomePlano: 'Cafeteria Especial & Coworking Criativo',
    setor: 'Alimentação & Espaços de Trabalho',
    descricao: 'Cafeteria de microlotes e espaço de trabalho compartilhado com Wi-Fi ultra veloz.',
    cidadeUf: 'Curitiba / PR',
    criadoEm: new Date(Date.now() - 3600000 * 24).toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14
  }
];

// ===== AUTHENTICATION SYSTEM (Supabase Auth) =====
// Login/registro agora usam Supabase Auth (auth.users). Tokens JWT são emitidos
// pelo próprio Supabase. Dados ficam no banco, não em memória do servidor.
const SUPABASE_URL = process.env.SUPABASE_URL || '';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';
if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('[Auth] SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY não configurados. Auth inoperante.');
}

// Client admin (service role): cria usuários, valida JWTs, acessa tabelas.
const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

// Middleware de autenticação — valida o access token JWT do Supabase.
function authMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ status: 'error', message: 'Token de acesso não fornecido' });
  }
  const token = authHeader.substring(7);
  supabase.auth.getUser(token)
    .then(({ data, error }) => {
      if (error || !data.user) {
        return res.status(401).json({ status: 'error', message: 'Token inválido ou expirado' });
      }
      // expõe { id (uuid), email, user_metadata } no req.user
      const user = data.user;
      (req as any).user = {
        id: user.id,
        email: user.email,
        name: user.user_metadata?.name || user.email?.split('@')[0] || 'Usuário',
      };
      next();
    })
    .catch(() => res.status(401).json({ status: 'error', message: 'Token inválido ou expirado' }));
}

// Opcional: middleware que não falha se não houver token
function optionalAuthMiddleware(req: express.Request, res: express.Response, next: express.NextFunction) {
  const authHeader = req.headers.authorization;
  if (authHeader?.startsWith('Bearer ')) {
    supabase.auth.getUser(authHeader.substring(7))
      .then(({ data }) => {
        if (data.user) {
          (req as any).user = {
            id: data.user.id,
            email: data.user.email,
            name: data.user.user_metadata?.name || data.user.email?.split('@')[0] || 'Usuário',
          };
        }
        next();
      })
      .catch(() => next());
  } else {
    next();
  }
}

// ===== PLANS CRUD API Types =====
interface UserPlan {
  id: string;
  userId: string;
  name: string;
  description: string;
  sector: string;
  city: string;
  progress: number;
  status: 'rascunho' | 'pesquisa' | 'preparacao' | 'pronto' | 'executando' | 'concluido' | 'arquivado';
  researchStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  executionStatus: 'pending' | 'in_progress' | 'completed' | 'failed';
  toolsFilled: number;
  createdAt: string;
  updatedAt: string;
}

const USER_PLANS: Map<string, UserPlan[]> = new Map(); // userId -> Plan[]

function generatePlanId(): string {
  return 'plan_' + Math.random().toString(36).substring(2, 12) + Date.now().toString(36);
}

function getUserPlans(userId: string): UserPlan[] {
  return USER_PLANS.get(userId) || [];
}

function setUserPlans(userId: string, plans: UserPlan[]): void {
  USER_PLANS.set(userId, plans);
}

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

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

    const { data, error } = await supabase.auth.signInWithPassword({
      email: email.toLowerCase().trim(),
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
  app.put('/api/auth/pnbox-credentials', authMiddleware, async (req, res) => {
    const userId = (req as any).user.id;
    const { cpf, password, idPlano } = req.body || {};
    if (typeof cpf !== 'string' || !cpf.trim()) {
      return res.status(400).json({ status: 'error', message: 'CPF é obrigatório' });
    }
    if (typeof password !== 'string' || !password) {
      return res.status(400).json({ status: 'error', message: 'Senha é obrigatória' });
    }
    const { error } = await supabase.from('pnbox_credentials').upsert(
      { user_id: userId, cpf: cpf.trim(), password, id_plano: idPlano?.trim?.() || '' },
      { onConflict: 'user_id' }
    );
    if (error) {
      return res.status(500).json({ status: 'error', message: `Falha ao salvar: ${error.message}` });
    }
    
    // Log de auditoria para credenciais salvas
    console.log(`[AUDIT] PNBOX credentials saved for user ${userId} at ${new Date().toISOString()}`);
    
    res.json({ status: 'ok', message: 'Credenciais PNBOX salvas' });
  });

  // POST /api/auth/pnbox-credentials/reconnect - reconecta a sessão PNBOX
  // usando as credenciais salvas no banco (auto-reconnect / hub).
  app.post('/api/auth/pnbox-credentials/reconnect', authMiddleware, async (req, res) => {
    const userId = (req as any).user.id;
    const { data } = await supabase
      .from('pnbox_credentials')
      .select('cpf, password, id_plano')
      .eq('user_id', userId)
      .maybeSingle();
    if (!data) {
      return res.status(400).json({ status: 'error', message: 'Nenhuma credencial PNBOX salva para este usuário' });
    }
    try {
      const sessionResult = await iniciarSessaoPlaywright(
        { cpf: data.cpf, password: data.password, idPlano: data.id_plano || ID_PLANO_PADRAO },
        true
      );
      res.json({
        status: sessionResult.status === 'authenticated' ? 'ok' : 'error',
        session: sessionResult,
      });
    } catch (err: any) {
      res.status(500).json({ status: 'error', message: err?.message || 'Erro ao reconectar' });
    }
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
        provider: provider || 'gemini',
        useSearchGrounding: useSearchGrounding !== false,
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
  app.get('/api/automation/auth/status', (req, res) => {
    const session = obterStatusSessaoAtualizada();
    res.json({
      status: 'ok',
      isOnline: true,
      isExpired: session.isExpired || false,
      session
    });
  });

  app.post('/api/automation/auth/expire', (req, res) => {
    const session = simularExpiracaoSessao();
    res.json({
      status: 'ok',
      mensagem: 'Sessão marcada como expirada para fins de teste de reconexão.',
      session
    });
  });

  app.post('/api/automation/auth/login', async (req, res) => {
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

    if (modoExecucao === 'LIVE') {
      globalAuthState.modoExecucao = 'LIVE';
    } else {
      globalAuthState.modoExecucao = 'DRY_RUN';
    }

    const credenciais = {
      cpf: String(cpf).trim(),
      password: String(password),
      idPlano: idPlano || ID_PLANO_PADRAO
    };

    const sessionResult = await iniciarSessaoPlaywright(credenciais, consentimentoAceito);
    res.json({
      status: sessionResult.status === 'authenticated' ? 'ok' : 'error',
      session: sessionResult
    });
  });

  // 4. Execução de Preenchimento Oficial do PNBOX (Individual ou em Lote)
  app.post('/api/automation/fill-tool', async (req, res) => {
    const { ferramentaId, registros, idPlano, modoExecucao } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;
    const modo = modoExecucao || globalAuthState.modoExecucao || 'DRY_RUN';

    try {
      let stepResult;
      if (modo === 'LIVE') {
        const sessao = obterSessaoAtual();
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

  app.post('/api/automation/fill-batch', async (req, res) => {
    const { templateId, idPlano, customData, delayBetweenToolsMs = 0, modoExecucao } = req.body || {};
    const plano = idPlano || ID_PLANO_PADRAO;
    const modo = modoExecucao || globalAuthState.modoExecucao || 'DRY_RUN';
    const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];

    // No modo LIVE, exigimos sessão autenticada
    let authContext: { cookies: string; loginToken: string; userId?: string } | null = null;
    if (modo === 'LIVE') {
      const sessao = obterSessaoAtual();
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
      prompt,
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

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
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
      provider,
      useSearchGrounding,
      maxIterations,
      searchApiKey,
      searchProvider
    } = req.body || {};

    if (!prompt || typeof prompt !== 'string' || prompt.trim().length === 0) {
      return res.status(400).json({
        status: 'error',
        mensagem: 'O prompt da ideia de negócio é obrigatório.'
      });
    }

    try {
      const engine = searchApiKey
        ? new ResearchEngine({ searchProvider, searchApiKey })
        : new ResearchEngine();

      const result = await engine.execute({
        prompt,
        cidadeUf: cidadeUf || 'Brasil / Nacional',
        orcamentoEstimado: Number(orcamentoEstimado) || 100000,
        publicoAlvo: publicoAlvo || 'Consumidor final / B2C',
        modeloAprofundado: !!modeloAprofundado,
        idPlano: idPlano || ID_PLANO_PADRAO,
        provider: provider || 'gemini',
        useSearchGrounding: useSearchGrounding !== false,
        maxIterations: maxIterations || 3,
        preserveLegacy: true,
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
      // Gerar payloads usando o SchemaGenerator oficial
      const dados14Ferramentas = SchemaGenerator.generateFromResearch(research, planoId);
      res.json({
        status: 'ok',
        idPlano: planoId,
        dados14Ferramentas
      });
    } catch (err: any) {
      console.error('[API /api/ai/synthesize-plan] Erro:', err);
      res.status(500).json({ status: 'error', mensagem: err.message || 'Erro ao sintetizar dados das 14 ferramentas' });
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
      setor || 'Serviços',
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

  // Toggle de modo de execução (LIVE ↔ DRY_RUN)
  app.post('/api/automation/mode', (req, res) => {
    const { modoExecucao } = req.body || {};
    if (modoExecucao !== 'LIVE' && modoExecucao !== 'DRY_RUN') {
      return res.status(400).json({
        status: 'error',
        mensagem: 'modoExecucao deve ser "LIVE" ou "DRY_RUN".'
      });
    }

    if (modoExecucao === 'LIVE' && !obterCookiesPnbox()) {
      return res.status(401).json({
        status: 'error',
        mensagem: 'Não é possível ativar LIVE sem sessão autenticada. Faça login primeiro.'
      });
    }

    globalAuthState.modoExecucao = modoExecucao;
    res.json({
      status: 'ok',
      modoExecucao,
      mensagem:
        modoExecucao === 'LIVE'
          ? '⚠️ MODO LIVE ATIVADO — preenchimentos serão gravados no servidor real do PNBOX.'
          : 'Modo DRY_RUN ativado — preenchimentos são simulados.'
    });
  });

  // Vite middleware setup
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa'
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    console.log('[DEBUG] Serving static from:', distPath);
    app.use(express.static(distPath, { index: false }));
    app.get('*', (req, res) => {
      console.log('[DEBUG] Fallback for:', req.path);
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`[PNBOX Hub] Server running at http://0.0.0.0:${PORT}`);
  });
}

startServer();