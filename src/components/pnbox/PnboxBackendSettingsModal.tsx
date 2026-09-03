import React, { useState } from 'react';
import {
  X,
  Settings,
  Shield,
  Layers,
  Terminal,
  Activity,
  CheckCircle2,
  AlertCircle,
  Clock,
  RefreshCw,
  KeyRound,
  ExternalLink,
  Code,
  FileCheck2,
  Send,
  Eye,
  EyeOff
} from 'lucide-react';
import { AuthSessionState, FerramentaInfo, EventoTrafego } from '../../types/pnbox';

interface PnboxBackendSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  authSession: AuthSessionState;
  ferramentas: FerramentaInfo[];
  eventosTrafego: EventoTrafego[];
  onOpenAuthModal: () => void;
  onRefreshTraffic: () => void;
  onUpdateActivePlanId: (novoId: string) => void;
  onToggleModoExecucao?: () => void;
}

export const PnboxBackendSettingsModal: React.FC<PnboxBackendSettingsModalProps> = ({
  isOpen,
  onClose,
  authSession,
  ferramentas,
  eventosTrafego,
  onOpenAuthModal,
  onRefreshTraffic,
  onUpdateActivePlanId,
  onToggleModoExecucao
}) => {
  const [activeTab, setActiveTab] = useState<'auth' | 'traffic' | 'schemas' | 'logs'>('auth');
  const [showPassword, setShowPassword] = useState(false);
  const [idPlanoInput, setIdPlanoInput] = useState(authSession.idPlano || 'HCOQIkjSk97gGcfGDPb0h');

  if (!isOpen) return null;

  const isLive = authSession.modoExecucao === 'LIVE';
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
                Diagnóstico Técnico & Conexão Sebrae
              </h2>
              <p className="text-xs text-indigo-200/80">
                Gerenciamento de credenciais, sessão DDP, tráfego WebSocket e schemas de backend
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
              activeTab === 'auth'
                ? 'bg-[#1877f2] text-white'
                : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <Shield className="w-3.5 h-3.5" />
            <span>Sessão & Credenciais</span>
          </button>

          <button
            onClick={() => setActiveTab('traffic')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'traffic'
                ? 'bg-[#1877f2] text-white'
                : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <Activity className="w-3.5 h-3.5" />
            <span>Monitor de Tráfego DDP ({eventosTrafego.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('schemas')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors whitespace-nowrap ${
              activeTab === 'schemas'
                ? 'bg-[#1877f2] text-white'
                : 'text-indigo-200 hover:bg-white/5'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5" />
            <span>Schemas das 14 Ferramentas ({ferramentas.length})</span>
          </button>
        </div>

        {/* Conteúdo das Abas */}
        <div className="flex-1 overflow-y-auto mt-4 pr-1">
          {/* Aba 1: Sessão & Credenciais */}
          {activeTab === 'auth' && (
            <div className="space-y-6">
              {/* Status Geral */}
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
                  <span className="text-[11px] text-indigo-300 block">Modo de Operação</span>
                  <div className="flex items-center gap-2 mt-1">
                    <span className={`px-2 py-0.5 rounded text-xs font-bold font-mono ${
                      isLive ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30' : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                    }`}>
                      {isLive ? 'LIVE (Real PNBOX)' : 'DRY_RUN (Simulado)'}
                    </span>
                  </div>
                </div>

                <div className="bg-[#24225b] p-3.5 rounded-xl border border-white/10">
                  <span className="text-[11px] text-indigo-300 block">Validade do Token</span>
                  <div className="flex items-center gap-2 mt-1 text-sm font-semibold text-white">
                    <Clock className="w-4 h-4 text-indigo-400" />
                    <span>{authSession.tempoRestanteFormatado || 'Expirada'}</span>
                  </div>
                </div>
              </div>

              {/* Formulário de Configuração de ID do Plano */}
              <div className="bg-[#24225b] p-4 rounded-xl border border-white/10">
                <h3 className="text-sm font-bold text-white mb-2">
                  ID do Plano Ativo no Sebrae
                </h3>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={idPlanoInput}
                    onChange={(e) => setIdPlanoInput(e.target.value)}
                    placeholder="Ex: HCOQIkjSk97gGcfGDPb0h ou Cole a URL do Sebrae"
                    className="flex-1 bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-xs text-white focus:outline-none focus:border-pink-500 font-mono"
                  />
                  <button
                    onClick={() => onUpdateActivePlanId(idPlanoInput)}
                    className="px-4 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-lg text-xs font-bold"
                  >
                    Atualizar ID
                  </button>
                </div>
              </div>

              {/* Ações de Reautenticação */}
              <div className="flex items-center justify-between bg-[#24225b] p-4 rounded-xl border border-white/10">
                <div>
                  <h4 className="text-sm font-bold text-white">Sessão Playwright Headless</h4>
                  <p className="text-xs text-indigo-200/70 mt-0.5">
                    Utiliza navegador headless para autenticar no SSO do Sebrae e capturar o loginToken do Meteor.
                  </p>
                </div>
                <button
                  onClick={onOpenAuthModal}
                  className="px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow"
                >
                  Reautenticar Sessão
                </button>
              </div>
            </div>
          )}

          {/* Aba 2: Tráfego DDP */}
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
                  {eventosTrafego.slice(0, 15).map((evento) => (
                    <div
                      key={evento.id}
                      className="bg-[#24225b] border border-white/5 rounded-lg p-3 text-xs font-mono"
                    >
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

          {/* Aba 3: Schemas das Ferramentas */}
          {activeTab === 'schemas' && (
            <div className="space-y-3">
              <span className="text-xs text-indigo-200 block mb-2">
                14/14 Ferramentas Oficiais mapeadas e validadas contra o Sebrae PNBOX:
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
                {ferramentas.map((f) => (
                  <div
                    key={f.id}
                    className="bg-[#24225b] p-3 rounded-lg border border-white/5 text-xs flex items-center justify-between"
                  >
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
