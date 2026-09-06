import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, CheckCircle2, Loader2, Play, RefreshCw, ShieldCheck } from 'lucide-react';
import { useParams } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { usePlans } from '../contexts/PlansContext';
import { useResearch } from '../contexts/ResearchContext';
import { useExecution } from '../contexts/ExecutionContext';
import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';

export function PlanExecutionPage() {
  const { planId: routePlanId } = useParams<{ planId: string }>();
  const { currentPlan, fetchPlan } = usePlan();
  const { plans, fetchPlans } = usePlans();
  const { report } = useResearch();
  const { mode, sessionStatus, executeSingle, isExecuting, summary, error, resetExecution } = useExecution();
  const [selectedPlanId, setSelectedPlanId] = useState(routePlanId || '');
  const [loadingPlans, setLoadingPlans] = useState(true);
  const [runningTool, setRunningTool] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoadingPlans(true);
      try { await fetchPlans(); } finally { setLoadingPlans(false); }
    })();
  }, [fetchPlans]);

  useEffect(() => {
    if (selectedPlanId) void fetchPlan(selectedPlanId);
    else if (routePlanId) setSelectedPlanId(routePlanId);
  }, [fetchPlan, routePlanId, selectedPlanId]);

  const realPlanId = useMemo(() => {
    const id = (selectedPlanId || currentPlan?.id || '').trim();
    return id && id !== ':idPlano' && !id.startsWith('plano_') ? id : '';
  }, [selectedPlanId, currentPlan?.id]);

  const handleExecuteTool = async (ferramentaId: string) => {
    if (!realPlanId) return;
    if (sessionStatus !== 'authenticated') return;
    const ferramenta = FERRAMENTAS_PNBOX.find((item) => item.id === ferramentaId);
    const registros = ferramenta ? report?.pnboxCollections?.[ferramenta.collectionName] : undefined;
    if (!registros || registros.length === 0) return;
    setRunningTool(ferramentaId);
    resetExecution();
    try {
      await executeSingle(realPlanId, ferramentaId, registros, 'LIVE');
    } finally {
      setRunningTool(null);
    }
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      <header>
        <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2"><Play className="w-7 h-7 text-emerald-400" /> Execução real no PNBOX</h1>
        <p className="text-slate-400 mt-1">Somente dados reais do plano e sessão autenticada. Nenhum exemplo ou ID sintético é executado.</p>
      </header>

      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <label className="block text-sm font-medium text-slate-300 mb-2">Plano PNBOX</label>
        <select value={selectedPlanId} onChange={(e) => setSelectedPlanId(e.target.value)} disabled={loadingPlans || isExecuting} className="w-full max-w-xl px-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-white font-mono">
          <option value="">Selecione um plano retornado pelo PNBOX</option>
          {plans.map((plan) => <option key={plan.id} value={plan.id}>{plan.name} — {plan.id}</option>)}
        </select>
        <div className="mt-4 flex flex-wrap gap-3 text-xs">
          <span className="px-3 py-1.5 rounded-full bg-slate-800 text-slate-300">ID: {realPlanId || 'não selecionado'}</span>
          <span className={`px-3 py-1.5 rounded-full ${sessionStatus === 'authenticated' ? 'bg-emerald-950 text-emerald-300' : 'bg-amber-950 text-amber-300'}`}>Sessão: {sessionStatus}</span>
          <span className="px-3 py-1.5 rounded-full bg-indigo-950 text-indigo-300">Modo: {mode}</span>
        </div>
      </section>

      {sessionStatus !== 'authenticated' && (
        <section className="p-5 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex gap-3">
          <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0" />
          <div><p className="font-semibold text-amber-200">Autenticação PNBOX necessária</p><p className="text-xs text-amber-200/70 mt-1">Abra Configurações do Sistema e autentique sua própria conta antes de executar qualquer ferramenta.</p></div>
        </section>
      )}

      {!report?.pnboxCollections && (
        <section className="p-5 bg-slate-900 border border-slate-800 rounded-2xl flex gap-3"><AlertCircle className="w-5 h-5 text-slate-400" /><p className="text-sm text-slate-300">Não há dados de pesquisa/mapeamento disponíveis nesta sessão. A execução está bloqueada para evitar uso de payloads de exemplo.</p></section>
      )}

      <section className="bg-slate-900 border border-slate-800 rounded-3xl p-6">
        <div className="flex items-center justify-between mb-4"><div><h2 className="text-lg font-bold text-white">Ferramentas com dados reais</h2><p className="text-xs text-slate-500 mt-1">Cada botão envia somente os registros presentes no relatório canônico.</p></div>{summary && <span className="text-xs text-emerald-300">Último resultado recebido</span>}</div>
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
          {FERRAMENTAS_PNBOX.map((ferramenta) => {
            const registros = report?.pnboxCollections?.[ferramenta.collectionName] || [];
            const canRun = Boolean(realPlanId && sessionStatus === 'authenticated' && registros.length > 0 && !isExecuting);
            const result = summary?.steps?.find((step) => step.ferramentaId === ferramenta.id);
            return <div key={ferramenta.id} className="p-4 bg-slate-950 border border-slate-800 rounded-2xl">
              <p className="font-semibold text-white">{ferramenta.nome}</p>
              <p className="text-[11px] text-slate-500 font-mono mt-1">{ferramenta.collectionName}</p>
              <p className="text-xs text-slate-400 mt-3">{registros.length} registro(s) real(is) disponível(is)</p>
              <button onClick={() => void handleExecuteTool(ferramenta.id)} disabled={!canRun} className="w-full mt-3 px-3 py-2 rounded-xl bg-emerald-700 hover:bg-emerald-600 disabled:bg-slate-800 disabled:text-slate-600 text-white text-sm font-semibold flex items-center justify-center gap-2">
                {runningTool === ferramenta.id ? <Loader2 className="w-4 h-4 animate-spin" /> : result?.status === 'success' ? <CheckCircle2 className="w-4 h-4" /> : <Play className="w-4 h-4" />}
                {runningTool === ferramenta.id ? 'Executando...' : result?.status === 'success' ? 'Executado' : 'Executar no PNBOX'}
              </button>
            </div>;
          })}
        </div>
      </section>

      {error && <section className="p-4 bg-rose-950/30 border border-rose-500/30 rounded-2xl text-sm text-rose-200">{error}</section>}
      <button onClick={resetExecution} className="text-xs text-slate-500 hover:text-slate-300 flex items-center gap-2"><RefreshCw className="w-3 h-3" /> Limpar resultado local da execução</button>
    </div>
  );
}
