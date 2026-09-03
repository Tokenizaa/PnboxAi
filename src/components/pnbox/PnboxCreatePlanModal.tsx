import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Search,
  Building2,
  MapPin,
  DollarSign,
  TrendingUp,
  BrainCircuit,
  CheckCircle2,
  RefreshCw,
  ArrowRight
} from 'lucide-react';
import { PlanoCriadoInfo, AuthSessionState } from '../../types/pnbox';
import { SchemaGenerator } from '../../utils/schemaGenerator';

interface PnboxCreatePlanModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPlanCreated: (novoPlano: PlanoCriadoInfo) => void;
  authSession: AuthSessionState;
}

const PRESETS = [
  {
    nome: 'Defesas & Recursos de Trânsito com IA',
    setor: 'Legaltech & Trânsito',
    descricao: 'SaaS para automatizar recursos contra multas de trânsito NIC e pessoas físicas com teses fundamentadas no CTB.',
    cidade: 'São Paulo / SP',
    orcamento: 75000
  },
  {
    nome: 'Clínica Veterinária 24h & UTI Móvel',
    setor: 'Saúde Animal & Serviços',
    descricao: 'Atendimento emergencial 24h, internação com monitoramento contínuo, telemedicina e UTI móvel domiciliar.',
    cidade: 'Curitiba / PR',
    orcamento: 120000
  },
  {
    nome: 'Dark Kitchen Saudável para Atletas',
    setor: 'Alimentos & Bebidas',
    descricao: 'Refeições funcionais e hiperproteicas com cardápio assinado por nutricionistas esportivos e entregas via app.',
    cidade: 'Rio de Janeiro / RJ',
    orcamento: 65000
  },
  {
    nome: 'Software de IA para Agronegócio',
    setor: 'Agrotech & Inteligência Artificial',
    descricao: 'Monitoramento preditivo de safras e controle de pulverização com visão computacional para cooperativas.',
    cidade: 'Ribeirão Preto / SP',
    orcamento: 95000
  }
];

export const PnboxCreatePlanModal: React.FC<PnboxCreatePlanModalProps> = ({
  isOpen,
  onClose,
  onPlanCreated,
  authSession
}) => {
  const [nomePlano, setNomePlano] = useState('');
  const [setor, setSetor] = useState('');
  const [descricao, setDescricao] = useState('');
  const [cidadeUf, setCidadeUf] = useState('São Paulo / SP');
  const [orcamento, setOrcamento] = useState<number>(80000);
  const [isGenerating, setIsGenerating] = useState(false);
  const [statusProgress, setStatusProgress] = useState<string>('');

  if (!isOpen) return null;

  const handleSelectPreset = (preset: typeof PRESETS[0]) => {
    setNomePlano(preset.nome);
    setSetor(preset.setor);
    setDescricao(preset.descricao);
    setCidadeUf(preset.cidade);
    setOrcamento(preset.orcamento);
  };

  const handleCreateWithAi = async () => {
    if (!nomePlano.trim() || !descricao.trim()) {
      alert('Por favor, preencha o nome e a descrição do negócio.');
      return;
    }

    setIsGenerating(true);
    setStatusProgress('Iniciando pesquisa de mercado com Gemini Deep Research...');

    try {
      const response = await fetch('/api/ai/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ideiaNegocio: `${nomePlano} - ${descricao}`,
          cidadeUf,
          orcamentoEstimado: orcamento,
          provider: 'gemini'
        })
      });

      const data = await response.json();
      setStatusProgress('Pesquisa concluída! Estruturando schemas oficiais do Sebrae...');

      const idGerado = `plano_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 6)}`;
      const dados14 = SchemaGenerator.gerarTodosOsSchemas(
        data.report || {
          nomeEmpresa: nomePlano,
          setor,
          resumoExecutivo: descricao,
          cidadeUf,
          orcamentoEstimado: orcamento
        },
        idGerado
      );

      const novoPlano: PlanoCriadoInfo = {
        idPlano: idGerado,
        nomePlano,
        setor: setor || 'Serviços & Inovação',
        descricao,
        cidadeUf,
        criadoEm: new Date().toISOString(),
        status: 'preenchido_completo',
        metodoCriacao: 'ddp_direct',
        pesquisaMercado: data.report,
        dados14Ferramentas: dados14,
        ferramentasPreenchidas: 14,
        categoriaObjetivo: 'Criar um novo negócio'
      };

      onPlanCreated(novoPlano);
      onClose();
    } catch (err) {
      console.error(err);
      // Fallback local se a API demorar
      const idGerado = `plano_${Date.now().toString(36)}`;
      const dadosFallback = SchemaGenerator.gerarTodosOsSchemas(
        {
          nomeEmpresa: nomePlano,
          setor: setor || 'Serviços',
          resumoExecutivo: descricao,
          cidadeUf,
          orcamentoEstimado: orcamento
        },
        idGerado
      );

      const novoPlano: PlanoCriadoInfo = {
        idPlano: idGerado,
        nomePlano,
        setor: setor || 'Serviços',
        descricao,
        cidadeUf,
        criadoEm: new Date().toISOString(),
        status: 'preenchido_completo',
        metodoCriacao: 'ddp_direct',
        dados14Ferramentas: dadosFallback,
        ferramentasPreenchidas: 14,
        categoriaObjetivo: 'Criar um novo negócio'
      };

      onPlanCreated(novoPlano);
      onClose();
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#1e1d4b] border border-[#3b387e] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-white/10">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white">
              <Sparkles className="w-4 h-4 text-pink-200" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">
                Criar Novo Plano de Negócio com IA
              </h2>
              <p className="text-xs text-indigo-200/80">
                Gere automaticamente todas as 14 ferramentas compatíveis com o Sebrae PNBOX
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Presets Rápidos */}
        <div className="mt-4">
          <span className="text-xs font-semibold text-indigo-200 mb-2 block">
            💡 Ou escolha um modelo de negócio pronto para inspirar:
          </span>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
            {PRESETS.map((p, i) => (
              <button
                key={i}
                onClick={() => handleSelectPreset(p)}
                className="text-left p-2.5 bg-[#252258] hover:bg-[#2c296f] border border-white/10 rounded-lg text-xs transition-colors"
              >
                <div className="font-bold text-white truncate">{p.nome}</div>
                <div className="text-[11px] text-indigo-300/80">{p.setor} • {p.cidade}</div>
              </button>
            ))}
          </div>
        </div>

        {/* Formulário */}
        <div className="mt-5 space-y-4">
          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">
              Nome do Negócio ou Marca
            </label>
            <input
              type="text"
              value={nomePlano}
              onChange={(e) => setNomePlano(e.target.value)}
              placeholder="Ex: Defesai/AdeusMultas ou Studio Café"
              className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-indigo-200 mb-1">
                Setor de Atuação
              </label>
              <input
                type="text"
                value={setor}
                onChange={(e) => setSetor(e.target.value)}
                placeholder="Ex: Legaltech, Alimentação, Saúde"
                className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-indigo-200 mb-1">
                Cidade e Estado (UF)
              </label>
              <input
                type="text"
                value={cidadeUf}
                onChange={(e) => setCidadeUf(e.target.value)}
                placeholder="Ex: Curitiba / PR ou São Paulo / SP"
                className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">
              Descrição da Ideia & Diferenciais
            </label>
            <textarea
              rows={3}
              value={descricao}
              onChange={(e) => setDescricao(e.target.value)}
              placeholder="Descreva o que a empresa faz, como atende o cliente e qual o diferencial..."
              className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-indigo-200 mb-1">
              Orçamento de Investimento Estimado (R$)
            </label>
            <input
              type="number"
              value={orcamento}
              onChange={(e) => setOrcamento(Number(e.target.value))}
              className="w-full bg-[#18163f] border border-white/10 rounded-lg px-3 py-2 text-sm text-white focus:outline-none focus:border-pink-500"
            />
          </div>
        </div>

        {/* Status de Carregamento */}
        {isGenerating && (
          <div className="mt-4 p-3 bg-pink-900/20 border border-pink-500/30 rounded-lg flex items-center gap-2.5 text-xs text-pink-200">
            <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
            <span>{statusProgress}</span>
          </div>
        )}

        {/* Ações */}
        <div className="mt-6 flex items-center justify-end gap-3 pt-4 border-t border-white/10">
          <button
            onClick={onClose}
            disabled={isGenerating}
            className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-white"
          >
            Cancelar
          </button>

          <button
            onClick={handleCreateWithAi}
            disabled={isGenerating}
            className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-xs sm:text-sm font-bold shadow-lg shadow-pink-600/30 transition-all hover:scale-105 active:scale-95 disabled:opacity-50"
          >
            <Sparkles className="w-4 h-4 text-pink-200" />
            <span>{isGenerating ? 'Gerando Plano com IA...' : 'Criar Plano com IA'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};
