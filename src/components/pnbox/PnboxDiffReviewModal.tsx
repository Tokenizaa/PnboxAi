import React, { useState } from 'react';
import {
  X,
  CloudUpload,
  Layers,
  CheckCircle2,
  AlertCircle,
  Eye,
  CheckSquare,
  Square,
  ArrowRight,
  RefreshCw,
  Sparkles
} from 'lucide-react';
import { FerramentaInfo, PlanoCriadoInfo } from '../../types/pnbox';

interface PnboxDiffReviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  plano: PlanoCriadoInfo;
  ferramentas: FerramentaInfo[];
  onConfirmSync: (selectedToolIds?: string[]) => Promise<void>;
  isSyncing: boolean;
}

export const PnboxDiffReviewModal: React.FC<PnboxDiffReviewModalProps> = ({
  isOpen,
  onClose,
  plano,
  ferramentas,
  onConfirmSync,
  isSyncing
}) => {
  const dados = plano.dados14Ferramentas || {};
  
  // Identificar quais ferramentas possuem dados prontos para sincronizar
  const toolsWithData = ferramentas.map((f) => {
    const itens = (dados[f.id] || dados[f.collectionName] || []) as Record<string, unknown>[];
    return {
      ferramenta: f,
      itens,
      count: itens.length,
      hasData: itens.length > 0
    };
  });

  const filledTools = toolsWithData.filter((t) => t.hasData);

  const [selectedTools, setSelectedTools] = useState<Record<string, boolean>>(() => {
    const initial: Record<string, boolean> = {};
    ferramentas.forEach((f) => {
      const items = (dados[f.id] || dados[f.collectionName] || []) as Record<string, unknown>[];
      initial[f.id] = items.length > 0;
    });
    return initial;
  });

  const [inspectToolId, setInspectToolId] = useState<string>(filledTools[0]?.ferramenta.id || 'segmentacaoMercado');

  if (!isOpen) return null;

  const totalItemsToSync = toolsWithData
    .filter((t) => selectedTools[t.ferramenta.id])
    .reduce((acc, curr) => acc + curr.count, 0);

  const selectedCount = Object.values(selectedTools).filter(Boolean).length;

  const toggleTool = (id: string) => {
    setSelectedTools((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const selectAll = () => {
    const update: Record<string, boolean> = {};
    toolsWithData.forEach((t) => {
      if (t.hasData) update[t.ferramenta.id] = true;
    });
    setSelectedTools(update);
  };

  const deselectAll = () => {
    const update: Record<string, boolean> = {};
    toolsWithData.forEach((t) => {
      update[t.ferramenta.id] = false;
    });
    setSelectedTools(update);
  };

  const inspecting = toolsWithData.find((t) => t.ferramenta.id === inspectToolId) || toolsWithData[0];

  const handleExecute = async () => {
    const toolIds = Object.entries(selectedTools)
      .filter(([, selected]) => selected)
      .map(([id]) => id);
    await onConfirmSync(toolIds);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div className="w-full max-w-5xl bg-[#1e1d4b] border border-indigo-500/30 rounded-3xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="px-6 py-5 border-b border-[#2d2a63] flex items-center justify-between bg-gradient-to-r from-[#18173d] to-[#1e1d4b]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#1877f2]/20 border border-[#1877f2]/40 flex items-center justify-center text-[#1877f2]">
              <CloudUpload className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <span>Conciliação & Pré-Sincronização</span>
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                  {selectedCount} ferramenta(s) selecionada(s)
                </span>
              </h2>
              <p className="text-xs text-indigo-200/80">
                Revise os dados sintetizados por IA antes de gravá-los na sua conta oficial do Sebrae PNBOX.
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/10 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body dividido em 2 colunas: Lista de Ferramentas e Inspeção de Itens */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
          {/* Coluna Esquerda: Lista das 14 Ferramentas */}
          <div className="lg:col-span-5 border-r border-[#2d2a63] p-4 overflow-y-auto space-y-3 bg-[#15143a]">
            <div className="flex items-center justify-between pb-2 border-b border-[#2d2a63]">
              <span className="text-xs font-semibold text-indigo-200">
                Ferramentas do Plano ({filledTools.length}/14 com dados)
              </span>
              <div className="flex items-center gap-2 text-xs">
                <button
                  type="button"
                  onClick={selectAll}
                  className="text-indigo-400 hover:text-indigo-300 font-medium transition-colors"
                >
                  Marcar Todas
                </button>
                <span className="text-slate-600">|</span>
                <button
                  type="button"
                  onClick={deselectAll}
                  className="text-slate-400 hover:text-slate-300 font-medium transition-colors"
                >
                  Desmarcar
                </button>
              </div>
            </div>

            <div className="space-y-1.5">
              {toolsWithData.map(({ ferramenta, count, hasData }) => {
                const isSelected = !!selectedTools[ferramenta.id];
                const isInspecting = inspectToolId === ferramenta.id;

                return (
                  <div
                    key={ferramenta.id}
                    onClick={() => setInspectToolId(ferramenta.id)}
                    className={`flex items-center justify-between p-3 rounded-2xl border transition-all cursor-pointer ${
                      isInspecting
                        ? 'bg-[#1877f2]/20 border-[#1877f2] text-white shadow-sm'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          if (hasData) toggleTool(ferramenta.id);
                        }}
                        disabled={!hasData}
                        className={`text-indigo-400 disabled:opacity-30 hover:scale-110 transition-transform ${
                          !hasData ? 'cursor-not-allowed' : 'cursor-pointer'
                        }`}
                      >
                        {isSelected && hasData ? (
                          <CheckSquare className="w-4 h-4 text-emerald-400" />
                        ) : (
                          <Square className="w-4 h-4 text-slate-500" />
                        )}
                      </button>

                      <div className="truncate">
                        <div className="text-xs font-bold truncate flex items-center gap-1.5">
                          <span>{ferramenta.nome}</span>
                        </div>
                        <div className="text-[10px] text-indigo-300/70 font-mono">
                          {ferramenta.collectionName}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {hasData ? (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                          {count} item(ns)
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-medium bg-white/5 text-slate-500">
                          Pendente
                        </span>
                      )}
                      <Eye className={`w-3.5 h-3.5 ${isInspecting ? 'text-[#1877f2]' : 'text-slate-500'}`} />
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Coluna Direita: Visualizador Detalhado dos Dados a Serem Enviados */}
          <div className="lg:col-span-7 p-6 overflow-y-auto space-y-4 bg-[#1e1d4b]">
            {inspecting && (
              <>
                <div className="flex items-start justify-between gap-3 pb-3 border-b border-[#2d2a63]">
                  <div>
                    <h3 className="text-base font-bold text-white flex items-center gap-2">
                      <span>{inspecting.ferramenta.nome}</span>
                      <span className="text-xs font-mono font-normal text-indigo-300 bg-indigo-950/60 px-2 py-0.5 rounded-md border border-indigo-500/30">
                        {inspecting.ferramenta.collectionName}
                      </span>
                    </h3>
                    <p className="text-xs text-indigo-200/80 mt-0.5">
                      {inspecting.ferramenta.descricao}
                    </p>
                  </div>

                  <div className="text-right">
                    <span className="text-xs font-bold text-indigo-300">
                      {inspecting.count} registro(s) pronto(s)
                    </span>
                  </div>
                </div>

                {inspecting.itens.length === 0 ? (
                  <div className="py-12 text-center text-slate-400 space-y-2">
                    <AlertCircle className="w-8 h-8 mx-auto text-slate-500" />
                    <p className="text-sm font-semibold">Nenhum registro sintetizado para esta ferramenta.</p>
                    <p className="text-xs text-slate-500">
                      Gere o plano completo usando a IA Gemini/NVIDIA para popular automaticamente.
                    </p>
                  </div>
                ) : (
                  <div className="space-y-4">
                    {inspecting.itens.map((item, idx) => (
                      <div
                        key={idx}
                        className="bg-[#15143a] border border-[#2d2a63] rounded-2xl p-4 shadow-sm space-y-2"
                      >
                        <div className="flex items-center justify-between border-b border-white/5 pb-2">
                          <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-pink-400" />
                            <span>Registro #{idx + 1}</span>
                          </span>
                          <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-white/5 text-slate-400">
                            idPlano: {plano.idPlano}
                          </span>
                        </div>

                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                          {Object.entries(item).map(([k, v]) => {
                            if (k === 'idPlano' || k === '_id' || k === 'id') return null;
                            const isNumeric = typeof v === 'number';
                            const isCurrency =
                              isNumeric &&
                              (k.toLowerCase().includes('valor') ||
                                k.toLowerCase().includes('custo') ||
                                k.toLowerCase().includes('preco') ||
                                k.toLowerCase().includes('faturamento') ||
                                k.toLowerCase().includes('capital') ||
                                k.toLowerCase().includes('necessidade'));

                            const formattedVal = isCurrency
                              ? (v as number).toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
                              : typeof v === 'object'
                              ? JSON.stringify(v)
                              : String(v ?? '-');

                            return (
                              <div key={k} className="space-y-0.5">
                                <label className="text-[11px] font-semibold text-indigo-300/80 capitalize">
                                  {k.replace(/([A-Z])/g, ' $1')}
                                </label>
                                <div className="text-xs text-white font-medium bg-white/5 p-2 rounded-xl border border-white/5 break-words">
                                  {formattedVal}
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer com Ações */}
        <div className="px-6 py-4 border-t border-[#2d2a63] bg-[#15143a] flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="text-xs text-indigo-200">
            Total selecionado: <strong className="text-white">{selectedCount} ferramentas</strong> ({totalItemsToSync} registros)
          </div>

          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white rounded-xl hover:bg-white/10 transition-colors cursor-pointer"
            >
              Cancelar
            </button>

            <button
              type="button"
              onClick={handleExecute}
              disabled={isSyncing || selectedCount === 0}
              className="flex items-center gap-2 px-5 py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-xl text-xs sm:text-sm font-bold shadow-lg shadow-[#1877f2]/30 transition-all active:scale-95 disabled:opacity-50 cursor-pointer"
            >
              {isSyncing ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Sincronizando no Sebrae...</span>
                </>
              ) : (
                <>
                  <CloudUpload className="w-4 h-4" />
                  <span>Gravar no Sebrae PNBOX</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
