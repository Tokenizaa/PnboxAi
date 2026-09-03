import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Bell,
  Search,
  Building2,
  Plus,
  ChevronDown,
  User,
  LogOut,
  Settings,
  Sparkles,
  Sun,
  Moon,
} from 'lucide-react';
import { User as AuthUser } from '../../types/auth';
import { Plan } from '../../contexts/PlansContext';

interface TopbarProps {
  user: AuthUser | null;
  currentPlan: Plan | null;
  plans: Plan[];
  onPlanChange: (planId: string) => void;
  onMenuClick: () => void;
  onMobileMenuClick: () => void;
  mobileMenuOpen: boolean;
}

export function Topbar({
  user,
  currentPlan,
  plans,
  onPlanChange,
  onMenuClick,
  onMobileMenuClick,
  mobileMenuOpen,
}: TopbarProps) {
  const [showPlanSelector, setShowPlanSelector] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showNotifications, setShowNotifications] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const planSelectorRef = useRef<HTMLDivElement>(null);
  const userMenuRef = useRef<HTMLDivElement>(null);

  // Close dropdowns when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (planSelectorRef.current && !planSelectorRef.current.contains(event.target as Node)) {
        setShowPlanSelector(false);
      }
      if (userMenuRef.current && !userMenuRef.current.contains(event.target as Node)) {
        setShowUserMenu(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handlePlanSelect = (planId: string) => {
    onPlanChange(planId);
    setShowPlanSelector(false);
  };

  const handleCreatePlan = () => {
    setShowPlanSelector(false);
    // Navigate to plans page with new plan modal
    window.location.href = '/plans/new';
  };

  return (
    <header className="bg-slate-900/80 backdrop-blur-sm border-b border-slate-800 sticky top-0 z-30">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Left: Menu button + Brand (mobile) + Plan Selector */}
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <button
              onClick={onMenuClick}
              className="lg:hidden p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              aria-label="Abrir menu"
            >
              <Menu className="w-6 h-6" />
            </button>

            {/* Brand (mobile only) */}
            <Link to="/" className="lg:hidden flex items-center gap-2" onClick={onMobileMenuClick}>
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg">
                <Sparkles className="w-4 h-4" />
              </div>
              <span className="font-bold text-white">PNBOXAI</span>
            </Link>

            {/* Plan Selector (desktop) */}
            <div className="hidden lg:block relative" ref={planSelectorRef}>
              <button
                onClick={() => setShowPlanSelector(!showPlanSelector)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all"
                aria-label="Selecionar plano"
                aria-expanded={showPlanSelector}
              >
                <Building2 className="w-4 h-4 text-indigo-400" />
                <span className="truncate max-w-[200px] font-mono">
                  {currentPlan?.name || 'Selecione um plano'}
                </span>
                <ChevronDown className={`w-4 h-4 text-slate-400 transition-transform ${showPlanSelector ? 'rotate-180' : ''}`} />
              </button>

              {showPlanSelector && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  {/* Search */}
                  <div className="px-3 py-2">
                    <div className="relative">
                      <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                      <input
                        type="text"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        placeholder="Buscar plano..."
                        className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
                      />
                    </div>
                  </div>

                  {/* Plans list */}
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                    {plans.filter(p =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase())
                    ).map((plan) => (
                      <button
                        key={plan.id}
                        onClick={() => handlePlanSelect(plan.id)}
                        className={`w-full px-3 py-3 text-left transition-colors ${
                          currentPlan?.id === plan.id
                            ? 'bg-indigo-600/20 text-indigo-300'
                            : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                        }`}
                      >
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0">
                            <Building2 className="w-4 h-4" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="font-medium text-white truncate">{plan.name}</p>
                            <p className="text-xs text-slate-400 truncate">{plan.sector}</p>
                          </div>
                          {currentPlan?.id === plan.id && (
                            <Sparkles className="w-4 h-4 text-indigo-300 shrink-0" />
                          )}
                        </div>
                      </button>
                    ))}

                    {plans.length === 0 && (
                      <div className="px-3 py-4 text-center text-slate-500 text-sm">
                        Nenhum plano encontrado
                      </div>
                    )}
                  </div>

                  {/* Create new plan */}
                  <div className="p-3 border-t border-slate-800">
                    <button
                      onClick={handleCreatePlan}
                      className="w-full flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10 rounded-xl transition-colors"
                    >
                      <Plus className="w-4 h-4" />
                      <span>Criar novo plano</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Center: Search (desktop) */}
          <div className="hidden lg:flex-1 lg:max-w-xl mx-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar planos, ferramentas, documentação..."
                className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 text-sm"
              />
            </div>
          </div>

          {/* Right: Notifications, User Menu */}
          <div className="flex items-center gap-2">
            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setShowNotifications(!showNotifications)}
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors relative"
                aria-label="Notificações"
                aria-expanded={showNotifications}
              >
                <Bell className="w-5 h-5" />
                <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">3</span>
              </button>

              {showNotifications && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800 flex items-center justify-between">
                    <h3 className="font-bold text-white">Notificações</h3>
                    <button className="text-xs text-slate-400 hover:text-white">Marcar todas como lidas</button>
                  </div>
                  <div className="max-h-80 overflow-y-auto divide-y divide-slate-800">
                    <div className="px-3 py-3">
                      <p className="text-slate-400 text-sm">Pesquisa "Cafeteria Premium" concluída</p>
                      <p className="text-xs text-slate-500 mt-1">Há 10 minutos</p>
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-slate-400 text-sm">Execução DRY_RUN finalizada</p>
                      <p className="text-xs text-slate-500 mt-1">Há 1 hora</p>
                    </div>
                    <div className="px-3 py-3">
                      <p className="text-slate-400 text-sm">Novo plano "Loja de Roupas" criado</p>
                      <p className="text-xs text-slate-500 mt-1">Há 2 horas</p>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* User Menu */}
            <div className="relative" ref={userMenuRef}>
              <button
                onClick={() => setShowUserMenu(!showUserMenu)}
                className="flex items-center gap-2 px-3 py-2 bg-slate-950/50 border border-slate-800 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white hover:border-slate-700 transition-all"
                aria-label="Menu do usuário"
                aria-expanded={showUserMenu}
              >
                <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center text-indigo-400">
                  <User className="w-4 h-4" />
                </div>
                <span className="hidden sm:block truncate max-w-[120px]">{user?.name?.split(' ')[0] || 'Usuário'}</span>
                <ChevronDown className={`w-4 h-4 text-slate-400 hidden sm:block ${showUserMenu ? 'rotate-180' : ''}`} />
              </button>

              {showUserMenu && (
                <div className="absolute right-0 top-full mt-2 w-56 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl py-2 z-50 animate-in fade-in zoom-in-95">
                  <div className="px-3 py-2 border-b border-slate-800">
                    <p className="font-bold text-white truncate">{user?.name}</p>
                    <p className="text-xs text-slate-400 truncate">{user?.email}</p>
                  </div>
                  <Link
                    to="/system"
                    className="flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors"
                  >
                    <Settings className="w-4 h-4" />
                    <span>Configurações</span>
                  </Link>
                  <button
                    onClick={() => {}}
                    className="w-full flex items-center gap-2 px-3 py-2 text-slate-300 hover:text-white hover:bg-slate-800 transition-colors text-left"
                  >
                    <Sun className="w-4 h-4" />
                    <span>Tema (placeholder)</span>
                  </button>
                  <div className="border-t border-slate-800 my-2" />
                  <button
                    onClick={() => {
                      setShowUserMenu(false);
                      // Logout handled by parent
                    }}
                    className="w-full flex items-center gap-2 px-3 py-2 text-rose-400 hover:text-rose-300 hover:bg-rose-500/10 transition-colors text-left"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Sair</span>
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}