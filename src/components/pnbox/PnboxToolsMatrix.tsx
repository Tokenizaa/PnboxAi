import React from 'react';
import {
  ArrowLeft,
  Sparkles,
  Cloud,
  CheckCircle2,
  PieChart,
  Users,
  Route,
  Heart,
  Target,
  Scale,
  Lightbulb,
  LayoutGrid,
  DollarSign,
  TrendingUp,
  Receipt,
  FileSpreadsheet,
  BarChart3,
  ShoppingCart,
  Flag,
  Kanban,
  Filter,
  Layers,
  Settings,
  RefreshCw,
  Eye,
  Check
} from 'lucide-react';
import { FerramentaInfo, PlanoCriadoInfo, AuthSessionState } from '../../types/pnbox';
import { PnboxBusinessHealthSummary } from './PnboxBusinessHealthSummary';

interface PnboxToolsMatrixProps {
  plano: PlanoCriadoInfo;
  ferramentas: FerramentaInfo[];
  authSession: AuthSessionState;
  onSelectFerramenta: (ferramentaId: string) => void;
  onBackToPlans: () => void;
  onExecuteAllWithAi: () => void;
  onSyncAllToSebrae: () => void;
  onOpenBackendSettings: () => void;
  onQuickGenerateToolAi: (ferramentaId: string) => void;
  isSyncing?: boolean;
}

export const PnboxToolsMatrix: React.FC<PnboxToolsMatrixProps> = ({
  plano,
  ferramentas,
  authSession,
  onSelectFerramenta,
  onBackToPlans,
  onExecuteAllWithAi,
  onSyncAllToSebrae,
  onOpenBackendSettings,
  onQuickGenerateToolAi,
  isSyncing = false
}) => {
  // Mapa de ícones canônicos do PNBOX
  const getToolIcon = (id: string) => {
    switch (id) {
      // 1. Cliente - Mercado
      case 'segmentacaoMercado':
        return <PieChart className="w-8 h-8 text-[#1877f2]" />;
      case 'geradorPersonas':
        return <Users className="w-8 h-8 text-[#1877f2]" />;
      case 'jornadaCliente':
        return <Route className="w-8 h-8 text-[#1877f2]" />;

      // 2. Problema - Solução
      case 'propostaValor':
        return <Heart className="w-8 h-8 text-[#1877f2]" />;
      case 'analiseConcorrencia':
        return <Target className="w-8 h-8 text-[#1877f2]" />;

      // 3. Estratégia
      case 'forcasFraquezas':
        return <Scale className="w-8 h-8 text-[#1877f2]" />;
      case 'oportunidadesAmeacas':
        return <Lightbulb className="w-8 h-8 text-[#1877f2]" />;
      case 'analiseSwot':
        return <LayoutGrid className="w-8 h-8 text-[#1877f2]" />;

      // 4. Finanças
      case 'investimentoFixo':
      case 'investimentoPreOperacional':
      case 'investimento':
        return <DollarSign className="w-8 h-8 text-[#1877f2]" />;
      case 'produtoServico':
      case 'ganhos':
        return <TrendingUp className="w-8 h-8 text-[#1877f2]" />;
      case 'custoFixo':
      case 'custos':
        return <Receipt className="w-8 h-8 text-[#1877f2]" />;
      case 'dre':
        return <FileSpreadsheet className="w-8 h-8 text-[#1877f2]" />;
      case 'capitalGiro':
      case 'indicadoresFinanceiros':
        return <BarChart3 className="w-8 h-8 text-[#1877f2]" />;

      // 5. Complementares
      case 'canaisAquisicao':
        return <ShoppingCart className="w-8 h-8 text-[#1877f2]" />;
      case 'simuladorResultados':
        return <Flag className="w-8 h-8 text-[#1877f2]" />;
      case 'quadroExperimentacao':
        return <Kanban className="w-8 h-8 text-[#1877f2]" />;
      case 'funilVendas':
        return <Filter className="w-8 h-8 text-[#1877f2]" />;

      default:
        return <Layers className="w-8 h-8 text-[#1877f2]" />;
    }
  };

  // Estrutura canônica das 5 categorias idênticas ao Screenshot 2
  const categoriasPnbox = [
    {
      id: 'CLIENTE_MERCADO',
      titulo: 'Cliente - Mercado',
      descricao: null,
      ferramentas: [
        { id: 'segmentacaoMercado', nome: 'Segmentação de Mercado' },
        { id: 'geradorPersonas', nome: 'Gerador de Personas' },
        { id: 'jornadaCliente', nome: 'Jornada do Cliente' }
      ]
    },
    {
      id: 'PROBLEMA_SOLUCAO',
      titulo: 'Problema - Solução',
      descricao: null,
      ferramentas: [
        { id: 'propostaValor', nome: 'Proposta de Valor' },
        { id: 'analiseConcorrencia', nome: 'Análise da Concorrência' }
      ]
    },
    {
      id: 'ESTRATEGIA',
      titulo: 'Estratégia',
      descricao: null,
      ferramentas: [
        { id: 'forcasFraquezas', nome: 'Forças e Fraquezas' },
        { id: 'oportunidadesAmeacas', nome: 'Oportunidades e Ameaças' },
        { id: 'analiseSwot', nome: 'Análise SWOT' }
      ]
    },
    {
      id: 'FINANCAS',
      titulo: 'Finanças',
      descricao: null,
      ferramentas: [
        { id: 'investimentoFixo', nome: 'Investimento' },
        { id: 'produtoServico', nome: 'Ganhos' },
        { id: 'custoFixo', nome: 'Custos' },
        { id: 'dre', nome: 'DRE' },
        { id: 'capitalGiro', nome: 'Indicadores Financeiros' }
      ]
    },
    {
      id: 'COMPLEMENTARES',
      titulo: 'Ferramentas Complementares',
      descricao: 'Com as ferramentas de apoio você pode complementar ainda mais o seu plano:',
      ferramentas: [
        { id: 'canaisAquisicao', nome: 'Canais de Aquisição' },
        { id: 'simuladorResultados', nome: 'Simulador de Resultados' },
        { id: 'quadroExperimentacao', nome: 'Quadro de Experimentação' },
        { id: 'funilVendas', nome: 'Funil de Vendas' }
      ]
    }
  ];

  // Identificar se a ferramenta possui dados gerados ou preenchidos
  const isToolFilled = (toolId: string) => {
    if (!plano.dados14Ferramentas) return false;
    const dados = plano.dados14Ferramentas[toolId];
    return Boolean(dados && dados.length > 0);
  };

  return (
    <div className="w-full min-h-screen bg-[#1e1d4b] text-white pb-24">
      {/* 1. Header do Plano com Navegação de Retorno */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2d2a63] pb-6">
          <div>
            <button
              onClick={onBackToPlans}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white mb-2 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar para Seus Planos</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight flex items-center gap-3">
              <span>{plano.nomePlano}</span>
              <span className="text-xs px-2.5 py-1 bg-white/10 rounded-full font-mono font-normal text-indigo-200 border border-white/10">
                ID: {plano.idPlano}
              </span>
            </h1>
            <p className="text-sm text-indigo-200/90 mt-1 font-normal">
              Aqui está o seu plano! Preencha as ferramentas para completá-lo:
            </p>
          </div>

          {/* Barra de Ações Rápidas (IA + Sincronização Sebrae) */}
          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={onExecuteAllWithAi}
              className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95"
              title="Preencher todas as 14 ferramentas automaticamente com IA Gemini"
            >
              <Sparkles className="w-4 h-4 text-pink-200" />
              <span>Preencher Plano com IA (1 Clique)</span>
            </button>

            <button
              onClick={onSyncAllToSebrae}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2.5 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full text-xs sm:text-sm font-semibold shadow-md transition-all active:scale-95 disabled:opacity-50"
              title="Sincronizar no Sebrae PNBOX oficial"
            >
              {isSyncing ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <Cloud className="w-4 h-4" />
              )}
              <span>{isSyncing ? 'Sincronizando...' : 'Sincronizar no Sebrae'}</span>
            </button>

            <button
              onClick={onOpenBackendSettings}
              className="p-2.5 bg-white/5 hover:bg-white/10 border border-white/10 rounded-full text-slate-300 hover:text-white transition-colors"
              title="Diagnóstico de Conexão e Ferramentas Backend"
            >
              <Settings className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Resumo de Negócio IA com Gráficos de Viabilidade Recharts */}
        <div className="mt-8">
          <PnboxBusinessHealthSummary
            plano={plano}
            ferramentas={ferramentas}
            onOpenCopilot={onExecuteAllWithAi}
          />
        </div>

        {/* 2. As 5 Categorias Oficiais do PNBOX */}
        <div className="mt-8 space-y-12">
          {categoriasPnbox.map((categoria) => (
            <div key={categoria.id} className="space-y-4">
              <div>
                <h2 className="text-xl font-bold text-white tracking-tight">
                  {categoria.titulo}
                </h2>
                {categoria.descricao && (
                  <p className="text-xs text-indigo-200/80 mt-1">
                    {categoria.descricao}
                  </p>
                )}
              </div>

              {/* Grid de Cards de Ferramentas (Design Idêntico ao Screenshot 2) */}
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4 sm:gap-6">
                {categoria.ferramentas.map((tool) => {
                  const filled = isToolFilled(tool.id);

                  return (
                    <div
                      key={tool.id}
                      onClick={() => onSelectFerramenta(tool.id)}
                      className="group relative bg-[#1877f2] hover:bg-[#166fe5] rounded-xl p-5 shadow-lg border border-[#3b8ef7]/40 flex flex-col items-center justify-between min-h-[170px] cursor-pointer transition-all duration-200 hover:-translate-y-1"
                    >
                      {/* Checkmark superior direito */}
                      <div className="w-full flex justify-end">
                        <div
                          className={`w-5 h-5 rounded-full flex items-center justify-center text-white ${
                            filled ? 'bg-emerald-400 shadow-sm' : 'bg-white/20'
                          }`}
                          title={filled ? 'Preenchido' : 'Pendente'}
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                        </div>
                      </div>

                      {/* Círculo branco com ícone central */}
                      <div className="w-16 h-16 rounded-full bg-white flex items-center justify-center shadow-md my-2 group-hover:scale-110 transition-transform duration-200">
                        {getToolIcon(tool.id)}
                      </div>

                      {/* Título da Ferramenta */}
                      <h3 className="text-sm font-bold text-white text-center leading-tight mt-1 line-clamp-2">
                        {tool.nome}
                      </h3>

                      {/* Hover Overlay com Opções de IA e Acesso */}
                      <div className="absolute inset-0 bg-[#0c4ca5]/95 rounded-xl opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 gap-2 z-10">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onSelectFerramenta(tool.id);
                          }}
                          className="w-full py-1.5 px-2 bg-white text-[#1877f2] rounded-lg text-xs font-bold shadow hover:bg-slate-100 transition-all text-center"
                        >
                          Abrir Ferramenta
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            onQuickGenerateToolAi(tool.id);
                          }}
                          className="w-full py-1.5 px-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-lg text-[11px] font-bold shadow transition-all flex items-center justify-center gap-1"
                        >
                          <Sparkles className="w-3 h-3 text-pink-200" />
                          <span>Sugerir com IA</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 3. Rodapé Oficial Sebrae */}
      <footer className="mt-20 border-t border-[#2d2a63] pt-8 text-center text-xs text-indigo-300/70">
        <div className="max-w-7xl mx-auto px-4 flex flex-col sm:flex-row items-center justify-between gap-4">
          <div>
            <span>Central de Relacionamento Sebrae: </span>
            <strong className="text-indigo-200">0800 570 0800</strong>
          </div>
          <div className="text-[11px]">
            © PNBOX • Sebrae Nacional • Plataforma com Inteligência Artificial
          </div>
        </div>
      </footer>
    </div>
  );
};
