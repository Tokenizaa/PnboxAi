import React from 'react';
import {
  Sparkles,
  Plus,
  MoreVertical,
  CheckCircle2,
  FolderOpen,
  ArrowRight,
  ShieldCheck,
  Building2,
  Coins,
  Leaf,
  Truck,
  FileText,
  TrendingUp,
  BrainCircuit,
  Lightbulb,
  Share2,
  ExternalLink,
  RefreshCw,
  Cloud,
  Check
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
  userName = 'OSVALDO LESSA FARIAS NETTO'
}) => {
  // Ícone contextual para cada plano
  const getIconePlano = (nome: string) => {
    const n = nome.toLowerCase();
    if (n.includes('multa') || n.includes('defesa') || n.includes('juridico')) {
      return <ShieldCheck className="w-8 h-8 text-blue-600" />;
    }
    if (n.includes('token') || n.includes('contrato') || n.includes('fintech')) {
      return <Coins className="w-8 h-8 text-amber-500" />;
    }
    if (n.includes('weed') || n.includes('saude') || n.includes('natural')) {
      return <Leaf className="w-8 h-8 text-emerald-500" />;
    }
    if (n.includes('entrega') || n.includes('chico') || n.includes('delivery')) {
      return <Truck className="w-8 h-8 text-orange-500" />;
    }
    return <Building2 className="w-8 h-8 text-indigo-600" />;
  };

  return (
    <div className="w-full min-h-screen bg-[#1e1d4b] text-white pb-24">
      {/* 1. Header de Boas-Vindas Oficial */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-8 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2d2a63] pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              Olá, {userName}
            </h1>
            <p className="text-sm sm:text-base text-indigo-200/90 mt-1 font-normal">
              Tenha visibilidade do seu negócio com o seu plano
            </p>
            <div className="flex items-center gap-2 mt-2">
              {authSession?.isOnline ? (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-emerald-500/10 border border-emerald-500/30 text-emerald-300 font-medium">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span>Conectado ao PNBOX Sebrae • Sincronização Bidirecional Ativa</span>
                </div>
              ) : (
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs bg-amber-500/10 border border-amber-500/30 text-amber-300 font-medium">
                  <Cloud className="w-3.5 h-3.5" />
                  <span>Modo Local • Conecte na aba "Sessão" para carregar seus projetos oficiais do Sebrae</span>
                </div>
              )}
            </div>
          </div>

          {/* Banner de Ação Rápida de IA e Sincronização */}
          <div className="flex flex-wrap items-center gap-3">
            {onSyncPnboxPlans && (
              <button
                onClick={onSyncPnboxPlans}
                disabled={isSyncingPlans}
                className="flex items-center gap-2 px-4 py-2.5 bg-white/10 hover:bg-white/20 border border-white/20 rounded-full text-sm font-semibold transition-all hover:scale-105 active:scale-95 disabled:opacity-50 text-white cursor-pointer"
                title="Sincronizar projetos diretamente com a plataforma Sebrae PNBOX"
              >
                <RefreshCw className={`w-4 h-4 text-indigo-300 ${isSyncingPlans ? 'animate-spin' : ''}`} />
                <span>{isSyncingPlans ? 'Sincronizando...' : 'Sincronizar com PNBOX'}</span>
              </button>
            )}

            <button
              onClick={onOpenCriarPlanoModal}
              className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-sm font-semibold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-pink-200" />
              <span>Criar Novo Plano com IA</span>
            </button>
          </div>
        </div>

        {/* 2. Seção "Seus planos" */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Seus planos
            </h2>
            <div className="flex items-center gap-3">
              <span className="text-xs text-indigo-300">
                {planos.length} plano(s) cadastrado(s)
              </span>
            </div>
          </div>

          {planos.length === 0 ? (
            <div className="bg-[#125ec2]/20 border border-[#3b8ef7]/30 rounded-2xl p-10 text-center flex flex-col items-center justify-center">
              <div className="w-16 h-16 rounded-full bg-[#1877f2]/20 flex items-center justify-center text-indigo-300 mb-4">
                <FolderOpen className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-2">Nenhum projeto carregado ainda</h3>
              <p className="text-sm text-indigo-200/80 max-w-md mb-6">
                Conecte sua conta do Sebrae para importar automaticamente seus projetos existentes no PNBOX ou crie um novo plano com auxílio de IA.
              </p>
              <div className="flex flex-wrap items-center justify-center gap-4">
                {onSyncPnboxPlans && (
                  <button
                    onClick={onSyncPnboxPlans}
                    disabled={isSyncingPlans}
                    className="flex items-center gap-2 px-5 py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full text-sm font-semibold shadow-md transition-all cursor-pointer"
                  >
                    <RefreshCw className={`w-4 h-4 ${isSyncingPlans ? 'animate-spin' : ''}`} />
                    <span>{isSyncingPlans ? 'Buscando do PNBOX...' : 'Sincronizar Projetos do Sebrae'}</span>
                  </button>
                )}
                <button
                  onClick={onOpenCriarPlanoModal}
                  className="flex items-center gap-2 px-5 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 text-white rounded-full text-sm font-semibold shadow-md transition-all cursor-pointer"
                >
                  <Sparkles className="w-4 h-4 text-pink-200" />
                  <span>Criar Novo Plano</span>
                </button>
              </div>
            </div>
          ) : (
            /* Grid de Cards de Planos (Estilo Oficial PNBOX) */
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
              {planos.map((plano) => {
                const isActive = plano.idPlano === planoAtivoId;
                const isFilled = (plano.ferramentasPreenchidas || 0) >= 10;
                const isSynced = Boolean(plano.sincronizadoPnbox);

                return (
                  <div
                    key={plano.idPlano}
                    className={`group relative bg-[#1877f2] hover:bg-[#166fe5] rounded-xl overflow-hidden shadow-lg border ${
                      isActive ? 'border-amber-400 ring-2 ring-amber-400/40' : 'border-[#3b8ef7]/40'
                    } transition-all duration-200 flex flex-col justify-between cursor-pointer`}
                    onClick={() => onSelectPlano(plano.idPlano)}
                  >
                    {/* Topo do Card com Checkmark e Ações */}
                    <div className="p-5 flex flex-col items-center text-center">
                      {/* Badge de status (concluído / ativo / sincronizado) */}
                      <div className="w-full flex items-center justify-between text-xs text-white/80 mb-2">
                        <span className="px-2 py-0.5 bg-white/20 rounded text-[10px] font-mono">
                          {plano.idPlano.slice(0, 8)}...
                        </span>
                        <div className="flex items-center gap-1.5">
                          {isSynced && (
                            <span className="px-1.5 py-0.5 rounded text-[9px] bg-emerald-400/20 text-emerald-200 border border-emerald-400/30 font-medium" title="Sincronizado no Sebrae PNBOX">
                              PNBOX ✓
                            </span>
                          )}
                          {isFilled && (
                            <div className="w-5 h-5 rounded-full bg-emerald-400 text-white flex items-center justify-center shadow-sm" title="Plano preenchido">
                              <CheckCircle2 className="w-3.5 h-3.5" />
                            </div>
                          )}
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              onAutoFillWithAi(plano.idPlano);
                            }}
                            className="p-1 rounded hover:bg-white/20 text-white/90"
                            title="Menu do plano"
                          >
                            <MoreVertical className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Círculo com Ícone em Fundo Branco (Identidade Visual PNBOX) */}
                      <div className="w-20 h-20 rounded-full bg-white flex items-center justify-center shadow-md my-3 group-hover:scale-105 transition-transform duration-200">
                        {getIconePlano(plano.nomePlano)}
                      </div>

                      {/* Nome do Plano */}
                      <h3 className="text-lg font-bold text-white leading-snug line-clamp-2 mt-1 min-h-[3rem]">
                        {plano.nomePlano}
                      </h3>
                    </div>

                    {/* Barra Inferior com Categoria/Objetivo */}
                    <div className="bg-[#125ec2] px-4 py-3 flex items-center justify-between text-xs text-white/95 border-t border-[#3b8ef7]/30">
                      <span className="truncate font-medium">
                        {plano.categoriaObjetivo || 'Criar um novo negócio'}
                      </span>
                      <a
                        href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${plano.idPlano}`}
                        target="_blank"
                        rel="noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1 hover:bg-white/20 rounded transition-colors"
                        title="Abrir diretamente no Sebrae PNBOX oficial"
                      >
                        <ExternalLink className="w-3.5 h-3.5 text-white/80 hover:text-white" />
                      </a>
                    </div>

                    {/* Camada Hover com Botões de Ação Direta */}
                    <div className="absolute inset-0 bg-[#0c4ca5]/95 backdrop-blur-xs opacity-0 group-hover:opacity-100 transition-opacity flex flex-col justify-center items-center gap-2.5 p-4 z-10">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectPlano(plano.idPlano);
                        }}
                        className="w-full py-2 px-3 bg-white text-[#1877f2] hover:bg-slate-100 rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <FolderOpen className="w-4 h-4" />
                        <span>Abrir Ferramentas (14)</span>
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAutoFillWithAi(plano.idPlano);
                        }}
                        className="w-full py-2 px-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-lg text-xs font-bold shadow transition-all flex items-center justify-center gap-2 cursor-pointer"
                      >
                        <Sparkles className="w-4 h-4 text-pink-200" />
                        <span>Preencher com IA</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* 3. Seção "Para você" (Conteúdos e Recomendações) */}
        <div className="mt-14">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold text-white tracking-tight">
              Para você
            </h2>
            <span className="text-xs text-indigo-300">
              Guias estratégicos do Sebrae com suporte de IA
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div
              onClick={onOpenAiCopilot}
              className="bg-[#24225b] hover:bg-[#2c296f] border border-[#37347a] rounded-xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-pink-500/20 text-pink-400 flex items-center justify-center mb-3">
                  <BrainCircuit className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white mb-1">
                  Como preencher seu plano em 3 minutos com IA
                </h3>
                <p className="text-xs text-indigo-200/80 line-clamp-3">
                  Utilize o Deep Research integrado ao Gemini para analisar o mercado brasileiro e preencher automaticamente as 14 ferramentas oficiais do Sebrae.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-pink-300 font-semibold">
                <span>Experimentar no Copiloto</span>
                <span>→</span>
              </div>
            </div>

            <div
              onClick={() => onSelectPlano('HCOQIkjSk97gGcfGDPb0h')}
              className="bg-[#24225b] hover:bg-[#2c296f] border border-[#37347a] rounded-xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-blue-500/20 text-blue-400 flex items-center justify-center mb-3">
                  <ShieldCheck className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white mb-1">
                  Defesai / AdeusMultas: Oportunidades 2025
                </h3>
                <p className="text-xs text-indigo-200/80 line-clamp-3">
                  Mercado de recursos contra multas NIC para frotas e pessoas físicas cresce mais de 28% ao ano com a digitalização dos Detrans.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-blue-300 font-semibold">
                <span>Ver ferramentas do plano</span>
                <span>→</span>
              </div>
            </div>

            <div
              onClick={onOpenCriarPlanoModal}
              className="bg-[#24225b] hover:bg-[#2c296f] border border-[#37347a] rounded-xl p-5 cursor-pointer transition-all shadow-md flex flex-col justify-between"
            >
              <div>
                <div className="w-10 h-10 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center mb-3">
                  <TrendingUp className="w-5 h-5" />
                </div>
                <h3 className="font-bold text-base text-white mb-1">
                  Simulador de Viabilidade e DRE
                </h3>
                <p className="text-xs text-indigo-200/80 line-clamp-3">
                  Calcule Ponto de Equilíbrio, Margem de Contribuição e Retorno sobre Investimento (ROI) em conformidade com as diretrizes contábeis do Sebrae.
                </p>
              </div>
              <div className="mt-4 pt-3 border-t border-white/10 flex items-center justify-between text-xs text-emerald-300 font-semibold">
                <span>Simular com IA</span>
                <span>→</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 4. Floating Action Button (FAB) Oficial - "+ Adicionar com IA" */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-30">
        <button
          onClick={onOpenCriarPlanoModal}
          className="flex items-center gap-2.5 px-6 py-3.5 bg-[#ff2d78] hover:bg-[#f01c68] text-white rounded-full font-bold text-sm shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Adicionar com IA</span>
        </button>
      </div>
    </div>
  );
};
