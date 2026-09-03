import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FolderKanban,
  Sparkles,
  Search,
  Layers,
  Play,
  History,
  Settings,
  Building2,
  ChevronRight,
  LogOut,
  User,
  Plus,
  X,
  Menu,
} from 'lucide-react';
import { User as AuthUser } from '../../types/auth';
import { Plan, usePlans } from '../../contexts/PlansContext';
import { usePlan } from '../../contexts/PlanContext';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  user: AuthUser | null;
  plans: Plan[];
  currentPlan: Plan | null;
  onPlanChange: (planId: string) => void;
  onCreatePlan: () => void;
  onLogout: () => void;
  isDashboard: boolean;
  isPlansPage: boolean;
  isPlanWorkspace: boolean;
  isSystem: boolean;
}

const NAV_ITEMS = [
  { path: '/', label: 'Dashboard', icon: LayoutDashboard },
  { path: '/plans', label: 'Planos', icon: FolderKanban },
] as const;

const PLAN_NAV_ITEMS = [
  { path: 'overview', label: 'Overview', icon: Building2 },
  { path: 'research', label: 'Pesquisa', icon: Search },
  { path: 'tools', label: 'Ferramentas PNBOX', icon: Layers },
  { path: 'execution', label: 'Execução', icon: Play },
  { path: 'history', label: 'Histórico', icon: History },
] as const;

export function Sidebar({
  isOpen,
  onClose,
  user,
  plans,
  currentPlan,
  onPlanChange,
  onCreatePlan,
  onLogout,
  isDashboard,
  isPlansPage,
  isPlanWorkspace,
  isSystem,
}: SidebarProps) {
  const location = useLocation();

  const isActive = (path: string) => {
    if (path === '/') return location.pathname === '/';
    return location.pathname.startsWith(path);
  };

  const isPlanActive = (path: string) => {
    return location.pathname === `/plan/${currentPlan?.id}/${path}`;
  };

  return (
    <>
      {/* Mobile close button */}
      <button
        className="lg:hidden fixed top-4 left-4 z-50 p-2 bg-slate-900 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
        onClick={onClose}
        aria-label="Fechar menu"
      >
        <X className="w-5 h-5" />
      </button>

      {/* Sidebar */}
      <aside
        className={`fixed lg:static inset-y-0 left-0 z-40 w-72 bg-slate-900 border-r border-slate-800 flex flex-col transform transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
        aria-label="Navegação principal"
      >
        <div className="flex flex-col h-full">
          {/* Logo & Brand */}
          <div className="p-4 border-b border-slate-800 flex-shrink-0">
            <Link to="/" className="flex items-center gap-3" onClick={onClose}>
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg shadow-indigo-500/20 shrink-0">
                <Sparkles className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <h1 className="font-bold text-white truncate">PNBOXAI</h1>
                <p className="text-xs text-slate-400 truncate">Plataforma de Planos de Negócio</p>
              </div>
            </Link>
          </div>

          {/* User info & Plan selector (when in plan workspace) */}
          {isPlanWorkspace && currentPlan && (
            <div className="p-4 border-b border-slate-800 flex-shrink-0 animate-in slide-in-from-top-2">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-semibold uppercase tracking-wider text-slate-400">Plano Atual</span>
              </div>
              <button
                onClick={() => {}}
                className="w-full flex items-center gap-3 p-3 bg-slate-950 border border-slate-800 rounded-xl text-left hover:border-indigo-500/50 hover:bg-indigo-950/20 transition-all"
              >
                <div className="w-10 h-10 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                  <Building2 className="w-5 h-5" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-white truncate">{currentPlan.name}</p>
                  <p className="text-xs text-slate-400 truncate">{currentPlan.sector}</p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
              </button>
              <p className="text-xs text-slate-500 mt-2 text-center">Clique no seletor no topo para trocar</p>
            </div>
          )}

          {/* Navigation */}
          <nav className="flex-1 p-3 space-y-1 overflow-y-auto" aria-label="Navegação">
            {/* Main navigation */}
            <div>
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Principal</p>
              <div className="space-y-1">
                {NAV_ITEMS.map((item) => {
                  const active = isActive(item.path);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.path}
                      to={item.path}
                      onClick={onClose}
                      className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                        active
                          ? 'bg-gradient-to-r from-indigo-600/30 to-blue-600/30 text-indigo-300 border border-indigo-500/50 font-bold shadow-sm'
                          : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                      }`}
                      aria-current={active ? 'page' : undefined}
                    >
                      <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-indigo-300' : 'text-slate-400'}`} />
                      <span>{item.label}</span>
                    </Link>
                  );
                })}
              </div>
            </div>

            {/* Plan workspace navigation */}
            {isPlanWorkspace && currentPlan && (
              <div className="pt-4 border-t border-slate-800">
                <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">
                  {currentPlan.name}
                </p>
                <div className="space-y-1">
                  {PLAN_NAV_ITEMS.map((item) => {
                    const active = isPlanActive(item.path);
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.path}
                        to={`/plan/${currentPlan.id}/${item.path}`}
                        onClick={onClose}
                        className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                          active
                            ? 'bg-emerald-600/20 text-emerald-400 border border-emerald-500/30 font-bold'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-emerald-300'
                        }`}
                        aria-current={active ? 'page' : undefined}
                      >
                        <Icon className={`w-5 h-5 shrink-0 ${active ? 'text-emerald-400' : 'text-slate-400'}`} />
                        <span>{item.label}</span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            )}

            {/* System */}
            <div className="pt-4 border-t border-slate-800">
              <p className="px-3 py-2 text-xs font-semibold uppercase tracking-wider text-slate-500">Sistema</p>
              <div className="space-y-1">
                <Link
                  to="/system"
                  onClick={onClose}
                  className={`flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                    isSystem
                      ? 'bg-slate-800 text-slate-300 border border-slate-700'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                  aria-current={isSystem ? 'page' : undefined}
                >
                  <Settings className="w-5 h-5 text-slate-400 shrink-0" />
                  <span>Configurações</span>
                </Link>
              </div>
            </div>
          </nav>

          {/* Footer - User & Actions */}
          <div className="p-3 border-t border-slate-800 flex-shrink-0">
            <div className="flex items-center gap-3 p-2 bg-slate-950/50 border border-slate-800 rounded-xl mb-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                <User className="w-4 h-4" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="font-medium text-white truncate">{user?.name || 'Usuário'}</p>
                <p className="text-xs text-slate-400 truncate">{user?.email}</p>
              </div>
            </div>
            <div className="flex flex-col gap-2">
              <button
                onClick={onCreatePlan}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Novo Plano</span>
              </button>
              <button
                onClick={onLogout}
                className="w-full flex items-center justify-center gap-2 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors font-medium"
              >
                <LogOut className="w-4 h-4" />
                <span>Sair</span>
              </button>
            </div>
          </div>
        </div>
      </aside>
    </>
  );
}