import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PnboxNavbar } from './components/pnbox/PnboxNavbar';
import { PnboxPlansView } from './components/pnbox/PnboxPlansView';
import { PnboxToolsMatrix } from './components/pnbox/PnboxToolsMatrix';
import { PnboxToolDetailView } from './components/pnbox/PnboxToolDetailView';
import { PnboxAiCopilotDrawer } from './components/pnbox/PnboxAiCopilotDrawer';
import { PnboxCreatePlanModal } from './components/pnbox/PnboxCreatePlanModal';
import { PnboxConnectionTimeline } from './components/pnbox/PnboxConnectionTimeline';
import { Toast, ToastMessage } from './components/Toast';
import { AuthSessionState, FerramentaInfo, InterceptedTrafficEvent, PlanoCriadoInfo, CredenciaisLogin } from './types/pnbox';
import { FERRAMENTAS_PNBOX } from './automation/schemaCatalog';
import { carregarPlanosSalvos, salvarPlanoNoHistorico, conciliarPlanosBidirecional, extrairIdPlano } from './utils/planUtils';
import { SchemaGenerator } from './utils/schemaGenerator';
import { getPlatformSession } from './components/PlatformGate';

interface PnboxCreds { cpf: string; password: string; idPlano: string; }
function platformToken(): string | null { return getPlatformSession()?.accessToken || null; }
async function persistirCredenciaisNoBanco(creds: PnboxCreds): Promise<boolean> {
  const token = platformToken(); if (!token) return false;
  try { const res = await fetch('/api/auth/pnbox-credentials', { method: 'PUT', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` }, body: JSON.stringify(creds) }); return res.ok; } catch { return false; }
}

export function App() {
  const [viewMode, setViewMode] = useState<'plans' | 'tools_matrix' | 'tool_detail'>('plans');
  const [planoAtivoId, setPlanoAtivoId] = useState<string>('');
  const [ferramentaAtivaId, setFerramentaAtivaId] = useState<string>('segmentacaoMercado');
  const [planos, setPlanos] = useState<PlanoCriadoInfo[]>(() => carregarPlanosSalvos());
  const [ferramentas, setFerramentas] = useState<FerramentaInfo[]>(FERRAMENTAS_PNBOX);
  const [eventosTrafego, setEventosTrafego] = useState<InterceptedTrafficEvent[]>([]);
  const [showAiCopilotDrawer, setShowAiCopilotDrawer] = useState(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState(false);
  const [showBackendModal, setShowBackendModal] = useState(false);
  const [isSyncing, setIsSyncing] = useState(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState(false);
  const [authSession, setAuthSession] = useState<AuthSessionState>({ status: 'idle', cpf: '', idPlano: '', modoExecucao: 'DRY_RUN', logs: [{ timestamp: new Date().toISOString(), mensagem: 'Painel inicializado. Aguardando sessão PNBOX real.', level: 'info' }] });
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const lastAutoReconnectAttemptRef = useRef<number>(0);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState(false);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6); const newToast = { id, ...toast }; setToasts(prev => [...prev, newToast]); const duration = toast.duration ?? 4000; if (duration > 0) setTimeout(() => setToasts(prev => prev.filter(t => t.id !== id)), duration); return id;
  }, []);
  const dismissToast = useCallback((id: string) => setToasts(prev => prev.filter(t => t.id !== id)), []);

  const planoAtivo = planos.find(p => p.idPlano === planoAtivoId);
  const ferramentaAtiva = ferramentas.find(f => f.id === ferramentaAtivaId) || ferramentas[0];
  const getItensFerramentaAtiva = (): Record<string, unknown>[] => {
    if (!planoAtivo || !ferramentaAtiva) return [];
    return planoAtivo.dados14Ferramentas?.[ferramentaAtivaId] || [];
  };

  const carregarDados = useCallback(async () => {
    try {
      const token = platformToken(); const headers: Record<string,string> = token ? { Authorization: `Bearer ${token}` } : {};
      const resAuth = await fetch('/api/automation/auth/status', { headers });
      if (resAuth.ok) {
        const dataAuth = await resAuth.json();
        if (dataAuth.session) {
          setAuthSession(dataAuth.session);
          if (dataAuth.session.idPlano) setPlanoAtivoId(dataAuth.session.idPlano);
          if (Array.isArray(dataAuth.session.planosPnbox)) setPlanos(prev => conciliarPlanosBidirecional(dataAuth.session.planosPnbox, prev));
        }
      }
      const resPlans = await fetch('/api/pnbox/plans', { headers });
      if (resPlans.ok) {
        const dataPlans = await resPlans.json();
        if (Array.isArray(dataPlans.planos)) {
          const conciliados = conciliarPlanosBidirecional(dataPlans.planos, planos);
          setPlanos(conciliados);
          setPlanoAtivoId(prev => conciliados.some(p => p.idPlano === prev) ? prev : (conciliados[0]?.idPlano || ''));
        }
      }
      const resTraffic = await fetch('/api/automation/traffic', { headers });
      if (resTraffic.ok) { const dataTraffic = await resTraffic.json(); if (dataTraffic.eventos) setEventosTrafego(dataTraffic.eventos); }
    } catch (err) { console.warn('Falha ao carregar dados remotos do PNBOX:', err); }
  }, [planos]);
  useEffect(() => { carregarDados(); }, [carregarDados]);

  const handleUpdateActivePlanId = (entrada: string) => {
    const novoId = extrairIdPlano(entrada);
    if (!novoId) { pushToast({ level: 'error', title: 'Plano inválido', message: 'Informe um ID de plano real do PNBOX.', duration: 4000 }); return; }
    setPlanoAtivoId(novoId); setAuthSession(prev => ({ ...prev, idPlano: novoId, logs: [{ timestamp: new Date().toISOString(), mensagem: `Plano ativo definido para ${novoId}`, level: 'info' }, ...prev.logs] }));
  };
  const handleSelectPlano = (idPlano: string) => { if (!idPlano.trim()) return; handleUpdateActivePlanId(idPlano); setViewMode('tools_matrix'); };
  const handleSelectFerramenta = (ferramentaId: string) => { setFerramentaAtivaId(ferramentaId); setViewMode('tool_detail'); };

  const handleExecuteAllWithAi = async () => {
    if (!planoAtivo) { pushToast({ level: 'error', title: 'Nenhum plano selecionado', message: 'Sincronize ou crie um plano no PNBOX antes de gerar as ferramentas.', duration: 4500 }); return; }
    setIsGeneratingAi(true);
    try {
      const researchRes = await fetch('/api/ai/deep-research', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ prompt: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}`, ideiaNegocio: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}`, cidadeUf: planoAtivo.cidadeUf, orcamentoEstimado: 85000, provider: 'gemini' }) });
      if (!researchRes.ok) throw new Error(`Falha na pesquisa IA: ${researchRes.status}`);
      const research = await researchRes.json(); if (!research.report) throw new Error('A pesquisa IA não retornou relatório.');
      const res = await fetch('/api/ai/synthesize-plan', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ research: research.report, idPlano: planoAtivo.idPlano }) });
      if (!res.ok) throw new Error(`AI synthesis failed with status ${res.status}`);
      const json = await res.json(); const dadosSintetizados = json.dados14Ferramentas || json.planData;
      if (!dadosSintetizados || typeof dadosSintetizados !== 'object') throw new Error('A IA não retornou dados das ferramentas.');
      const planoAtualizado: PlanoCriadoInfo = { ...planoAtivo, dados14Ferramentas: dadosSintetizados, ferramentasPreenchidas: Object.values(dadosSintetizados).filter((arr: any) => Array.isArray(arr) && arr.length > 0).length, status: 'criado_pnbox_ddp' };
      setPlanos(salvarPlanoNoHistorico(planoAtualizado));
      pushToast({ level: 'success', title: 'Dados gerados', message: 'As ferramentas foram sintetizadas para o plano real do PNBOX.', duration: 4500, icon: 'check' });
    } catch (err: any) { pushToast({ level: 'error', title: 'Erro na geração com IA', message: err.message || 'Falha na síntese IA', duration: 5000, icon: 'error' }); }
    finally { setIsGeneratingAi(false); }
  };

  const handleSyncAllToSebrae = async () => {
    if (!planoAtivo) { pushToast({ level: 'error', title: 'Nenhum plano selecionado', message: 'Selecione um plano PNBOX real.', duration: 4000 }); return; }
    setIsSyncing(true);
    try {
      const dadosParaEnviar = planoAtivo.dados14Ferramentas;
      if (!dadosParaEnviar || Object.values(dadosParaEnviar).every(arr => !arr || arr.length === 0)) throw new Error('O plano não possui ferramentas preenchidas.');
      const token = platformToken(); const headers: Record<string,string> = { 'Content-Type':'application/json' }; if (token) headers.Authorization = `Bearer ${token}`;
      const res = await fetch('/api/automation/fill-batch', { method:'POST', headers, body: JSON.stringify({ templateId:'placeholder', idPlano:planoAtivo.idPlano, dados:dadosParaEnviar, modoExecucao:authSession.modoExecucao }) });
      const data = await res.json(); if (!res.ok || data.status !== 'ok') throw new Error(data.mensagem || 'Falha na sincronização PNBOX.');
      const summary = data.data; const failed = summary?.ferramentasFalha || 0;
      pushToast({ level: failed ? 'warn' : 'success', title: failed ? 'Sincronização parcial' : 'Sincronização concluída', message: `Sucesso: ${summary?.ferramentasSucesso || 0}; falhas: ${failed}; registros: ${summary?.totalRegistrosSalvos || 0}.`, duration: 5000, icon: failed ? 'warn' : 'check' });
      await carregarDados();
    } catch (err: any) { pushToast({ level:'error', title:'Erro na sincronização', message:err.message || 'Falha na sincronização', duration:5000, icon:'error' }); }
    finally { setIsSyncing(false); }
  };

  const handleSyncPnboxPlans = async () => {
    setIsSyncing(true); try { const token = platformToken(); const headers: Record<string,string> = token ? { Authorization:`Bearer ${token}` } : {}; const res = await fetch('/api/pnbox/plans',{headers}); if(!res.ok) throw new Error((await res.json().catch(()=>({}))).message || 'Falha ao buscar projetos do PNBOX'); const data=await res.json(); if(!Array.isArray(data.planos)) throw new Error('Resposta de planos do PNBOX inválida.'); const conciliados=conciliarPlanosBidirecional(data.planos,planos); setPlanos(conciliados); setPlanoAtivoId(conciliados[0]?.idPlano || ''); pushToast({level:'success',title:'Projetos sincronizados',message:`${conciliados.length} projeto(s) oficial(is) carregado(s).`,duration:4000,icon:'check'}); } catch(err:any){pushToast({level:'error',title:'Erro ao sincronizar projetos',message:err.message||'Verifique a sessão PNBOX.',duration:5000,icon:'error'});} finally{setIsSyncing(false);} };

  const handlePullAllFromPnbox = async (targetId?: string) => {
    const id = targetId || planoAtivo?.idPlano; if (!id) { pushToast({level:'error',title:'Nenhum plano selecionado',message:'Selecione um plano PNBOX real.',duration:4000}); return; }
    setIsSyncing(true); try { const token=platformToken(); const headers:Record<string,string> = token ? {Authorization:`Bearer ${token}`} : {}; const res=await fetch(`/api/pnbox/plans/${encodeURIComponent(id)}/pull-all`,{headers}); const data=await res.json(); if(!res.ok) throw new Error(data.message||data.mensagem||'Falha ao importar dados do PNBOX.'); pushToast({level:'success',title:'Dados importados',message:'Dados carregados diretamente do PNBOX.',duration:4000,icon:'check'}); await carregarDados(); } catch(err:any){pushToast({level:'error',title:'Erro ao importar',message:err.message||'Falha ao importar dados.',duration:5000,icon:'error'});} finally{setIsSyncing(false);} };

  const handlePlanCreated = (novoPlano: PlanoCriadoInfo) => { if (!novoPlano.idPlano || novoPlano.idPlano.startsWith('plano_')) { pushToast({level:'error',title:'Criação não confirmada',message:'O PNBOX não retornou um ID real.',duration:5000}); return; } setPlanos(prev => conciliarPlanosBidirecional([novoPlano],prev)); setPlanoAtivoId(novoPlano.idPlano); setViewMode('tools_matrix'); };

  return (
    <div className="min-h-screen bg-[#09090b] text-white">
      <PnboxNavbar authSession={authSession} onOpenBackend={() => setShowBackendModal(true)} onOpenAi={() => setShowAiCopilotDrawer(true)} onSync={handleSyncPnboxPlans} isSyncing={isSyncing} />
      {viewMode === 'plans' && <PnboxPlansView planos={planos} planoAtivoId={planoAtivoId} onSelectPlano={handleSelectPlano} onCreatePlan={() => setShowCreatePlanModal(true)} onSync={handleSyncPnboxPlans} />}
      {viewMode === 'tools_matrix' && planoAtivo && <PnboxToolsMatrix plano={planoAtivo} ferramentas={ferramentas} onSelectFerramenta={handleSelectFerramenta} onSyncAll={handleSyncAllToSebrae} onPullAll={() => handlePullAllFromPnbox()} isSyncing={isSyncing} />}
      {viewMode === 'tool_detail' && planoAtivo && ferramentaAtiva && <PnboxToolDetailView plano={planoAtivo} ferramenta={ferramentaAtiva} itens={getItensFerramentaAtiva()} onBack={() => setViewMode('tools_matrix')} onSync={handleSyncAllToSebrae} />}
      {!planoAtivo && viewMode !== 'plans' && <div className="p-8 text-center text-slate-400">Nenhum plano PNBOX disponível. Sincronize sua conta ou crie um plano real.</div>}
      <PnboxCreatePlanModal isOpen={showCreatePlanModal} onClose={() => setShowCreatePlanModal(false)} onPlanCreated={handlePlanCreated} authSession={authSession} />
      <PnboxAiCopilotDrawer isOpen={showAiCopilotDrawer} onClose={() => setShowAiCopilotDrawer(false)} plano={planoAtivo} authSession={authSession} onRefresh={carregarDados} />
      <PnboxConnectionTimeline isOpen={showBackendModal} onClose={() => setShowBackendModal(false)} authSession={authSession} />
      {toasts.map(toast => <Toast key={toast.id} {...toast} onDismiss={() => dismissToast(toast.id)} />)}
    </div>
  );
}
