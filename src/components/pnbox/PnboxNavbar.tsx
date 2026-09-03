import React from 'react';
import {
  Sparkles,
  Cloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  SlidersHorizontal,
  Info,
  User,
  Settings,
  Shield,
  Layers
} from 'lucide-react';
import { AuthSessionState } from '../../types/pnbox';

interface PnboxNavbarProps {
  authSession: AuthSessionState;
  onOpenBackendSettings: () => void;
  onOpenAiCopilot: () => void;
  onNavigateHome: () => void;
  currentView: 'plans' | 'tools_matrix' | 'tool_detail';
  userName?: string;
}

export const PnboxNavbar: React.FC<PnboxNavbarProps> = ({
  authSession,
  onOpenBackendSettings,
  onOpenAiCopilot,
  onNavigateHome,
  currentView,
  userName = 'OSVALDO LESSA FARIAS NETTO'
}) => {
  const isLive = authSession.modoExecucao === 'LIVE';
  const isAuthenticated = authSession.status === 'authenticated' && !authSession.isExpired;

  return (
    <header className="w-full bg-[#18163f] border-b border-[#2d2a63] text-white select-none">
      {/* 1. Barra de Acessibilidade Superior (Oficial PNBOX) */}
      <div className="w-full bg-[#131135] px-4 sm:px-8 py-1.5 flex items-center justify-between text-[11px] text-slate-300 border-b border-[#242152]">
        <div className="flex items-center gap-4">
          <span className="flex items-center gap-1.5 font-medium text-slate-400">
            Acessibilidade
            <button
              className="w-4 h-4 rounded-full border border-slate-400 flex items-center justify-center text-[9px] hover:text-white"
              title="Alto Contraste"
            >
              ◑
            </button>
          </span>
          <div className="flex items-center gap-1 bg-white/5 px-2 py-0.5 rounded border border-white/10 text-[10px] font-mono">
            <button className="hover:text-white px-1" title="Diminuir fonte">A-</button>
            <button className="hover:text-white px-1 font-bold" title="Fonte normal">A</button>
            <button className="hover:text-white px-1" title="Aumentar fonte">A+</button>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="https://sebrae.com.br"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 hover:text-white text-slate-400 transition-colors"
          >
            <span>Ir para o Portal Sebrae</span>
            <span className="text-indigo-400">→</span>
          </a>
        </div>
      </div>

      {/* 2. Barra Principal com Logo PNBOX Oficial + Camada de IA */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 py-3 flex items-center justify-between gap-4">
        {/* Logo PNBOX Oficial */}
        <div
          onClick={onNavigateHome}
          className="flex items-center gap-3 cursor-pointer group"
          title="Ir para Meus Planos PNBOX"
        >
          {/* Logo 4 blocos geométricos idêntico ao oficial */}
          <div className="w-8 h-8 grid grid-cols-2 gap-0.5 p-0.5 bg-[#252258] rounded-md shadow-inner">
            <div className="bg-[#ff2d78] rounded-[2px] shadow-sm"></div>
            <div className="bg-[#1877f2] rounded-[2px] shadow-sm"></div>
            <div className="bg-[#4f46e5] rounded-[2px] shadow-sm"></div>
            <div className="bg-[#00c6ff] rounded-[2px] shadow-sm"></div>
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-1.5">
              <span className="text-xl font-black tracking-tight text-white font-sans lowercase">
                pnbox
              </span>
              <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.2 bg-gradient-to-r from-pink-500/20 to-indigo-500/20 text-pink-300 border border-pink-500/30 rounded-full font-mono">
                + IA Copilot
              </span>
            </div>
            <span className="text-[9px] text-indigo-300/80 -mt-0.5 hidden sm:inline">
              Sebrae • Plano de Negócios Inteligente
            </span>
          </div>
        </div>

        {/* Camada Central: Status do Copiloto IA & Conexão Sebrae */}
        <div className="hidden md:flex items-center gap-3">
          {/* Botão de Ativação do Copiloto IA */}
          <button
            onClick={onOpenAiCopilot}
            className="flex items-center gap-2 px-3 py-1.5 bg-gradient-to-r from-indigo-600 to-pink-600 hover:from-indigo-500 hover:to-pink-500 text-white rounded-full text-xs font-semibold shadow-md shadow-pink-600/20 transition-all hover:scale-105 active:scale-95"
            title="Abrir Copiloto IA para sugerir ideias, personas e finanças"
          >
            <Sparkles className="w-3.5 h-3.5 text-pink-200 animate-pulse" />
            <span>Copiloto IA Ativo</span>
            <span className="px-1.5 py-0.2 bg-white/20 rounded-full text-[10px] font-mono">Gemini</span>
          </button>

          {/* Badge de Conexão com Sebrae */}
          <button
            onClick={onOpenBackendSettings}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-all cursor-pointer ${
              isAuthenticated
                ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300 hover:bg-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/30 text-amber-300 hover:bg-amber-500/20'
            }`}
            title="Clique para ver o status da conexão Sebrae, DDP e credenciais"
          >
            <span className="relative flex h-2 w-2">
              <span className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${
                isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
              <span className={`relative inline-flex rounded-full h-2 w-2 ${
                isAuthenticated ? 'bg-emerald-400' : 'bg-amber-400'
              }`}></span>
            </span>
            <span>
              {isLive ? 'Sebrae LIVE' : 'Sebrae Simulado (DRY_RUN)'}
            </span>
          </button>
        </div>

        {/* Lado Direito: Ações, Info, Perfil Oficial */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Botão de configurações/backend (discreto, não polui a tela) */}
          <button
            onClick={onOpenBackendSettings}
            className="p-2 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
            title="Configurações de Conexão, Schemas e Ferramentas de Backend"
          >
            <Settings className="w-4 h-4" />
          </button>

          {/* Ícone de Informações */}
          <button
            onClick={() => {
              alert('PNBOX + IA Copilot: Plataforma que expande o Sebrae PNBOX com inteligência artificial para geração automática de todas as ferramentas de negócio.');
            }}
            className="w-7 h-7 rounded-full bg-white/5 hover:bg-white/10 border border-white/10 flex items-center justify-center text-slate-300 hover:text-white text-xs font-serif italic transition-colors"
            title="Sobre o PNBOX"
          >
            i
          </button>

          {/* Avatar do Usuário (Identidade do Screenshot) */}
          <div
            onClick={onOpenBackendSettings}
            className="flex items-center gap-2 pl-2 border-l border-white/10 cursor-pointer group"
            title={`Conectado como ${userName}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-indigo-500 to-blue-500 text-white flex items-center justify-center font-bold text-xs shadow-inner">
              <User className="w-4 h-4" />
            </div>
            <div className="hidden xl:flex flex-col text-left">
              <span className="text-xs font-semibold text-white truncate max-w-[150px]">
                {userName.split(' ')[0]} {userName.split(' ')[1] || ''}
              </span>
              <span className="text-[10px] text-indigo-300/70">
                {isLive ? 'Conta Oficial Sebrae' : 'Ambiente Local Seguro'}
              </span>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
