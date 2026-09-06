import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Coins,
  Leaf,
  Truck,
  ExternalLink,
  RefreshCw,
  Cloud
} from 'lucide-react';
import { PlanoCriadoInfo, AuthSessionState } from '../../types/pnbox';

interface PnboxPlansViewProps {
  planos: PlanoCriadoInfo[];
  planoAtivoId: string;
  onSelectPlano: (idPlano: string) => void;
  onOpenCriarPlanoModal: () => void;
  onOpenAiCopilot: () => void;
  onAutoFillWithAi: (idPlano: string) => void;
  onSyncPnboxPlans?: () => void;
  isSyncingPlans?: boolean;
  authSession?: AuthSessionState;
  userName?: string;
}

export const PnboxPlansView: React.FC<PnboxPlansViewProps> = ({
  planos,
  planoAtivoId,
  onSelectPlano,
  onOpenCriarPlanoModal,
  onOpenAiCopilot,
  onAutoFillWithAi,
  onSyncPnboxPlans,
  isSyncingPlans = false,
  authSession,
  userName = 'Usuário'
}) => {
  const getIconePlano = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('multa') || n.includes('defesa') || n.includes('juridico')) return <ShieldCheck className="w-8 h-8 text-blue-600" />;
    if (n.includes('token') || n.includes('contrato') || n.includes('fintech')) return <Coins className="w-8 h-8 text-amber-500" />;
    if (n.includes('weed') || n.includes('saude') || n.includes('natural')) return <Leaf className="w-8 h-8 text-emerald-500" />;
    if (n.includes('entrega') || n.includes('delivery') || n.includes('logistica')) return <Truck className="w-8 h-8 text-orange-500" />;
    return <Building2 className="w-8 h-8 text-indigo-600" />;
  };

  return (
    <div className="w-full min-h-screen bg-[#1e1d4b] text-white pb-24">
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2d2a63] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">Olá, {userName}</h1>
            <p className="text-sm sm:text-base text-indigo-200/90 mt-1">Seus planos reais do PNBOX Sebrae</p>
            <div className="flex items-center gap-2 mt-2">
              {authSession?.isOnline ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conectado ao PNBOX Sebrae</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Conecte a sessão Sebrae para carregar os planos</span>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {onSyncPnboxPlans && (
              <button
                onClick={onSyncPnboxPlans}
                disabled={isSyncingPlans}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-semibold disabled:opacity-50"
              >
                <RefreshCw className={`w-4 h-4 ${isSyncingPlans ? 'animate-spin' : ''}`} />
                <span>{isSyncingPlans ? 'Sincronizando...' : 'Sincronizar com PNBOX'}</span>
              </button>
            )}
            <button
              onClick={onOpenCriarPlanoModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-full text-sm font-semibold shadow-lg"
            >
              <Sparkles className="w-4 h-4" />
              <span>Criar Novo Plano com IA</span>
            </button>
          </div>
        </div>

        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Seus planos</h2>
            <span className="text-xs text-indigo-300">{planos.length} plano(s) encontrado(s) no PNBOX</span>
          </div>

          {planos.length === 0 ? (
            <div className="bg-[#125ec2]/20 border border-[#3b8ef7]/30 rounded-2xl p-10 text-center flex flex-col items-center">
              <FolderOpen className="w-10 h-10 text-indigo-300 mb-4" />
              <h3 className="text-lg font-bold mb-2">Nenhum plano retornado pelo PNBOX</h3>
              <p className="text-sm text-indigo-200/80 max-w-md mb-6">
                Os planos exibidos aqui precisam existir na sua conta do Sebrae. Nenhum plano local ou de demonstração é criado automaticamente.
              </p>
              <div className="flex flex-wrap justify-center gap-3">
                {onSyncPnboxPlans && (
                  <button onClick={onSyncPnboxPlans} disabled={isSyncingPlans} className="flex items-center gap-2 px-5 py-2.5 bg-[#1877f2] text-white rounded-full text-sm font-semibold disabled:opacity-50">
                    <RefreshCw className={`w-4 h-4 ${isSyncingPlans ? 'animate-spin' : ''}`} />
                    <span>{isSyncingPlans ? 'Buscando...' : 'Buscar no Sebrae'}</span>
                  </button>
                )}
                <button onClick={onOpenCriarPlanoModal} className="flex items-center gap-2 px-5 py-2.5 bg-white/10 border border-white/20 text-white rounded-full text-sm font-semibold">
                  <Sparkles className="w-4 h-4" />
                  <span>Criar Novo Plano</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {planos.map((plano) => {
                const isActive = plano.idPlano === planoAtivoId;
                const isFilled = (plano.ferramentasPreenchidas || 0) >= 10;
                return (
                  <div
                    key={plano.idPlano}
                    className={`group relative bg-[#1877f2] rounded-xl overflow-hidden shadow-lg border ${isActive ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-[#3b8ef7]/40'} transition-all cursor-pointer`}
                    onClick={() => onSelectPlano(plano.idPlano)}
                  >
                    <div className="p-5 flex flex-col items-center text-center">
                      <div className="w-full flex items-center justify-between text-xs text-white/80 mb-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-mono">{plano.idPlano.slice(0, 8)}...</span>
                        {isFilled && <CheckCircle2 className="w-5 h-5 text-emerald-300" />}
                      </div>
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md my-3">{getIconePlano(plano.nomePlano)}</div>
                      <h3 className="text-lg font-bold leading-snug line-clamp-2 min-h-[3rem]">{plano.nomePlano}</h3>
                    </div>

                    <div className="bg-[#125ec2] px-4 py-3 flex items-center justify-between text-xs border-t border-[#3b8ef7]/30">
                      <span className="truncate font-medium">{plano.categoriaObjetivo || plano.setor || 'Plano de negócios'}</span>
                      <a
                        href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${plano.idPlano}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-white/20 rounded"
                        title="Abrir no PNBOX"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                    </div>

                    <div className="absolute inset-0 bg-[#0c4ca5]/95 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2.5 p-4 z-10">
                      <button onClick={(e) => { e.stopPropagation(); onSelectPlano(plano.idPlano); }} className="w-full py-2 px-3 bg-white text-[#1877f2] rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                        <FolderOpen className="w-4 h-4" /> Abrir Ferramentas
                      </button>
                      <button onClick={(e) => { e.stopPropagation(); onAutoFillWithAi(plano.idPlano); }} className="w-full py-2 px-3 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-lg text-xs font-bold flex items-center justify-center gap-2">
                        <Sparkles className="w-4 h-4" /> Preencher com IA
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="mt-14 grid grid-cols-1 md:grid-cols-3 gap-6">
          <div onClick={onOpenAiCopilot} className="bg-[#24225b] hover:bg-[#2c296f] border border-[#37347a] rounded-xl p-5 cursor-pointer">
            <Sparkles className="w-5 h-5 text-pink-400 mb-3" />
            <h3 className="font-bold text-base mb-1">Copiloto de IA</h3>
            <p className="text-xs text-indigo-200/80">Use IA para trabalhar sobre um plano real selecionado do PNBOX.</p>
            <div className="mt-4 text-xs text-pink-300 font-semibold flex items-center gap-1">Abrir Copiloto <ArrowRight className="w-3 h-3" /></div>
          </div>
          <div className="bg-[#24225b] border border-[#37347a] rounded-xl p-5">
            <ShieldCheck className="w-5 h-5 text-blue-400 mb-3" />
            <h3 className="font-bold text-base mb-1">Fonte de verdade</h3>
            <p className="text-xs text-indigo-200/80">Somente IDs retornados ou explicitamente selecionados do PNBOX são usados.</p>
          </div>
          <div className="bg-[#24225b] border border-[#37347a] rounded-xl p-5">
            <Cloud className="w-5 h-5 text-cyan-400 mb-3" />
            <h3 className="font-bold text-base mb-1">Sincronização</h3>
            <p className="text-xs text-indigo-200/80">O estado exibido deve ser reconciliado com o servidor oficial, sem planos fictícios.</p>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PnboxPlansView;
