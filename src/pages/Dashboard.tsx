import React, { useEffect } from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { usePlans } from '../contexts/PlansContext';
import {
  FolderKanban,
  Building2,
  Search,
  Layers,
  Play,
  History,
  Plus,
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertCircle,
  Sparkles,
  Settings,
  ExternalLink,
  RefreshCw,
} from 'lucide-react';

export function DashboardPage() {
  const { user } = useAuth();
  const { plans, isLoading, fetchPlans, error } = usePlans();

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const stats = {
    totalPlans: plans.length,
    inResearch: plans.filter(p => p.researchStatus === 'in_progress').length,
    inPreparation: plans.filter(p => p.status === 'preparacao' || p.status === 'pesquisa').length,
    completed: plans.filter(p => p.status === 'concluido').length,
  };

  const getStatusConfig = (status: string) => {
    switch (status) {
      case 'pronto':
        return { label: 'Pronto p/ Execução', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
      case 'preparacao':
        return { label: 'Em Preparação', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock };
      case 'concluido':
        return { label: 'Concluído', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 };
      case 'pesquisa':
        return { label: 'Pesquisa', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Search };
      case 'executando':
        return { label: 'Executando', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Play };
      case 'arquivado':
        return { label: 'Arquivado', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: AlertCircle };
      default:
        return { label: 'Rascunho', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: AlertCircle };
    }
  };

  const getResearchStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'in_progress': return { label: 'Em andamento', icon: RefreshCw, color: 'text-blue-400' };
      case 'failed': return { label: 'Falhou', icon: AlertCircle, color: 'text-rose-400' };
      default: return { label: 'Pendente', icon: Clock, color: 'text-slate-400' };
    }
  };

  const getExecutionStatusConfig = (status: string) => {
    switch (status) {
      case 'completed': return { label: 'Concluída', icon: CheckCircle2, color: 'text-emerald-400' };
      case 'in_progress': return { label: 'Em andamento', icon: Play, color: 'text-blue-400' };
      case 'failed': return { label: 'Falhou', icon: AlertCircle, color: 'text-rose-400' };
      default: return { label: 'Pendente', icon: Clock, color: 'text-slate-400' };
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Olá, {user?.name?.split(' ')[0] || 'Usuário'}</h1>
            <p className="text-slate-400 mt-1">Carregando seus planos...</p>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1,2,3,4].map(i => (
            <div key={i} className="p-5 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse">
              <div className="h-4 bg-slate-700 rounded w-3/4 mb-4"></div>
              <div className="h-8 bg-slate-700 rounded w-1/2"></div>
            </div>
          ))}
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-8 animate-in fade-in duration-300">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white">Olá, {user?.name?.split(' ')[0] || 'Usuário'}</h1>
            <p className="text-slate-400 mt-1">Gerencie seus planos de negócio no PNBOX do Sebrae</p>
          </div>
        </div>
        <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-6 text-center">
          <AlertCircle className="w-12 h-12 mx-auto text-rose-400 mb-4" />
          <h3 className="text-lg font-medium text-rose-300 mb-1">Erro ao carregar planos</h3>
          <p className="text-rose-200/80 mb-4">{error}</p>
          <button
            onClick={fetchPlans}
            className="px-4 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Tentar novamente
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Welcome Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white">Olá, {user?.name?.split(' ')[0] || 'Usuário'}</h1>
          <p className="text-slate-400 mt-1">Gerencie seus planos de negócio no PNBOX do Sebrae</p>
        </div>
        <Link
          to="/plans/new"
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </Link>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          label="Total de Planos"
          value={stats.totalPlans}
          icon={FolderKanban}
          color="indigo"
        />
        <StatCard
          label="Em Pesquisa"
          value={stats.inResearch}
          icon={Search}
          color="blue"
        />
        <StatCard
          label="Em Preparação"
          value={stats.inPreparation}
          icon={Layers}
          color="amber"
        />
        <StatCard
          label="Concluídos"
          value={stats.completed}
          icon={CheckCircle2}
          color="emerald"
        />
      </div>

      {/* Plans List */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-5 h-5 text-indigo-400" />
            Seus Planos
          </h2>
          <Link
            to="/plans"
            className="text-sm text-indigo-400 hover:text-indigo-300 font-medium flex items-center gap-1"
          >
            Ver todos
            <Sparkles className="w-3.5 h-3.5" />
          </Link>
        </div>

        {plans.length === 0 ? (
          <div className="text-center py-12">
            <FolderKanban className="w-16 h-16 mx-auto text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-1">Nenhum plano criado</h3>
            <p className="text-slate-500 mb-4">Comece criando seu primeiro plano de negócio</p>
            <Link
              to="/plans/new"
              className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-sm font-semibold transition-colors inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              Criar Plano
            </Link>
          </div>
        ) : (
          <div className="space-y-4">
            {plans.slice(0, 5).map((plan) => {
              const statusConfig = getStatusConfig(plan.status);
              const researchConfig = getResearchStatusConfig(plan.researchStatus);
              const executionConfig = getExecutionStatusConfig(plan.executionStatus);
              const StatusIcon = statusConfig.icon;
              const ResearchIcon = researchConfig.icon;
              const ExecutionIcon = executionConfig.icon;

              return (
                <Link
                  key={plan.id}
                  to={`/plan/${plan.id}`}
                  className="group block p-4 bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 rounded-2xl transition-all"
                >
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <div className="flex items-center gap-4 min-w-0">
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate">{plan.name}</h3>
                        <p className="text-sm text-slate-400 truncate">{plan.sector}</p>
                      </div>
                    </div>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 sm:gap-6 w-full sm:w-auto">
                      {/* Progress */}
                      <div className="w-full sm:w-48">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Progresso</span>
                          <span className="font-bold text-white">{plan.progress}%</span>
                        </div>
                        <div className="h-2 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status */}
                      <div className="flex items-center gap-2">
                        <span
                          className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig.color}`}
                        >
                          <StatusIcon className="w-3 h-3 inline mr-1" />
                          {statusConfig.label}
                        </span>
                      </div>

                      {/* Research/Execution Status */}
                      <div className="flex items-center gap-4 text-xs text-slate-400">
                        <span className={`flex items-center gap-1 ${researchConfig.color}`}>
                          <ResearchIcon className="w-3.5 h-3.5" />
                          {researchConfig.label}
                        </span>
                        <span className={`flex items-center gap-1 ${executionConfig.color}`}>
                          <ExecutionIcon className="w-3.5 h-3.5" />
                          {executionConfig.label}
                        </span>
                      </div>
                    </div>
                  </div>
                </Link>
              );
            })}

            {plans.length > 5 && (
              <Link
                to="/plans"
                className="block p-4 text-center bg-slate-950/50 border border-slate-800 hover:border-indigo-500/30 rounded-2xl transition-all text-indigo-400 font-medium"
              >
                Ver mais {plans.length - 5} plano(s)
              </Link>
            )}
          </div>
        )}

        {/* Quick Actions */}
        <div className="mt-6 pt-6 border-t border-slate-800 grid grid-cols-1 sm:grid-cols-3 gap-3">
          <Link
            to="/plans"
            className="p-4 bg-slate-950 border border-slate-800 hover:border-indigo-500/30 rounded-2xl transition-all text-center"
          >
            <FolderKanban className="w-6 h-6 mx-auto text-indigo-400 mb-2" />
            <p className="font-medium text-white">Gerenciar Planos</p>
            <p className="text-xs text-slate-400 mt-1">Ver, editar, duplicar, arquivar</p>
          </Link>
          <Link
            to="/plans/new"
            className="p-4 bg-slate-950 border border-slate-800 hover:border-emerald-500/30 rounded-2xl transition-all text-center"
          >
            <Sparkles className="w-6 h-6 mx-auto text-emerald-400 mb-2" />
            <p className="font-medium text-white">Criar com IA</p>
            <p className="text-xs text-slate-400 mt-1">Deep Research + 14 ferramentas</p>
          </Link>
          <Link
            to="/system"
            className="p-4 bg-slate-950 border border-slate-800 hover:border-slate-700 rounded-2xl transition-all text-center"
          >
            <Settings className="w-6 h-6 mx-auto text-slate-400 mb-2" />
            <p className="font-medium text-white">Configurações</p>
            <p className="text-xs text-slate-400 mt-1">Sessão, API, preferências</p>
          </Link>
        </div>
      </div>
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: number;
  icon: React.ComponentType<{ className?: string }>;
  color: 'indigo' | 'blue' | 'amber' | 'emerald';
}) {
  const colors = {
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    emerald: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
  };

  return (
    <div className={`p-5 bg-slate-900/50 border rounded-2xl ${colors[color]}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="text-3xl font-bold text-white mt-1">{value}</p>
        </div>
        <div className="w-12 h-12 rounded-xl flex items-center justify-center">
          <Icon className="w-6 h-6" />
        </div>
      </div>
    </div>
  );
}