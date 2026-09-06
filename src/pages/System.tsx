import React, { useCallback, useEffect, useState } from 'react';
import { Activity, CheckCircle2, Cpu, Database, Settings, ShieldCheck, Wifi } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { AuthSessionCard } from '../components/AuthSessionCard';
import { AuthSessionState, InterceptedTrafficEvent } from '../types/pnbox';

export function SystemPage() {
  const { user, session } = useAuth();
  const accessToken = session?.accessToken ?? null;
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    status: 'idle',
    cpf: '',
    idPlano: '',
    modoExecucao: 'LIVE',
    logs: [],
  });
  const [trafficEvents, setTrafficEvents] = useState<InterceptedTrafficEvent[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);

  const loadAuthStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/automation/auth/status', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.session) setAuthSession(data.session);
    } catch (error) {
      console.warn('[System] falha ao consultar sessão PNBOX:', error);
    }
  }, [accessToken]);

  const loadTrafficEvents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/automation/traffic', {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data.eventos)) setTrafficEvents(data.eventos);
    } catch (error) {
      console.warn('[System] falha ao consultar tráfego PNBOX:', error);
    }
  }, [accessToken]);

  useEffect(() => {
    void loadAuthStatus();
    void loadTrafficEvents();
  }, [loadAuthStatus, loadTrafficEvents]);

  const handleLogin = async (cred: {
    cpf: string;
    password: string;
    idPlano: string;
    consentimentoAceito: boolean;
    modoExecucao: 'DRY_RUN' | 'LIVE';
  }) => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/automation/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...(accessToken ? { Authorization: `Bearer ${accessToken}` } : {}),
        },
        body: JSON.stringify({ ...cred, modoExecucao: 'LIVE' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.message || data.mensagem || 'Falha na autenticação PNBOX.');
      if (data.session) setAuthSession(data.session);
    } catch (error) {
      console.error('[System] autenticação PNBOX falhou:', error);
    } finally {
      setIsLoadingAuth(false);
      void loadTrafficEvents();
    }
  };

  const handleRefreshTraffic = () => {
    void loadTrafficEvents();
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-400" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 mt-1">Conta, sessão PNBOX e observabilidade da integração oficial.</p>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" /> Conta
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Nome</p>
            <p className="text-white font-medium mt-1">{user?.name || '—'}</p>
          </div>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Email</p>
            <p className="text-white font-medium mt-1">{user?.email || '—'}</p>
          </div>
          <div className="p-4 bg-slate-950 border border-slate-800 rounded-xl">
            <p className="text-xs text-slate-400">Sessão PNBOX</p>
            <p className="text-white font-medium mt-1">{authSession.status === 'authenticated' ? 'Autenticada' : 'Não autenticada'}</p>
          </div>
        </div>
      </div>

      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-cyan-400" /> Conexão PNBOX (Sebrae)
        </h2>
        <div className="mb-4 p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl text-sm text-indigo-100">
          A integração usa somente sessão real autenticada no PNBOX. Não há modo de simulação, plano local ou credencial fictícia nesta tela.
        </div>
        <AuthSessionCard
          authSession={{ ...authSession, modoExecucao: 'LIVE' }}
          onLogin={handleLogin}
          isLoading={isLoadingAuth}
          trafficEvents={trafficEvents}
          onRefreshTraffic={handleRefreshTraffic}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatusCard icon={Database} title="Fonte de dados" value="PNBOX oficial" />
        <StatusCard icon={Activity} title="Tráfego" value={`${trafficEvents.length} eventos observados`} />
        <StatusCard icon={Cpu} title="Execução" value="LIVE somente" />
      </div>
    </div>
  );
}

function StatusCard({ icon: Icon, title, value }: { icon: React.ComponentType<{ className?: string }>; title: string; value: string }) {
  return (
    <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5">
      <Icon className="w-5 h-5 text-indigo-400" />
      <p className="text-xs text-slate-400 mt-3">{title}</p>
      <div className="flex items-center gap-2 mt-1">
        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
        <p className="text-white font-semibold">{value}</p>
      </div>
    </div>
  );
}
