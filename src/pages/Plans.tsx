import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { usePlans } from '../contexts/PlansContext';
import {
  FolderKanban,
  Plus,
  Search,
  Building2,
  Sparkles,
  Edit3,
  Copy,
  Trash2,
  Archive,
  ExternalLink,
  CheckCircle2,
  Clock,
  AlertCircle,
  Filter,
  ChevronDown,
  Play,
  Layers,
  MoreVertical,
  RefreshCw,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'all', label: 'Todos' },
  { value: 'pesquisa', label: 'Pesquisa' },
  { value: 'preparacao', label: 'Preparação' },
  { value: 'pronto', label: 'Pronto' },
  { value: 'executando', label: 'Executando' },
  { value: 'concluido', label: 'Concluído' },
  { value: 'arquivado', label: 'Arquivado' },
];

function getStatusConfig(status: string) {
  switch (status) {
    case 'pronto': return { label: 'Pronto', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 };
    case 'preparacao': return { label: 'Preparação', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: Clock };
    case 'concluido': return { label: 'Concluído', color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20', icon: CheckCircle2 };
    case 'pesquisa': return { label: 'Pesquisa', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Search };
    case 'executando': return { label: 'Executando', color: 'text-purple-400 bg-purple-500/10 border-purple-500/20', icon: Play };
    case 'arquivado': return { label: 'Arquivado', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Archive };
    default: return { label: 'Rascunho', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: AlertCircle };
  }
}

export function PlansPage() {
  const navigate = useNavigate();
  const { plans, isLoading, fetchPlans, createPlan, deletePlan, duplicatePlan, archivePlan, error } = usePlans();
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | string>('all');
  const [showFilterMenu, setShowFilterMenu] = useState(false);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newPlanName, setNewPlanName] = useState('');
  const [newPlanSector, setNewPlanSector] = useState('');
  const [newPlanCity, setNewPlanCity] = useState('Brasil');
  const [newPlanDescription, setNewPlanDescription] = useState('');
  const [creating, setCreating] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    fetchPlans();
  }, [fetchPlans]);

  const filteredPlans = plans.filter((plan) => {
    const matchesSearch = plan.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.sector.toLowerCase().includes(searchQuery.toLowerCase()) ||
      plan.id.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === 'all' || plan.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleCreatePlan = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPlanName.trim()) return;

    setCreating(true);
    try {
      await createPlan({
        name: newPlanName.trim(),
        description: newPlanDescription.trim(),
        sector: newPlanSector.trim() || 'Não definido',
        city: newPlanCity.trim() || 'Brasil',
      });
      setShowCreateModal(false);
      setNewPlanName('');
      setNewPlanSector('');
      setNewPlanCity('Brasil');
      setNewPlanDescription('');
    } catch (err) {
      console.error('Erro ao criar plano:', err);
      alert('Erro ao criar plano. Tente novamente.');
    } finally {
      setCreating(false);
    }
  };

  const handleDeletePlan = async (id: string) => {
    if (!confirm('Tem certeza que deseja excluir este plano? Esta ação não pode ser desfeita.')) return;

    setDeletingId(id);
    try {
      await deletePlan(id);
    } catch (err) {
      console.error('Erro ao excluir plano:', err);
      alert('Erro ao excluir plano. Tente novamente.');
    } finally {
      setDeletingId(null);
    }
  };

  const handleDuplicatePlan = async (id: string) => {
    try {
      await duplicatePlan(id);
    } catch (err) {
      console.error('Erro ao duplicar plano:', err);
      alert('Erro ao duplicar plano. Tente novamente.');
    }
  };

  const handleArchivePlan = async (id: string) => {
    try {
      await archivePlan(id);
    } catch (err) {
      console.error('Erro ao arquivar plano:', err);
      alert('Erro ao arquivar plano. Tente novamente.');
    }
  };

  const handleOpenCreateModal = () => {
    setShowCreateModal(true);
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <FolderKanban className="w-7 h-7 text-indigo-400" />
            Gerenciar Planos
          </h1>
          <p className="text-slate-400 mt-1">{filteredPlans.length} plano(s) encontrado(s)</p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Plus className="w-4 h-4" />
          <span>Novo Plano</span>
        </button>
      </div>

      {/* Search & Filter */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-500" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Buscar por nome, setor ou ID..."
            className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl pl-10 pr-4 py-2.5 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>
        <div className="relative">
          <button
            onClick={() => setShowFilterMenu(!showFilterMenu)}
            className="flex items-center gap-2 px-4 py-2.5 bg-slate-950 border border-slate-700 rounded-xl text-sm font-medium text-slate-300 hover:bg-slate-800 hover:text-white transition-colors"
          >
            <Filter className="w-4 h-4" />
            <span>{STATUS_OPTIONS.find(o => o.value === statusFilter)?.label || 'Filtro'}</span>
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
          {showFilterMenu && (
            <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
              {STATUS_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => {
                    setStatusFilter(opt.value);
                    setShowFilterMenu(false);
                  }}
                  className={`w-full px-3 py-2 text-sm text-left transition-colors ${
                    statusFilter === opt.value
                      ? 'bg-indigo-600/20 text-indigo-300'
                      : 'text-slate-300 hover:bg-slate-800 hover:text-white'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Plans Grid */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl overflow-hidden">
        {isLoading ? (
          <div className="p-8 space-y-4">
            {[1,2,3].map(i => (
              <div key={i} className="p-4 animate-pulse">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-800"></div>
                  <div className="flex-1 space-y-2">
                    <div className="h-4 bg-slate-800 rounded w-1/4"></div>
                    <div className="h-3 bg-slate-800 rounded w-1/2"></div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : filteredPlans.length === 0 ? (
          <div className="p-12 text-center">
            <FolderKanban className="w-16 h-16 mx-auto text-slate-700 mb-4" />
            <h3 className="text-lg font-medium text-slate-300 mb-1">
              {searchQuery || statusFilter !== 'all' ? 'Nenhum plano encontrado' : 'Nenhum plano criado'}
            </h3>
            <p className="text-slate-500 mb-6">
              {searchQuery || statusFilter !== 'all'
                ? 'Tente ajustar sua busca ou filtros'
                : 'Comece criando seu primeiro plano de negócio'}
            </p>
            {!searchQuery && statusFilter === 'all' && (
              <button
                onClick={handleOpenCreateModal}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl font-semibold inline-flex items-center gap-2"
              >
                <Plus className="w-4 h-4" />
                Criar Primeiro Plano
              </button>
            )}
          </div>
        ) : (
          <div className="divide-y divide-slate-800">
            {filteredPlans.map((plan) => {
              const statusConfig = getStatusConfig(plan.status);
              const StatusIcon = statusConfig.icon;

              return (
                <div key={plan.id} className="p-4 hover:bg-slate-950/50 transition-colors">
                  <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                    <Link
                      to={`/plan/${plan.id}`}
                      className="flex items-center gap-4 min-w-0 flex-1 group"
                    >
                      <div className="w-12 h-12 rounded-xl bg-indigo-500/10 flex items-center justify-center text-indigo-400 shrink-0 group-hover:bg-indigo-500/20 group-hover:text-indigo-300 transition-colors">
                        <Building2 className="w-6 h-6" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="font-bold text-white truncate group-hover:text-indigo-300 transition-colors">{plan.name}</h3>
                        <div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-400">
                          <span className="truncate max-w-[200px]">{plan.sector}</span>
                          <span className="flex items-center gap-1">
                            <Building2 className="w-3.5 h-3.5" />
                            {plan.city}
                          </span>
                          <span className="font-mono text-xs text-slate-500">ID: {plan.id}</span>
                        </div>
                      </div>
                    </Link>

                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4 w-full sm:w-auto flex-shrink-0">
                      {/* Progress */}
                      <div className="w-full sm:w-40">
                        <div className="flex items-center justify-between text-xs mb-1">
                          <span className="text-slate-400">Progresso</span>
                          <span className="font-bold text-white">{plan.progress}%</span>
                        </div>
                        <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-indigo-500 to-blue-500 rounded-full transition-all duration-500"
                            style={{ width: `${plan.progress}%` }}
                          />
                        </div>
                      </div>

                      {/* Status Badge */}
                      <span className={`px-2.5 py-1 text-xs font-semibold rounded-full border ${statusConfig.color} flex items-center gap-1`}>
                        <StatusIcon className="w-3 h-3" />
                        {statusConfig.label}
                      </span>

                      {/* Tools filled */}
                      <span className="px-2.5 py-1 text-xs font-medium text-slate-400 bg-slate-900 rounded-full border border-slate-700 flex items-center gap-1">
                        <Layers className="w-3 h-3" />
                        {plan.toolsFilled}/14
                      </span>

                      {/* Actions Menu */}
                      <div className="relative">
                        <button
                          className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
                          aria-label="Mais opções"
                        >
                          <MoreVertical className="w-5 h-5" />
                        </button>
                        <div className="absolute right-0 top-full mt-1 w-40 bg-slate-900 border border-slate-700 rounded-xl shadow-2xl py-1 z-50 animate-in fade-in zoom-in-95">
                          <Link
                            to={`/plan/${plan.id}`}
                            className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <ExternalLink className="w-4 h-4" />
                            Abrir
                          </Link>
                          <button
                            onClick={() => handleDuplicatePlan(plan.id)}
                            className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                          >
                            <Copy className="w-4 h-4" />
                            Duplicar
                          </button>
                          {plan.status !== 'arquivado' && (
                            <button
                              onClick={() => handleArchivePlan(plan.id)}
                              className="w-full px-3 py-2 text-sm text-left text-slate-300 hover:bg-slate-800 hover:text-white transition-colors flex items-center gap-2"
                            >
                              <Archive className="w-4 h-4" />
                              Arquivar
                            </button>
                          )}
                          <button
                            onClick={() => handleDeletePlan(plan.id)}
                            disabled={deletingId === plan.id}
                            className="w-full px-3 py-2 text-sm text-left text-rose-400 hover:bg-rose-500/10 hover:text-rose-300 transition-colors flex items-center gap-2"
                          >
                            <Trash2 className="w-4 h-4" />
                            Excluir
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Create Plan Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 animate-in fade-in">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-emerald-400" />
                Novo Plano
              </h2>
              <button
                onClick={() => setShowCreateModal(false)}
                className="p-1 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <MoreVertical className="w-5 h-5 rotate-90" />
              </button>
            </div>

            <form onSubmit={handleCreatePlan} className="space-y-4">
              <div className="space-y-1.5">
                <label htmlFor="planName" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-indigo-400" />
                  Nome do Plano *
                </label>
                <input
                  id="planName"
                  type="text"
                  value={newPlanName}
                  onChange={(e) => setNewPlanName(e.target.value)}
                  placeholder="Ex: Cafeteria Premium"
                  disabled={creating}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 transition-all disabled:opacity-50"
                  required
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="planSector" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-emerald-400" />
                  Setor
                </label>
                <input
                  id="planSector"
                  type="text"
                  value={newPlanSector}
                  onChange={(e) => setNewPlanSector(e.target.value)}
                  placeholder="Ex: Alimentação & Coworking"
                  disabled={creating}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="planCity" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Building2 className="w-3.5 h-3.5 text-amber-400" />
                  Cidade / UF
                </label>
                <input
                  id="planCity"
                  type="text"
                  value={newPlanCity}
                  onChange={(e) => setNewPlanCity(e.target.value)}
                  placeholder="Ex: Curitiba / PR"
                  disabled={creating}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-amber-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-amber-500 transition-all disabled:opacity-50"
                />
              </div>

              <div className="space-y-1.5">
                <label htmlFor="planDescription" className="text-xs font-semibold text-slate-300 flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5 text-blue-400" />
                  Descrição (opcional)
                </label>
                <textarea
                  id="planDescription"
                  rows={3}
                  value={newPlanDescription}
                  onChange={(e) => setNewPlanDescription(e.target.value)}
                  placeholder="Descreva brevemente sua ideia de negócio..."
                  disabled={creating}
                  className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl px-4 py-3 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none transition-all disabled:opacity-50"
                />
              </div>

              {error && (
                <div className="p-3 bg-rose-950/50 border border-rose-500/30 rounded-xl text-rose-300 text-sm">
                  {error}
                </div>
              )}

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  disabled={creating}
                  className="flex-1 py-3 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl font-semibold transition-colors disabled:opacity-50"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creating || !newPlanName.trim()}
                  className="flex-1 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creating ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      <span>Criando...</span>
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4" />
                      <span>Criar Plano</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}