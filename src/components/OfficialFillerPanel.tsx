import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertCircle,
  Clock,
  ExternalLink,
  Terminal,
  Layers,
  Sparkles,
  RefreshCw,
  Eye,
  Send,
  Building2,
  FileCheck2,
  ArrowUpRight,
  Edit3,
  HelpCircle,
  Plus
} from 'lucide-react';
import { FerramentaInfo, AuthSessionState } from '../types/pnbox';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from '../automation/businessTemplates';
import { ExecutionStepResult, BatchExecutionSummary } from '../automation/officialRunner';
import { PlaywrightScriptExportModal } from './PlaywrightScriptExportModal';
import { PlanSwitcherModal } from './PlanSwitcherModal';

interface OfficialFillerPanelProps {
  ferramentas: FerramentaInfo[];
  authSession: AuthSessionState;
  onRefreshTraffic: () => void;
  onOpenAuthModal: () => void;
  onUpdateActivePlanId: (novoId: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const OfficialFillerPanel: React.FC<OfficialFillerPanelProps> = ({
  ferramentas,
  authSession,
  onRefreshTraffic,
  onOpenAuthModal,
  onUpdateActivePlanId,
  onNavigateTab
}) => {
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('cafeteria_coworking');
  const [templates, setTemplates] = useState<BusinessTemplate[]>(TEMPLATES_NEGOCIO);
  const [isExecutingBatch, setIsExecutingBatch] = useState<boolean>(false);
  const [activeStepRunningId, setActiveStepRunningId] = useState<string | null>(null);
  const [executionSummary, setExecutionSummary] = useState<BatchExecutionSummary | null>(null);
  const [logs, setLogs] = useState<string[]>([]);
  const [selectedFerramentaForCustom, setSelectedFerramentaForCustom] = useState<FerramentaInfo | null>(null);
  const [customPayloadText, setCustomPayloadText] = useState<string>('');
  const [isExecutingSingle, setIsExecutingSingle] = useState<boolean>(false);
  const [showPlaywrightModal, setShowPlaywrightModal] = useState<boolean>(false);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);
  const [scriptPlaywright, setScriptPlaywright] = useState<string>('');

  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const targetIdPlano = authSession.idPlano || 'HCOQIkjSk97gGcfGDPb0h';

  // Buscar templates do backend
  useEffect(() => {
    fetch('/api/automation/templates')
      .then((res) => res.json())
      .then((data) => {
        if (data.templates) setTemplates(data.templates);
      })
      .catch((err) => console.warn('Usando templates locais:', err));
  }, []);

  const addLog = (msg: string) => {
    const time = new Date().toLocaleTimeString();
    setLogs((prev) => [`[${time}] ${msg}`, ...prev.slice(0, 150)]);
  };

  // Executar Preenchimento de Todas as 14 Ferramentas no PNBOX Oficial
  const handleExecuteBatch = async () => {
    setIsExecutingBatch(true);
    setLogs([]);
    addLog(`Iniciando preenchimento oficial do PNBOX para o plano: ${targetIdPlano}`);
    addLog(`Modelo de negócio selecionado: "${currentTemplate.nome}" (${currentTemplate.setor})`);

    try {
      const res = await fetch('/api/automation/fill-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          templateId: selectedTemplateId,
          idPlano: targetIdPlano
        })
      });

      const data = await res.json();
      if (data.resumo) {
        setExecutionSummary(data.resumo);
        addLog(`✅ Preenchimento em lote concluído com sucesso! ${data.resumo.ferramentasSucesso}/14 ferramentas preenchidas.`);
        addLog(`Total de registros persistidos no Sebrae PNBOX: ${data.resumo.totalRegistrosSalvos}`);
      }
      onRefreshTraffic();
    } catch (err: any) {
      addLog(`❌ Erro durante a execução em lote: ${err.message}`);
    } finally {
      setIsExecutingBatch(false);
      setActiveStepRunningId(null);
    }
  };

  // Executar Preenchimento de Uma Ferramenta Específica
  const handleExecuteSingle = async (ferramenta: FerramentaInfo) => {
    setActiveStepRunningId(ferramenta.id);
    addLog(`Disparando preenchimento direto para: ${ferramenta.nome} (${ferramenta.collectionName})`);

    const registros = currentTemplate.dados[ferramenta.collectionName] || [ferramenta.exemploPayload];

    try {
      const res = await fetch('/api/automation/fill-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ferramentaId: ferramenta.id,
          registros,
          idPlano: targetIdPlano
        })
      });

      const data = await res.json();
      if (data.resultado) {
        const resStep: ExecutionStepResult = data.resultado;
        addLog(`✓ ${ferramenta.nome}: ${resStep.mensagem} (Doc ID: ${resStep.docIds.join(', ')})`);

        // Atualizar estado no summary
        setExecutionSummary((prev) => {
          if (!prev) {
            return {
              idExecucao: 'exec_single_' + Date.now(),
              templateId: selectedTemplateId,
              idPlano: targetIdPlano,
              iniciadoEm: new Date().toISOString(),
              duracaoTotalMs: resStep.duracaoMs,
              totalFerramentas: 1,
              ferramentasSucesso: resStep.status === 'success' ? 1 : 0,
              ferramentasFalha: resStep.status === 'error' ? 1 : 0,
              totalRegistrosSalvos: resStep.registrosSalvos,
              steps: [resStep],
              statusGeral: 'completed'
            };
          }

          const existingIndex = prev.steps.findIndex((s) => s.ferramentaId === ferramenta.id);
          let newSteps = [...prev.steps];
          if (existingIndex >= 0) {
            newSteps[existingIndex] = resStep;
          } else {
            newSteps.push(resStep);
          }

          return {
            ...prev,
            steps: newSteps,
            totalRegistrosSalvos: prev.totalRegistrosSalvos + resStep.registrosSalvos
          };
        });
      }
      onRefreshTraffic();
    } catch (err: any) {
      addLog(`❌ Erro ao preencher ${ferramenta.nome}: ${err.message}`);
    } finally {
      setActiveStepRunningId(null);
    }
  };

  // Abrir Modal do Script Playwright
  const handleOpenPlaywrightScript = async () => {
    try {
      const res = await fetch(`/api/automation/script-playwright?templateId=${selectedTemplateId}&idPlano=${targetIdPlano}`);
      const data = await res.json();
      if (data.script) {
        setScriptPlaywright(data.script);
        setShowPlaywrightModal(true);
      }
    } catch (err: any) {
      alert(`Erro ao obter script: ${err.message}`);
    }
  };

  // Obter status de uma ferramenta no resumo
  const getStepStatus = (ferramentaId: string): ExecutionStepResult | undefined => {
    if (!executionSummary) return undefined;
    return executionSummary.steps.find((s) => s.ferramentaId === ferramentaId);
  };

  return (
    <div className="space-y-6">
      {/* Banner Principal de Preenchimento Oficial */}
      <div className="bg-gradient-to-br from-indigo-950/70 via-slate-900 to-slate-950 p-6 rounded-2xl border border-indigo-900/40 shadow-xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20" />

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                Sistema de Preenchimento Oficial
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                Sebrae PNBOX
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Preenchimento Automático das 14 Ferramentas no PNBOX Oficial
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 max-w-3xl leading-relaxed">
              Persiste instantaneamente todos os módulos do plano de negócio oficial no servidor Meteor/DDP do Sebrae.
              Você pode executar em lote com um clique ou ferramenta por ferramenta, e verificar o resultado em tempo real no portal do Sebrae.
            </p>
            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-mono">
              {/* Botão de Trocar Plano Interativo */}
              <button
                onClick={() => setShowPlanModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-900/60 hover:bg-indigo-800 text-indigo-200 rounded-xl border border-indigo-500/50 shadow-sm transition-all cursor-pointer group"
                title="Clique para trocar para outro plano, colar qualquer URL do Sebrae ou cadastrar novo ID"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-slate-300">Plano Alvo:</span>
                <span className="text-white font-bold">{targetIdPlano}</span>
                <Edit3 className="w-3 h-3 text-indigo-300 ml-1" />
              </button>

              <button
                onClick={() => setShowPlanModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Colar outro ID/URL</span>
              </button>

              <div className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900/80 rounded-xl border border-slate-800 text-slate-300">
                <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                <span>CPF: {authSession.cpf}</span>
              </div>

              <a
                href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${targetIdPlano}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 transition-colors"
                title="Abrir página oficial das ferramentas no Sebrae PNBOX"
              >
                <span>Acessar PNBOX no Sebrae</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            {/* Aviso de Compatibilidade Universal */}
            <div className="pt-2 text-[11px] text-slate-400 flex items-center gap-1.5">
              <span className="text-emerald-400 font-bold">✓ Compatibilidade Universal:</span>
              <span>Esta automação funciona para <strong>qualquer ID de plano</strong> do seu usuário Sebrae.</span>
            </div>
          </div>

          {/* Botões de Ação Principal */}
          <div className="flex flex-col sm:flex-row lg:flex-col gap-3 shrink-0 w-full lg:w-auto">
            <button
              onClick={handleExecuteBatch}
              disabled={isExecutingBatch}
              className={`flex items-center justify-center gap-2.5 px-6 py-3.5 rounded-xl font-bold text-sm text-white shadow-lg transition-all ${
                isExecutingBatch
                  ? 'bg-indigo-900/50 cursor-not-allowed opacity-80 border border-indigo-700'
                  : 'bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-emerald-950/50 hover:shadow-emerald-900/50 hover:scale-[1.02] active:scale-[0.99]'
              }`}
            >
              {isExecutingBatch ? (
                <>
                  <RefreshCw className="w-5 h-5 animate-spin text-white" />
                  <span>Preenchendo 14 Ferramentas...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-5 h-5 text-amber-300" />
                  <span>Preencher 14 Ferramentas no PNBOX</span>
                </>
              )}
            </button>

            <div className="flex gap-2">
              {onNavigateTab && (
                <button
                  onClick={() => onNavigateTab('fila_lote')}
                  className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/40 rounded-xl text-xs font-semibold transition-colors shadow-sm cursor-pointer"
                  title="Abrir a Fila em Lote com controle de Delay e Relatório Completo"
                >
                  <Layers className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Fila em Lote (Delay)</span>
                </button>
              )}
              <button
                onClick={handleOpenPlaywrightScript}
                className="flex-1 flex items-center justify-center gap-1.5 px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors shadow-sm"
              >
                <Terminal className="w-3.5 h-3.5 text-indigo-400" />
                <span>Script Playwright</span>
              </button>
              <button
                onClick={() => {
                  setExecutionSummary(null);
                  setLogs([]);
                }}
                className="px-3 py-2 bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 rounded-xl text-xs transition-colors"
                title="Limpar Histórico de Execução"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Seletor de Modelo de Negócio Pré-configurado */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Modelo de Negócio para o Preenchimento Oficial</h3>
          </div>
          <span className="text-xs text-slate-400">Dados pré-validados para os 14 schemas do Sebrae</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {templates.map((tpl) => {
            const isSelected = tpl.id === selectedTemplateId;
            return (
              <div
                key={tpl.id}
                onClick={() => setSelectedTemplateId(tpl.id)}
                className={`p-4 rounded-xl border cursor-pointer transition-all ${
                  isSelected
                    ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md ring-1 ring-indigo-500/30'
                    : 'bg-slate-950/60 border-slate-800/80 hover:border-slate-700 hover:bg-slate-950'
                }`}
              >
                <div className="flex items-start justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <h4 className="text-sm font-bold text-white">{tpl.nome}</h4>
                      <span className="px-2 py-0.5 text-[10px] font-medium rounded-full bg-slate-800 text-indigo-300 border border-slate-700">
                        {tpl.setor}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400 leading-relaxed">{tpl.descricao}</p>
                  </div>
                  <div
                    className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ml-3 ${
                      isSelected
                        ? 'border-indigo-500 bg-indigo-600 text-white'
                        : 'border-slate-700 bg-slate-900'
                    }`}
                  >
                    {isSelected && <CheckCircle2 className="w-3.5 h-3.5" />}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Grade com as 14 Ferramentas e Status de Preenchimento */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
              <FileCheck2 className="w-4 h-4 text-emerald-400" />
              Status de Preenchimento das 14 Ferramentas
            </h3>
            <p className="text-xs text-slate-400">
              Clique em "Executar" em qualquer ferramenta para enviar individualmente ou abra diretamente a página oficial no Sebrae.
            </p>
          </div>
          {executionSummary && (
            <div className="flex items-center gap-3 text-xs font-mono bg-slate-900 px-3 py-1.5 rounded-xl border border-slate-800">
              <span className="text-slate-400">Progresso:</span>
              <span className="text-emerald-400 font-bold">
                {executionSummary.ferramentasSucesso}/14 Concluídas
              </span>
              <span className="text-slate-500">•</span>
              <span className="text-indigo-300">{executionSummary.totalRegistrosSalvos} registros</span>
            </div>
          )}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ferramentas.map((f, index) => {
            const stepResult = getStepStatus(f.id);
            const isRunning = activeStepRunningId === f.id || (isExecutingBatch && stepResult?.status === 'running');
            const isCompleted = stepResult?.status === 'success' || stepResult?.status === 'warning';
            const registrosTemplate = currentTemplate.dados[f.collectionName] || [f.exemploPayload];

            return (
              <div
                key={f.id}
                className={`p-4 rounded-xl border transition-all flex flex-col justify-between ${
                  isCompleted
                    ? 'bg-slate-900/90 border-emerald-500/40 shadow-sm'
                    : isRunning
                    ? 'bg-indigo-950/40 border-indigo-500 animate-pulse'
                    : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                }`}
              >
                <div>
                  {/* Top card row */}
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-950 text-slate-400 border border-slate-800">
                      #{index + 1} {f.blocoLabel}
                    </span>
                    {isCompleted ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-950/40 px-2 py-0.5 rounded-full border border-emerald-500/30">
                        <CheckCircle2 className="w-3 h-3" />
                        Preenchido
                      </span>
                    ) : isRunning ? (
                      <span className="flex items-center gap-1 text-[11px] font-bold text-amber-300 bg-amber-950/40 px-2 py-0.5 rounded-full border border-amber-500/30">
                        <RefreshCw className="w-3 h-3 animate-spin" />
                        Gravando...
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 bg-slate-950 px-2 py-0.5 rounded-full border border-slate-800">
                        Pendente
                      </span>
                    )}
                  </div>

                  {/* Tool Title and description */}
                  <h4 className="text-sm font-bold text-white tracking-tight">{f.nome}</h4>
                  <p className="text-xs text-slate-400 mt-1 line-clamp-2">{f.descricao}</p>

                  {/* Technical Collection Details */}
                  <div className="mt-3 p-2 bg-slate-950 rounded-lg border border-slate-800/80 font-mono text-[11px] space-y-1">
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Coleção:</span>
                      <span className="text-indigo-300 font-semibold">{f.collectionName}</span>
                    </div>
                    <div className="flex items-center justify-between text-slate-400">
                      <span>Registros:</span>
                      <span className="text-slate-200">{registrosTemplate.length} item(s)</span>
                    </div>
                    {stepResult?.docIds && stepResult.docIds.length > 0 && (
                      <div className="flex items-center justify-between text-slate-400 pt-0.5 border-t border-slate-900">
                        <span>Doc ID:</span>
                        <span className="text-emerald-400 truncate max-w-[130px]" title={stepResult.docIds[0]}>
                          {stepResult.docIds[0]}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Card Actions */}
                <div className="mt-4 pt-3 border-t border-slate-800/80 flex items-center justify-between gap-2">
                  <button
                    onClick={() => handleExecuteSingle(f)}
                    disabled={isRunning || isExecutingBatch}
                    className={`flex-1 flex items-center justify-center gap-1 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                      isCompleted
                        ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700'
                        : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm'
                    }`}
                  >
                    {isRunning ? (
                      <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                    ) : (
                      <Play className="w-3.5 h-3.5" />
                    )}
                    <span>{isCompleted ? 'Reexecutar' : 'Executar'}</span>
                  </button>

                  <a
                    href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${targetIdPlano}/${f.id}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Abrir esta ferramenta no portal oficial do Sebrae PNBOX"
                    className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded-lg border border-slate-800 transition-colors"
                  >
                    <ArrowUpRight className="w-4 h-4" />
                  </a>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Terminal / Log de Execução ao Vivo */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg">
        <div className="flex items-center justify-between px-5 py-3 bg-slate-900 border-b border-slate-800">
          <div className="flex items-center gap-2 text-xs font-bold text-slate-300 font-mono">
            <Terminal className="w-4 h-4 text-emerald-400" />
            <span>Console de Execução Oficial (Meteor DDP / WebSocket)</span>
          </div>
          <div className="flex items-center gap-3 text-xs text-slate-400 font-mono">
            <span>{logs.length} eventos</span>
            <button
              onClick={() => setLogs([])}
              className="text-slate-400 hover:text-white transition-colors"
            >
              Limpar
            </button>
          </div>
        </div>

        <div className="p-4 font-mono text-xs text-slate-300 max-h-56 overflow-y-auto space-y-1 select-text">
          {logs.length === 0 ? (
            <div className="text-slate-600 italic py-2">
              Nenhuma execução disparada ainda. Clique em "Preencher 14 Ferramentas no PNBOX" ou em uma ferramenta acima para iniciar.
            </div>
          ) : (
            logs.map((log, index) => (
              <div
                key={index}
                className={`leading-relaxed ${
                  log.includes('❌') || log.includes('Erro')
                    ? 'text-rose-400'
                    : log.includes('✅') || log.includes('✓')
                    ? 'text-emerald-300 font-medium'
                    : log.includes('Iniciando')
                    ? 'text-indigo-300'
                    : 'text-slate-400'
                }`}
              >
                {log}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Modal do Script Playwright */}
      {showPlaywrightModal && (
        <PlaywrightScriptExportModal
          scriptCode={scriptPlaywright}
          idPlano={targetIdPlano}
          onClose={() => setShowPlaywrightModal(false)}
        />
      )}

      {/* Modal de Seleção / Alteração de Plano */}
      <PlanSwitcherModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        activePlanId={targetIdPlano}
        onSelectPlanId={(novoId) => {
          onUpdateActivePlanId(novoId);
          setShowPlanModal(false);
          addLog(`🔄 Plano ativo alterado para: ${novoId}`);
        }}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
