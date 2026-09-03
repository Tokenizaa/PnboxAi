import React, { useState } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  RefreshCw,
  Cpu,
  Activity,
  Wifi,
  WifiOff,
  Clock,
  ChevronDown,
  CheckCircle2,
  AlertTriangle,
  Play,
  Building2,
  ExternalLink,
  Edit3,
  Menu
} from 'lucide-react';
import { AuthSessionState } from '../types/pnbox';
import { PlanSwitcherModal } from './PlanSwitcherModal';

interface HeaderProps {
  authSession: AuthSessionState;
  onRefreshAuth: () => void;
  onOpenAuthModal: () => void;
  onUpdateActivePlanId: (novoId: string) => void;
  activeTab: string;
  setActiveTab: (tab: string) => void;
  trafficCount: number;
  onOpenSidebar: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  authSession,
  onRefreshAuth,
  onOpenAuthModal,
  onUpdateActivePlanId,
  activeTab,
  setActiveTab,
  trafficCount,
  onOpenSidebar
}) => {
  const [showStatusMenu, setShowStatusMenu] = useState(false);
  const [showPlanSwitcherModal, setShowPlanSwitcherModal] = useState(false);
  const [isSimulatingExpire, setIsSimulatingExpire] = useState(false);

  const isExpired = authSession.isExpired || authSession.status === 'expired';
  const isAuthenticated = authSession.status === 'authenticated' && !isExpired;
  const isAuthenticating = authSession.status === 'authenticating';
  const isOnline = authSession.isOnline !== false && authSession.status !== 'failed';

  const handleSimularExpiracao = async () => {
    setIsSimulatingExpire(true);
    try {
      await fetch('/api/automation/auth/expire', { method: 'POST' });
      onRefreshAuth();
    } catch (e) {
      console.error(e);
    } finally {
      setIsSimulatingExpire(false);
      setShowStatusMenu(false);
    }
  };

  return (
    <>
      <header className="bg-slate-900 border-b border-slate-800 sticky top-0 z-30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            {/* Logo, Título e Seletor Rápido de Plano */}
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-base font-bold text-slate-100 tracking-tight">PNBOX Automation Hub</h1>
                  <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                    Meteor DDP
                  </span>
                </div>
                {/* Seletor Dinâmico de Plano Ativo */}
                <div className="flex items-center gap-1.5 text-xs text-slate-400">
                  <span>Plano:</span>
                  <button
                    onClick={() => setShowPlanSwitcherModal(true)}
                    className="font-mono text-indigo-300 hover:text-white bg-slate-950 hover:bg-indigo-950/60 px-2 py-0.5 rounded border border-slate-800 hover:border-indigo-500/40 flex items-center gap-1 transition-all cursor-pointer"
                    title="Clique para trocar ou colar qualquer ID de plano do Sebrae PNBOX"
                  >
                    <Building2 className="w-3 h-3 text-indigo-400" />
                    <span className="font-bold">{authSession.idPlano}</span>
                    <Edit3 className="w-2.5 h-2.5 text-slate-400 ml-0.5" />
                  </button>
                </div>
              </div>
            </div>

          {/* Botão de abrir Sidebar (mobile) */}
          <button
            onClick={onOpenSidebar}
            className="lg:hidden p-2 text-slate-300 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            title="Abrir menu de páginas"
          >
            <Menu className="w-5 h-5" />
          </button>

          {/* Indicador de Status Online/Offline e Sessão */}
          <div className="flex items-center gap-2.5">
            {/* Badge Indicador de Status Online / Offline */}
            <div className="relative">
              <button
                onClick={() => setShowStatusMenu(!showStatusMenu)}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all cursor-pointer ${
                  isAuthenticated
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300 hover:bg-emerald-900/40'
                    : isExpired
                    ? 'bg-amber-950/40 border-amber-500/40 text-amber-300 hover:bg-amber-900/40'
                    : isAuthenticating
                    ? 'bg-blue-950/40 border-blue-500/40 text-blue-300 animate-pulse'
                    : 'bg-rose-950/40 border-rose-500/40 text-rose-300 hover:bg-rose-900/40'
                }`}
                title="Status da Conexão com o Backend PNBOX"
              >
                {/* Ícone de Conexão com pulso visual */}
                {isAuthenticated ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                    </span>
                    <Wifi className="w-3.5 h-3.5 text-emerald-400" />
                    <span className="font-semibold">
                      {authSession.modoExecucao === 'LIVE' ? 'PNBOX LIVE Conectado' : 'PNBOX Simulação Conectada'}
                    </span>
                    {authSession.tempoRestanteMinutos !== undefined && (
                      <span className="text-[10px] text-emerald-400/80 font-mono hidden sm:inline">
                        ({authSession.tempoRestanteMinutos}m)
                      </span>
                    )}
                  </>
                ) : isExpired ? (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-amber-400"></span>
                    </span>
                    <WifiOff className="w-3.5 h-3.5 text-amber-400" />
                    <span className="font-semibold">PNBOX Offline (Sessão Expirada)</span>
                  </>
                ) : isAuthenticating ? (
                  <>
                    <Activity className="w-3.5 h-3.5 text-blue-400 animate-spin" />
                    <span>Conectando...</span>
                  </>
                ) : (
                  <>
                    <span className="relative flex h-2 w-2">
                      <span className="relative inline-flex rounded-full h-2 w-2 bg-rose-400"></span>
                    </span>
                    <WifiOff className="w-3.5 h-3.5 text-rose-400" />
                    <span className="font-semibold">PNBOX Offline</span>
                  </>
                )}
                <ChevronDown className="w-3 h-3 text-slate-400 ml-0.5" />
              </button>

              {/* Menu Popover de Diagnóstico da Sessão */}
              {showStatusMenu && (
                <div className="absolute right-0 mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl p-4 z-50 text-xs space-y-3 animate-in fade-in zoom-in-95">
                  <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                    <span className="font-bold text-slate-200">Diagnóstico de Conexão</span>
                    <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                      isAuthenticated
                        ? 'bg-emerald-500/20 text-emerald-300'
                        : isExpired
                        ? 'bg-amber-500/20 text-amber-300'
                        : 'bg-rose-500/20 text-rose-300'
                    }`}>
                      {isAuthenticated ? 'CONECTADO' : isExpired ? 'EXPIRADA' : 'DESCONECTADO'}
                    </span>
                  </div>

                  <div className="space-y-2 font-mono text-[11px] text-slate-300">
                    <div className="flex justify-between">
                      <span className="text-slate-400">Backend Alvo:</span>
                      <span className="text-slate-200">wss://pnbox.sebrae.com.br</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Modo de Operação:</span>
                      <span className={authSession.modoExecucao === 'LIVE' ? 'text-amber-400 font-bold' : 'text-indigo-400'}>
                        {authSession.modoExecucao === 'LIVE' ? 'Oficial (LIVE Sebrae)' : 'Simulação Segura (DRY_RUN)'}
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-slate-400">Sessão DDP:</span>
                      <span className={isAuthenticated ? 'text-emerald-400 font-medium' : isExpired ? 'text-amber-400' : 'text-slate-400'}>
                        {isAuthenticated ? 'Ativa & Autenticada' : isExpired ? 'Expirada' : 'Aguardando Inicialização'}
                      </span>
                    </div>
                    {authSession.autenticadoEm && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">Autenticado em:</span>
                        <span className="text-slate-300">
                          {new Date(authSession.autenticadoEm).toLocaleTimeString()}
                        </span>
                      </div>
                    )}
                    <div className="flex justify-between">
                      <span className="text-slate-400">Validade Restante:</span>
                      <span className={isAuthenticated ? 'text-emerald-400 font-semibold' : isExpired ? 'text-amber-400' : 'text-slate-400'}>
                        {isAuthenticated ? `${authSession.tempoRestanteMinutos ?? 50} min` : isExpired ? 'Expirada' : 'Não iniciada'}
                      </span>
                    </div>
                    {isAuthenticated && authSession.meteorUserId && (
                      <div className="flex justify-between">
                        <span className="text-slate-400">User ID Sebrae:</span>
                        <span className="text-indigo-300 font-mono text-[10px]">
                          {authSession.meteorUserId}
                        </span>
                      </div>
                    )}
                  </div>

                  <div className="pt-2 border-t border-slate-800 flex flex-col gap-2">
                    {isAuthenticated ? (
                      <button
                        onClick={handleSimularExpiracao}
                        disabled={isSimulatingExpire}
                        className="w-full py-1.5 bg-slate-800 hover:bg-slate-750 border border-slate-700 text-amber-300 rounded-lg text-center text-xs transition-colors flex items-center justify-center gap-1.5"
                      >
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Simular Expiração de Sessão</span>
                      </button>
                    ) : (
                      <button
                        onClick={() => {
                          setShowStatusMenu(false);
                          onOpenAuthModal();
                        }}
                        className="w-full py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-lg text-center text-xs font-semibold transition-colors flex items-center justify-center gap-1.5 shadow"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Reautenticar Sessão Agora</span>
                      </button>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Botão de Autenticar / Gerenciar Sessão */}
            <button
              onClick={onOpenAuthModal}
              className={`hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${
                isAuthenticated
                  ? 'bg-slate-800/80 border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white'
                  : isExpired
                  ? 'bg-amber-900/30 border-amber-500/40 text-amber-300 hover:bg-amber-800/40'
                  : 'bg-rose-950/40 border-rose-500/30 text-rose-300 hover:bg-rose-900/40'
              }`}
            >
              {isAuthenticated ? (
                <>
                  <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Sessão Playwright</span>
                </>
              ) : isExpired ? (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                  <span>Renovar Token</span>
                </>
              ) : (
                <>
                  <ShieldAlert className="w-3.5 h-3.5 text-rose-400" />
                  <span>Autenticar</span>
                </>
              )}
            </button>

            {/* Botão de Refresh */}
            <button
              onClick={onRefreshAuth}
              title="Recarregar status da conexão"
              className="p-1.5 text-slate-400 hover:text-white bg-slate-800 hover:bg-slate-700 rounded-lg border border-slate-700 transition-colors"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>

    {/* Modal de Troca / Seleção de Plano */}
    <PlanSwitcherModal
      isOpen={showPlanSwitcherModal}
      onClose={() => setShowPlanSwitcherModal(false)}
      activePlanId={authSession.idPlano}
      onSelectPlanId={(novoId) => {
        onUpdateActivePlanId(novoId);
        setShowPlanSwitcherModal(false);
      }}
      onNavigateTab={setActiveTab}
    />
  </>
);
};

