import React, { useState, useEffect, useRef } from 'react';
import {
  Layers,
  Play,
  Pause,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  AlertTriangle,
  Clock,
  ArrowUp,
  ArrowDown,
  Trash2,
  Sparkles,
  Download,
  Copy,
  Check,
  FileSpreadsheet,
  RefreshCw,
  ExternalLink,
  ChevronRight,
  Sliders,
  XCircle,
  BarChart3,
  ShieldCheck,
  FileCheck2,
  Printer,
  Building2,
  Edit3,
  Plus
} from 'lucide-react';
import { FerramentaInfo, AuthSessionState, BatchQueueItem, BatchQueueConfig, BatchReportSummary } from '../types/pnbox';
import { BusinessTemplate, TEMPLATES_NEGOCIO } from '../automation/businessTemplates';
import { ExecutionStepResult } from '../automation/officialRunner';
import { SchemaGenerator } from '../automation/schemaGenerator';
import { PlanSwitcherModal } from './PlanSwitcherModal';

interface BatchProcessingQueueProps {
  ferramentas: FerramentaInfo[];
  authSession: AuthSessionState;
  templates: BusinessTemplate[];
  selectedTemplateId: string;
  onSelectTemplateId: (id: string) => void;
  onRefreshTraffic: () => void;
  onOpenAuthModal: () => void;
  onUpdateActivePlanId: (novoId: string) => void;
  onNavigateTab?: (tab: string) => void;
  customData?: Record<string, Record<string, unknown>[]>;
}

export const BatchProcessingQueue: React.FC<BatchProcessingQueueProps> = ({
  ferramentas,
  authSession,
  templates,
  selectedTemplateId,
  onSelectTemplateId,
  onRefreshTraffic,
  onOpenAuthModal,
  onUpdateActivePlanId,
  onNavigateTab,
  customData
}) => {
  // Configuração da Fila
  const [delayMs, setDelayMs] = useState<number>(1000);
  const [stopOnError, setStopOnError] = useState<boolean>(false);
  const [useCustomData, setUseCustomData] = useState<boolean>(!!customData);
  const [showPlanModal, setShowPlanModal] = useState<boolean>(false);

  // Itens da Fila de Execução
  const [queueItems, setQueueItems] = useState<BatchQueueItem[]>([]);

  // Estados de Controle de Execução
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [activeStepIndex, setActiveStepIndex] = useState<number | null>(null);
  const [countdownRemainingMs, setCountdownRemainingMs] = useState<number>(0);
  const [reportSummary, setReportSummary] = useState<BatchReportSummary | null>(null);
  const [copiedReport, setCopiedReport] = useState<boolean>(false);
  const [viewFilter, setViewFilter] = useState<'todos' | 'sucesso' | 'falha'>('todos');

  // Refs para controle assíncrono e cancelamento/pausa
  const isCancelledRef = useRef<boolean>(false);
  const isPausedRef = useRef<boolean>(false);
  const currentTemplate = templates.find((t) => t.id === selectedTemplateId) || templates[0];
  const targetIdPlano = authSession.idPlano || 'HCOQIkjSk97gGcfGDPb0h';

  // Sincroniza estado de uso de dados personalizados quando customData é modificado
  useEffect(() => {
    if (customData && Object.keys(customData).length > 0) {
      setUseCustomData(true);
    }
  }, [customData]);

  // Inicializar itens da fila com base nas ferramentas
  useEffect(() => {
    const dadosFonte = useCustomData && customData ? customData : currentTemplate.dados;
    const initialItems: BatchQueueItem[] = ferramentas.map((f, index) => {
      const records = dadosFonte[f.collectionName] || [f.exemploPayload];
      return {
        id: `queue_${f.id}`,
        ferramentaId: f.id,
        ferramentaNome: f.nome,
        collectionName: f.collectionName,
        blocoLabel: f.blocoLabel,
        selected: true,
        order: index + 1,
        status: 'pending',
        totalRegistros: records.length,
        registrosSalvos: 0,
        duracaoMs: 0,
        mensagem: 'Aguardando início do lote',
        docIds: [],
        rotaOficial: `https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${targetIdPlano}/${f.id}`
      };
    });
    setQueueItems(initialItems);
  }, [ferramentas, selectedTemplateId, useCustomData, customData, targetIdPlano]);

  // Funções de manipulação da fila
  const toggleSelectAll = (select: boolean) => {
    setQueueItems((prev) => prev.map((item) => ({ ...item, selected: select })));
  };

  const toggleSelectItem = (id: string) => {
    setQueueItems((prev) =>
      prev.map((item) => (item.id === id ? { ...item, selected: !item.selected } : item))
    );
  };

  const moveItem = (index: number, direction: 'up' | 'down') => {
    if (isExecuting) return;
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= queueItems.length) return;

    const newItems = [...queueItems];
    const [movedItem] = newItems.splice(index, 1);
    newItems.splice(targetIndex, 0, movedItem);

    // Atualiza numeração de ordem
    const reordered = newItems.map((item, idx) => ({ ...item, order: idx + 1 }));
    setQueueItems(reordered);
  };

  const resetQueueStatus = () => {
    setQueueItems((prev) =>
      prev.map((item) => ({
        ...item,
        status: 'pending',
        registrosSalvos: 0,
        duracaoMs: 0,
        mensagem: 'Aguardando início do lote',
        docIds: [],
        erroDetalhe: undefined
      }))
    );
    setReportSummary(null);
  };

  // Utilitário de delay com suporte a pausa, cancelamento e atualização de contagem regressiva
  const waitWithCountdown = async (ms: number) => {
    if (ms <= 0) return;
    const intervalMs = 50;
    let elapsed = 0;

    return new Promise<void>((resolve, reject) => {
      const timer = setInterval(() => {
        if (isCancelledRef.current) {
          clearInterval(timer);
          setCountdownRemainingMs(0);
          reject(new Error('Execução cancelada'));
          return;
        }

        // Aguardar enquanto estiver pausado
        if (isPausedRef.current) {
          return;
        }

        elapsed += intervalMs;
        const remaining = Math.max(0, ms - elapsed);
        setCountdownRemainingMs(remaining);

        if (elapsed >= ms) {
          clearInterval(timer);
          setCountdownRemainingMs(0);
          resolve();
        }
      }, intervalMs);
    });
  };

  // Execução do lote
  const handleStartBatch = async () => {
    setIsExecuting(true);
    setIsPaused(false);
    isCancelledRef.current = false;
    isPausedRef.current = false;
    setReportSummary(null);

    const dadosFonte = useCustomData && customData ? customData : currentTemplate.dados;
    const itemsToExecute = queueItems.filter((it) => it.selected);

    if (itemsToExecute.length === 0) {
      alert('Selecione ao menos 1 ferramenta na fila para executar.');
      setIsExecuting(false);
      return;
    }

    const batchStartTime = Date.now();
    const updatedItems = [...queueItems];

    // Marcar não selecionados como ignorados
    updatedItems.forEach((it) => {
      if (!it.selected) {
        it.status = 'skipped';
        it.mensagem = 'Ignorado pelo usuário (não selecionado)';
      } else {
        it.status = 'pending';
      }
    });
    setQueueItems([...updatedItems]);

    let cancelado = false;
    let teveErroFatal = false;

    for (let i = 0; i < updatedItems.length; i++) {
      if (isCancelledRef.current) {
        cancelado = true;
        break;
      }

      const item = updatedItems[i];
      if (!item.selected) continue;

      // Aguardar se estiver pausado
      while (isPausedRef.current && !isCancelledRef.current) {
        await new Promise((r) => setTimeout(r, 200));
      }

      if (isCancelledRef.current) {
        cancelado = true;
        break;
      }

      setActiveStepIndex(i);

      // Atualiza status do item para "running"
      item.status = 'running';
      item.mensagem = `Conectando e enviando registros via Meteor DDP...`;
      setQueueItems([...updatedItems]);

      const ferramenta = ferramentas.find((f) => f.id === item.ferramentaId);
      const registros = ferramenta
        ? dadosFonte[ferramenta.collectionName] || [ferramenta.exemploPayload]
        : [];

      const stepStartTime = Date.now();

      try {
        const res = await fetch('/api/automation/fill-tool', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ferramentaId: item.ferramentaId,
            registros,
            idPlano: targetIdPlano
          })
        });

        const data = await res.json();
        const duration = Date.now() - stepStartTime;

        if (res.ok && data.resultado) {
          const resStep: ExecutionStepResult = data.resultado;
          item.status = resStep.status === 'success' ? 'success' : resStep.status === 'warning' ? 'warning' : 'error';
          item.registrosSalvos = resStep.registrosSalvos;
          item.duracaoMs = duration;
          item.mensagem = resStep.mensagem;
          item.docIds = resStep.docIds;
          item.erroDetalhe = resStep.status === 'error' ? resStep.mensagem : undefined;
        } else {
          item.status = 'error';
          item.duracaoMs = duration;
          item.mensagem = data.mensagem || 'Falha na resposta do servidor DDP';
          item.erroDetalhe = data.mensagem || `Erro HTTP ${res.status}`;
        }
      } catch (err: any) {
        const duration = Date.now() - stepStartTime;
        item.status = 'error';
        item.duracaoMs = duration;
        item.mensagem = `Erro de rede/DDP: ${err.message}`;
        item.erroDetalhe = err.message;
      }

      setQueueItems([...updatedItems]);
      onRefreshTraffic();

      // Se ocorreu erro e stopOnError estiver ativo
      if (item.status === 'error' && stopOnError) {
        teveErroFatal = true;
        break;
      }

      // Aplica o Delay configurável entre ferramentas (exceto na última executada)
      const hasNextSelected = updatedItems.slice(i + 1).some((it) => it.selected);
      if (hasNextSelected && delayMs > 0 && !isCancelledRef.current) {
        try {
          await waitWithCountdown(delayMs);
        } catch {
          cancelado = true;
          break;
        }
      }
    }

    const batchEndTime = Date.now();
    const totalDuration = batchEndTime - batchStartTime;

    // Gerar Relatório Pós-Execução
    const sucessos = updatedItems.filter((it) => it.status === 'success').length;
    const avisos = updatedItems.filter((it) => it.status === 'warning').length;
    const falhas = updatedItems.filter((it) => it.status === 'error').length;
    const ignorados = updatedItems.filter((it) => it.status === 'skipped' || it.status === 'pending').length;
    const totalExecutados = sucessos + avisos + falhas;
    const taxaSucesso = totalExecutados > 0 ? Math.round(((sucessos + avisos) / totalExecutados) * 100) : 0;
    const totalSalvos = updatedItems.reduce((acc, curr) => acc + curr.registrosSalvos, 0);
    const totalEsperados = updatedItems
      .filter((it) => it.selected)
      .reduce((acc, curr) => acc + curr.totalRegistros, 0);
    const tempoMedio = totalExecutados > 0 ? Math.round(totalDuration / totalExecutados) : 0;

    const summary: BatchReportSummary = {
      idExecucao: `batch_${Date.now()}`,
      templateNome: currentTemplate.nome,
      idPlano: targetIdPlano,
      iniciadoEm: new Date(batchStartTime).toISOString(),
      finalizadoEm: new Date(batchEndTime).toISOString(),
      duracaoTotalMs: totalDuration,
      delayConfiguradoMs: delayMs,
      totalFerramentas: updatedItems.length,
      ferramentasSucesso: sucessos,
      ferramentasAviso: avisos,
      ferramentasFalha: falhas,
      ferramentasIgnoradas: ignorados,
      taxaSucessoPercent: taxaSucesso,
      totalRegistrosSalvos: totalSalvos,
      totalRegistrosEsperados: totalEsperados,
      tempoMedioPorFerramentaMs: tempoMedio,
      statusGeral: cancelado ? 'cancelled' : falhas === 0 ? 'success' : avisos > 0 ? 'warning' : 'error',
      items: [...updatedItems]
    };

    setReportSummary(summary);
    setIsExecuting(false);
    setIsPaused(false);
    setActiveStepIndex(null);
    setCountdownRemainingMs(0);
  };

  const handlePauseToggle = () => {
    const nextState = !isPaused;
    setIsPaused(nextState);
    isPausedRef.current = nextState;
  };

  const handleCancelBatch = () => {
    isCancelledRef.current = true;
    setIsPaused(false);
    isPausedRef.current = false;
    setCountdownRemainingMs(0);
  };

  // Reexecutar apenas as ferramentas com falha
  const handleRetryFailedOnly = () => {
    setQueueItems((prev) =>
      prev.map((item) => ({
        ...item,
        selected: item.status === 'error',
        status: item.status === 'error' ? 'pending' : item.status
      }))
    );
    setTimeout(() => {
      handleStartBatch();
    }, 100);
  };

  // Reexecutar uma ferramenta específica diretamente da tabela do relatório
  const handleRetrySingle = async (ferramentaId: string) => {
    const itemIndex = queueItems.findIndex((it) => it.ferramentaId === ferramentaId);
    if (itemIndex === -1) return;

    const updated = [...queueItems];
    const item = updated[itemIndex];
    item.status = 'running';
    item.mensagem = 'Reexecutando individualmente...';
    setQueueItems([...updated]);

    const dadosFonte = useCustomData && customData ? customData : currentTemplate.dados;
    const ferramenta = ferramentas.find((f) => f.id === ferramentaId);
    const registros = ferramenta
      ? dadosFonte[ferramenta.collectionName] || [ferramenta.exemploPayload]
      : [];

    const start = Date.now();
    try {
      const res = await fetch('/api/automation/fill-tool', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ferramentaId,
          registros,
          idPlano: targetIdPlano
        })
      });

      const data = await res.json();
      const dur = Date.now() - start;

      if (res.ok && data.resultado) {
        const resStep: ExecutionStepResult = data.resultado;
        item.status = resStep.status === 'success' ? 'success' : resStep.status === 'warning' ? 'warning' : 'error';
        item.registrosSalvos = resStep.registrosSalvos;
        item.duracaoMs = dur;
        item.mensagem = resStep.mensagem;
        item.docIds = resStep.docIds;
      } else {
        item.status = 'error';
        item.duracaoMs = dur;
        item.mensagem = data.mensagem || 'Falha na resposta';
      }
    } catch (err: any) {
      item.status = 'error';
      item.duracaoMs = Date.now() - start;
      item.mensagem = err.message;
    }

    setQueueItems([...updated]);
    onRefreshTraffic();
  };

  // Copiar Resumo em Formato Markdown
  const copyReportMarkdown = () => {
    if (!reportSummary) return;

    const md = `
# Relatório de Execução em Lote - PNBOX Sebrae
- **Plano Alvo**: ${reportSummary.idPlano}
- **Modelo de Negócio**: ${reportSummary.templateNome}
- **Data/Hora**: ${new Date(reportSummary.iniciadoEm).toLocaleString('pt-BR')}
- **Duração Total**: ${(reportSummary.duracaoTotalMs / 1000).toFixed(2)}s (Delay entre ferramentas: ${reportSummary.delayConfiguradoMs}ms)
- **Taxa de Sucesso**: ${reportSummary.taxaSucessoPercent}% (${reportSummary.ferramentasSucesso} sucesso, ${reportSummary.ferramentasFalha} falhas, ${reportSummary.ferramentasIgnoradas} ignoradas)
- **Total de Registros Salvos no Meteor DDP**: ${reportSummary.totalRegistrosSalvos}/${reportSummary.totalRegistrosEsperados}

## Detalhamento por Ferramenta:
| # | Ferramenta | Coleção DDP | Status | Registros | Duração | Doc IDs |
|---|---|---|---|---|---|---|
${reportSummary.items
  .map(
    (it) =>
      `| ${it.order} | ${it.ferramentaNome} | \`${it.collectionName}\` | ${
        it.status === 'success'
          ? '✅ Sucesso'
          : it.status === 'warning'
          ? '⚠️ Alerta'
          : it.status === 'error'
          ? '❌ Falha'
          : '⚪ Ignorado'
      } | ${it.registrosSalvos}/${it.totalRegistros} | ${it.duracaoMs}ms | ${it.docIds?.join(', ') || '-'} |`
  )
  .join('\n')}
    `.trim();

    navigator.clipboard.writeText(md);
    setCopiedReport(true);
    setTimeout(() => setCopiedReport(false), 2000);
  };

  // Download do Relatório em JSON
  const downloadReportJson = () => {
    if (!reportSummary) return;
    const blob = new Blob([JSON.stringify(reportSummary, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnbox_relatorio_lote_${reportSummary.idPlano}_${Date.now()}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Contadores
  const selectedCount = queueItems.filter((it) => it.selected).length;
  const completedCount = queueItems.filter(
    (it) => it.status === 'success' || it.status === 'warning' || it.status === 'error'
  ).length;
  const percentProgress = selectedCount > 0 ? Math.round((completedCount / selectedCount) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Banner Principal da Fila */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <Layers className="w-3.5 h-3.5 text-indigo-400" />
                Processador de Fila em Lote (Batch Queue)
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                14 Ferramentas Sequenciais
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Fila de Execução em Lote com Intervalo Configurável
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Enfileire o preenchimento automático das 14 ferramentas oficiais do Sebrae PNBOX com controle total de
              ordem, atraso entre requisições (rate limiting), pausa, cancelamento e auditoria pós-execução.
            </p>
            {/* Seletor Rápido de Plano Ativo */}
            <div className="flex flex-wrap items-center gap-2.5 pt-2 text-xs font-mono">
              <button
                onClick={() => setShowPlanModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-indigo-950/80 hover:bg-indigo-900 text-indigo-200 rounded-xl border border-indigo-500/50 shadow-sm transition-all cursor-pointer group"
                title="Trocar para outro ID de plano"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span className="text-slate-400">Plano Alvo:</span>
                <span className="text-white font-bold">{targetIdPlano}</span>
                <Edit3 className="w-3 h-3 text-indigo-300 ml-1" />
              </button>

              <button
                onClick={() => setShowPlanModal(true)}
                className="flex items-center gap-1 px-2.5 py-1.5 bg-slate-900/90 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Colar outro ID/URL</span>
              </button>

              <a
                href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${targetIdPlano}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 transition-colors"
                title="Abrir no portal Sebrae PNBOX"
              >
                <span>Acessar PNBOX</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>

          {/* Botões de Controle Principal da Fila */}
          <div className="flex flex-wrap items-center gap-3 shrink-0">
            {!isExecuting ? (
              <button
                onClick={handleStartBatch}
                disabled={selectedCount === 0}
                className="flex items-center gap-2 px-6 py-3 rounded-xl font-bold text-sm text-white bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 shadow-lg shadow-emerald-950/50 hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                <Play className="w-4 h-4 fill-current" />
                <span>Executar Fila ({selectedCount} ferramentas)</span>
              </button>
            ) : (
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePauseToggle}
                  className={`flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs text-white border transition-all cursor-pointer ${
                    isPaused
                      ? 'bg-emerald-600 hover:bg-emerald-500 border-emerald-500'
                      : 'bg-amber-600 hover:bg-amber-500 border-amber-500'
                  }`}
                >
                  {isPaused ? (
                    <>
                      <Play className="w-4 h-4 fill-current" />
                      <span>Retomar Fila</span>
                    </>
                  ) : (
                    <>
                      <Pause className="w-4 h-4 fill-current" />
                      <span>Pausar Fila</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleCancelBatch}
                  className="flex items-center gap-1.5 px-4 py-3 rounded-xl font-bold text-xs text-rose-300 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 transition-all cursor-pointer"
                >
                  <XCircle className="w-4 h-4" />
                  <span>Cancelar</span>
                </button>
              </div>
            )}

            <button
              onClick={resetQueueStatus}
              disabled={isExecuting}
              title="Redefinir status da fila"
              className="p-3 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            >
              <RotateCcw className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Barra de Progresso em Tempo Real */}
        {isExecuting && (
          <div className="mt-6 pt-4 border-t border-slate-800/80 space-y-2 animate-in fade-in">
            <div className="flex items-center justify-between text-xs font-mono">
              <div className="flex items-center gap-2 text-indigo-300">
                <RefreshCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span className="font-bold">
                  {isPaused ? 'Fila Pausada pelo Usuário' : 'Executando em Lote...'}
                </span>
                <span className="text-slate-400">
                  ({completedCount}/{selectedCount} finalizadas)
                </span>
              </div>
              {countdownRemainingMs > 0 && (
                <div className="flex items-center gap-1.5 text-amber-300 bg-amber-950/60 px-2.5 py-0.5 rounded-lg border border-amber-500/30">
                  <Clock className="w-3.5 h-3.5 animate-pulse" />
                  <span>Próxima ferramenta em: {(countdownRemainingMs / 1000).toFixed(1)}s</span>
                </div>
              )}
            </div>

            <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800">
              <div
                className="bg-gradient-to-r from-indigo-500 via-teal-400 to-emerald-400 h-full transition-all duration-300 ease-out"
                style={{ width: `${percentProgress}%` }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Painel de Configurações da Fila (Delay, Rate Limiting, Template) */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-400" />
            <h3 className="text-sm font-bold text-slate-100">Parâmetros de Execução e Rate Limiting</h3>
          </div>
          <span className="text-xs text-slate-400 font-mono">Prevenção de sobrecarga no WebSocket DDP</span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
          {/* Configuração de Delay Inter-ferramentas */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-semibold flex items-center justify-between">
              <span>Intervalo entre Ferramentas (Delay):</span>
              <span className="text-indigo-400 font-mono font-bold">{delayMs} ms ({(delayMs / 1000).toFixed(1)}s)</span>
            </label>
            <div className="flex items-center gap-1.5 flex-wrap">
              {[0, 300, 800, 1500, 3000, 5000].map((preset) => (
                <button
                  key={preset}
                  type="button"
                  disabled={isExecuting}
                  onClick={() => setDelayMs(preset)}
                  className={`px-2.5 py-1 rounded-lg font-mono text-[11px] border transition-all ${
                    delayMs === preset
                      ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                      : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
                  }`}
                >
                  {preset === 0 ? '0ms' : `${preset}ms`}
                </button>
              ))}
            </div>
            <input
              type="range"
              min="0"
              max="6000"
              step="100"
              value={delayMs}
              onChange={(e) => setDelayMs(Number(e.target.value))}
              disabled={isExecuting}
              className="w-full accent-indigo-500 bg-slate-950 h-1.5 rounded-lg cursor-pointer"
            />
          </div>

          {/* Modelo de Negócio Alvo */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-slate-300 font-semibold">Fonte dos Dados:</label>
              {customData && (
                <button
                  type="button"
                  onClick={() => setUseCustomData(!useCustomData)}
                  className={`text-[10px] px-2 py-0.5 rounded-full font-bold font-mono transition-all cursor-pointer ${
                    useCustomData
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                      : 'bg-slate-800 text-slate-400 hover:text-slate-200'
                  }`}
                >
                  {useCustomData ? '● Mock Customizado Ativo' : '○ Usar Mock Customizado'}
                </button>
              )}
            </div>

            {useCustomData && customData ? (
              <div className="p-2.5 bg-slate-950 rounded-xl border border-emerald-500/30 flex items-center justify-between gap-2">
                <div className="space-y-0.5 truncate">
                  <p className="text-xs font-bold text-emerald-300 truncate flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                    Dados do SchemaGenerator / Importador
                  </p>
                  <p className="text-[11px] text-slate-400 truncate">
                    {Object.keys(customData).length} coleções customizadas prontas
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setUseCustomData(false)}
                  className="px-2 py-1 text-[10px] text-slate-400 hover:text-slate-200 bg-slate-900 rounded-lg border border-slate-800 cursor-pointer"
                >
                  Alternar
                </button>
              </div>
            ) : (
              <>
                <select
                  value={selectedTemplateId}
                  onChange={(e) => onSelectTemplateId(e.target.value)}
                  disabled={isExecuting}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 font-mono focus:border-indigo-500 focus:outline-none"
                >
                  {templates.map((tpl) => (
                    <option key={tpl.id} value={tpl.id}>
                      {tpl.nome} ({tpl.setor})
                    </option>
                  ))}
                </select>
                <p className="text-[11px] text-slate-400 truncate">
                  {currentTemplate.descricao}
                </p>
              </>
            )}
          </div>

          {/* Opções de Resiliência */}
          <div className="space-y-2">
            <label className="block text-slate-300 font-semibold">Controle de Erros:</label>
            <label className="flex items-center gap-2 p-2 bg-slate-950 rounded-xl border border-slate-800 cursor-pointer text-slate-300">
              <input
                type="checkbox"
                checked={stopOnError}
                onChange={(e) => setStopOnError(e.target.checked)}
                disabled={isExecuting}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span className="text-[11px]">Interromper fila se alguma ferramenta falhar</span>
            </label>
            <div className="text-[11px] text-slate-500 font-mono">
              Plano de gravação: <span className="text-slate-300">{targetIdPlano}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Relatório Pós-Execução (Se disponível) */}
      {reportSummary && (
        <div className="bg-slate-900 rounded-2xl border border-slate-700 p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
            <div className="flex items-center gap-3">
              <div
                className={`p-3 rounded-2xl ${
                  reportSummary.statusGeral === 'success'
                    ? 'bg-emerald-500/20 text-emerald-400'
                    : reportSummary.statusGeral === 'warning'
                    ? 'bg-amber-500/20 text-amber-400'
                    : 'bg-rose-500/20 text-rose-400'
                }`}
              >
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-white">Relatório de Conclusão do Lote</h3>
                  <span
                    className={`px-2.5 py-0.5 rounded-full text-xs font-bold font-mono uppercase ${
                      reportSummary.statusGeral === 'success'
                        ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40'
                        : reportSummary.statusGeral === 'warning'
                        ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40'
                        : 'bg-rose-500/20 text-rose-300 border border-rose-500/40'
                    }`}
                  >
                    {reportSummary.statusGeral === 'success'
                      ? '100% Sucesso'
                      : reportSummary.statusGeral === 'warning'
                      ? 'Concluído com Avisos'
                      : reportSummary.statusGeral === 'cancelled'
                      ? 'Cancelado'
                      : 'Falhas Detectadas'}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-0.5">
                  Execução finalizada em {new Date(reportSummary.finalizadoEm).toLocaleTimeString()} • Duração Total:{' '}
                  <span className="font-mono text-slate-200">
                    {(reportSummary.duracaoTotalMs / 1000).toFixed(2)}s
                  </span>
                </p>
              </div>
            </div>

            {/* Ações do Relatório (Copiar MD, Download JSON, Reexecutar Falhas) */}
            <div className="flex items-center gap-2 flex-wrap">
              {reportSummary.ferramentasFalha > 0 && (
                <button
                  onClick={handleRetryFailedOnly}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-semibold shadow transition-all cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Reexecutar {reportSummary.ferramentasFalha} com Falha</span>
                </button>
              )}

              <button
                onClick={copyReportMarkdown}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
              >
                {copiedReport ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedReport ? 'Copiado!' : 'Copiar Relatório'}</span>
              </button>

              <button
                onClick={downloadReportJson}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-medium transition-colors"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Exportar JSON</span>
              </button>
            </div>
          </div>

          {/* Cards de Métricas e Taxa de Sucesso */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 font-mono text-xs">
            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Taxa de Sucesso</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-emerald-400">{reportSummary.taxaSucessoPercent}%</span>
                <span className="text-[10px] text-slate-500">
                  ({reportSummary.ferramentasSucesso}/{reportSummary.totalFerramentas - reportSummary.ferramentasIgnoradas})
                </span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Registros Gravados</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-indigo-400">{reportSummary.totalRegistrosSalvos}</span>
                <span className="text-[10px] text-slate-500">/ {reportSummary.totalRegistrosEsperados} itens</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Latência Média</span>
              <div className="flex items-baseline gap-1">
                <span className="text-xl font-bold text-cyan-400">{reportSummary.tempoMedioPorFerramentaMs}ms</span>
                <span className="text-[10px] text-slate-500">/ tool</span>
              </div>
            </div>

            <div className="p-3.5 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
              <span className="text-slate-400 text-[10px] uppercase font-bold block">Falhas / Erros</span>
              <div className="flex items-baseline gap-1">
                <span
                  className={`text-xl font-bold ${
                    reportSummary.ferramentasFalha > 0 ? 'text-rose-400' : 'text-slate-400'
                  }`}
                >
                  {reportSummary.ferramentasFalha}
                </span>
                <span className="text-[10px] text-slate-500">ferramentas</span>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Tabela de Enfileiramento e Status das 14 Ferramentas */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-md">
        <div className="p-4 bg-slate-950/80 border-b border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <FileCheck2 className="w-4 h-4 text-emerald-400" />
            <h3 className="text-sm font-bold text-slate-100">
              Ordem de Execução das Ferramentas na Fila ({queueItems.length})
            </h3>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <button
              onClick={() => toggleSelectAll(true)}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors"
            >
              Selecionar Todas (14)
            </button>
            <button
              onClick={() => toggleSelectAll(false)}
              disabled={isExecuting}
              className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg transition-colors"
            >
              Desmarcar Todas
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-slate-800 bg-slate-950/40 text-slate-400 font-mono text-[11px] uppercase">
                <th className="py-3 px-4 w-12 text-center">Sel.</th>
                <th className="py-3 px-3 w-16 text-center">Ordem</th>
                <th className="py-3 px-4">Ferramenta / Módulo</th>
                <th className="py-3 px-4">Coleção DDP</th>
                <th className="py-3 px-3 text-center">Registros</th>
                <th className="py-3 px-4 text-center">Status</th>
                <th className="py-3 px-3 text-right">Duração</th>
                <th className="py-3 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-mono">
              {queueItems.map((item, index) => {
                const isRunningThis = activeStepIndex === index && isExecuting;

                return (
                  <tr
                    key={item.id}
                    className={`transition-colors ${
                      isRunningThis
                        ? 'bg-indigo-950/40 border-y border-indigo-500/50 animate-pulse'
                        : item.status === 'success'
                        ? 'bg-slate-900/40 hover:bg-slate-850/40'
                        : item.status === 'error'
                        ? 'bg-rose-950/20 hover:bg-rose-950/30'
                        : 'hover:bg-slate-850/30'
                    }`}
                  >
                    {/* Checkbox de Seleção */}
                    <td className="py-3 px-4 text-center">
                      <input
                        type="checkbox"
                        checked={item.selected}
                        onChange={() => toggleSelectItem(item.id)}
                        disabled={isExecuting}
                        className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-4 h-4 cursor-pointer"
                      />
                    </td>

                    {/* Ordem e Botões de Mover */}
                    <td className="py-3 px-3 text-center">
                      <div className="flex items-center justify-center gap-1">
                        <span className="font-bold text-slate-400">#{item.order}</span>
                        {!isExecuting && (
                          <div className="flex flex-col">
                            <button
                              onClick={() => moveItem(index, 'up')}
                              disabled={index === 0}
                              className="text-slate-500 hover:text-slate-200 disabled:opacity-20 p-0.5"
                            >
                              <ArrowUp className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => moveItem(index, 'down')}
                              disabled={index === queueItems.length - 1}
                              className="text-slate-500 hover:text-slate-200 disabled:opacity-20 p-0.5"
                            >
                              <ArrowDown className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </td>

                    {/* Nome da Ferramenta */}
                    <td className="py-3 px-4">
                      <div>
                        <span className="font-sans font-bold text-slate-200 text-xs">{item.ferramentaNome}</span>
                        <div className="text-[10px] text-slate-500">{item.blocoLabel}</div>
                      </div>
                    </td>

                    {/* Coleção DDP */}
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded bg-slate-950 border border-slate-800 text-indigo-300 text-[11px]">
                        {item.collectionName}
                      </span>
                    </td>

                    {/* Quantidade de Registros */}
                    <td className="py-3 px-3 text-center">
                      <span className="text-slate-300">
                        {item.status === 'success' || item.status === 'warning'
                          ? `${item.registrosSalvos}/${item.totalRegistros}`
                          : `${item.totalRegistros} itens`}
                      </span>
                    </td>

                    {/* Status da Execução */}
                    <td className="py-3 px-4 text-center">
                      {isRunningThis ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold bg-indigo-500/20 text-indigo-300 border border-indigo-500/40">
                          <RefreshCw className="w-3 h-3 animate-spin" />
                          Gravando DDP...
                        </span>
                      ) : item.status === 'success' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                          <CheckCircle2 className="w-3 h-3" />
                          Sucesso
                        </span>
                      ) : item.status === 'warning' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/40">
                          <AlertTriangle className="w-3 h-3" />
                          Alerta
                        </span>
                      ) : item.status === 'error' ? (
                        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[11px] font-bold bg-rose-500/20 text-rose-300 border border-rose-500/40">
                          <AlertCircle className="w-3 h-3" />
                          Falha
                        </span>
                      ) : item.status === 'skipped' ? (
                        <span className="px-2 py-1 rounded-full text-[10px] text-slate-500 bg-slate-950 border border-slate-800">
                          Ignorado
                        </span>
                      ) : (
                        <span className="px-2 py-1 rounded-full text-[10px] text-slate-400 bg-slate-950 border border-slate-800">
                          Pendente
                        </span>
                      )}
                    </td>

                    {/* Duração */}
                    <td className="py-3 px-3 text-right text-slate-400 text-[11px]">
                      {item.duracaoMs > 0 ? `${item.duracaoMs}ms` : '-'}
                    </td>

                    {/* Ações (Reexecutar / Acessar Portal) */}
                    <td className="py-3 px-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        <button
                          onClick={() => handleRetrySingle(item.ferramentaId)}
                          disabled={isExecuting}
                          title="Reexecutar individualmente esta ferramenta"
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-300 hover:text-white rounded-lg border border-slate-800 transition-colors"
                        >
                          <Play className="w-3 h-3" />
                        </button>

                        <a
                          href={item.rotaOficial}
                          target="_blank"
                          rel="noopener noreferrer"
                          title="Abrir no portal oficial Sebrae PNBOX"
                          className="p-1.5 bg-slate-950 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 rounded-lg border border-slate-800 transition-colors"
                        >
                          <ExternalLink className="w-3 h-3" />
                        </a>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal de Troca / Seleção de Plano */}
      <PlanSwitcherModal
        isOpen={showPlanModal}
        onClose={() => setShowPlanModal(false)}
        activePlanId={targetIdPlano}
        onSelectPlanId={(novoId) => {
          onUpdateActivePlanId(novoId);
          setShowPlanModal(false);
        }}
        onNavigateTab={onNavigateTab}
      />
    </div>
  );
};
