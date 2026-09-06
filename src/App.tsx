import React, { useCallback, useEffect, useState } from 'react';
import { PnboxNavbar } from './components/pnbox/PnboxNavbar';
import { PnboxPlansView } from './components/pnbox/PnboxPlansView';
import { PnboxToolsMatrix } from './components/pnbox/PnboxToolsMatrix';
import { PnboxToolDetailView } from './components/pnbox/PnboxToolDetailView';
import { PnboxAiCopilotDrawer } from './components/pnbox/PnboxAiCopilotDrawer';
import { PnboxCreatePlanModal } from './components/pnbox/PnboxCreatePlanModal';
import { PnboxBackendSettingsModal } from './components/pnbox/PnboxBackendSettingsModal';
import { Toast, ToastMessage } from './components/Toast';
import { AuthSessionState, FerramentaInfo, InterceptedTrafficEvent, PlanoCriadoInfo } from './types/pnbox';
import { FERRAMENTAS_PNBOX } from './automation/schemaCatalog';
import { carregarPlanosSalvos, conciliarPlanosBidirecional, extrairIdPlano, salvarPlanoNoHistorico } from './utils/planUtils';
import { getPlatformSession } from './components/PlatformGate';

function headers(json=false): Record<string,string> { const token=getPlatformSession()?.accessToken; return { ...(json?{'Content-Type':'application/json'}:{}), ...(token?{Authorization:`Bearer ${token}`}:{}) }; }
const initialSession:AuthSessionState={status:'idle',cpf:'',idPlano:'',modoExecucao:'DRY_RUN',logs:[{timestamp:new Date().toISOString(),mensagem:'Painel inicializado. Aguardando sessão PNBOX real.',level:'info'}]};

export function App(){
 const [view,setView]=useState<'plans'|'tools_matrix'|'tool_detail'>('plans');
 const [activeId,setActiveId]=useState(''); const [toolId,setToolId]=useState('segmentacaoMercado');
 const [plans,setPlans]=useState<PlanoCriadoInfo[]>(()=>carregarPlanosSalvos()); const [session,setSession]=useState<AuthSessionState>(initialSession);
 const [traffic,setTraffic]=useState<InterceptedTrafficEvent[]>([]); const [createOpen,setCreateOpen]=useState(false); const [aiOpen,setAiOpen]=useState(false); const [settingsOpen,setSettingsOpen]=useState(false); const [syncing,setSyncing]=useState(false); const [generating,setGenerating]=useState(false); const [toasts,setToasts]=useState<ToastMessage[]>([]);
 const notify=useCallback((x:Omit<ToastMessage,'id'>)=>{const id=`toast_${Date.now()}_${Math.random().toString(36).slice(2,7)}`;setToasts(p=>[...p,{id,...x}]);setTimeout(()=>setToasts(p=>p.filter(t=>t.id!==id)),x.duration??4000);},[]);
 const dismiss=useCallback((id:string)=>setToasts(p=>p.filter(t=>t.id!==id)),[]);
 const load=useCallback(async()=>{try{const h=headers();const a=await fetch('/api/automation/auth/status',{headers:h});if(a.ok){const d=await a.json();if(d.session)setSession(d.session);}const r=await fetch('/api/pnbox/plans',{headers:h});if(r.ok){const d=await r.json();if(Array.isArray(d.planos)){const remote=conciliarPlanosBidirecional(d.planos,plans);setPlans(remote);setActiveId(c=>remote.some(p=>p.idPlano===c)?c:(remote[0]?.idPlano||''));}}const t=await fetch('/api/automation/traffic',{headers:h});if(t.ok){const d=await t.json();if(Array.isArray(d.eventos))setTraffic(d.eventos);}}catch(e){console.warn('[App] falha ao carregar dados PNBOX',e);}},[plans]);
 useEffect(()=>{void load();},[load]);
 const active=plans.find(p=>p.idPlano===activeId); const tool=FERRAMENTAS_PNBOX.find(f=>f.id===toolId);
 const selectPlan=(id:string)=>{const real=extrairIdPlano(id);if(!real){notify({level:'error',title:'Plano inválido',message:'Selecione um plano real retornado pelo PNBOX.'});return;}setActiveId(real);setSession(s=>({...s,idPlano:real}));setView('tools_matrix');};
 const syncPlans=async()=>{setSyncing(true);try{const r=await fetch('/api/pnbox/plans',{headers:headers()});const d=await r.json().catch(()=>({}));if(!r.ok)throw new Error(d.message||'Falha ao consultar PNBOX.');const remote=conciliarPlanosBidirecional(Array.isArray(d.planos)?d.planos:[],plans);setPlans(remote);setActiveId(c=>remote.some(p=>p.idPlano===c)?c:(remote[0]?.idPlano||''));notify({level:'success',title:'PNBOX sincronizado',message:`${remote.length} plano(s) oficial(is) carregado(s).`});}catch(e){notify({level:'error',title:'Falha na sincronização',message:e instanceof Error?e.message:'Erro desconhecido.'});}finally{setSyncing(false);}};
 const runAi=async()=>{if(!active)return;setGenerating(true);try{const r=await fetch('/api/ai/deep-research',{method:'POST',headers:headers(true),body:JSON.stringify({prompt:`${active.nomePlano} - ${active.descricao}`,ideiaNegocio:`${active.nomePlano} - ${active.descricao}`,cidadeUf:active.cidadeUf,provider:'gemini'})});const rd=await r.json();if(!r.ok||!rd.report)throw new Error(rd.mensagem||'Pesquisa IA sem relatório.');const s=await fetch('/api/ai/synthesize-plan',{method:'POST',headers:headers(true),body:JSON.stringify({research:rd.report,idPlano:active.idPlano})});const sd=await s.json();if(!s.ok)throw new Error(sd.mensagem||'Falha na síntese IA.');const data=sd.dados14Ferramentas||sd.planData;if(!data||typeof data!=='object')throw new Error('A IA não retornou dados das ferramentas.');setPlans(salvarPlanoNoHistorico({...active,dados14Ferramentas:data,ferramentasPreenchidas:Object.values(data).filter((x:any)=>Array.isArray(x)&&x.length).length}));notify({level:'success',title:'IA concluída',message:'Dados sintetizados para o plano PNBOX real.'});}catch(e){notify({level:'error',title:'Erro na IA',message:e instanceof Error?e.message:'Erro desconhecido.'});}finally{setGenerating(false);}};
 const syncAll=async()=>{if(!active)return;setSyncing(true);try{const r=await fetch('/api/automation/fill-batch',{method:'POST',headers:headers(true),body:JSON.stringify({templateId:'placeholder',idPlano:active.idPlano,dados:active.dados14Ferramentas,modoExecucao:'LIVE'})});const d=await r.json().catch(()=>({}));if(!r.ok&&r.status!==207)throw new Error(d.mensagem||d.message||'Falha na sincronização.');notify({level:d.status==='partial'?'warn':'success',title:d.status==='partial'?'Sincronização parcial':'Sincronização concluída',message:`Registros confirmados: ${d.data?.totalRegistrosSalvos||0}.`});await load();}catch(e){notify({level:'error',title:'Falha ao gravar no PNBOX',message:e instanceof Error?e.message:'Erro desconhecido.'});}finally{setSyncing(false);}};
 const saveItems=(items:Record<string,unknown>[])=>{if(!active||!tool)return;setPlans(salvarPlanoNoHistorico({...active,dados14Ferramentas:{...(active.dados14Ferramentas||{}),[tool.id]:items}}));};
 const applyCopilot=(id:string,data:Record<string,unknown>[])=>{if(active)setPlans(salvarPlanoNoHistorico({...active,dados14Ferramentas:{...(active.dados14Ferramentas||{}),[id]:data}}));};
 const createPlan=(p:PlanoCriadoInfo)=>{if(!p.idPlano||p.idPlano.startsWith('plano_')){notify({level:'error',title:'Criação não confirmada',message:'O PNBOX não retornou um ID real.'});return;}setPlans(x=>conciliarPlanosBidirecional([p],x));setActiveId(p.idPlano);setView('tools_matrix');};
 return <div className="min-h-screen bg-[#09090b] text-white">
  <PnboxNavbar authSession={session} onOpenBackendSettings={()=>setSettingsOpen(true)} onOpenAiCopilot={()=>setAiOpen(true)} onNavigateHome={()=>setView('plans')} currentView={view}/>
  {view==='plans'&&<PnboxPlansView planos={plans} planoAtivoId={activeId} onSelectPlano={selectPlan} onOpenCriarPlanoModal={()=>setCreateOpen(true)} onOpenAiCopilot={()=>setAiOpen(true)} onAutoFillWithAi={()=>void runAi()} onSyncPnboxPlans={syncPlans} isSyncingPlans={syncing} authSession={session}/>} 
  {view==='tools_matrix'&&active&&<PnboxToolsMatrix plano={active} ferramentas={FERRAMENTAS_PNBOX} authSession={session} onSelectFerramenta={id=>{setToolId(id);setView('tool_detail');}} onBackToPlans={()=>setView('plans')} onExecuteAllWithAi={runAi} onSyncAllToSebrae={syncAll} onPullFromSebrae={()=>void load()} onBidirectionalSync={syncAll} onOpenBackendSettings={()=>setSettingsOpen(true)} onQuickGenerateToolAi={()=>void runAi()} isSyncing={syncing}/>} 
  {view==='tool_detail'&&active&&tool&&<PnboxToolDetailView plano={active} ferramenta={tool} items={active.dados14Ferramentas?.[tool.id]||[]} authSession={session} onBackToMatrix={()=>setView('tools_matrix')} onSaveItems={saveItems} onSyncToolToSebrae={syncAll} onGenerateAiSuggestions={runAi} isGeneratingAi={generating} isSyncing={syncing}/>} 
  <PnboxCreatePlanModal isOpen={createOpen} onClose={()=>setCreateOpen(false)} onPlanCreated={createPlan} authSession={session}/>
  {active&&<PnboxAiCopilotDrawer isOpen={aiOpen} onClose={()=>setAiOpen(false)} planoAtivo={active} onApplyDataToPlan={applyCopilot} onAutoFillFullPlan={runAi}/>} 
  <PnboxBackendSettingsModal isOpen={settingsOpen} onClose={()=>setSettingsOpen(false)} authSession={session} ferramentas={FERRAMENTAS_PNBOX} eventosTrafego={traffic as any} onRefreshTraffic={()=>void load()} onDisconnect={()=>void fetch('/api/automation/auth/expire',{method:'POST',headers:headers()})}/>
  <Toast toasts={toasts} onDismiss={dismiss}/>
 </div>;
}
export default App;
