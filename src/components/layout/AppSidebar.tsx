import React from 'react';
import {
  Sparkles,
  PenLine,
  Layers,
  BookOpen,
  Map,
  Activity,
  CheckSquare,
  ShieldCheck,
  Cpu,
  X,
} from 'lucide-react';
import { AuthSessionState } from '../../types/pnbox';

export interface AppTabItem {
  id: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}

export const APP_TABS: AppTabItem[] = [
  { id: 'criar_plano_ia', label: 'Criar com IA (Deep Research)', icon: Sparkles },
  { id: 'preenchedor', label: 'Preenchedor Oficial', icon: PenLine },
  { id: 'fila_lote', label: 'Fila em Lote (Batch)', icon: Layers },
  { id: 'guia_dados', label: 'Guia & Schemas', icon: BookOpen },
  { id: 'mapa', label: 'Mapa Técnico', icon: Map },
  { id: 'trafego', label: 'Monitor de Tráfego', icon: Activity },
  { id: 'validador', label: 'Validador JSON', icon: CheckSquare },
  { id: 'autenticacao', label: 'Sessão Playwright', icon: ShieldCheck },
];

interface AppSidebarProps {
  activeTab: string;
  onSelectTab: (tab: string) => void;
  authSession: AuthSessionState;
  isOpen: boolean;
  onClose: () => void;
}

export function AppSidebar({ activeTab, onSelectTab, authSession, isOpen, onClose }: AppSidebarProps) {
  const isAuthenticated = authSession.status === 'authenticated' && !authSession.isExpired;

  return (
    <>
      {/* Mobile overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 lg:hidden"
          onClick={onClose}
          aria-hidden="true"
        />
      )}

      {/* Mobile close button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        onClick={onClose}
        aria-label="Fechar menu"
      >
        <X className="w-5 h-5" />
      </button>

      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Navegação do Hub"
      >
        <div className="flex flex-col h-full">
          {/* Brand */}
          <div className="p-4 border-b border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Cpu className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white truncate">PNBOX Automation Hub</h1>
                <p className="text-xs text-slate-400 truncate">Meteor DDP • Plano: {authSession.idPlano}</p>
              </div>
            </div>
          </div>

          {/* Status */}
          <div className="px-4 pt-4 flex-shrink-0">
            <span
              className={`inline-flex items-center gap-2 px-2.5 py-1 text-xs font-medium rounded-lg border ${
                isAuthenticated
                  ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                  : 'bg-rose-950/40 border-rose-500/40 text-rose-300'
              }`}
            >
              <span
                className={`relative flex h-2 w-2 ${isAuthenticated ? '' : 'animate-pulse'}`}
              >
                <span
                  className={`relative inline-flex rounded-full h-2 w-2 ${
                    isAuthenticated ? 'bg-emerald-400' : 'bg-rose-400'
                  }`}
                ></span>
              </span>
              {isAuthenticated ? 'PNBOX Online' : 'PNBOX Offline'}
            </span>
          </div>

          {/* Navigation */}
          <nav className="flex-1 p-3 pt-5 space-y-1 overflow-y-auto" aria-label="Páginas">
            <p className="px-3 py-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Páginas</p>
            <div className="space-y-1">
              {APP_TABS.map((item) => {
                const active = activeTab === item.id;
                const Icon = item.icon;
                return (
                  <button
                    key={item.id}
                    onClick={() => {
                      onSelectTab(item.id);
                      onClose();
                    }}
                    className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all text-left ${
                      active
                        ? 'bg-gradient-to-r from-indigo-600/30 to-blue-600/30 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm'
                        : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                    }`}
                    aria-current={active ? 'page' : undefined}
                  >
                    <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-300' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </button>
                );
              })}
            </div>
          </nav>

          {/* Footer */}
          <div className="p-3 border-t border-slate-800 flex-shrink-0">
            <p className="text-[11px] text-slate-500 font-mono px-2">
              Sebrae PNBOX Oficial • Engenharia Reversa
            </p>
          </div>
        </div>
      </aside>
    </>
  );
}
