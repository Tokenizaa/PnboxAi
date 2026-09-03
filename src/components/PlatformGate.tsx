import React, { useState, useCallback, useEffect, ReactNode } from 'react';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  Loader2,
  LogOut,
} from 'lucide-react';

// Sessão da plataforma (Supabase Auth via /api/auth/*), guardada em sessionStorage.
const SESSION_KEY = 'pnboxai_platform_session';

export interface PlatformUser {
  id: string;
  email: string;
  name: string;
}

export interface PlatformSession {
  user: PlatformUser;
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
}

function loadSession(): PlatformSession | null {
  try {
    const raw = sessionStorage.getItem(SESSION_KEY);
    return raw ? (JSON.parse(raw) as PlatformSession) : null;
  } catch {
    return null;
  }
}

function saveSession(s: PlatformSession) {
  try {
    sessionStorage.setItem(SESSION_KEY, JSON.stringify(s));
  } catch {
    // ignore
  }
}

function clearSession() {
  try {
    sessionStorage.removeItem(SESSION_KEY);
  } catch {
    // ignore
  }
}

// Exposto para o hub obter o token/sessão da plataforma.
export function getPlatformSession(): PlatformSession | null {
  return loadSession();
}

interface PlatformGateProps {
  children: ReactNode;
}

export function PlatformGate({ children }: PlatformGateProps) {
  const [session, setSession] = useState<PlatformSession | null>(() => loadSession());
  const [mode, setMode] = useState<'login' | 'register'>('login');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Login/register
  const nameField = mode === 'register';
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    if (!email.trim() || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('Email inválido');
      return;
    }
    if (password.length < 6) {
      setError('Senha deve ter pelo menos 6 caracteres');
      return;
    }
    if (mode === 'register') {
      if (!name.trim()) {
        setError('Nome é obrigatório');
        return;
      }
      if (password !== confirm) {
        setError('As senhas não conferem');
        return;
      }
    }
    setLoading(true);
    try {
      const res = await fetch(mode === 'login' ? '/api/auth/login' : '/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(
          mode === 'login'
            ? { email: email.trim(), password }
            : { name: name.trim(), email: email.trim(), password, confirmPassword: confirm }
        ),
      });
      const data = await res.json();
      if (!res.ok) {
        setError(data.mensagem || data.message || `HTTP ${res.status}`);
        return;
      }
      if (!data.accessToken) {
        setError('Conta criada. Faça login para continuar.');
        setMode('login');
        setPassword('');
        setConfirm('');
        return;
      }
      const s: PlatformSession = {
        user: { id: data.user.id, email: data.user.email, name: data.user.name },
        accessToken: data.accessToken,
        refreshToken: data.refreshToken,
        expiresIn: data.expiresIn || 3600,
      };
      saveSession(s);
      setSession(s);
    } catch (err: any) {
      setError(err?.message || 'Falha de conexão');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = useCallback(() => {
    clearSession();
    setSession(null);
    setPassword('');
    setConfirm('');
  }, []);

  // Auto-logout quando o token expira
  useEffect(() => {
    if (!session) return;
    const timer = setTimeout(() => {
      handleLogout();
    }, (session.expiresIn - 60) * 1000);
    return () => clearTimeout(timer);
  }, [session, handleLogout]);

  if (!session) {
    return <AuthScreen {...{ mode, setMode, name, setName, email, setEmail, password, setPassword, confirm, setConfirm, showPassword, setShowPassword, error, loading, handleSubmit, clearError: () => setError(null) }} />;
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Barra superior com sessão da plataforma */}
      <div className="bg-slate-900 border-b border-slate-800 px-4 py-2 flex items-center justify-between text-sm">
        <div className="flex items-center gap-2 text-slate-300">
          <User className="w-4 h-4 text-indigo-400" />
          <span className="font-medium">{session.user.name}</span>
          <span className="text-slate-500">· {session.user.email}</span>
        </div>
        <button
          onClick={handleLogout}
          className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <LogOut className="w-4 h-4" />
          Sair
        </button>
      </div>
      <div className="flex-1">{children}</div>
    </div>
  );
}

interface AuthScreenProps {
  mode: 'login' | 'register';
  setMode: (m: 'login' | 'register') => void;
  name: string;
  setName: (v: string) => void;
  email: string;
  setEmail: (v: string) => void;
  password: string;
  setPassword: (v: string) => void;
  confirm: string;
  setConfirm: (v: string) => void;
  showPassword: boolean;
  setShowPassword: (v: boolean) => void;
  error: string | null;
  loading: boolean;
  handleSubmit: (e: React.FormEvent) => void;
  clearError: () => void;
}

function AuthScreen(p: AuthScreenProps) {
  const toggleMode = () => {
    p.setMode(p.mode === 'login' ? 'register' : 'login');
    p.clearError();
  };
  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20">
            <Lock className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">
            {p.mode === 'login' ? 'Entrar no PNBOX AI' : 'Criar conta'}
          </h1>
          <p className="text-slate-400 mt-1">Acesso à plataforma de automação do Plano de Negócio</p>
        </div>

        {p.error && (
          <div className="mb-6 p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm" role="alert">
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{p.error}</span>
          </div>
        )}

        <form onSubmit={p.handleSubmit} className="space-y-5" noValidate>
          {p.mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <User className="w-3.5 h-3.5 text-indigo-400" />
                Nome
              </label>
              <input
                type="text"
                value={p.name}
                onChange={(e) => p.setName(e.target.value)}
                placeholder="Seu nome"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
            </div>
          )}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-indigo-400" />
              Email
            </label>
            <input
              type="email"
              value={p.email}
              onChange={(e) => p.setEmail(e.target.value)}
              placeholder="seu@email.com"
              className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
            />
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-indigo-400" />
              Senha
            </label>
            <div className="relative">
              <input
                type={p.showPassword ? 'text' : 'password'}
                value={p.password}
                onChange={(e) => p.setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50 pr-12"
              />
              <button
                type="button"
                onClick={() => p.setShowPassword(!p.showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label="Mostrar/ocultar senha"
              >
                {p.showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>
          {p.mode === 'register' && (
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                <Lock className="w-3.5 h-3.5 text-indigo-400" />
                Confirmar senha
              </label>
              <input
                type={p.showPassword ? 'text' : 'password'}
                value={p.confirm}
                onChange={(e) => p.setConfirm(e.target.value)}
                placeholder="••••••••"
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
              />
            </div>
          )}
          <button
            type="submit"
            disabled={p.loading}
            className="w-full py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {p.loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <span>{p.mode === 'login' ? 'Entrar' : 'Criar conta'}</span>
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={toggleMode}
            className="text-sm text-indigo-400 hover:text-indigo-300 font-semibold transition-colors"
          >
            {p.mode === 'login' ? 'Não tem conta? Criar conta gratuita' : 'Já tem conta? Entrar'}
          </button>
        </div>
      </div>
    </div>
  );
}
