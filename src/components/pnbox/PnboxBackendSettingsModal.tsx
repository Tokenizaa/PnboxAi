import React, { useState, useCallback, useEffect } from 'react';
import {
  X,
  Settings,
  Shield,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  FileCheck2,
  User,
  Lock,
  Play,
  Key,
  AlertTriangle,
  LogOut,
  Globe
} from 'lucide-react';
import { AuthSessionState, FerramentaInfo, EventoTrafego } from '../../types/pnbox';
import { getPlatformSession } from '../../components/PlatformGate';

interface PnboxBackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSessionState;
  ferramentas: FerramentaInfo[];
  eventosTrafego: EventoTrafego[];
  onRefreshTraffic: () => void;
  onDisconnect?: () => void;
}

export const PnboxBackendSettingsModal: React.FC<PnboxBackendSettingsModalProps> = ({
  isOpen,
  onClose,
  authSession,
  ferramentas,
  eventosTrafego,
  onRefreshTraffic,
  onDisconnect
}) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'traffic' | 'schemas'>('auth');
  const [showPassword, setShowPassword] = useState(false);

  // Formulário de credenciais
  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [formMessage, setFormMessage] = useState<{ text: string; type: 'success' | 'error' | 'info' } | null>(null);

  const PNBOX_BASE = 'https://pnbox.sebrae.com.br/';

  // Pré-popula credenciais do banco/localStorage
  const loadSavedCreds = useCallback(async () => {
    try {
      const token = getPlatformSession()?.accessToken;
      if (token) {
        const res = await fetch('/api/auth/pnbox-credentials', {
          headers: { Authorization: `Bearer ${token}` }
        });
        const data = await res.json();
        if (data.configured && data.data?.cpf) {
          setCpf(data.data.cpf);
        }
      }
      // Pre-preenche senha do localStorage (se existir) para conveniência
      const { getEncryptedPnboxCredentials } = await import('../../utils/secureStorage');
      const saved = await getEncryptedPnboxCredentials();
      if (saved?.cpf && !cpf) setCpf(saved.cpf);
      if (saved?.password) setPassword(saved.password);
    } catch {}
  }, [cpf]);

  useEffect(() => {
    if (isOpen) loadSavedCreds();
  }, [isOpen, loadSavedCreds]);

  // Salvar (autentica + persiste no banco criptografado)
  const handleSalvar = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentimento) {
      setFormMessage({ text: 'É necessário aceitar o consentimento antes de continuar.', type: 'error' });
      return;
    }
    if (!cpf || !password) {
      setFormMessage({ text: 'CPF e senha são obrigatórios.', type: 'error' });
      return;
    }

    setIsLoading(true);
    setFormMessage({ text: 'Autenticando no PNBOX (LIVE)...', type: 'info' });

    try {
      const token = getPlatformSession()?.accessToken;
      if (!token) throw new Error('Sessão da plataforma expirada. Faça login novamente.');

      // 1. Autentica no PNBOX (LIVE, sem idPlano - dashboard abre todos os planos)
      const loginRes = await fetch('/api/automation/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          cpf: cpf.trim(),
          password,
          consentimentoAceito: true,
          modoExecucao: 'LIVE'
        })
      });
      const loginData = await loginRes.json();

      if (loginData.session?.status !== 'authenticated') {
        setFormMessage({ text: loginData.mensagem || 'Falha na autenticação', type: 'error' });
        setIsLoading(false);
        return;
      }

      // 2. Persiste no banco (criptografado AES-256-GCM)
      const dbRes = await fetch('/api/auth/pnbox-credentials', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ cpf: cpf.trim(), password })
      });

      // 3. Salva localmente como cache (criptografado)
      const { saveEncryptedPnboxCredentials } = await import('../../utils/secureStorage');
      await saveEncryptedPnboxCredentials({ cpf: cpf.trim(), password });

      const dbData = await dbRes.json();
      setFormMessage({
        text: dbRes.ok
          ? 'PNBOX conectado! Credenciais salvas no banco (criptografado).'
          : `Conectado, mas falha ao salvar no banco: ${dbData.message || ''}`,
        type: 'success'
      });
    } catch (err: any) {
      setFormMessage({ text: err.message || 'Erro ao conectar', type: 'error' });
    } finally {
      setIsLoading(false);
      onRefreshTraffic();
    }
  };

  // Deslogar (encerra sessão PNBOX + limpa credenciais)
  const handleDeslogar = async () => {
    try {
      const token = getPlatformSession()?.accessToken;
      if (token) {
        // Encerra sessão PNBOX do usuário
        await fetch('/api/automation/auth/expire', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        // Remove credenciais do banco
        await fetch('/api/auth/pnbox-credentials', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      // Limpa cache local
      const { clearEncryptedPnboxCredentials } = await import('../../utils/secureStorage');
      clearEncryptedPnboxCredentials();
      setCpf('');
      setPassword('');
      setConsentimento(false);
      setFormMessage({ text: 'Desconectado do PNBOX. Credenciais removidas.', type: 'success' });
      onDisconnect?.();
    } catch (err: any) {
      setFormMessage({ text: `Erro ao deslogar: ${err.message}`, type: 'error' });
    }
  };

  if (!isOpen) return null;

  const isAuthenticated = authSession.status === 'authenticated' && !authSession.isExpired;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#18163f] border border-[#2d2a63] rounded-2xl max-w-4xl w-full p-6 text-white shadow-2xl my-8 flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2a63]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Settings className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Conexão PNBOX (Sebrae)
              </h2>
              <p className="text-xs text-indigo-200/80">
                Conecte sua conta PNBOX para executar planos no ambiente real
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Abas */}
        <div className="flex items-center gap-2 mt-4 border-b border-white/10 pb-2 overflow-x-auto">
          <button
            onClick={() => setActiveTab('auth')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'auth' ? 'bg-[#1877f2] text-white' : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Conexão</span>
          </button>
          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'traffic' ? 'bg-[#1877f2] text-white' : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Tráfego DDP ({eventosTrafego.length})</span>
          </button>
          <button
            onClick={() => setActiveTab('schemas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'schemas' ? 'bg-[#1877f2] text-white' : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Ferramentas ({ferramentas.length})</span>
          </button>
        </div>

        {/* Conteúdo */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {/* Aba: Conexão */}
          {activeTab === 'auth' && (
            <div className="space-y-6">
              {/* Status */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="bg-[#24225b] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-indigo-300 block">Status da Conexão</span>
                  <div className="flex items-center gap-2 mt-1">
                    {isAuthenticated ? (
                      <>
                        <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                        <span className="font-bold text-sm text-emerald-300">AUTENTICADO</span>
                      </>
                    ) : (
                      <>
                        <AlertCircle className="w-4 h-4 text-amber-400" />
                        <span className="font-bold text-sm text-amber-300">DESCONECTADO</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="bg-[#24225b] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-indigo-300 block">Ambiente</span>
                  <div className="flex items-center gap-2 mt-1">
                    <Globe className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold text-sm text-emerald-300">LIVE (PNBOX Real)</span>
                  </div>
                </div>

                <div className="bg-[#24225b] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-indigo-300 block">Validade do Token</span>
                  <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-white">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>{isAuthenticated ? authSession.tempoRestanteFormatado || 'Válida' : '—'}</span>
                  </div>
                </div>
              </div>

              {isAuthenticated && (
                <div className="bg-[#24225b] p-3.5 rounded-xl border border-emerald-500/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="text-[11px] text-indigo-300 block">Conta conectada</span>
                      <div className="text-sm font-bold text-white mt-0.5">
                        {authSession.cpf ? authSession.cpf : cpf}
                        {authSession.autenticadoEm && (
                          <span className="text-[10px] text-indigo-300 font-normal ml-2">
                            em {new Date(authSession.autenticadoEm).toLocaleString()}
                          </span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={handleDeslogar}
                      className="px-4 py-2 bg-red-600/20 hover:bg-red-600/30 border border-red-500/30 text-red-300 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      Deslogar
                    </button>
                  </div>
                </div>
              )}

              {/* Formulário de credenciais */}
              <div className="bg-[#24225b] p-4 rounded-xl border border-white/10">
                <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                  <Key className="w-4 h-4 text-pink-400" />
                  Conectar Conta PNBOX
                </h3>
                <form onSubmit={handleSalvar} className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                        CPF / Login Sebrae
                      </label>
                      <div className="relative">
                        <User className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type="text"
                          value={cpf}
                          onChange={(e) => setCpf(e.target.value)}
                          placeholder="515.178.842-68"
                          className="w-full pl-9 pr-3 py-2 bg-[#18163f] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-[10px] font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                        Senha de Acesso
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••••••"
                          className="w-full pl-9 pr-20 py-2 bg-[#18163f] border border-white/10 rounded-lg text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-2 text-[10px] text-slate-400 hover:text-white"
                        >
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#18163f] border border-white/10 rounded-lg p-2.5 flex items-center gap-2 text-[11px] text-indigo-300">
                    <Globe className="w-3.5 h-3.5 text-emerald-400" />
                    <span>
                      Ambiente fixo: <strong className="text-white font-mono">https://pnbox.sebrae.com.br/</strong>
                    </span>
                  </div>

                  {/* Consentimento */}
                  <label className="flex items-start gap-2 text-[11px] text-slate-300 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={consentimento}
                      onChange={(e) => setConsentimento(e.target.checked)}
                      className="mt-1 w-3.5 h-3.5 rounded border-white/20 bg-[#18163f] text-pink-500 focus:ring-pink-500"
                    />
                    <span className="leading-snug">
                      Confirmo que sou o titular da conta PNBOX informada, autorizo o Hub a usar minhas
                      credenciais exclusivamente para automatizar o preenchimento dos meus planos no
                      ambiente oficial Sebrae, e estou ciente de que o uso automatizado pode ser registrado.
                    </span>
                  </label>

                  {/* Mensagem */}
                  {formMessage && (
                    <div className={`p-2 rounded text-[11px] flex items-center gap-2 ${
                      formMessage.type === 'success' ? 'bg-emerald-950/30 border border-emerald-500/30 text-emerald-300' :
                      formMessage.type === 'error' ? 'bg-amber-950/30 border border-amber-500/30 text-amber-300' :
                      'bg-blue-950/30 border border-blue-500/30 text-blue-300'
                    }`}>
                      {formMessage.type === 'success' && <CheckCircle2 className="w-3.5 h-3.5" />}
                      {formMessage.type === 'error' && <AlertTriangle className="w-3.5 h-3.5" />}
                      {formMessage.type === 'info' && <Activity className="w-3.5 h-3.5 animate-spin" />}
                      <span>{formMessage.text}</span>
                    </div>
                  )}

                  {/* Botão Salvar (único) */}
                  <button
                    type="submit"
                    disabled={isLoading || !consentimento}
                    className="w-full py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-lg text-sm font-bold shadow disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {isLoading ? (
                      <>
                        <Play className="w-4 h-4 animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <Key className="w-4 h-4" />
                        Salvar
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-indigo-300/70 text-center -mt-1">
                    Autentica no PNBOX (LIVE) e salva as credenciais criptografadas no banco
                  </p>
                </form>
              </div>
            </div>
          )}

          {/* Aba: Tráfego DDP */}
          {activeTab === 'traffic' && (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs text-indigo-200">
                  Eventos de rede interceptados via WebSocket DDP:
                </span>
                <button
                  onClick={onRefreshTraffic}
                  className="px-3 py-1 bg-white/10 hover:bg-white/15 rounded text-xs text-indigo-200 flex items-center gap-1.5"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Atualizar</span>
                </button>
              </div>

              {eventosTrafego.length === 0 ? (
                <div className="bg-[#24225b] p-8 rounded-xl text-center text-xs text-indigo-300">
                  Nenhum tráfego DDP registrado nesta sessão. As chamadas aparecerão aqui em tempo real ao sincronizar ferramentas.
                </div>
              ) : (
                <div className="space-y-2">
                  {eventosTrafego.slice(0, 20).map((evento) => (
                    <div key={evento.id} className="bg-[#24225b] border border-white/5 rounded-lg p-3 text-xs font-mono">
                      <div className="flex items-center justify-between text-indigo-300 pb-1 border-b border-white/5">
                        <span className="font-bold text-white">{evento.metodo}</span>
                        <span className="text-[10px] text-slate-400">{evento.horario}</span>
                      </div>
                      <div className="mt-1.5 text-slate-300 truncate">
                        {JSON.stringify(evento.payload)}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Aba: Ferramentas */}
          {activeTab === 'schemas' && (
            <div className="space-y-3">
              <span className="text-xs text-indigo-200 block mb-2">
                {ferramentas.length} Ferramentas Oficiais mapeadas e validadas contra o Sebrae PNBOX:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ferramentas.map((f) => (
                  <div key={f.id} className="bg-[#24225b] p-3 rounded-lg border border-white/5 text-xs flex items-center justify-between">
                    <div>
                      <div className="font-bold text-white">{f.nome}</div>
                      <div className="text-[11px] text-indigo-300 font-mono mt-0.5">
                        {f.collectionName || f.id}
                      </div>
                    </div>
                    <span className="px-2 py-0.5 bg-emerald-500/20 text-emerald-300 rounded text-[10px] font-bold">
                      Validado
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
