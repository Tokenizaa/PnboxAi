import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { useResearch } from '../contexts/ResearchContext';
import {
  Search,
  Sparkles,
  FileSearch,
  Database,
  Layers,
  CheckCircle2,
  Clock,
  PlayCircle,
  AlertCircle,
  TrendingUp,
  Users,
  DollarSign,
  ArrowRight,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  Loader2,
} from 'lucide-react';

interface ResearchStep {
  id: string;
  label: string;
  status: 'completed' | 'in_progress' | 'pending';
  category?: string;
}

const initialSteps: ResearchStep[] = [
  { id: 'planning', label: 'Planejamento', status: 'pending', category: 'Setup' },
  { id: 'market', label: 'Mercado', status: 'pending', category: 'Análise' },
  { id: 'customers', label: 'Clientes', status: 'pending', category: 'Análise' },
  { id: 'competitors', label: 'Concorrentes', status: 'pending', category: 'Análise' },
  { id: 'financial', label: 'Financeiro', status: 'pending', category: 'Análise' },
  { id: 'regulatory', label: 'Regulatório', status: 'pending', category: 'Análise' },
];

export function PlanResearchPage() {
  const { planId } = useParams<{ planId: string }>();
  const { currentPlan, fetchPlan } = usePlan();
  const { startResearch, fetchResearch, isLoading, error, report, currentStep, progress } = useResearch();
  const [idea, setIdea] = useState('');
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [cidadeUf, setCidadeUf] = useState('Brasil');
  const [orcamento, setOrcamento] = useState(80000);
  const [publico, setPublico] = useState('B2C');
  const [modeloAprofundado, setModeloAprofundado] = useState(true);
  const [steps, setSteps] = useState<ResearchStep[]>(initialSteps);

  // Fetch plan on mount
  useEffect(() => {
    if (planId) {
      fetchPlan(planId);
    }
  }, [planId, fetchPlan]);

  // Fetch existing research on mount
  useEffect(() => {
    if (planId) {
      fetchResearch(planId);
    }
  }, [planId, fetchResearch]);

  // Update steps based on research progress
  useEffect(() => {
    if (report) {
      setSteps(prev => prev.map(s => ({ ...s, status: 'completed' as const })));
    } else if (isLoading) {
      const stepOrder = ['planning', 'market', 'customers', 'competitors', 'financial', 'regulatory'];
      const currentIndex = stepOrder.indexOf(currentStep);
      setSteps(prev => prev.map((s, idx) => ({
        ...s,
        status: idx < currentIndex ? 'completed' as const : idx === currentIndex ? 'in_progress' as const : 'pending' as const,
      })));
    }
  }, [report, isLoading, currentStep]);

  const handleStartResearch = async () => {
    if (!idea.trim() || !planId) return;

    try {
      await startResearch(planId, {
        prompt: idea,
        cidadeUf,
        orcamentoEstimado: orcamento,
        publicoAlvo: publico,
        modeloAprofundado,
        provider: 'gemini',
        useSearchGrounding: true,
        maxIterations: 3,
      });
    } catch (err) {
      console.error('Erro ao iniciar pesquisa:', err);
    }
  };

  const completedCount = steps.filter((s) => s.status === 'completed').length;
  const progressPercent = report ? 100 : (completedCount / steps.length) * 100;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
          <FileSearch className="w-7 h-7 text-blue-400" />
          Pesquisa de Mercado
        </h1>
        <p className="text-slate-400 mt-1">Pesquisa agentic com evidência, fontes e gap analysis</p>
      </div>

      {/* Input Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Ideia do Negócio</h2>
        <textarea
          rows={4}
          value={idea}
          onChange={(e) => setIdea(e.target.value)}
          placeholder="Descreva sua ideia de negócio. Ex: Cafeteria de microlotes com espaço de coworking..."
          className="w-full bg-slate-950 border border-slate-700 focus:border-blue-500 rounded-xl p-4 text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
          disabled={isLoading}
        />

        <div className="mt-4">
          <button
            onClick={() => setShowAdvanced(!showAdvanced)}
            className="text-sm text-slate-400 hover:text-white flex items-center gap-1 transition-colors"
          >
            <ChevronDown className={`w-4 h-4 transition-transform ${showAdvanced ? 'rotate-180' : ''}`} />
            Opções avançadas
          </button>
          {showAdvanced && (
            <div className="mt-3 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 animate-in slide-in-from-top-2">
              <div>
                <label className="text-xs font-semibold text-slate-300">Cidade / UF</label>
                <input
                  type="text"
                  value={cidadeUf}
                  onChange={(e) => setCidadeUf(e.target.value)}
                  disabled={isLoading}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Orçamento (R$)</label>
                <input
                  type="number"
                  value={orcamento}
                  onChange={(e) => setOrcamento(Number(e.target.value))}
                  disabled={isLoading}
                  step={5000}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500 font-mono"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Público-alvo</label>
                <input
                  type="text"
                  value={publico}
                  onChange={(e) => setPublico(e.target.value)}
                  disabled={isLoading}
                  className="w-full mt-1 bg-slate-950 border border-slate-700 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300">Profundidade</label>
                <label className="w-full mt-1 flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={modeloAprofundado}
                    onChange={(e) => setModeloAprofundado(e.target.checked)}
                    disabled={isLoading}
                    className="w-4 h-4 rounded border-slate-700 text-blue-500 focus:ring-blue-500 bg-slate-950"
                  />
                  <span className="text-sm text-slate-300">Modelo aprofundado</span>
                </label>
              </div>
            </div>
          )}
        </div>

        <button
          onClick={handleStartResearch}
          disabled={isLoading || !idea.trim()}
          className="mt-4 w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-500 hover:to-cyan-500 text-white font-bold rounded-2xl shadow-lg shadow-blue-600/30 transition-all flex items-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Pesquisando... {progress > 0 ? `(${Math.round(progress)}%)` : ''}</span>
            </>
          ) : (
            <>
              <Sparkles className="w-4 h-4" />
              <span>Iniciar Pesquisa</span>
            </>
          )}
        </button>
      </div>

      {/* Progress Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-indigo-400" />
            Progresso da Pesquisa
          </h2>
          <span className="text-sm font-mono text-slate-400">
            {completedCount}/{steps.length} ({Math.round(progressPercent)}%)
          </span>
        </div>

        <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-6">
          <div
            className="h-full bg-gradient-to-r from-blue-500 to-cyan-500 transition-all duration-500"
            style={{ width: `${progressPercent}%` }}
          />
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          {steps.map((step) => {
            const Icon =
              step.status === 'completed' ? CheckCircle2 :
              step.status === 'in_progress' ? Loader2 :
              Clock;
            const color =
              step.status === 'completed' ? 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' :
              step.status === 'in_progress' ? 'text-blue-400 bg-blue-500/10 border-blue-500/20 animate-pulse' :
              'text-slate-400 bg-slate-500/10 border-slate-500/20';

            return (
              <div key={step.id} className={`p-3 border rounded-2xl ${color}`}>
                <div className="flex items-center gap-2 mb-1">
                  <Icon className={`w-4 h-4 ${step.status === 'in_progress' ? 'animate-spin' : ''}`} />
                  <span className="text-xs font-bold">{step.status === 'completed' ? 'Concluído' : step.status === 'in_progress' ? 'Em andamento' : 'Pendente'}</span>
                </div>
                <p className="font-bold text-white text-sm">{step.label}</p>
                {step.category && <p className="text-xs text-slate-400 mt-0.5">{step.category}</p>}
              </div>
            );
          })}
        </div>
      </div>

      {/* Research Results Sections */}
      {report && (
        <div className="space-y-6">
          <div className="bg-emerald-950/60 border border-emerald-500/30 rounded-3xl p-6">
            <h2 className="text-lg font-bold text-white flex items-center gap-2 mb-4">
              <CheckCircle2 className="w-5 h-5 text-emerald-400" />
              Pesquisa Concluída
            </h2>
            <p className="text-slate-300 mb-4">Síntese pronta para gerar as 14 ferramentas do PNBOX</p>
            <Link
              to={`/plan/${planId}/tools`}
              className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl font-semibold flex items-center gap-2 transition-colors inline-block"
            >
              <Layers className="w-4 h-4" />
              Gerar 14 Ferramentas
              <ArrowRight className="w-4 h-4" />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            <ResearchSection
              title="Fontes"
              description="Fontes consultadas com reliability score"
              icon={Database}
              count={report.sources?.length || 0}
              color="blue"
            />
            <ResearchSection
              title="Evidências"
              description="Trechos e datapoints extraídos"
              icon={FileSearch}
              count={report.evidence?.length || 0}
              color="indigo"
            />
            <ResearchSection
              title="Contradições"
              description="Divergências entre fontes detectadas"
              icon={AlertCircle}
              count={report.contradictions?.length || 0}
              color="amber"
            />
            <ResearchSection
              title="Gaps"
              description="Lacunas de informação identificadas"
              icon={TrendingUp}
              count={report.gaps?.length || 0}
              color="rose"
            />
          </div>

          {/* Sufficiency Score */}
          {report.sufficiency && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <TrendingUp className="w-5 h-5 text-emerald-400" />
                Análise de Suficiência
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="text-center p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-2xl">
                  <p className="text-3xl font-bold text-emerald-400">{Math.round((report.sufficiency.overall || 0) * 100)}%</p>
                  <p className="text-xs text-slate-400">Suficiência Geral</p>
                </div>
                <div className="text-center p-4 bg-blue-500/10 border border-blue-500/20 rounded-2xl">
                  <p className="text-3xl font-bold text-blue-400">{report.sufficiency.minimumIterations || 2}</p>
                  <p className="text-xs text-slate-400">Iterações Mínimas</p>
                </div>
                <div className="text-center p-4 bg-amber-500/10 border border-amber-500/20 rounded-2xl">
                  <p className="text-3xl font-bold text-amber-400">{report.sufficiency.criticalGaps?.length || 0}</p>
                  <p className="text-xs text-slate-400">Gaps Críticos</p>
                </div>
              </div>
              {report.sufficiency.byCategory && (
                <div className="mt-4 grid grid-cols-2 sm:grid-cols-4 gap-2">
                  {Object.entries(report.sufficiency.byCategory).map(([cat, score]) => (
                    <div key={cat} className="text-center p-3 bg-slate-950 border border-slate-800 rounded-xl">
                      <p className="text-xs text-slate-400 uppercase">{cat}</p>
                      <p className="text-xl font-bold text-white mt-1">{Math.round((Number(score) || 0) * 100)}%</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Canonical Model Preview */}
          {report.canonicalModel && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <Layers className="w-5 h-5 text-indigo-400" />
                Modelo Canônico de Negócio
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 text-sm">
                {[
                  { label: 'Mercado', value: report.canonicalModel.market?.size?.total ? `R$ ${Number(report.canonicalModel.market.size.total).toLocaleString()}` : '—' },
                  { label: 'Segmentos', value: report.canonicalModel.customer?.segments?.length || 0 },
                  { label: 'Personas', value: report.canonicalModel.customer?.personas?.length || 0 },
                  { label: 'Concorrentes', value: report.canonicalModel.competition?.competitors?.length || 0 },
                  { label: 'CAPEX', value: report.canonicalModel.financials?.investment?.total ? `R$ ${Number(report.canonicalModel.financials.investment.total).toLocaleString()}` : '—' },
                  { label: 'OPEX/Mês', value: report.canonicalModel.financials?.costs?.monthlyTotal ? `R$ ${Number(report.canonicalModel.financials.costs.monthlyTotal).toLocaleString()}` : '—' },
                  { label: 'Receita/Mês', value: report.canonicalModel.financials?.revenue?.monthlyTotal ? `R$ ${Number(report.canonicalModel.financials.revenue.monthlyTotal).toLocaleString()}` : '—' },
                  { label: 'Break-even', value: report.canonicalModel.viability?.breakEven?.months ? `${report.canonicalModel.viability.breakEven.months} meses` : '—' },
                ].map((item) => (
                  <div key={item.label} className="p-3 bg-slate-950 border border-slate-800 rounded-xl">
                    <p className="text-xs text-slate-400">{item.label}</p>
                    <p className="font-bold text-white mt-1">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Validation Results */}
          {report.validation && (
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
              <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                Validação de Schema
              </h3>
              <div className="flex items-center gap-4">
                <span className={`px-3 py-1 rounded-full text-sm font-bold ${
                  report.validation.valid
                    ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                }`}>
                  {report.validation.valid ? 'VÁLIDO' : 'INVÁLIDO'}
                </span>
                <span className="text-sm text-slate-400">
                  {report.validation.totalErrors} erros, {report.validation.totalWarnings} avisos
                </span>
              </div>
              {report.validation.detailsByCollection && (
                <div className="mt-4 max-h-60 overflow-y-auto">
                  {Object.entries(report.validation.detailsByCollection || {}).map(([collection, details]) => {
                    const d = details as { status?: string; collectionName?: string };
                    return (
                    <div key={collection} className="flex items-center justify-between py-1 border-b border-slate-800 text-sm">
                      <span className="text-slate-300 capitalize">{collection}</span>
                      <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                        d.status === 'valid' ? 'bg-emerald-500/20 text-emerald-400' :
                        d.status === 'missing' ? 'bg-amber-500/20 text-amber-400' :
                        'bg-rose-500/20 text-rose-400'
                      }`}>
                        {d.status}
                      </span>
                    </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Error Display */}
      {error && !isLoading && (
        <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-300">Erro na pesquisa</p>
            <p className="text-xs text-rose-200/80 mt-1">{error}</p>
          </div>
        </div>
      )}

      {/* Placeholder sections when no report yet */}
      {!report && !isLoading && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <ResearchSection
            title="Fontes"
            description="Fontes consultadas com reliability score"
            icon={Database}
            count={0}
            color="blue"
          />
          <ResearchSection
            title="Evidências"
            description="Trechos e datapoints extraídos"
            icon={FileSearch}
            count={0}
            color="indigo"
          />
          <ResearchSection
            title="Contradições"
            description="Divergências entre fontes detectadas"
            icon={AlertCircle}
            count={0}
            color="amber"
          />
          <ResearchSection
            title="Gaps"
            description="Lacunas de informação identificadas"
            icon={TrendingUp}
            count={0}
            color="rose"
          />
        </div>
      )}
    </div>
  );
}

function ResearchSection({
  title,
  description,
  icon: Icon,
  count,
  color,
}: {
  title: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  count: number;
  color: 'blue' | 'indigo' | 'amber' | 'rose';
}) {
  const colors = {
    blue: 'text-blue-400 bg-blue-500/10 border-blue-500/20',
    indigo: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
    amber: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
    rose: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
  };

  return (
    <div className={`p-4 bg-slate-900 border rounded-2xl ${colors[color]}`}>
      <div className="flex items-center justify-between mb-2">
        <Icon className="w-6 h-6" />
        <span className="px-2 py-0.5 text-xs font-bold rounded-full bg-slate-900 border border-current">
          {count}
        </span>
      </div>
      <h3 className="font-bold text-white">{title}</h3>
      <p className="text-xs text-slate-400 mt-1">{description}</p>
    </div>
  );
}