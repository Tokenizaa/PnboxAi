import React, { useState } from 'react';
import {
  ArrowLeft,
  GraduationCap,
  Sparkles,
  Cloud,
  Plus,
  MoreVertical,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Lightbulb,
  ExternalLink,
  Save,
  Layers,
  Copy,
  Check
} from 'lucide-react';
import { FerramentaInfo, PlanoCriadoInfo, AuthSessionState } from '../../types/pnbox';

interface PnboxToolDetailViewProps {
  plano: PlanoCriadoInfo;
  ferramenta: FerramentaInfo;
  items: Record<string, unknown>[];
  authSession: AuthSessionState;
  onBackToMatrix: () => void;
  onSaveItems: (novosItems: Record<string, unknown>[]) => void;
  onSyncToolToSebrae: () => void;
  onGenerateAiSuggestions: () => void;
  isGeneratingAi?: boolean;
  isSyncing?: boolean;
}

export const PnboxToolDetailView: React.FC<PnboxToolDetailViewProps> = ({
  plano,
  ferramenta,
  items,
  authSession,
  onBackToMatrix,
  onSaveItems,
  onSyncToolToSebrae,
  onGenerateAiSuggestions,
  isGeneratingAi = false,
  isSyncing = false
}) => {
  const [showAddModal, setShowAddModal] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemContent, setNewItemContent] = useState('');
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  // Descrições pedagógicas de cada ferramenta oficial do Sebrae
  const getToolDescription = (id: string) => {
    switch (id) {
      case 'segmentacaoMercado':
        return 'Divida seus clientes em grupos com expectativas semelhantes e necessidades comuns.';
      case 'geradorPersonas':
        return 'Crie perfis semi-fictícios que representam o seu cliente ideal com base em dados reais e comportamentos.';
      case 'jornadaCliente':
        return 'Mapeie cada ponto de contato e a experiência do cliente desde a descoberta até a fidelização.';
      case 'propostaValor':
        return 'Defina com clareza o valor único entregue ao cliente, seus aliviadores de dores e criadores de ganhos.';
      case 'analiseConcorrencia':
        return 'Analise seus concorrentes diretos e indiretos, identificando diferenciais competitivos e lacunas.';
      case 'forcasFraquezas':
        return 'Mapeie os fatores internos controláveis da sua empresa para potencializar virtudes e corrigir gargalos.';
      case 'oportunidadesAmeacas':
        return 'Identifique tendências de mercado, tecnologia e regulação externa que podem alavancar ou ameaçar o negócio.';
      case 'analiseSwot':
        return 'Cruze forças e oportunidades para definir planos de desenvolvimento, manutenção e sobrevivência.';
      case 'investimentoFixo':
      case 'investimento':
        return 'Projete as máquinas, equipamentos, reformas e infraestrutura necessária para iniciar as operações.';
      case 'produtoServico':
      case 'ganhos':
        return 'Cadastre seus produtos e serviços com preços de venda, margens e estimativas mensais de faturamento.';
      case 'custoFixo':
      case 'custos':
        return 'Planeje os custos operacionais recorrentes essenciais (aluguel, sistemas, folha, marketing).';
      case 'dre':
        return 'Demonstrativo de Resultado do Exercício com projeção de receita líquida, lucro bruto e operacional.';
      case 'capitalGiro':
      case 'indicadoresFinanceiros':
        return 'Calcule ponto de equilíbrio, margem de segurança e prazo de retorno do investimento (ROI).';
      default:
        return 'Preencha as informações para estruturar esta etapa do seu plano de negócios oficial.';
    }
  };

  // Helper para formatar o texto do item no card branco estilo PNBOX
  const formatItemDisplay = (item: Record<string, unknown>, index: number) => {
    // Caso tenha detalheVisual específico
    if (item.detalheVisual) {
      return {
        title: (item.descricao as string) || `Segmentação ${index + 1}`,
        content: item.detalheVisual as string
      };
    }

    if (item.nomeConcorrente) {
      return {
        title: item.nomeConcorrente as string,
        content: `${item.diferencial || ''} | Preço: ${item.preco || 'Médio'} | Pontos Fortes: ${item.pontosFortes || ''}`
      };
    }

    if (item.nome) {
      return {
        title: item.nome as string,
        content: `${item.profissao || ''} - ${item.idade || ''} | ${item.dores || item.objetivos || ''}`
      };
    }

    if (item.tarefasCliente) {
      return {
        title: 'Proposta de Valor Principal',
        content: `Produtos: ${item.produtosServicos} | Aliviadores: ${item.aliviadoresDores} | Ganhos: ${item.criadoresGanhos}`
      };
    }

    if (item.descricao) {
      const extra = item.valor ? ` - R$ ${item.valor}` : (item.tipo ? ` (${item.tipo})` : '');
      return {
        title: `Item ${index + 1}${extra}`,
        content: item.descricao as string
      };
    }

    return {
      title: `Item ${index + 1}`,
      content: JSON.stringify(item)
    };
  };

  const handleAddItem = () => {
    if (!newItemTitle.trim() && !newItemContent.trim()) return;
    const novo = {
      descricao: newItemTitle || `Item ${items.length + 1}`,
      detalheVisual: newItemContent,
      idPlano: plano.idPlano
    };
    onSaveItems([...items, novo]);
    setNewItemTitle('');
    setNewItemContent('');
    setShowAddModal(false);
  };

  const handleDeleteItem = (index: number) => {
    const atualizados = items.filter((_, i) => i !== index);
    onSaveItems(atualizados);
  };

  return (
    <div className="w-full min-h-screen bg-[#1e1d4b] text-white pb-28">
      {/* 1. Header Oficial da Ferramenta */}
      <div className="max-w-7xl mx-auto px-4 sm:px-8 pt-6 pb-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#2d2a63] pb-6">
          <div>
            <button
              onClick={onBackToMatrix}
              className="inline-flex items-center gap-1.5 text-xs text-indigo-300 hover:text-white mb-2 transition-colors group cursor-pointer"
            >
              <ArrowLeft className="w-4 h-4 group-hover:-translate-x-1 transition-transform" />
              <span>Voltar ao Plano ({plano.nomePlano})</span>
            </button>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-white tracking-tight">
              {ferramenta.nome}
            </h1>
            <p className="text-sm text-indigo-200/90 mt-1 font-normal max-w-2xl">
              {getToolDescription(ferramenta.id)}
            </p>
          </div>

          {/* Botões de Ação Superiores */}
          <div className="flex flex-wrap items-center gap-2.5 sm:gap-3">
            {/* Botão Escola Pnbox (Idêntico ao Screenshot 3) */}
            <a
              href="https://sebrae.com.br"
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 px-4 py-2 bg-[#1877f2] hover:bg-[#166fe5] text-white rounded-full text-xs font-bold shadow transition-all hover:scale-105 active:scale-95"
            >
              <GraduationCap className="w-4 h-4" />
              <span>Escola Pnbox</span>
            </a>

            {/* Botão Sugerir com IA */}
            <button
              onClick={onGenerateAiSuggestions}
              disabled={isGeneratingAi}
              className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
            >
              <Sparkles className="w-4 h-4 text-pink-200 animate-pulse" />
              <span>{isGeneratingAi ? 'Gerando com IA...' : 'Sugerir com IA'}</span>
            </button>

            {/* Sincronizar Ferramenta */}
            <button
              onClick={onSyncToolToSebrae}
              disabled={isSyncing}
              className="flex items-center gap-2 px-4 py-2 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-full text-xs font-semibold shadow transition-all active:scale-95 disabled:opacity-50"
            >
              <Cloud className="w-4 h-4 text-indigo-300" />
              <span>{isSyncing ? 'Sincronizando...' : 'Salvar no Sebrae'}</span>
            </button>
          </div>
        </div>

        {/* 2. Banner de Sugestão e Raciocínio do Copiloto IA */}
        <div className="mt-6 bg-gradient-to-r from-indigo-900/40 via-purple-900/30 to-pink-900/40 border border-indigo-500/30 rounded-xl p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="p-2 bg-pink-500/20 text-pink-300 rounded-lg shrink-0 mt-0.5">
              <Lightbulb className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-xs font-bold text-white uppercase tracking-wider">
                Copiloto IA PNBOX ({plano.nomePlano})
              </h4>
              <p className="text-xs text-indigo-200/90 mt-0.5">
                Dados validados e alinhados às diretrizes do Sebrae para <strong>{plano.setor}</strong>.
                Clique em "+ Adicionar" ou "Sugerir com IA" para enriquecer esta ferramenta.
              </p>
            </div>
          </div>
          <button
            onClick={onGenerateAiSuggestions}
            className="self-start sm:self-center px-3 py-1.5 bg-pink-600/30 hover:bg-pink-600/50 border border-pink-500/40 text-pink-200 rounded-lg text-xs font-medium whitespace-nowrap transition-colors"
          >
            Gerar Mais Alternativas
          </button>
        </div>

        {/* 3. Lista de Cards Brancos Oficiais (Design Idêntico ao Screenshot 3) */}
        <div className="mt-8 space-y-4">
          {items.length === 0 ? (
            <div className="bg-[#252258] border-2 border-dashed border-[#3d397d] rounded-2xl p-12 text-center">
              <div className="w-16 h-16 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center mx-auto mb-4">
                <Layers className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white mb-1">
                Nenhum item adicionado ainda
              </h3>
              <p className="text-xs text-indigo-200/70 max-w-md mx-auto mb-6">
                Utilize o Copiloto IA para gerar sugestões instantâneas para seu segmento ou adicione manualmente.
              </p>
              <div className="flex items-center justify-center gap-3">
                <button
                  onClick={onGenerateAiSuggestions}
                  className="px-5 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow-lg"
                >
                  <Sparkles className="w-4 h-4 inline mr-2 text-pink-200" />
                  Gerar com IA Agora
                </button>
                <button
                  onClick={() => setShowAddModal(true)}
                  className="px-5 py-2.5 bg-white/10 hover:bg-white/15 border border-white/20 text-white rounded-full text-xs font-semibold"
                >
                  Adicionar Manualmente
                </button>
              </div>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4">
              {items.map((item, index) => {
                const display = formatItemDisplay(item, index);

                return (
                  <div
                    key={index}
                    className="bg-white text-slate-800 rounded-xl p-5 sm:p-6 shadow-md border border-slate-100 transition-all hover:shadow-lg relative group"
                  >
                    {/* Linha de Cabeçalho do Card */}
                    <div className="flex items-center justify-between pb-2 border-b border-slate-100">
                      <span className="font-bold text-base text-slate-900">
                        {display.title}
                      </span>
                      <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                        <button
                          onClick={() => {
                            navigator.clipboard.writeText(display.content);
                            setCopiedIndex(index);
                            setTimeout(() => setCopiedIndex(null), 2000);
                          }}
                          className="p-1.5 text-slate-400 hover:text-slate-700 rounded hover:bg-slate-100 transition-colors"
                          title="Copiar texto"
                        >
                          {copiedIndex === index ? (
                            <Check className="w-4 h-4 text-emerald-600" />
                          ) : (
                            <Copy className="w-4 h-4" />
                          )}
                        </button>
                        <button
                          onClick={() => handleDeleteItem(index)}
                          className="p-1.5 text-slate-400 hover:text-rose-600 rounded hover:bg-slate-100 transition-colors"
                          title="Remover item"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>

                    {/* Conteúdo do Card (Estilo do Screenshot 3) */}
                    <div className="mt-3 text-sm leading-relaxed text-slate-700 font-normal">
                      {display.content}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* 4. Modal para Adicionar Novo Item */}
      {showAddModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-[#24225b] border border-[#3b387e] rounded-2xl max-w-lg w-full p-6 text-white shadow-2xl">
            <h3 className="text-lg font-bold mb-1">
              Adicionar Item em {ferramenta.nome}
            </h3>
            <p className="text-xs text-indigo-200/80 mb-4">
              Descreva o segmento, persona, diferencial ou métrica para este plano.
            </p>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">
                  Título do Item
                </label>
                <input
                  type="text"
                  value={newItemTitle}
                  onChange={(e) => setNewItemTitle(e.target.value)}
                  placeholder="Ex: Segmentação 2 ou Nome da Persona"
                  className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-indigo-200 mb-1">
                  Descrição Detalhada
                </label>
                <textarea
                  rows={4}
                  value={newItemContent}
                  onChange={(e) => setNewItemContent(e.target.value)}
                  placeholder="Descreva as características, dores, expectativas e variáveis de diferenciação..."
                  className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowAddModal(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
              >
                Cancelar
              </button>
              <button
                onClick={handleAddItem}
                className="px-5 py-2 bg-pink-600 hover:bg-pink-500 text-white rounded-lg text-xs font-bold shadow"
              >
                Salvar Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 5. Floating Action Button (FAB) Oficial - "+ Adicionar" */}
      <div className="fixed bottom-6 right-6 sm:bottom-8 sm:right-8 z-30">
        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-2.5 px-6 py-3.5 bg-[#ff2d78] hover:bg-[#f01c68] text-white rounded-full font-bold text-sm shadow-xl shadow-pink-600/40 hover:scale-105 active:scale-95 transition-all"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Adicionar</span>
        </button>
      </div>
    </div>
  );
};
