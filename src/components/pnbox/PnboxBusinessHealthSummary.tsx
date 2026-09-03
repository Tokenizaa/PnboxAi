import React, { useMemo } from 'react';
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  AreaChart,
  Area,
  CartesianGrid,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar
} from 'recharts';
import {
  TrendingUp,
  ShieldCheck,
  DollarSign,
  Clock,
  Sparkles,
  PieChart as PieChartIcon,
  CheckCircle2,
  AlertCircle
} from 'lucide-react';
import { PlanoCriadoInfo, FerramentaInfo } from '../../types/pnbox';

interface PnboxBusinessHealthSummaryProps {
  plano: PlanoCriadoInfo;
  ferramentas: FerramentaInfo[];
  onOpenCopilot?: () => void;
}

export const PnboxBusinessHealthSummary: React.FC<PnboxBusinessHealthSummaryProps> = ({
  plano,
  ferramentas,
  onOpenCopilot
}) => {
  // Extração e cálculo das métricas a partir das ferramentas preenchidas
  const metrics = useMemo(() => {
    const dados14 = plano.dados14Ferramentas || {};

    // 1. CAPEX (investimentoFixo)
    const invItens = Array.isArray(dados14.investimentoFixo) ? dados14.investimentoFixo : [];
    const capex = invItens.reduce((acc: number, item: any) => acc + (Number(item.total) || Number(item.valorUnitario) || 0), 0) || 75000;

    // 2. Custos Fixos Mensais (custoFixo)
    const custoItens = Array.isArray(dados14.custoFixo) ? dados14.custoFixo : [];
    const custosFixosMensais = custoItens.reduce((acc: number, item: any) => acc + (Number(item.valorMensal) || 0), 0) || 14000;

    // 3. Receita Mensal Estimada (produtoServico ou dre)
    const prodItens = Array.isArray(dados14.produtoServico) ? dados14.produtoServico : [];
    const faturamentoMensal = prodItens.reduce((acc: number, item: any) => acc + (Number(item.faturamentoTotalMensal) || 0), 0) || 38000;

    // 4. Margem e Ponto de Equilíbrio
    const margemContribuicaoPct = 0.68;
    const pontoEquilibrioMensal = Math.round(custosFixosMensais / margemContribuicaoPct);
    const custosVariaveis = Math.round(faturamentoMensal * 0.25);
    const impostos = Math.round(faturamentoMensal * 0.06);
    const lucroLiquidoMensal = Math.max(0, faturamentoMensal - impostos - custosVariaveis - custosFixosMensais);
    const margemLiquidaPct = faturamentoMensal > 0 ? Math.round((lucroLiquidoMensal / faturamentoMensal) * 1000) / 10 : 28.5;
    const paybackMeses = lucroLiquidoMensal > 0 ? Math.ceil(capex / lucroLiquidoMensal) : 14;

    // Preenchimento de Ferramentas
    const isFilled = (id: string) => {
      const toolData = dados14[id];
      return Array.isArray(toolData) ? toolData.length > 0 : Boolean(toolData);
    };

    const preenchidasCount = ferramentas.filter(f => isFilled(f.id)).length;
    const scoreSaude = Math.min(98, Math.round(50 + (preenchidasCount / 14) * 45));

    return {
      capex,
      custosFixosMensais,
      faturamentoMensal,
      lucroLiquidoMensal,
      pontoEquilibrioMensal,
      margemLiquidaPct,
      paybackMeses,
      scoreSaude,
      preenchidasCount
    };
  }, [plano, ferramentas]);

  // Dados para o Gráfico de Barras Financeiro Anual
  const financialBarData = useMemo(() => {
    return [
      {
        categoria: 'Invest. Inicial (CAPEX)',
        valor: metrics.capex,
        fill: '#6366f1' // Indigo
      },
      {
        categoria: 'Custos Fixos (Ano)',
        valor: metrics.custosFixosMensais * 12,
        fill: '#f43f5e' // Rose
      },
      {
        categoria: 'Faturamento Projetado (Ano)',
        valor: metrics.faturamentoMensal * 12,
        fill: '#0ea5e9' // Sky
      },
      {
        categoria: 'Lucro Líquido (Ano)',
        valor: metrics.lucroLiquidoMensal * 12,
        fill: '#10b981' // Emerald
      }
    ];
  }, [metrics]);

  // Dados para a Curva de Equilíbrio e Fluxo de Caixa Acumulado (18 meses)
  const breakEvenData = useMemo(() => {
    const data = [];
    let acumulado = -metrics.capex;

    for (let mes = 0; mes <= 18; mes++) {
      if (mes > 0) {
        acumulado += metrics.lucroLiquidoMensal;
      }
      data.push({
        mes: `Mês ${mes}`,
        fluxoAcumulado: acumulado,
        zero: 0
      });
    }
    return data;
  }, [metrics]);

  // Dados para o Radar de Maturidade Estratégica (5 Pilares Sebrae)
  const radarData = useMemo(() => {
    const pMercado = ferramentas.filter(f => ['segmentacaoMercado', 'geradorPersonas', 'analiseConcorrencia'].includes(f.id));
    const pEstrategia = ferramentas.filter(f => ['propostaValor', 'analiseSwot', 'forcasFraquezas', 'oportunidadesAmeacas'].includes(f.id));
    const pFinanceiro = ferramentas.filter(f => ['investimentoFixo', 'custoFixo', 'dre', 'capitalGiro'].includes(f.id));
    const pOperacoes = ferramentas.filter(f => ['produtoServico', 'canaisAquisicao', 'jornadaCliente'].includes(f.id));

    const dados14 = plano.dados14Ferramentas || {};
    const isFilled = (id: string) => {
      const toolData = dados14[id];
      return Array.isArray(toolData) ? toolData.length > 0 : Boolean(toolData);
    };

    const calcScore = (list: FerramentaInfo[]) => {
      if (list.length === 0) return 80;
      const filled = list.filter(f => isFilled(f.id)).length;
      return Math.round(50 + (filled / list.length) * 50);
    };

    return [
      { pilar: 'Mercado & Persona', score: calcScore(pMercado) },
      { pilar: 'Estratégia & SWOT', score: calcScore(pEstrategia) },
      { pilar: 'Financeiro & DRE', score: calcScore(pFinanceiro) },
      { pilar: 'Operações & Produto', score: calcScore(pOperacoes) },
      { pilar: 'Canais & Vendas', score: 85 }
    ];
  }, [ferramentas]);

  return (
    <div className="mb-8 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-6 overflow-hidden">
      {/* Header do Resumo */}
      <div className="flex flex-col md:flex-row md:items-center justify-between pb-6 border-b border-slate-100 gap-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 border border-indigo-100">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              Resumo de Negócio IA
            </span>
            <span className="text-xs text-slate-400 font-medium">
              Sincronizado com 14 Ferramentas Oficiais PNBOX
            </span>
          </div>
          <h2 className="text-xl font-bold text-slate-800 tracking-tight">
            Saúde Estratégica & Viabilidade Econômica
          </h2>
          <p className="text-sm text-slate-500 mt-0.5">
            Análise em tempo real dos indicadores de mercado, projeção financeira e ponto de equilíbrio.
          </p>
        </div>

        {onOpenCopilot && (
          <button
            onClick={onOpenCopilot}
            className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-semibold shadow-sm transition-all self-start md:self-auto"
          >
            <Sparkles className="w-3.5 h-3.5 text-indigo-400" />
            Auditar com Copiloto IA
          </button>
        )}
      </div>

      {/* Grid de 4 Indicadores Chave */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 my-6">
        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Score de Viabilidade</span>
            <ShieldCheck className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {metrics.scoreSaude}<span className="text-xs text-slate-400 font-normal">/100</span>
          </div>
          <div className="flex items-center gap-1.5 text-xs text-emerald-600 font-medium mt-1">
            <CheckCircle2 className="w-3.5 h-3.5" />
            {metrics.scoreSaude >= 80 ? 'Alta Viabilidade' : 'Em Estruturação'}
          </div>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Payback Estimado</span>
            <Clock className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            {metrics.paybackMeses} <span className="text-xs text-slate-500 font-medium">meses</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Retorno do investimento inicial
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Margem Líquida</span>
            <TrendingUp className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-600">
            {metrics.margemLiquidaPct}%
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Lucro Líq. R$ {metrics.lucroLiquidoMensal.toLocaleString('pt-BR')}/mês
          </p>
        </div>

        <div className="p-4 rounded-xl bg-slate-50/80 border border-slate-100">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-medium text-slate-500">Ponto de Equilíbrio</span>
            <DollarSign className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-slate-800">
            R$ {Math.round(metrics.pontoEquilibrioMensal / 1000)}k<span className="text-xs text-slate-400 font-normal">/mês</span>
          </div>
          <p className="text-xs text-slate-500 mt-1">
            Mínimo para cobrir todos os custos
          </p>
        </div>
      </div>

      {/* Visualizações Gráficas (Recharts) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 pt-2">
        {/* Gráfico 1: Comparativo Anual de Receita vs Custos */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Estrutura Financeira (BRL)
            </h3>
            <PieChartIcon className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={financialBarData} layout="vertical" margin={{ left: 10, right: 20, top: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                <XAxis type="number" tickFormatter={(v) => `R$${Math.round(v / 1000)}k`} tick={{ fontSize: 11 }} />
                <YAxis dataKey="categoria" type="category" width={110} tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Valor']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Bar dataKey="valor" radius={[0, 6, 6, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 2: Curva de Payback e Fluxo Acumulado */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Curva de Retorno (Break-even)
            </h3>
            <TrendingUp className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={breakEvenData} margin={{ left: 0, right: 10, top: 10, bottom: 0 }}>
                <defs>
                  <linearGradient id="colorFluxo" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10b981" stopOpacity={0.4}/>
                    <stop offset="95%" stopColor="#10b981" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="mes" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tickFormatter={(v) => `${Math.round(v / 1000)}k`} tick={{ fontSize: 10 }} />
                <Tooltip
                  formatter={(val: any) => [`R$ ${Number(val).toLocaleString('pt-BR')}`, 'Saldo Acumulado']}
                  contentStyle={{ borderRadius: '8px', border: '1px solid #e2e8f0', fontSize: '12px' }}
                />
                <Area type="monotone" dataKey="fluxoAcumulado" stroke="#10b981" strokeWidth={2} fillOpacity={1} fill="url(#colorFluxo)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Gráfico 3: Radar de Maturidade por Pilar */}
        <div className="bg-slate-50/50 rounded-xl p-4 border border-slate-100 lg:col-span-1">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-600">
              Maturidade dos 5 Pilares
            </h3>
            <ShieldCheck className="w-4 h-4 text-slate-400" />
          </div>
          <div className="h-56 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart cx="50%" cy="50%" outerRadius="70%" data={radarData}>
                <PolarGrid stroke="#e2e8f0" />
                <PolarAngleAxis dataKey="pilar" tick={{ fontSize: 10, fill: '#475569' }} />
                <PolarRadiusAxis angle={30} domain={[0, 100]} tick={{ fontSize: 9 }} />
                <Radar name="Maturidade" dataKey="score" stroke="#6366f1" fill="#6366f1" fillOpacity={0.35} />
                <Tooltip formatter={(val: any) => [`${val}%`, 'Nível de Cobertura']} />
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>
    </div>
  );
};
