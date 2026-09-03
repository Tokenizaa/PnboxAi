import React, { useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  History,
  Clock,
  User,
  Database,
  CheckCircle2,
  AlertCircle,
  Search,
  Sparkles,
  Play,
  Edit3,
  Layers,
} from 'lucide-react';

interface HistoryEvent {
  id: string;
  timestamp: string;
  type: 'created' | 'research' | 'edit' | 'execute' | 'archive' | 'duplicate';
  action: string;
  user: string;
  details?: string;
  status: 'success' | 'warning' | 'error' | 'info';
}

const mockHistory: HistoryEvent[] = [
  {
    id: '1',
    timestamp: '2025-01-18T14:30:00Z',
    type: 'execute',
    action: 'Execução DRY_RUN das 14 ferramentas',
    user: 'Sistema',
    details: '14 ferramentas validadas - 142 registros',
    status: 'success',
  },
  {
    id: '2',
    timestamp: '2025-01-15T10:30:00Z',
    type: 'research',
    action: 'Pesquisa de mercado concluída',
    user: 'João',
    details: 'Iteração 3/3 - Suficiência: 87%',
    status: 'success',
  },
  {
    id: '3',
    timestamp: '2025-01-12T09:00:00Z',
    type: 'research',
    action: 'Deep Research iniciado',
    user: 'João',
    details: 'Iteração 1/3',
    status: 'info',
  },
  {
    id: '4',
    timestamp: '2025-01-10T16:45:00Z',
    type: 'edit',
    action: 'Editou Proposta de Valor',
    user: 'João',
    details: 'Campo "tarefasCliente" alterado',
    status: 'info',
  },
  {
    id: '5',
    timestamp: '2025-01-05T11:20:00Z',
    type: 'edit',
    action: 'Editou Análise de Concorrência',
    user: 'João',
    status: 'info',
  },
  {
    id: '6',
    timestamp: '2025-01-01T10:00:00Z',
    type: 'created',
    action: 'Plano criado',
    user: 'João',
    details: 'Método: Deep Research IA',
    status: 'success',
  },
];

const eventTypeConfig = {
  created: { icon: Sparkles, label: 'Criação', color: 'text-emerald-400 bg-emerald-500/10' },
  research: { icon: Search, label: 'Pesquisa', color: 'text-blue-400 bg-blue-500/10' },
  edit: { icon: Edit3, label: 'Edição', color: 'text-indigo-400 bg-indigo-500/10' },
  execute: { icon: Play, label: 'Execução', color: 'text-purple-400 bg-purple-500/10' },
  archive: { icon: Layers, label: 'Arquivo', color: 'text-slate-400 bg-slate-500/10' },
  duplicate: { icon: Layers, label: 'Duplicação', color: 'text-amber-400 bg-amber-500/10' },
};

const statusConfig = {
  success: { icon: CheckCircle2, color: 'text-emerald-400' },
  warning: { icon: AlertCircle, color: 'text-amber-400' },
  error: { icon: AlertCircle, color: 'text-rose-400' },
  info: { icon: Clock, color: 'text-slate-400' },
};

export function PlanHistoryPage() {
  const { planId } = useParams<{ planId: string }>();
  const [filter, setFilter] = useState<string>('all');

  const filteredHistory = filter === 'all' ? mockHistory : mockHistory.filter((e) => e.type === filter);

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <History className="w-7 h-7 text-amber-400" />
          Histórico de Atividades
        </h1>
        <p className="text-slate-400 mt-1">Log completo de ações neste plano</p>
      </div>

      {/* Filters */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4 flex flex-wrap gap-2">
        {['all', 'created', 'research', 'edit', 'execute'].map((f) => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl transition-colors ${
              filter === f
                ? 'bg-indigo-600 text-white'
                : 'bg-slate-950 text-slate-400 hover:bg-slate-800 hover:text-white'
            }`}
          >
            {f === 'all' ? 'Todos' : eventTypeConfig[f as keyof typeof eventTypeConfig]?.label || f}
          </button>
        ))}
      </div>

      {/* Timeline */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        {filteredHistory.length === 0 ? (
          <div className="text-center py-8">
            <History className="w-12 h-12 mx-auto text-slate-700 mb-2" />
            <p className="text-slate-400">Nenhuma atividade registrada</p>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredHistory.map((event, idx) => {
              const typeConfig = eventTypeConfig[event.type];
              const sConfig = statusConfig[event.status];
              const TypeIcon = typeConfig.icon;
              const StatusIcon = sConfig.icon;

              return (
                <div key={event.id} className="flex gap-4 relative">
                  {/* Timeline line */}
                  {idx < filteredHistory.length - 1 && (
                    <div className="absolute left-[19px] top-12 w-0.5 h-full bg-slate-800 -z-0" />
                  )}

                  {/* Icon */}
                  <div className={`shrink-0 w-10 h-10 rounded-xl ${typeConfig.color} flex items-center justify-center z-10`}>
                    <TypeIcon className="w-5 h-5" />
                  </div>

                  {/* Content */}
                  <div className="flex-1 pb-4">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-white flex items-center gap-2">
                        {event.action}
                        <StatusIcon className={`w-4 h-4 ${sConfig.color}`} />
                      </h3>
                      <span className="text-xs text-slate-500 font-mono">
                        {new Date(event.timestamp).toLocaleString('pt-BR')}
                      </span>
                    </div>
                    {event.details && (
                      <p className="text-sm text-slate-400">{event.details}</p>
                    )}
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-500">
                      <User className="w-3 h-3" />
                      <span>{event.user}</span>
                      <span>•</span>
                      <span className="px-1.5 py-0.5 bg-slate-950 rounded-md text-slate-400">{typeConfig.label}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Info Note */}
      <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-4 flex items-start gap-3">
        <Database className="w-5 h-5 text-indigo-400 shrink-0 mt-0.5" />
        <div>
          <p className="text-sm font-bold text-white">Histórico imutável</p>
          <p className="text-xs text-slate-400 mt-1">
            Todas as ações neste plano são registradas com timestamp, usuário e detalhes. O histórico é preservado para auditoria.
          </p>
        </div>
      </div>
    </div>
  );
}