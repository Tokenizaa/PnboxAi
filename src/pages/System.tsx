import React, { useState, useEffect, useCallback } from 'react';
import {
  Settings,
  ShieldCheck,
  Cpu,
  Activity,
  Database,
  Wifi,
  WifiOff,
  KeyRound,
  Sparkles,
  RefreshCw,
  AlertCircle,
  CheckCircle2,
  UserPlus,
  LogIn,
  Lock,
  Check,
  X,
  Info,
} from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';
import { getEncryptedPnboxCredentials, saveEncryptedPnboxCredentials, clearEncryptedPnboxCredentials, SecurePnboxCredentials } from '../utils/secureStorage';
import { AuthSessionCard } from '../components/AuthSessionCard';
import { AuthSessionState, InterceptedTrafficEvent } from '../types/pnbox';
import { extrairIdPlano } from '../utils/planUtils';

export function SystemPage() {
  const { user, session } = useAuth();
  const accessToken = session?.accessToken ?? null;
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    status: 'idle',
    cpf: '',
    idPlano: '',
    modoExecucao: 'DRY_RUN',
    logs: []
  });
  const [trafficEvents, setTrafficEvents] = useState<InterceptedTrafficEvent[]>([]);
  const [isLoadingAuth, setIsLoadingAuth] = useState(false);
  const [savedCredentials, setSavedCredentials] = useState<SecurePnboxCredentials | null>(null);
  const [saveStatus, setSaveStatus] = useState({ message: '', type: '' }); // type: 'success' | 'error'

  // Load saved credentials from localStorage (client-side) on mount
  useEffect(() => {
    const loadSavedCredentials = async () => {
      try {
        const creds = await getEncryptedPnboxCredentials();
        if (creds) {
          setSavedCredentials(creds);
        }
      } catch (error) {
        console.error('Failed to load saved credentials:', error);
      }
    };
    loadSavedCredentials();
  }, []);

  // Load auth status from server (user's PNBOX session)
  const loadAuthStatus = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/automation/auth/status', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.session) {
          setAuthSession(data.session);
        }
      }
    } catch (err) {
      console.warn('Failed to load auth status:', err);
    }
  }, [accessToken]);

  // Load traffic events from server
  const loadTrafficEvents = useCallback(async () => {
    if (!accessToken) return;
    try {
      const res = await fetch('/api/automation/traffic', {
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      if (res.ok) {
        const data = await res.json();
        if (data.eventos) {
          setTrafficEvents(data.eventos);
        }
      }
    } catch (err) {
      console.warn('Failed to load traffic events:', err);
    }
  }, [accessToken]);

  useEffect(() => {
    loadAuthStatus();
    loadTrafficEvents();
  }, [loadAuthStatus, loadTrafficEvents]);

  // Handle login/authentication via AuthSessionCard
  const handleLogin = async (cred: { cpf: string; password: string; idPlano: string; consentimentoAceito: boolean; modoExecucao: 'DRY_RUN' | 'LIVE' }) => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/automation/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify(cred)
      });
      const data = await res.json();
      if (data.session) {
        setAuthSession(data.session);
      }
      if (data.mensagem) {
        // Could show toast here
        console.log(data.mensagem);
      }
    } catch (err) {
      console.error('Login failed:', err);
    } finally {
      setIsLoadingAuth(false);
      loadTrafficEvents();
    }
  };

  // Save credentials to DATABASE (server-side, encrypted at rest)
  const handleSaveCredentialsToDb = async () => {
    const creds = authSession;
    if (!creds.cpf || !creds.idPlano) {
      setSaveStatus({
        message: 'Faça login primeiro para obter as credenciais da sessão ativa',
        type: 'error'
      });
      return;
    }

    // We need the password - but it's not in authSession for security
    // The user must have entered it in AuthSessionCard which saves to localStorage
    // We'll read from localStorage and send to server
    const localCreds = await getEncryptedPnboxCredentials();
    if (!localCreds?.password) {
      setSaveStatus({
        message: 'Senha não encontrada no armazenamento local. Preencha as credenciais acima e clique em "Salvar & Reautenticar" primeiro.',
        type: 'error'
      });
      return;
    }

    setSaveStatus({ message: 'Salvando credenciais no banco de dados...', type: '' });

    try {
      const res = await fetch('/api/auth/pnbox-credentials', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${accessToken}`
        },
        body: JSON.stringify({
          cpf: localCreds.cpf,
          password: localCreds.password,
          idPlano: localCreds.idPlano
        })
      });
      const data = await res.json();
      if (res.ok) {
        setSaveStatus({
          message: 'Credenciais salvas com sucesso no banco (criptografadas). Auto-reconnect habilitado.',
          type: 'success'
        });
      } else {
        setSaveStatus({
          message: data.message || 'Falha ao salvar no banco',
          type: 'error'
        });
      }
    } catch (err) {
      console.error('Error saving to DB:', err);
      setSaveStatus({
        message: 'Erro ao salvar no banco de dados',
        type: 'error'
      });
    }
  };

  // Clear credentials from DATABASE
  const handleClearCredentialsFromDb = async () => {
    setSaveStatus({ message: 'Removendo credenciais do banco...', type: '' });
    try {
      const res = await fetch('/api/auth/pnbox-credentials', {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${accessToken}` }
      });
      // Note: DELETE endpoint not implemented yet, but we can clear local
      await clearEncryptedPnboxCredentials();
      setSavedCredentials(null);
      setSaveStatus({
        message: 'Credenciais locais removidas. (Remoção do banco requer endpoint DELETE)',
        type: 'success'
      });
    } catch (err) {
      console.error('Error clearing from DB:', err);
      setSaveStatus({
        message: 'Erro ao remover credenciais',
        type: 'error'
      });
    }
  };

  // Refresh traffic events
  const handleRefreshTraffic = () => {
    loadTrafficEvents();
  };

  // Update active plan ID
  const handleUpdateActivePlanId = (novoId: string) => {
    const idExtraido = extrairIdPlano(novoId);
    setAuthSession(prev => ({
      ...prev,
      idPlano: idExtraido,
      logs: [
        {
          timestamp: new Date().toISOString(),
          mensagem: `Plano ativo definido para ${idExtraido}`,
          level: 'info'
        },
        ...prev.logs
      ]
    }));
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <Settings className="w-7 h-7 text-slate-400" />
          Configurações do Sistema
        </h1>
        <p className="text-slate-400 mt-1">Gerencie conta, sessão PNBOX, IA providers e integrações técnicas</p>
      </div>

      {/* Account Info */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-emerald-400" />
          Conta
        </h2>
        <div className="space-y-3">
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">Nome</p>
              <p className="text-white font-medium">{user?.name}</p>
            </div>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">Email</p>
              <p className="text-white font-medium">{user?.email}</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
              Verificado
            </span>
          </div>
          <div className="flex items-center justify-between p-3 bg-slate-950 border border-slate-800 rounded-xl">
            <div>
              <p className="text-xs text-slate-400">ID da Conta</p>
              <p className="text-white font-mono text-xs">{user?.id}</p>
            </div>
          </div>
        </div>
      </div>

      {/* PNBOX Session - usando AuthSessionCard completo */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Wifi className="w-5 h-5 text-cyan-400" />
          Conexão PNBOX (Sebrae)
        </h2>

        {/* Database credential status */}
        {savedCredentials ? (
          <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-start gap-3 mb-4">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-emerald-300">Credenciais Salvas Localmente (AES-GCM)</p>
              <p className="text-xs text-emerald-200/80 mt-1">
                CPF: {savedCredentials.cpf.replace(/(\d{3})(\d{3})(\d{3})(\d{2})/, '$1.$2.$3-$4')}| 
                ID Plano: {savedCredentials.idPlano}
              </p>
              <p className="text-xs text-emerald-200/80 mt-1">
                Salvo em: {new Date(savedCredentials.salvoEm || 0).toLocaleString()}
              </p>
            </div>
          </div>
        ) : (
          <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-3 mb-4">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-sm">
              <p className="font-bold text-amber-300">Nenhuma Credencial Local</p>
              <p className="text-xs text-amber-200/80 mt-1">
                Preencha o formulário abaixo e clique em "Salvar & Reautenticar" para armazenar localmente.
              </p>
            </div>
          </div>
        )}

        {/* Botão para salvar no banco (separado do localStorage) */}
        <div className="mb-4 flex items-center gap-3">
          <button
            onClick={handleSaveCredentialsToDb}
            disabled={isLoadingAuth || !authSession.cpf || !authSession.idPlano}
            className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-lg text-sm font-bold flex items-center gap-2"
          >
            <Database className="w-4 h-4" />
            <span>Salvar Credenciais no Banco (Criptografado)</span>
          </button>
          <button
            onClick={handleClearCredentialsFromDb}
            disabled={isLoadingAuth || !savedCredentials}
            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-slate-300 rounded-lg text-sm font-medium flex items-center gap-2"
          >
            <X className="w-4 h-4" />
            <span>Limpar Locais</span>
          </button>
        </div>

        {/* Save Status Message */}
        {saveStatus.message && (
          <div className={`mb-4 p-3 rounded-md text-sm flex items-start gap-3 ${saveStatus.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30' : saveStatus.type === 'error' ? 'bg-amber-950/30 border border-amber-500/30' : 'bg-slate-950 border border-slate-800'}`}>
            {saveStatus.type === 'success' ? (
              <Check className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
            ) : saveStatus.type === 'error' ? (
              <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
            ) : (
              <Info className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
            )}
            <div>
              <p className="font-medium text-white">{saveStatus.message}</p>
            </div>
          </div>
        )}

        {/* AuthSessionCard - componente completo de credenciais e sessão */}
        <AuthSessionCard
          authSession={authSession}
          onLogin={handleLogin}
          isLoading={isLoadingAuth}
          trafficEvents={trafficEvents}
          onRefreshTraffic={handleRefreshTraffic}
        />

        <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-start gap-3 mb-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="text-sm">
            <p className="font-bold text-amber-300">Sessão Independente</p>
            <p className="text-xs text-amber-200/80 mt-1">
              A sessão PNBOX é independente da conta do PNBOXAI. Você pode usar DRY_RUN sem autenticar.
            </p>
          </div>
        </div>
      </div>

      {/* AI Providers */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Cpu className="w-5 h-5 text-indigo-400" />
          Provedores de IA
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
          {/* Gemini */}
          <ProviderCard
            name="Google Gemini"
            model="gemini-3.7-flash"
            available={true}
            hasGrounding={true}
            color="indigo"
          />

          {/* NVIDIA */}
          <ProviderCard
            name="NVIDIA NIM"
            model="3 contas disponíveis"
            available={true}
            color="emerald"
          />
        </div>
      </div>

      {/* Technical Tools */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Database className="w-5 h-5 text-slate-400" />
          Ferramentas Técnicas
        </h2>
        <p className="text-sm text-slate-400 mb-3">
          Acesso às ferramentas técnicas avançadas: mapa técnico, monitor de tráfego, validador JSON e documentação.
        </p>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <TechTool name="Mapa Técnico" description="Catálogo das 14 ferramentas" />
          <TechTool name="Monitor de Tráfego" description="Requests XHR/WS DDP" />
          <TechTool name="Validador JSON" description="Diff com schema" />
          <TechTool name="Documentação" description="Guia de campos" />
        </div>
      </div>

      {/* Schema Catalog Info */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <Sparkles className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Schema Catalog como Single Source of Truth</p>
          <p className="text-xs text-slate-400 mt-1">
            Todos os schemas das 14 ferramentas PNBOX vêm de <code className="px-1 py-0.5 bg-slate-950 rounded font-mono text-xs">schemaCatalog.ts</code>. Nenhuma duplicação em Research Engine ou Prompts.
          </p>
        </div>
      </div>
    </div>
  );
}

function ProviderCard({
  name,
  model,
  available,
  hasGrounding,
  color,
}: {
  name: string;
  model: string;
  available: boolean;
  hasGrounding?: boolean;
  color: 'indigo' | 'emerald';
}) {
  const colors = {
    indigo: 'border-indigo-500/20 bg-indigo-500/10',
    emerald: 'border-emerald-500/20 bg-emerald-500/10',
  };

  return (
    <div className={`p-4 bg-slate-950 border rounded-2xl ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="font-bold text-white">{name}</span>
        {available ? (
          <span className="px-2 py-0.5 text-xs font-bold bg-emerald-500/20 text-emerald-300 rounded-full border border-emerald-500/30">
            Disponível
          </span>
        ) : (
          <span className="px-2 py-0.5 text-xs font-bold bg-slate-500/20 text-slate-400 rounded-full border border-slate-500/30">
            Indisponível
          </span>
        )}
      </div>
      <p className="text-sm text-slate-400 font-mono">{model}</p>
      {hasGrounding && (
        <div className="mt-2 flex items-center gap-1.5 text-xs text-indigo-300">
          <Sparkles className="w-3 h-3" />
          <span>Google Search Grounding</span>
        </div>
      )}
    </div>
  );
}

function TechTool({ name, description }: { name: string; description: string }) {
  return (
    <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
      <p className="text-sm font-bold text-white">{name}</p>
      <p className="text-xs text-slate-400 mt-0.5">{description}</p>
    </div>
  );
}