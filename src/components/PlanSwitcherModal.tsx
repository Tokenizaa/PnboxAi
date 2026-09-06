import React, { useEffect, useMemo, useState } from 'react';
import { AlertCircle, Check, CheckCircle2, Copy, ExternalLink, Globe, RefreshCw, Search, Sparkles } from 'lucide-react';
import { PlanoCriadoInfo } from '../types/pnbox';

interface PlanSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlanId: string;
  onSelectPlanId: (idPlano: string) => void;
  onNavigateTab?: (tab: string) => void;
  onSyncPnbox?: () => Promise<void>;
}

export const PlanSwitcherModal: React.FC<PlanSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePlanId,
  onSelectPlanId,
  onNavigateTab,
  onSyncPnbox
}) => {
  const [planos, setPlanos] = useState<PlanoCriadoInfo[]>([]);
  const [filtro, setFiltro] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);

  const carregarPlanosRemotos = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    try {
      const response = await fetch('/api/pnbox/plans', { credentials: 'include' });
      const body = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(body?.error || body?.message || `Falha ao consultar PNBOX (${response.status})`);
      const remote = Array.isArray(body?.planos) ? body.planos : Array.isArray(body) ? body : [];
      setPlanos(remote);
    } catch (error) {
      setPlanos([]);
      setErrorMsg(error instanceof Error ? error.message : 'Não foi possível consultar os planos reais do PNBOX.');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setFiltro('');
      setCopiedId(null);
      void carregarPlanosRemotos();
    }
  }, [isOpen]);

  const handleSync = async () => {
    if (!onSyncPnbox) return;
    setIsSyncing(true);
    setErrorMsg(null);
    try {
      await onSyncPnbox();
      await carregarPlanosRemotos();
    } catch (error) {
      setErrorMsg(error instanceof Error ? error.message : 'Falha ao sincronizar com o PNBOX.');
    } finally {
      setIsSyncing(false);
    }
  };

  const handleSelect = (plano: PlanoCriadoInfo) => {
    if (!plano.idPlano) return;
    onSelectPlanId(plano.idPlano);
    onClose();
  };

  const handleCopy = async (event: React.MouseEvent, idPlano: string) => {
    event.stopPropagation();
    await navigator.clipboard.writeText(idPlano);
    setCopiedId(idPlano);
    window.setTimeout(() => setCopiedId(null), 2000);
  };

  const planosFiltrados = useMemo(() => {
    const termo = filtro.trim().toLowerCase();
    if (!termo) return planos;
    return planos.filter((plano) =>
      [plano.nomePlano, plano.idPlano, plano.setor, plano.cidadeUf]
        .filter(Boolean)
        .some((value) => value.toLowerCase().includes(termo))
    );
  }, [filtro, planos]);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl">
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center"><Globe className="w-4 h-4" /></div>
              <h2 className="text-lg font-bold text-white">Planos reais do Sebrae PNBOX</h2>
            </div>
            <p className="text-xs text-slate-400 mt-1">A lista abaixo é carregada diretamente do PNBOX. Este componente não cria, inventa ou persiste planos localmente.</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800">✕</button>
        </div>

        <div className="p-6 overflow-y-auto space-y-5 flex-1">
          {activePlanId ? (
            <div className="p-4 bg-slate-950 border border-indigo-500/40 rounded-2xl flex items-center justify-between gap-3">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 flex items-center gap-1"><CheckCircle2 className="w-3.5 h-3.5" /> Plano ativo</span>
                <div className="text-xs font-mono text-indigo-300 mt-1 break-all">{activePlanId}</div>
              </div>
              <a href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${activePlanId}`} target="_blank" rel="noopener noreferrer" className="px-3 py-1.5 bg-indigo-600/20 text-indigo-200 text-xs rounded-xl border border-indigo-500/40 flex items-center gap-1.5">
                Abrir no PNBOX <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          ) : (
            <div className="p-4 bg-slate-950 border border-amber-500/30 rounded-2xl text-xs text-amber-300 flex items-center gap-2"><AlertCircle className="w-4 h-4" />Nenhum plano real está selecionado.</div>
          )}

          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">Planos encontrados ({planosFiltrados.length})</h3>
              {onSyncPnbox && <button onClick={handleSync} disabled={isSyncing || isLoading} className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-indigo-600/30 border border-indigo-500/40 text-indigo-200 text-[11px] rounded-lg disabled:opacity-50"><RefreshCw className={`w-3 h-3 ${isSyncing ? 'animate-spin' : ''}`} />{isSyncing ? 'Sincronizando...' : 'Atualizar PNBOX'}</button>}
            </div>
            <div className="relative w-48"><Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" /><input value={filtro} onChange={(e) => setFiltro(e.target.value)} placeholder="Filtrar..." className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200" /></div>
          </div>

          {errorMsg && <div className="text-xs text-rose-400 flex items-center gap-1.5"><AlertCircle className="w-3.5 h-3.5" />{errorMsg}</div>}

          <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
            {isLoading ? <div className="p-6 text-center text-xs text-slate-400">Consultando planos no PNBOX...</div> : planosFiltrados.length === 0 ? <div className="p-6 text-center text-xs text-slate-500 border border-dashed border-slate-800 rounded-2xl">Nenhum plano real retornado pela conta autenticada.</div> : planosFiltrados.map((plano) => {
              const selected = plano.idPlano === activePlanId;
              return (
                <div key={plano.idPlano} onClick={() => handleSelect(plano)} className={`p-3 rounded-2xl border flex items-center justify-between gap-3 cursor-pointer ${selected ? 'bg-indigo-950/50 border-indigo-500/60' : 'bg-slate-950/60 border-slate-800 hover:border-slate-700'}`}>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2"><span className="font-bold text-white text-xs truncate">{plano.nomePlano || 'Plano PNBOX'}</span>{selected && <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 rounded">ATIVO</span>}</div>
                    <div className="text-[11px] font-mono text-indigo-300 mt-1 break-all">{plano.idPlano}</div>
                    <div className="text-[10px] text-slate-500 mt-0.5">{plano.setor || 'Sem setor'}{plano.cidadeUf ? ` • ${plano.cidadeUf}` : ''}</div>
                  </div>
                  <button onClick={(event) => handleCopy(event, plano.idPlano)} className="p-1.5 rounded-lg bg-slate-900 text-slate-400 hover:text-white" title="Copiar ID">{copiedId === plano.idPlano ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}</button>
                </div>
              );
            })}
          </div>

          {onNavigateTab && <div className="p-4 bg-indigo-950/30 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-3"><div><span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5"><Sparkles className="w-3.5 h-3.5" />Criar um novo plano com IA</span><p className="text-[11px] text-slate-400 mt-1">A criação deve gerar o plano no PNBOX e retornar o ID real antes da seleção.</p></div><button onClick={() => { onClose(); onNavigateTab('criar_plano_ia'); }} className="px-4 py-2 bg-indigo-600 text-white text-xs font-bold rounded-xl">Criar com IA</button></div>}
        </div>

        <div className="p-4 border-t border-slate-800 flex justify-end"><button onClick={onClose} className="px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-semibold">Fechar</button></div>
      </div>
    </div>
  );
};
