import React, { useEffect, useState } from 'react';
import { Activity, ExternalLink, Lock, Play, RefreshCw, ShieldAlert, ShieldCheck, User } from 'lucide-react';
import { AuthSessionState, InterceptedTrafficEvent } from '../types/pnbox';

interface AuthSessionCardProps {
  authSession: AuthSessionState;
  onLogin: (cred: { cpf: string; password: string; idPlano: string; consentimentoAceito: boolean; modoExecucao: 'DRY_RUN' | 'LIVE' }) => Promise<void>;
  isLoading: boolean;
  trafficEvents?: InterceptedTrafficEvent[];
  onRefreshTraffic?: () => void;
}

export const AuthSessionCard: React.FC<AuthSessionCardProps> = ({
  authSession,
  onLogin,
  isLoading,
  trafficEvents = [],
  onRefreshTraffic,
}) => {
  const [cpf, setCpf] = useState(authSession.cpf || '');
  const [password, setPassword] = useState('');
  const [idPlano, setIdPlano] = useState(authSession.idPlano || '');
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);

  useEffect(() => {
    setCpf(authSession.cpf || '');
    setIdPlano(authSession.idPlano || '');
  }, [authSession.cpf, authSession.idPlano]);

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();
    const plano = idPlano.trim();
    if (!cpf.trim() || !password || !plano || plano === ':idPlano' || plano.startsWith('plano_')) {
      alert('Informe CPF, senha e um ID real de plano retornado pelo PNBOX.');
      return;
    }
    if (!consentimentoAceito) {
      alert('É necessário aceitar o consentimento antes de continuar.');
      return;
    }
    void onLogin({ cpf: cpf.trim(), password, idPlano: plano, consentimentoAceito: true, modoExecucao: 'LIVE' });
  };

  const isAuth = authSession.status === 'authenticated' && !authSession.isExpired;
  const isExpired = authSession.isExpired || authSession.status === 'expired';

  return (
    <div className="space-y-5">
      <div className={`p-5 rounded-2xl border ${isAuth ? 'bg-emerald-950/20 border-emerald-500/30' : isExpired ? 'bg-amber-950/20 border-amber-500/30' : 'bg-slate-900 border-slate-800'}`}>
        <div className="flex items-start gap-3">
          {isAuth ? <ShieldCheck className="w-6 h-6 text-emerald-400 shrink-0" /> : <ShieldAlert className="w-6 h-6 text-amber-400 shrink-0" />}
          <div>
            <h3 className="font-bold text-white">Sessão PNBOX via OIDC + Playwright</h3>
            <p className="text-xs text-slate-400 mt-1">A autenticação cria uma sessão real e extrai o token Meteor necessário para o DDP. Não existe modo de simulação.</p>
            <p className="text-xs mt-2 font-semibold ${isAuth ? 'text-emerald-300' : 'text-amber-300'}">{isAuth ? 'Sessão autenticada' : isExpired ? 'Sessão expirada' : 'Sessão não autenticada'}</p>
          </div>
        </div>
      </div>

      {!isAuth && (
        <form onSubmit={handleSubmit} className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">CPF / Login Sebrae</label>
            <div className="relative">
              <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input value={cpf} onChange={(e) => setCpf(e.target.value)} autoComplete="username" className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">Senha</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
              <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white" />
            </div>
          </div>
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">ID real do plano PNBOX</label>
            <input value={idPlano} onChange={(e) => setIdPlano(e.target.value.trim())} placeholder="ID retornado pelo PNBOX" className="w-full px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono" />
          </div>
          <label className="flex items-start gap-2 text-xs text-slate-300">
            <input type="checkbox" checked={consentimentoAceito} onChange={(e) => setConsentimentoAceito(e.target.checked)} className="mt-0.5" />
            <span>Confirmo que sou o titular da conta PNBOX e autorizo a automação do meu próprio plano.</span>
          </label>
          <button type="submit" disabled={isLoading || !consentimentoAceito} className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl font-semibold flex items-center justify-center gap-2">
            {isLoading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Play className="w-4 h-4" />}
            {isLoading ? 'Autenticando no PNBOX...' : 'Autenticar no PNBOX'}
          </button>
        </form>
      )}

      {isAuth && (
        <div className="p-5 bg-emerald-950/20 border border-emerald-500/30 rounded-2xl">
          <p className="text-sm text-white font-semibold">Plano autenticado</p>
          <p className="text-xs text-slate-400 mt-1 font-mono">{authSession.idPlano}</p>
          <a href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${authSession.idPlano}`} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-2 mt-3 text-xs text-indigo-300 hover:text-indigo-200">
            Abrir plano no PNBOX <ExternalLink className="w-3 h-3" />
          </a>
        </div>
      )}

      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
        <div className="flex items-center justify-between mb-3">
          <h4 className="font-semibold text-white flex items-center gap-2"><Activity className="w-4 h-4 text-indigo-400" /> Tráfego DDP observado</h4>
          {onRefreshTraffic && <button onClick={onRefreshTraffic} className="text-xs text-slate-400 hover:text-white flex items-center gap-1"><RefreshCw className="w-3 h-3" /> Atualizar</button>}
        </div>
        <p className="text-xs text-slate-500 mb-3">Somente eventos realmente observados na sessão. Nenhum evento é fabricado.</p>
        {trafficEvents.length === 0 ? <p className="text-xs text-slate-500">Nenhum evento observado.</p> : <div className="space-y-2 max-h-72 overflow-y-auto">{trafficEvents.slice(0, 50).map((event, index) => <div key={event.id || `${event.timestamp}-${index}`} className="p-3 bg-slate-950 border border-slate-800 rounded-xl"><p className="text-xs text-slate-300 font-mono truncate">{event.metodo} {event.url}</p><p className="text-[11px] text-slate-500 mt-1">{event.timestamp}</p></div>)}</div>}
      </div>
    </div>
  );
};
