import React, { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { Building2, ArrowLeft, Sparkles, Search, Layers, Play, History, ExternalLink, AlertCircle, Calendar, MapPin, RefreshCw } from 'lucide-react';

interface PlanData {
  id: string; name: string; sector: string; city: string; description: string;
  progress: number; status: string; researchStatus: 'completed' | 'in_progress' | 'pending' | 'failed';
  executionStatus: 'completed' | 'in_progress' | 'pending' | 'failed'; createdAt: string; updatedAt: string; toolsFilled: number;
}

export function PlanOverviewPage() {
  const { planId } = useParams<{ planId: string }>();
  const [plan, setPlan] = useState<PlanData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      if (!planId?.trim()) { setError('ID do plano PNBOX não informado.'); setLoading(false); return; }
      setLoading(true); setError(null);
      try {
        const response = await fetch('/api/plans', { headers: { Accept: 'application/json' } });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.message || 'Não foi possível consultar os planos no PNBOX.');
        const remote = (data.planos || []).find((p: any) => String(p.idPlano) === String(planId));
        if (!remote) throw new Error('Plano não encontrado na fonte oficial PNBOX.');
        if (active) setPlan({
          id: String(remote.idPlano), name: String(remote.nomePlano || 'Sem título'), sector: String(remote.setor || 'Não informado'),
          city: String(remote.cidadeUf || 'Não informado'), description: String(remote.descricao || ''),
          progress: Math.min(100, Math.max(0, Number(remote.ferramentasPreenchidas || 0) / 14 * 100)),
          status: String(remote.status || 'criado_pnbox_ddp'), researchStatus: 'pending', executionStatus: 'pending',
          createdAt: String(remote.criadoEm), updatedAt: String(remote.ultimaSincronizacao || remote.criadoEm),
          toolsFilled: Number(remote.ferramentasPreenchidas || 0),
        });
      } catch (err) {
        if (active) setError(err instanceof Error ? err.message : 'Falha ao consultar o PNBOX.');
      } finally { if (active) setLoading(false); }
    }
    load();
    return () => { active = false; };
  }, [planId]);

  if (loading) return <div className="p-8 text-slate-300 flex items-center gap-3"><RefreshCw className="w-5 h-5 animate-spin" /> Consultando o plano diretamente no PNBOX...</div>;
  if (error || !plan) return <div className="space-y-4"><Link to="/plans" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar aos Planos</Link><div className="p-6 rounded-2xl border border-rose-500/30 bg-rose-950/20 text-rose-200 flex gap-3"><AlertCircle className="w-5 h-5 shrink-0" /><div><p className="font-semibold">Plano indisponível</p><p className="text-sm mt-1">{error || 'O PNBOX não retornou este plano.'}</p></div></div></div>;

  return <div className="space-y-6 animate-in fade-in duration-300">
    <Link to="/plans" className="inline-flex items-center gap-2 text-sm text-slate-400 hover:text-white"><ArrowLeft className="w-4 h-4" />Voltar aos Planos</Link>
    <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
      <div className="relative z-10"><div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"><div className="flex items-center gap-4"><div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-indigo-600 to-blue-500 flex items-center justify-center text-white shadow-lg"><Building2 className="w-8 h-8" /></div><div><h1 className="text-2xl sm:text-3xl font-bold text-white">{plan.name}</h1><div className="flex flex-wrap items-center gap-3 mt-1 text-sm text-slate-400"><span>{plan.sector}</span><span>•</span><span className="flex items-center gap-1"><MapPin className="w-3.5 h-3.5" />{plan.city}</span><span className="font-mono text-xs text-slate-500">ID: {plan.id}</span></div></div></div><a href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${plan.id}`} target="_blank" rel="noopener noreferrer" className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold border border-slate-700 flex items-center gap-1.5"><span>Abrir no PNBOX</span><ExternalLink className="w-3 h-3" /></a></div>{plan.description && <p className="mt-4 text-slate-300 text-sm leading-relaxed">{plan.description}</p>}</div>
    </div>
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4"><StatusCard label="Pesquisa" status={plan.researchStatus} icon={Search} /><StatusCard label="Ferramentas PNBOX" status={plan.toolsFilled >= 14 ? 'completed' : 'in_progress'} icon={Layers} extra={`${plan.toolsFilled}/14 preenchidas`} /><StatusCard label="Execução" status={plan.executionStatus} icon={Play} /></div>
    <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl"><h2 className="text-lg font-bold text-white mb-4">Ações Rápidas</h2><div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3"><QuickAction to={`/plan/${plan.id}/research`} label="Pesquisa" description="Deep Research + análise de mercado" icon={Search} color="blue" /><QuickAction to={`/plan/${plan.id}/tools`} label="Ferramentas" description="14 ferramentas do PNBOX" icon={Layers} color="indigo" /><QuickAction to={`/plan/${plan.id}/execution`} label="Executar" description="Executar somente no PNBOX real" icon={Play} color="emerald" /><QuickAction to={`/plan/${plan.id}/history`} label="Histórico" description="Log de atividades e execuções" icon={History} color="amber" /></div></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4"><div className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><h3 className="font-bold text-white mb-3 flex items-center gap-2"><Calendar className="w-4 h-4 text-indigo-400" />Datas</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Criado em:</span><span className="text-slate-200">{new Date(plan.createdAt).toLocaleDateString('pt-BR')}</span></div><div className="flex justify-between"><span className="text-slate-400">Última atualização:</span><span className="text-slate-200">{new Date(plan.updatedAt).toLocaleDateString('pt-BR')}</span></div></div></div><div className="bg-slate-900 border border-slate-800 rounded-2xl p-5"><h3 className="font-bold text-white mb-3 flex items-center gap-2"><Sparkles className="w-4 h-4 text-emerald-400" />Estatísticas</h3><div className="space-y-2 text-sm"><div className="flex justify-between"><span className="text-slate-400">Progresso geral:</span><span className="text-slate-200 font-bold">{plan.progress.toFixed(0)}%</span></div><div className="flex justify-between"><span className="text-slate-400">Ferramentas preenchidas:</span><span className="text-slate-200 font-bold">{plan.toolsFilled}/14</span></div><div className="flex justify-between"><span className="text-slate-400">Status atual:</span><span className="text-slate-200 font-mono text-xs">{plan.status}</span></div></div></div></div>
  </div>;
}

function StatusCard({ label, status, icon: Icon, extra }: { label: string; status: 'completed' | 'in_progress' | 'pending' | 'failed'; icon: React.ComponentType<{ className?: string }>; extra?: string }) {
  const config = { completed: { label: 'Concluído', color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }, in_progress: { label: 'Em andamento', color: 'text-blue-400 bg-blue-500/10 border-blue-500/20' }, pending: { label: 'Pendente', color: 'text-slate-400 bg-slate-500/10 border-slate-500/20' }, failed: { label: 'Falhou', color: 'text-rose-400 bg-rose-500/10 border-rose-500/20' } };
  const c = config[status];
  return <div className={`p-4 bg-slate-900 border rounded-2xl ${c.color}`}><div className="flex items-center justify-between mb-3"><Icon className="w-6 h-6" /><span className="px-2 py-0.5 text-xs font-semibold rounded-full border bg-slate-900 border-current">{c.label}</span></div><p className="font-bold text-white">{label}</p>{extra && <p className="text-xs text-slate-400 mt-1">{extra}</p>}</div>;
}
function QuickAction({ to, label, description, icon: Icon, color }: { to: string; label: string; description: string; icon: React.ComponentType<{ className?: string }>; color: 'blue' | 'indigo' | 'emerald' | 'amber' }) {
  const colors = { blue: 'hover:border-blue-500/40 group-hover:text-blue-400', indigo: 'hover:border-indigo-500/40 group-hover:text-indigo-400', emerald: 'hover:border-emerald-500/40 group-hover:text-emerald-400', amber: 'hover:border-amber-500/40 group-hover:text-amber-400' };
  return <Link to={to} className={`group p-4 bg-slate-950 border border-slate-800 rounded-2xl transition-all ${colors[color]}`}><Icon className="w-6 h-6 mb-2 text-slate-400 group-hover:text-current transition-colors" /><p className="font-bold text-white">{label}</p><p className="text-xs text-slate-400 mt-1">{description}</p></Link>;
}
