import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { useResearch } from '../contexts/ResearchContext';
import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';
import {
  Layers,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  ArrowRight,
  Play,
  Loader2,
  RefreshCw,
} from 'lucide-react';

type ToolStatus = 'completed' | 'in_progress' | 'pending' | 'warning';

export function PlanToolsPage() {
  const { planId } = useParams<{ planId: string }>();
  const { currentPlan, fetchPlan, updatePlanProgress } = usePlan();
  const { report } = useResearch();
  const [toolStatus, setToolStatus] = useState<Record<string, ToolStatus>>({});
  const [generating, setGenerating] = useState(false);

  useEffect(() => {
    if (planId) {
      fetchPlan(planId);
    }
  }, [planId, fetchPlan]);

  // Derive tool status from research report
  useEffect(() => {
    if (report?.pnboxCollections) {
      const status: Record<string, ToolStatus> = {};
      for (const tool of FERRAMENTAS_PNBOX) {
        const items = report.pnboxCollections[tool.collectionName];
        if (items && items.length > 0) {
          status[tool.id] = 'completed';
        } else if (report) {
          status[tool.id] = 'pending';
        } else {
          status[tool.id] = 'pending';
        }
      }
      setToolStatus(status);
    } else if (currentPlan) {
      // Default status based on plan progress
      const status: Record<string, ToolStatus> = {};
      const completedCount = Math.floor((currentPlan.toolsFilled / 14) * FERRAMENTAS_PNBOX.length);
      FERRAMENTAS_PNBOX.forEach((tool, idx) => {
        status[tool.id] = idx < completedCount ? 'completed' : 'pending';
      });
      setToolStatus(status);
    }
  }, [report, currentPlan]);

  const groupedTools = FERRAMENTAS_PNBOX.reduce((acc, tool) => {
    if (!acc[tool.blocoLabel]) acc[tool.blocoLabel] = [];
    acc[tool.blocoLabel].push(tool);
    return acc;
  }, {} as Record<string, typeof FERRAMENTAS_PNBOX>);

  const completedCount = Object.values(toolStatus).filter((s) => s === 'completed').length;
  const totalCount = FERRAMENTAS_PNBOX.length;
  const progressPercent = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  const handleGenerateTools = async () => {
    if (!planId || !report) return;
    setGenerating(true);
    try {
      // In a real implementation, this would call the PnboxAdapter
      // For now, we'll simulate the generation
      await new Promise(r => setTimeout(r, 1500));
      
      // Update plan progress
      await updatePlanProgress(100);
      
      // Refresh tool status
      const status: Record<string, ToolStatus> = {};
      for (const tool of FERRAMENTAS_PNBOX) {
        const items = report.pnboxCollections?.[tool.collectionName];
        status[tool.id] = items && items.length > 0 ? 'completed' : 'pending';
      }
      setToolStatus(status);
    } catch (err) {
      console.error('Erro ao gerar ferramentas:', err);
    } finally {
      setGenerating(false);
    }
  };

  const handleViewToolData = (collectionName: string) => {
    const items = report?.pnboxCollections?.[collectionName];
    if (items && items.length > 0) {
      console.log(`Data for ${collectionName}:`, items);
      alert(`${items.length} registro(s) gerado(s) para ${collectionName}. Ver console para detalhes.`);
    } else {
      alert('Nenhum dado gerado ainda para esta ferramenta.');
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
            <Layers className="w-7 h-7 text-indigo-400" />
            Ferramentas PNBOX
          </h1>
          <p className="text-slate-400 mt-1">
            {completedCount} de {totalCount} ferramentas preenchidas ({Math.round(progressPercent)}%)
          </p>
        </div>
        <Link
          to={`/plan/${planId}/execution`}
          className="px-4 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold rounded-2xl shadow-lg shadow-emerald-600/30 transition-all flex items-center gap-2 shrink-0"
        >
          <Play className="w-4 h-4" />
          <span>Executar no PNBOX</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* Overall Progress */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
        <div className="flex items-center justify-between mb-2">
          <span className="text-sm font-semibold text-slate-300">Progresso Geral</span>
          <span className="text-sm font-mono font-bold text-white">{Math.round(progressPercent)}%</span>
        </div>
        <div className="h-3 bg-slate-800 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-indigo-500 via-blue-500 to-emerald-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Generate Tools Button */}
      {report && completedCount < totalCount && (
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-4">
          <button
            onClick={handleGenerateTools}
            disabled={generating}
            className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {generating ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Gerando ferramentas...</span>
              </>
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                <span>Gerar 14 Ferramentas do Modelo Canônico</span>
              </>
            )}
          </button>
          <p className="text-xs text-slate-400 mt-2 text-center">
            Mapeia o Modelo Canônico para as 14 coleções do PNBOX usando o Schema Catalog
          </p>
        </div>
      )}

      {/* Tools by Bloco */}
      <div className="space-y-6">
        {Object.entries(groupedTools).map(([bloco, tools]) => (
          <div key={bloco} className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
            <h2 className="text-lg font-bold text-white mb-4">{bloco}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {tools.map((tool) => {
                const status = toolStatus[tool.id] || 'pending';
                const statusConfig = {
                  completed: { label: 'Preenchida', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20', icon: CheckCircle2 },
                  in_progress: { label: 'Em revisão', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20', icon: Loader2 },
                  pending: { label: 'Pendente', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20', icon: Clock },
                  warning: { label: 'Atenção', color: 'text-amber-400 bg-amber-500/10 border-amber-500/20', icon: AlertCircle },
                };
                const c = statusConfig[status];
                const StatusIcon = c.icon;

                return (
                  <div
                    key={tool.id}
                    className={`p-4 border rounded-2xl ${c.color} transition-all hover:scale-[1.02]`}
                  >
                    <div className="flex items-start justify-between gap-2 mb-2">
                      <h3 className="font-bold text-white text-sm flex-1">{tool.nome}</h3>
                      <span className="px-2 py-0.5 text-[10px] font-bold rounded-full bg-slate-900 border border-current flex items-center gap-1 shrink-0">
                        <StatusIcon className={`w-3 h-3 ${status === 'in_progress' ? 'animate-spin' : ''}`} />
                        {c.label}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 mb-3 line-clamp-2">{tool.descricao}</p>
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-mono text-slate-500">{tool.camposSchema.length} campos</span>
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleViewToolData(tool.collectionName)}
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors text-xs"
                        >
                          <span>Ver dados</span>
                        </button>
                        <a
                          href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${currentPlan?.id || planId}/${tool.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors text-xs"
                        >
                          <span>Abrir no PNBOX</span>
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}