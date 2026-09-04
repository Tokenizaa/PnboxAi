import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { usePlan } from '../contexts/PlanContext';
import { usePlans } from '../contexts/PlansContext';
import { useResearch } from '../contexts/ResearchContext';
import { useExecution } from '../contexts/ExecutionContext';
import { FERRAMENTAS_PNBOX } from '../automation/schemaCatalog';
import {
  Play,
  AlertCircle,
  CheckCircle2,
  Clock,
  Loader2,
  ShieldCheck,
  Activity,
  Zap,
  Wifi,
  WifiOff,
  Layers,
  RefreshCw,
} from 'lucide-react';

type ExecutionMode = 'DRY_RUN' | 'LIVE';

interface StepResult {
  ferramentaId: string;
  ferramentaNome: string;
  status: 'pending' | 'running' | 'success' | 'warning' | 'error';
  totalRegistros: number;
  registrosSalvos: number;
  mensagem: string;
}

export function PlanExecutionPage() {
  const { planId: routePlanId } = useParams<{ planId: string }>();
  const { currentPlan, fetchPlan } = usePlan();
  const { plans, fetchPlans } = usePlans();
  const { report } = useResearch();
  const {
    mode,
    setMode,
    sessionStatus,
    authenticateSession,
    executeBatch,
    executeSingle,
    isExecuting,
    summary,
    error: executionError,
    clearError,
    resetExecution,
  } = useExecution();

  const [steps, setSteps] = useState<StepResult[]>([]);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [isLoadingPlans, setIsLoadingPlans] = useState<boolean>(true);

  // Load all plans on mount
  useEffect(() => {
    const loadAllPlans = async () => {
      setIsLoadingPlans(true);
      try {
        await fetchPlans();
      } finally {
        setIsLoadingPlans(false);
      }
    };
    
    loadAllPlans();
  }, [fetchPlans]);

  // Determine which plan to use for execution
  // Priority: 1) Selected plan from dropdown, 2) Plan from route params, 3) First available plan
  useEffect(() => {
    if (selectedPlanId) {
      // Use explicitly selected plan
      fetchPlan(selectedPlanId);
    } else if (routePlanId) {
      // Use plan from route params
      fetchPlan(routePlanId);
      setSelectedPlanId(routePlanId);
    } else if (plans.length > 0) {
      // Use first available plan
      fetchPlan(plans[0].id);
      setSelectedPlanId(plans[0].id);
    }
  }, [selectedPlanId, routePlanId, plans, fetchPlan]);

  // Initialize steps from report or template
  useEffect(() => {
    if (report?.pnboxCollections) {
      const newSteps: StepResult[] = FERRAMENTAS_PNBOX.map((tool) => {
        const items = report.pnboxCollections[tool.collectionName];
        return {
          ferramentaId: tool.id,
          ferramentaNome: tool.nome,
          status: items && items.length > 0 ? 'pending' : 'pending',
          totalRegistros: items?.length || 1,
          registrosSalvos: 0,
          mensagem: 'Aguardando execução',
        };
      });
      setSteps(newSteps);
    } else if (currentPlan) {
      const newSteps: StepResult[] = FERRAMENTAS_PNBOX.map((tool) => ({
        ferramentaId: tool.id,
        ferramentaNome: tool.nome,
        status: 'pending',
        totalRegistros: 1,
        registrosSalvos: 0,
        mensagem: 'Aguardando execução',
      }));
      setSteps(newSteps);
    }
  }, [report, currentPlan]);

  // Sync steps with execution summary
  useEffect(() => {
    if (summary?.steps) {
      setSteps(summary.steps);
    }
  }, [summary]);

  const handleAuthenticate = async () => {
    // In a real app, this would open a modal for CPF/password
    // For now, we'll simulate
    await authenticateSession({
      cpf: '000.000.000-00', // placeholder
      password: 'senha123',
      idPlano: selectedPlanId || routePlanId || (plans.length > 0 ? plans[0].id : ''),
    });
  };

  const handleExecute = async () => {
    if (mode === 'LIVE' && sessionStatus !== 'authenticated') {
      alert('Para execução LIVE, autentique-se primeiro na sessão PNBOX');
      return;
    }

    if (!currentPlan || !report?.pnboxCollections) {
      alert('Gere as ferramentas primeiro na aba "Ferramentas"');
      return;
    }

    resetExecution();
    await executeBatch(currentPlan.id, 'default', mode);
  };

  const handleExecuteSingle = async (ferramentaId: string) => {
    if (mode === 'LIVE' && sessionStatus !== 'authenticated') {
      alert('Para execução LIVE, autentique-se primeiro');
      return;
    }

    const tool = FERRAMENTAS_PNBOX.find(t => t.id === ferramentaId);
    const items = report?.pnboxCollections?.[ferramentaId] || [tool?.exemploPayload];
    
    if (!items || items.length === 0) {
      alert('Nenhum dado para esta ferramenta');
      return;
    }

    resetExecution();
    await executeSingle(currentPlan.id, ferramentaId, items, mode);
  };

  const completedSteps = steps.filter((s) => s.status === 'success' || s.status === 'warning').length;
  const totalSteps = steps.length;
  const progressPercent = totalSteps > 0 ? (completedSteps / totalSteps) * 100 : 0;

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-white flex items-center gap-2">
              <Play className="w-7 h-7 text-emerald-400" />
              Execução no PNBOX
            </h1>
            <p className="text-slate-400 mt-1">Execute as 14 ferramentas no servidor real ou simule</p>
          </div>
          {/* Plan Selector */}
          <div className="sm:w-64">
            <label className="block text-sm font-medium text-slate-300 mb-1">
              Plano para Execução
            </label>
            <select
              value={selectedPlanId || ''}
              onChange={(e) => setSelectedPlanId(e.target.value)}
              disabled={isLoadingPlans || isExecuting}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-700 focus:border-indigo-500 rounded-xl text-white placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 disabled:opacity-50"
            >
              <option value="">Selecionar um plano...</option>
              {isLoadingPlans ? (
                <option value="">Carregando planos...</option>
              ) : plans.length === 0 ? (
                <option value="">Nenhum plano disponível</option>
              ) : (
                plans.map((plan) => (
                  <option key={plan.id} value={plan.id}>
                    {plan.name} ({plan.sector})
                  </option>
                ))
              )}
            </select>
          </div>
        </div>
      </div>

      {/* Mode Selector */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <h2 className="text-lg font-bold text-white mb-4">Modo de Execução</h2>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <button
            onClick={() => setMode('DRY_RUN')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              mode === 'DRY_RUN'
                ? 'bg-amber-500/10 border-amber-500/40 ring-1 ring-amber-500/30'
                : 'bg-slate-950 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">DRY_RUN (Simulação)</span>
              {mode === 'DRY_RUN' && <CheckCircle2 className="w-5 h-5 text-amber-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Executa o pipeline completo sem tocar o servidor real. Valida schemas, mas não persiste nada.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-bold">SEGURO</span>
              <span className="text-slate-400">Não requer autenticação</span>
            </div>
          </button>

          <button
            onClick={() => setMode('LIVE')}
            className={`p-4 rounded-2xl border text-left transition-all ${
              mode === 'LIVE'
                ? 'bg-emerald-500/10 border-emerald-500/40 ring-1 ring-emerald-500/30'
                : 'bg-slate-950 border-slate-700 hover:border-slate-600'
            }`}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="font-bold text-white">LIVE (Servidor Real)</span>
              {mode === 'LIVE' && <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            </div>
            <p className="text-xs text-slate-400">
              Grava dados no servidor Meteor DDP do PNBOX. Requer sessão autenticada e consome tokens OIDC.
            </p>
            <div className="mt-2 flex items-center gap-2 text-xs">
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-bold">REAL</span>
              <span className="text-slate-400">Requer autenticação OIDC</span>
            </div>
          </button>
        </div>
      </div>

      {/* Session Status (LIVE only) */}
      {mode === 'LIVE' && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
            <ShieldCheck className="w-5 h-5 text-emerald-400" />
            Sessão PNBOX
          </h2>

          {sessionStatus === 'authenticated' ? (
            <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-2xl flex items-center justify-between">
              <div className="flex items-center gap-3">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
                </span>
                <Wifi className="w-5 h-5 text-emerald-400" />
                <div>
                  <p className="font-bold text-white">Sessão Ativa</p>
                  <p className="text-xs text-slate-400">Pronto para execução no PNBOX real</p>
                </div>
              </div>
              <button
                onClick={() => {
                  // Would call logout for PNBOX session
                  clearError();
                }}
                className="text-xs text-rose-400 hover:text-rose-300"
              >
                Desconectar
              </button>
            </div>
          ) : (
            <div className="space-y-3">
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-2xl flex items-center gap-3">
                <WifiOff className="w-5 h-5 text-amber-400 shrink-0" />
                <div>
                  <p className="font-bold text-white">Sessão Necessária</p>
                  <p className="text-xs text-slate-400">Para LIVE, autentique no PNBOX via OIDC Playwright</p>
                </div>
              </div>
              <button
                onClick={handleAuthenticate}
                disabled={sessionStatus === 'authenticating'}
                className="w-full sm:w-auto px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-bold rounded-xl flex items-center gap-2 transition-colors disabled:opacity-50"
              >
                {sessionStatus === 'authenticating' ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Autenticando...
                  </>
                ) : (
                  <>
                    <ShieldCheck className="w-4 h-4" />
                    Autenticar Sessão PNBOX
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Execute Button */}
      <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg font-bold text-white">Executar 14 Ferramentas</h2>
            <p className="text-sm text-slate-400 mt-1">
              {mode === 'LIVE' ? 'Grava no servidor real do PNBOX' : 'Simula sem persistir'}
            </p>
            {report?.pnboxCollections && (
              <p className="text-xs text-emerald-400 mt-1">Modelo canônico pronto: {Object.keys(report.pnboxCollections).length} coleções mapeadas</p>
            )}
          </div>
          <button
            onClick={handleExecute}
            disabled={isExecuting || (mode === 'LIVE' && sessionStatus !== 'authenticated') || !report?.pnboxCollections}
            className={`px-6 py-3 rounded-2xl font-bold flex items-center gap-2 transition-all disabled:opacity-50 disabled:cursor-not-allowed ${
              mode === 'LIVE'
                ? 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white shadow-lg shadow-emerald-600/30'
                : 'bg-gradient-to-r from-amber-600 to-orange-600 hover:from-amber-500 hover:to-orange-500 text-white shadow-lg shadow-amber-600/30'
            }`}
          >
            {isExecuting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Executando...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                <span>Iniciar Execução {mode}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Individual Tool Execution */}
      {steps.length > 0 && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <h2 className="text-lg font-bold text-white mb-4">Executar Ferramenta Individual</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
            {steps.map((step) => (
              <button
                key={step.ferramentaId}
                onClick={() => handleExecuteSingle(step.ferramentaId)}
                disabled={isExecuting || step.status === 'running'}
                className={`p-3 rounded-xl border text-left transition-all text-xs ${
                  step.status === 'success'
                    ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
                    : step.status === 'running'
                    ? 'bg-blue-500/10 border-blue-500/30 text-blue-300 animate-pulse'
                    : step.status === 'warning'
                    ? 'bg-amber-500/10 border-amber-500/30 text-amber-300'
                    : step.status === 'error'
                    ? 'bg-rose-500/10 border-rose-500/30 text-rose-300'
                    : 'bg-slate-950 border-slate-700 hover:border-slate-600 hover:bg-slate-900 text-slate-300'
                }`}
              >
                <div className="flex items-center gap-2 mb-1">
                  <span className="font-medium truncate">{step.ferramentaNome}</span>
                  {step.status === 'running' && <Loader2 className="w-3 h-3 animate-spin" />}
                  {step.status === 'success' && <CheckCircle2 className="w-3 h-3 text-emerald-400" />}
                  {step.status === 'warning' && <AlertCircle className="w-3 h-3 text-amber-400" />}
                  {step.status === 'error' && <AlertCircle className="w-3 h-3 text-rose-400" />}
                </div>
                <p className="text-xs text-slate-400">{step.mensagem}</p>
                <div className="flex items-center justify-between mt-1">
                  <span className="font-mono text-slate-500">{step.registrosSalvos}/{step.totalRegistros}</span>
                  <span className="text-xs text-slate-500">registros</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Execution Progress */}
      {(totalSteps > 0 && (isExecuting || completedSteps > 0)) && (
        <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white flex items-center gap-2">
              <Activity className="w-5 h-5 text-indigo-400" />
              Progresso da Execução
            </h2>
            <span className="text-sm font-mono text-slate-400">
              {completedSteps}/{totalSteps} ({Math.round(progressPercent)}%)
            </span>
          </div>
          <div className="h-2 bg-slate-800 rounded-full overflow-hidden mb-4">
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-teal-500 transition-all duration-500"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          {summary && (
            <div className="grid grid-cols-3 gap-4 text-sm">
              <div className="text-center p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl">
                <p className="text-2xl font-bold text-emerald-400">{summary.ferramentasSucesso}</p>
                <p className="text-xs text-slate-400">Sucesso</p>
              </div>
              <div className="text-center p-3 bg-rose-500/10 border border-rose-500/20 rounded-xl">
                <p className="text-2xl font-bold text-rose-400">{summary.ferramentasFalha}</p>
                <p className="text-xs text-slate-400">Falhas</p>
              </div>
              <div className="text-center p-3 bg-blue-500/10 border border-blue-500/20 rounded-xl">
                <p className="text-2xl font-bold text-blue-400">{summary.totalRegistrosSalvos}</p>
                <p className="text-xs text-slate-400">Registros Salvos</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Warning about execution */}
      {mode === 'LIVE' && (
        <div className="bg-amber-950/30 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-amber-300">Atenção: Modo LIVE</p>
            <p className="text-xs text-amber-200/80 mt-1">
              Esta operação grava dados reais no servidor do PNBOX. Certifique-se de que está autenticado e revisou os dados antes de prosseguir.
            </p>
          </div>
        </div>
      )}

      {/* Execution Error */}
      {executionError && (
        <div className="bg-rose-950/50 border border-rose-500/30 rounded-2xl p-4 flex items-start gap-3">
          <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-rose-300">Erro na execução</p>
            <p className="text-xs text-rose-200/80 mt-1">{executionError}</p>
          </div>
        </div>
      )}
    </div>
  );
}