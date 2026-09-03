import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  Mail,
  Lock,
  User,
  Eye,
  EyeOff,
  AlertCircle,
  CheckCircle2,
  Loader2,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export function RegisterPage() {
  const navigate = useNavigate();
  const { register, isLoading, error, clearError } = useAuth();

  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const validateForm = (): boolean => {
    if (!name.trim()) {
      setLocalError('Nome é obrigatório');
      return false;
    }
    if (name.trim().length < 2) {
      setLocalError('Nome deve ter pelo menos 2 caracteres');
      return false;
    }
    if (!email.trim()) {
      setLocalError('Email é obrigatório');
      return false;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setLocalError('Email inválido');
      return false;
    }
    if (!password) {
      setLocalError('Senha é obrigatória');
      return false;
    }
    if (password.length < 6) {
      setLocalError('Senha deve ter pelo menos 6 caracteres');
      return false;
    }
    if (password !== confirmPassword) {
      setLocalError('As senhas não conferem');
      return false;
    }
    setLocalError(null);
    return true;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!validateForm()) return;

    try {
      await register({ name: name.trim(), email: email.trim(), password, confirmPassword });
      navigate('/', { replace: true });
    } catch {
      // Error handled by auth context
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl">
        {/* Header */}
        <div className="text-center mb-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 flex items-center justify-center text-white shadow-lg shadow-emerald-500/20">
            <User className="w-8 h-8" />
          </div>
          <h1 className="text-2xl font-bold text-white">Criar Conta no PNBOXAI</h1>
          <p className="text-slate-400 mt-1">Comece a gerenciar seus planos de negócio</p>
        </div>

        {/* Error Display */}
        {(error || localError) && (
          <div
            className="mb-6 p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl flex items-start gap-3 text-rose-300 text-sm animate-in shake-x"
            role="alert"
          >
            <AlertCircle className="w-5 h-5 mt-0.5 flex-shrink-0" />
            <span>{localError || error}</span>
            <button
              onClick={clearError}
              className="ml-auto text-rose-400 hover:text-rose-200"
              aria-label="Fechar erro"
            >
              ✕
            </button>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          {/* Name */}
          <div className="space-y-1.5">
            <label htmlFor="name" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <User className="w-3.5 h-3.5 text-emerald-400" />
              Nome completo
            </label>
            <input
              id="name"
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onBlur={() => validateForm() && name && setLocalError(null)}
              placeholder="João da Silva"
              disabled={isLoading}
              autoComplete="name"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Email */}
          <div className="space-y-1.5">
            <label htmlFor="email" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Mail className="w-3.5 h-3.5 text-emerald-400" />
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              onBlur={() => validateForm() && email && setLocalError(null)}
              placeholder="seu@email.com"
              disabled={isLoading}
              autoComplete="email"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Password */}
          <div className="space-y-1.5">
            <label htmlFor="password" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Senha
            </label>
            <div className="relative">
              <input
                id="password"
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onBlur={() => validateForm() && password && setLocalError(null)}
                placeholder="••••••••"
                disabled={isLoading}
                autoComplete="new-password"
                className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50 pr-12"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white transition-colors"
                aria-label={showPassword ? 'Ocultar senha' : 'Mostrar senha'}
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
          </div>

          {/* Confirm Password */}
          <div className="space-y-1.5">
            <label htmlFor="confirmPassword" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-emerald-400" />
              Confirmar senha
            </label>
            <input
              id="confirmPassword"
              type={showPassword ? 'text' : 'password'}
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              onBlur={() => validateForm() && confirmPassword && setLocalError(null)}
              placeholder="••••••••"
              disabled={isLoading}
              autoComplete="new-password"
              className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
            />
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Criando conta...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-5 h-5" />
                <span>Criar conta</span>
              </>
            )}
          </button>
        </form>

        {/* Footer */}
        <div className="mt-6 text-center">
          <p className="text-sm text-slate-400">
            Já tem conta?{' '}
            <Link to="/login" className="text-emerald-400 hover:text-emerald-300 font-semibold transition-colors">
              Entrar
            </Link>
          </p>
        </div>

        {/* Terms hint */}
        <div className="mt-4 p-3 bg-slate-950/50 border border-slate-800 rounded-xl text-xs text-slate-500 text-center">
          Ao criar uma conta, você concorda com nossos <Link to="/termos" className="text-emerald-400 hover:underline">Termos de Uso</Link> e <Link to="/privacidade" className="text-emerald-400 hover:underline">Política de Privacidade</Link>.
        </div>
      </div>
    </div>
  );
}