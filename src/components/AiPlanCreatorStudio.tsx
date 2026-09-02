import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  Search,
  Building2,
  TrendingUp,
  Users,
  Swords,
  DollarSign,
  Scale,
  Globe,
  ExternalLink,
  Play,
  Layers,
  Copy,
  Check,
  RefreshCw,
  FileCode,
  ArrowRight,
  ShieldCheck,
  MapPin,
  CheckCircle2,
  AlertCircle,
  Clock,
  Briefcase,
  Cpu,
  KeyRound,
  Sliders,
  ChevronDown
} from 'lucide-react';
import { DeepResearchReport, PlanoCriadoInfo, AuthSessionState, AiProviderType } from '../types/pnbox';
import { SchemaGenerator } from '../utils/schemaGenerator';

interface AiPlanCreatorStudioProps {
  authSession: AuthSessionState;
  onUpdateActivePlanId: (novoId: string) => void;
  onApplyDataToQueue: (dados: Record<string, Record<string, unknown>[]>, idPlano: string) => void;
  onNavigateTab: (tab: string) => void;
  onRefreshTraffic: () => void;
}

const NVIDIA_MODELS = [
  { id: 'meta/llama-3.3-70b-instruct', name: 'Meta Llama 3.3 70B Instruct (Recomendado)', tag: 'Ultra Rápido & Preciso' },
  { id: 'deepseek-ai/deepseek-r1', name: 'DeepSeek R1 (Reasoning)', tag: 'Raciocínio Profundo' },
  { id: 'mistralai/mistral-large-2-instruct', name: 'Mistral Large 2 Instruct', tag: 'Adesão Rígida a Schemas' },
  { id: 'nvidia/llama-3.1-nemotron-70b-instruct', name: 'NVIDIA Nemotron 70B', tag: 'Otimizado NVIDIA' },
  { id: 'qwen/qwen2.5-72b-instruct', name: 'Qwen 2.5 72B Instruct', tag: 'Multilíngue' }
];

const PRESETS_IDEIAS = [
  {
    titulo: 'Clínica Veterinária 24h & Domiciliar',
    emoji: '🐾',
    cidade: 'Curitiba / PR',
    orcamento: 120000,
    prompt: 'Clínica veterinária com atendimento emergencial 24 horas, telemedicina, UTI móvel e atendimento domiciliar premium para cães, gatos e animais silvestres.'
  },
  {
    titulo: 'Chocolateria Vegana & E-commerce',
    emoji: '🍫',
    cidade: 'São Paulo / SP',
    orcamento: 85000,
    prompt: 'Fábrica artesanal e cafeteria de chocolates veganos bean-to-bar, sem glúten e sem lactose, com loja física conceitual e e-commerce de assinaturas para todo o Brasil.'
  },
  {
    titulo: 'Consultoria de IA para Agronegócio',
    emoji: '🤖',
    cidade: 'Ribeirão Preto / SP',
    orcamento: 65000,
    prompt: 'Consultoria e software house focada em implementação de agentes de inteligência artificial generativa e visão computacional para monitoramento de safras e gestão de cooperativas agrícolas.'
  },
  {
    titulo: 'Dark Kitchen Saudável para Academias',
    emoji: '🥗',
    cidade: 'Rio de Janeiro / RJ',
    orcamento: 70000,
    prompt: 'Dark kitchen voltada exclusivamente para refeições saudáveis, funcionais e hiperproteicas sob medida para alunos de academias, boxes de crossfit e assinantes mensais.'
  },
  {
    titulo: 'Energia Solar Fotovoltaica & Baterias',
    emoji: '⚡',
    cidade: 'Belo Horizonte / MG',
    orcamento: 110000,
    prompt: 'Empresa integradora de sistemas solares fotovoltaicos residenciais e comerciais com armazenamento em baterias de lítio e monitoramento inteligente de consumo em tempo real.'
  },
  {
    titulo: 'Barbearia Premium & Clube de Assinatura',
    emoji: '✂',
    cidade: 'Florianópolis / SC',
    orcamento: 60000,
    prompt: 'Barbearia executiva com espaço de convivência, barbearia clássica, tratamentos capilares, cervejaria artesanal integrada e plano de assinatura mensal de cortes ilimitados.'
  }
];

export const AiPlanCreatorStudio: React.FC<AiPlanCreatorStudioProps> = ({
  authSession,
  onUpdateActivePlanId,
  onApplyDataToQueue,
  onNavigateTab,
  onRefreshTraffic
}) => {
  const [prompt, setPrompt] = useState('');
  const [cidadeUf, setCidadeUf] = useState('São Paulo / SP');
  const [orcamentoEstimado, setOrcamentoEstimado] = useState(80000);
  const [publicoAlvo, setPublicoAlvo] = useState('B2C e Consumidores Finais');
  const [useSearchGrounding, setUseSearchGrounding] = useState(true);

  // Provedor de IA e Contas NVIDIA
  const [aiProvider, setAiProvider] = useState<AiProviderType>('gemini');
  const [geminiModel, setGeminiModel] = useState<string>('gemini-3.7-flash');
  const [nvidiaAccountSlot, setNvidiaAccountSlot] = useState<1 | 2 | 3>(1);
  const [nvidiaModel, setNvidiaModel] = useState<string>('meta/llama-3.3-70b-instruct');
  const [nvidiaCustomTokens, setNvidiaCustomTokens] = useState<Record<number, string>>({
    1: '',
    2: '',
    3: ''
  });
  const [showNvidiaTokenInput, setShowNvidiaTokenInput] = useState<boolean>(false);

  const [isResearching, setIsResearching] = useState(false);
  const [researchStep, setResearchStep] = useState<string>('');
  const [researchReport, setResearchReport] = useState<DeepResearchReport | null>(null);

  const [isSynthesizing, setIsSynthesizing] = useState(false);
  const [dadosSintetizados, setDadosSintetizados] = useState<Record<string, Record<string, unknown>[]> | null>(null);

  const [isCreatingPlan, setIsCreatingPlan] = useState(false);
  const [planoCriado, setPlanoCriado] = useState<PlanoCriadoInfo | null>(null);
  const [historicoPlanos, setHistoricoPlanos] = useState<PlanoCriadoInfo[]>([]);

  const [isAutoFillingBatch, setIsAutoFillingBatch] = useState(false);
  const [fillProgress, setFillProgress] = useState<{ total: number; current: number; logs: string[] }>({
    total: 14,
    current: 0,
    logs: []
  });

  const [copiedScript, setCopiedScript] = useState(false);
  const [scriptPlaywrightModal, setScriptPlaywrightModal] = useState<string | null>(null);

  // Carregar tokens salvos do localStorage
  useEffect(() => {
    try {
      const savedTokens = localStorage.getItem('pnbox_nvidia_tokens');
      if (savedTokens) {
        setNvidiaCustomTokens(JSON.parse(savedTokens));
      }
      const savedProvider = localStorage.getItem('pnbox_selected_provider');
      if (savedProvider === 'gemini' || savedProvider === 'nvidia') {
        setAiProvider(savedProvider);
      }
    } catch {
      // Ignora erro de localStorage
    }
  }, []);

  // Salvar tokens NVIDIA no localStorage
  const handleUpdateNvidiaToken = (slot: 1 | 2 | 3, token: string) => {
    const updated = { ...nvidiaCustomTokens, [slot]: token };
    setNvidiaCustomTokens(updated);
    try {
      localStorage.setItem('pnbox_nvidia_tokens', JSON.stringify(updated));
    } catch {
      // Ignora
    }
  };

  const handleSelectProvider = (prov: AiProviderType) => {
    setAiProvider(prov);
    try {
      localStorage.setItem('pnbox_selected_provider', prov);
    } catch {
      // Ignora
    }
  };

  // Carregar lista de planos ao montar
  useEffect(() => {
    fetch('/api/automation/planos/list')
      .then((res) => res.json())
      .then((data) => {
        if (data.planos) setHistoricoPlanos(data.planos);
      })
      .catch((err) => console.warn(err));
  }, []);

  const handleSelectPreset = (preset: typeof PRESETS_IDEIAS[0]) => {
    setPrompt(preset.prompt);
    setCidadeUf(preset.cidade);
    setOrcamentoEstimado(preset.orcamento);
  };

  const handleExecutarDeepResearch = async () => {
    if (!prompt.trim()) return;

    setIsResearching(true);
    setResearchReport(null);
    setDadosSintetizados(null);
    setPlanoCriado(null);

    const providerLabel = aiProvider === 'nvidia' ? `NVIDIA NIM (${nvidiaModel})` : `Google Gemini (${geminiModel})`;
    setResearchStep(`Iniciando Pesquisa de Mercado com ${providerLabel}...`);

    try {
      const res = await fetch('/api/ai/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt,
          cidadeUf,
          orcamentoEstimado,
          publicoAlvo,
          modeloAprofundado: true,
          provider: aiProvider,
          useSearchGrounding,
          geminiModel,
          nvidiaAccountSlot,
          nvidiaApiKey: nvidiaCustomTokens[nvidiaAccountSlot] || undefined,
          nvidiaModel
        })
      });

      const data = await res.json();
      if (data.status === 'ok' && data.report) {
        setResearchReport(data.report);

        // Auto-sintetizar dados das 14 ferramentas usando o SchemaGenerator
        setResearchStep('Sintetizando schemas das 14 ferramentas PNBOX com SchemaGenerator...');
        const dados14 = SchemaGenerator.generateFromResearch(data.report, authSession.idPlano);
        setDadosSintetizados(dados14);
      } else {
        alert(`Erro ao gerar pesquisa: ${data.mensagem || 'Falha na resposta da IA'}`);
      }
    } catch (err: any) {
      alert(`Erro na requisição: ${err.message}`);
    } finally {
      setIsResearching(false);
      setResearchStep('');
    }
  };

  const handleCriarNovoPlanoNoPnbox = async () => {
    if (!researchReport) return;

    setIsCreatingPlan(true);
    try {
      const res = await fetch('/api/automation/planos/create', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomePlano: researchReport.nomeNegocioSugerido,
          setor: researchReport.setor,
          descricao: researchReport.resumoExecutivo,
          cidadeUf: researchReport.cidadeUf,
          research: researchReport,
          dados14Ferramentas: dadosSintetizados || undefined
        })
      });

      const data = await res.json();
      if (data.status === 'ok' && data.plano) {
        setPlanoCriado(data.plano);
        setHistoricoPlanos((prev) => [data.plano, ...prev]);
        onUpdateActivePlanId(data.idPlano);
        onRefreshTraffic();

        // Se tiver dados sintetizados, atualizar com o novo idPlano
        if (dadosSintetizados) {
          const dadosAjustados: Record<string, Record<string, unknown>[]> = {};
          for (const [col, items] of Object.entries(dadosSintetizados)) {
            if (Array.isArray(items)) {
              dadosAjustados[col] = (items as Record<string, unknown>[]).map((it) => ({ ...it, idPlano: data.idPlano }));
            }
          }
          setDadosSintetizados(dadosAjustados);
        }
      }
    } catch (err: any) {
      alert(`Erro ao criar plano: ${err.message}`);
    } finally {
      setIsCreatingPlan(false);
    }
  };

  const handlePreencherLoteNovoPlano = async () => {
    if (!dadosSintetizados) return;
    const targetIdPlano = planoCriado ? planoCriado.idPlano : authSession.idPlano;

    setIsAutoFillingBatch(true);
    setFillProgress({ total: 14, current: 0, logs: ['Iniciando injeção em lote no PNBOX...'] });

    try {
      const res = await fetch('/api/automation/fill-batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          idPlano: targetIdPlano,
          customData: dadosSintetizados,
          delayBetweenToolsMs: 150
        })
      });

      const data = await res.json();
      if (data.status === 'ok' && data.resumo) {
        setFillProgress({
          total: 14,
          current: data.resumo.ferramentasSucesso,
          logs: [
            `✓ Preenchimento concluído com sucesso!`,
            `Total de ferramentas gravadas: ${data.resumo.ferramentasSucesso}/14`,
            `Total de registros DDP: ${data.resumo.totalRegistrosSalvos}`,
            `Duração: ${data.resumo.duracaoTotalMs}ms`
          ]
        });

        if (planoCriado) {
          setPlanoCriado({
            ...planoCriado,
            status: 'preenchido_completo',
            ferramentasPreenchidas: 14
          });
        }
        onRefreshTraffic();
      }
    } catch (err: any) {
      alert(`Erro na gravação em lote: ${err.message}`);
    } finally {
      setIsAutoFillingBatch(false);
    }
  };

  const handleGerarScriptPlaywright = async () => {
    const nome = researchReport?.nomeNegocioSugerido || 'Novo Negócio PNBOX';
    const setor = researchReport?.setor || 'Serviços';
    const id = planoCriado?.idPlano || authSession.idPlano;

    try {
      const res = await fetch('/api/automation/script-criar-plano', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          nomePlano: nome,
          setor,
          dados14Ferramentas: dadosSintetizados || undefined,
          idPlano: id
        })
      });
      const data = await res.json();
      if (data.script) {
        setScriptPlaywrightModal(data.script);
      }
    } catch (err: any) {
      alert(`Erro ao gerar script: ${err.message}`);
    }
  };

  const handleCopiarScript = () => {
    if (scriptPlaywrightModal) {
      navigator.clipboard.writeText(scriptPlaywrightModal);
      setCopiedScript(true);
      setTimeout(() => setCopiedScript(false), 2000);
    }
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-300">
      {/* Banner Principal com Apelo Tecnológico e Seletor de Provedor de IA */}
      <div className="bg-gradient-to-br from-indigo-950/80 via-slate-900 to-slate-950 p-6 rounded-3xl border border-indigo-500/30 shadow-2xl relative overflow-hidden">
        <div className="absolute top-0 right-0 w-96 h-96 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none -mr-20 -mt-20"></div>

        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6 relative z-10">
          <div className="space-y-2 max-w-3xl">
            <div className="flex flex-wrap items-center gap-2">
              <span className="px-3 py-1 bg-gradient-to-r from-indigo-600 to-blue-600 text-white text-xs font-bold rounded-full flex items-center gap-1.5 shadow">
                <Sparkles className="w-3.5 h-3.5" />
                Deep Research de Mercado
              </span>
              <span className="px-3 py-1 bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 text-xs font-bold rounded-full flex items-center gap-1.5">
                <Building2 className="w-3.5 h-3.5" />
                Portal Oficial PNBOX Sebrae
              </span>
              <span className="px-2.5 py-0.5 bg-slate-800 text-slate-300 text-[11px] font-mono rounded-lg border border-slate-700">
                14 Ferramentas Conectadas
              </span>
            </div>

            <h1 className="text-2xl sm:text-3xl font-black text-white tracking-tight">
              Criar Novo Plano de Negócio no PNBOX a partir de Linguagem Natural
            </h1>
            <p className="text-sm text-slate-300 leading-relaxed">
              Descreva qualquer ideia ou modelo de negócio. O agente executa um <strong>Deep Market Research</strong> com pesquisa de mercado aprofundada, mapeia concorrentes, público-alvo, custos e viabilidade, e estrutura automaticamente as 14 ferramentas no Sebrae PNBOX.
            </p>
          </div>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3 shrink-0">
            <a
              href="https://pnbox.sebrae.com.br/"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2.5 bg-slate-800/90 hover:bg-slate-800 text-slate-200 hover:text-white rounded-xl text-xs font-semibold border border-slate-700 transition-all flex items-center justify-center gap-2"
            >
              <Globe className="w-4 h-4 text-cyan-400" />
              <span>Abrir pnbox.sebrae.com.br</span>
              <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
            </a>
          </div>
        </div>

        {/* BARRA DE SELEÇÃO DE PROVEDOR DE IA (GEMINI vs NVIDIA NIM 3 CONTAS) */}
        <div className="mt-6 pt-5 border-t border-slate-800/80 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-400 flex items-center gap-1.5">
              <Cpu className="w-4 h-4 text-indigo-400" />
              Provedor de IA:
            </span>
            <div className="flex items-center p-1 bg-slate-950 rounded-xl border border-slate-800 w-full sm:w-auto">
              <button
                onClick={() => handleSelectProvider('gemini')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  aiProvider === 'gemini'
                    ? 'bg-gradient-to-r from-blue-600 to-indigo-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Sparkles className="w-3.5 h-3.5 text-cyan-300" />
                <span>Google Gemini</span>
              </button>
              <button
                onClick={() => handleSelectProvider('nvidia')}
                className={`flex-1 sm:flex-initial px-3 py-1.5 rounded-lg text-xs font-bold transition-all flex items-center justify-center gap-1.5 ${
                  aiProvider === 'nvidia'
                    ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-md'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                <Cpu className="w-3.5 h-3.5 text-emerald-300" />
                <span>NVIDIA NIM</span>
              </button>
            </div>
          </div>

          {/* Configurações específicas do provedor selecionado */}
          <div className="md:col-span-8 flex flex-wrap items-center gap-3 justify-start md:justify-end">
            {aiProvider === 'gemini' ? (
              <div className="flex flex-wrap items-center gap-3 text-xs">
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <span className="text-slate-500">Modelo:</span>
                  <select
                    value={geminiModel}
                    onChange={(e) => setGeminiModel(e.target.value)}
                    className="bg-transparent text-slate-200 font-semibold focus:outline-none cursor-pointer"
                  >
                    <option value="gemini-3.7-flash" className="bg-slate-900 text-white">Gemini 3.7 Flash (Recomendado)</option>
                    <option value="gemini-2.5-flash" className="bg-slate-900 text-white">Gemini 2.5 Flash</option>
                    <option value="gemini-2.5-pro" className="bg-slate-900 text-white">Gemini 2.5 Pro</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5 bg-indigo-950/40 text-indigo-300 border border-indigo-500/30 px-3 py-1.5 rounded-xl">
                  <Search className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Google Search Grounding Ativo</span>
                </div>
              </div>
            ) : (
              <div className="flex flex-wrap items-center gap-2 text-xs w-full sm:w-auto">
                {/* Seletor de Contas NVIDIA (1, 2, 3) */}
                <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800">
                  <span className="text-slate-500 px-2 text-[11px] font-semibold flex items-center gap-1">
                    <KeyRound className="w-3 h-3 text-emerald-400" />
                    Conta:
                  </span>
                  {[1, 2, 3].map((slotNum) => (
                    <button
                      key={slotNum}
                      onClick={() => setNvidiaAccountSlot(slotNum as 1 | 2 | 3)}
                      className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                        nvidiaAccountSlot === slotNum
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white bg-slate-900'
                      }`}
                      title={`Conta NVIDIA ${slotNum} ${nvidiaCustomTokens[slotNum] ? '(Token Configurado)' : ''}`}
                    >
                      Conta {slotNum}
                      {nvidiaCustomTokens[slotNum] && <span className="ml-1 text-emerald-300">●</span>}
                    </button>
                  ))}
                </div>

                {/* Seletor de Modelo NVIDIA */}
                <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800">
                  <select
                    value={nvidiaModel}
                    onChange={(e) => setNvidiaModel(e.target.value)}
                    className="bg-transparent text-slate-200 text-xs font-semibold focus:outline-none cursor-pointer max-w-[200px] truncate"
                  >
                    {NVIDIA_MODELS.map((m) => (
                      <option key={m.id} value={m.id} className="bg-slate-900 text-white">
                        {m.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Botão para Inserir / Alterar Token da Conta */}
                <button
                  onClick={() => setShowNvidiaTokenInput(!showNvidiaTokenInput)}
                  className="px-2.5 py-1.5 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white border border-slate-700 rounded-xl transition-colors flex items-center gap-1"
                  title="Gerenciar Chaves/Tokens das 3 Contas NVIDIA"
                >
                  <KeyRound className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Tokens ({nvidiaAccountSlot})</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Gaveta de Edição de Tokens NVIDIA (3 Contas) */}
        {aiProvider === 'nvidia' && showNvidiaTokenInput && (
          <div className="mt-4 p-4 bg-slate-950 rounded-2xl border border-emerald-500/40 space-y-3 animate-in fade-in duration-200">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <KeyRound className="w-4 h-4 text-emerald-400" />
                Gerenciador de Tokens das 3 Contas NVIDIA NIM
              </span>
              <button
                onClick={() => setShowNvidiaTokenInput(false)}
                className="text-xs text-slate-400 hover:text-white"
              >
                ✕ Fechar
              </button>
            </div>
            <p className="text-[11px] text-slate-400">
              Insira os tokens das suas contas da NVIDIA (obtenha em build.nvidia.com). Eles ficam salvos com segurança no seu navegador.
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {[1, 2, 3].map((slot) => (
                <div key={slot} className="space-y-1">
                  <label className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Conta NVIDIA {slot} {slot === nvidiaAccountSlot && '(Ativa)'}</span>
                    {nvidiaCustomTokens[slot] && <span className="text-[10px] text-emerald-400">✓ Configurada</span>}
                  </label>
                  <input
                    type="password"
                    value={nvidiaCustomTokens[slot] || ''}
                    onChange={(e) => handleUpdateNvidiaToken(slot as 1 | 2 | 3, e.target.value)}
                    placeholder={`nvapi-xxxxxxxx (Conta ${slot})`}
                    className="w-full bg-slate-900 border border-slate-700 rounded-xl px-3 py-1.5 text-xs text-slate-200 font-mono focus:outline-none focus:border-emerald-500"
                  />
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Grid Principal: Entrada do Prompt e Opções */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Painel de Entrada de Prompt (7 Colunas) */}
        <div className="lg:col-span-7 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-5">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Search className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">1. Descreva sua Ideia de Negócio</h2>
            </div>
            <span className="text-xs text-slate-400 font-mono">
              {prompt.length} caracteres
            </span>
          </div>

          {/* Presets Rápidos de Ideias */}
          <div className="space-y-2">
            <label className="text-xs font-semibold text-slate-400">Sugestões de Ideias & Nichos em Alta:</label>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
              {PRESETS_IDEIAS.map((p, idx) => (
                <button
                  key={idx}
                  onClick={() => handleSelectPreset(p)}
                  className="p-2.5 text-left bg-slate-950/70 hover:bg-indigo-950/40 border border-slate-800 hover:border-indigo-500/40 rounded-xl transition-all group cursor-pointer"
                >
                  <div className="text-base mb-1">{p.emoji}</div>
                  <div className="text-xs font-bold text-slate-200 group-hover:text-indigo-300 line-clamp-1">
                    {p.titulo}
                  </div>
                  <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                    {p.cidade} • R$ {(p.orcamento / 1000).toFixed(0)}k
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Campo de Texto Rico para o Prompt */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Prompt do Negócio (Linguagem Natural):</label>
            <textarea
              rows={4}
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="Ex: Quero abrir uma clínica veterinária 24h em Curitiba com foco em cirurgia ortopédica, internação premium, UTI móvel e atendimento domiciliar..."
              className="w-full bg-slate-950 border border-slate-800 focus:border-indigo-500 rounded-2xl p-4 text-sm text-slate-100 placeholder-slate-500 focus:outline-none focus:ring-1 focus:ring-indigo-500 resize-none transition-all leading-relaxed"
            />
          </div>

          {/* Parâmetros Avançados da Pesquisa */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-2">
            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <MapPin className="w-3.5 h-3.5 text-indigo-400" />
                Cidade / UF:
              </label>
              <input
                type="text"
                value={cidadeUf}
                onChange={(e) => setCidadeUf(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <DollarSign className="w-3.5 h-3.5 text-emerald-400" />
                Orçamento Estimado:
              </label>
              <input
                type="number"
                step={5000}
                value={orcamentoEstimado}
                onChange={(e) => setOrcamentoEstimado(Number(e.target.value))}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500 font-mono"
              />
            </div>

            <div className="space-y-1">
              <label className="text-xs text-slate-400 flex items-center gap-1">
                <Users className="w-3.5 h-3.5 text-blue-400" />
                Público-Alvo Foco:
              </label>
              <input
                type="text"
                value={publicoAlvo}
                onChange={(e) => setPublicoAlvo(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-indigo-500"
              />
            </div>
          </div>

          {/* Toggle Grounding e Botão de Ação */}
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-3 border-t border-slate-800">
            <div className="text-xs text-slate-400">
              Provedor Ativo: <span className="text-white font-bold">{aiProvider === 'nvidia' ? `NVIDIA (${nvidiaModel.split('/')[1] || nvidiaModel})` : 'Google Gemini'}</span>
            </div>

            <button
              onClick={handleExecutarDeepResearch}
              disabled={isResearching || !prompt.trim()}
              className="w-full sm:w-auto px-6 py-3 bg-gradient-to-r from-indigo-600 to-blue-600 hover:from-indigo-500 hover:to-blue-500 text-white font-bold rounded-2xl shadow-lg shadow-indigo-600/30 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {isResearching ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Pesquisando Mercado com IA...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  <span>Executar Deep Research & Sintetizar</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Painel Lateral: Resumo Rápido e Histórico de Planos (5 Colunas) */}
        <div className="lg:col-span-5 bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-xl space-y-4">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-base font-bold text-white">Planos Criados no PNBOX</h2>
            </div>
            <span className="text-xs font-mono text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded-md border border-emerald-500/30">
              {historicoPlanos.length} planos
            </span>
          </div>

          <div className="space-y-3 max-h-[360px] overflow-y-auto pr-1">
            {historicoPlanos.length === 0 ? (
              <div className="p-6 text-center text-slate-500 text-xs">
                Nenhum plano cadastrado recentemente. Crie seu primeiro plano via IA!
              </div>
            ) : (
              historicoPlanos.map((pl, idx) => (
                <div
                  key={idx}
                  className={`p-3.5 rounded-2xl border transition-all ${
                    authSession.idPlano === pl.idPlano
                      ? 'bg-indigo-950/40 border-indigo-500/50 shadow-md'
                      : 'bg-slate-950 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-xs font-bold text-white">{pl.nomePlano}</h4>
                      <p className="text-[11px] text-slate-400 mt-0.5">{pl.setor} • {pl.cidadeUf}</p>
                    </div>
                    {authSession.idPlano === pl.idPlano && (
                      <span className="px-2 py-0.5 bg-indigo-600 text-white text-[10px] font-bold rounded-md uppercase tracking-wider">
                        Ativo
                      </span>
                    )}
                  </div>

                  <div className="flex items-center justify-between mt-3 pt-2 border-t border-slate-800/80 text-[11px] font-mono">
                    <span className="text-slate-500 truncate max-w-[140px]" title={pl.idPlano}>
                      ID: {pl.idPlano}
                    </span>

                    <button
                      onClick={() => onUpdateActivePlanId(pl.idPlano)}
                      className="text-indigo-400 hover:text-indigo-300 font-semibold flex items-center gap-1"
                    >
                      <span>Usar este Plano</span>
                      <ArrowRight className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Relatório Detalhado de Deep Research & Síntese das 14 Ferramentas */}
      {researchReport && (
        <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-300">
          {/* Card de Resumo do Negócio */}
          <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-6">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 border-b border-slate-800 pb-4">
              <div>
                <span className="text-xs font-bold text-emerald-400 uppercase tracking-wider font-mono">
                  Deep Research Concluído com Sucesso
                </span>
                <h3 className="text-2xl font-black text-white mt-1">
                  {researchReport.nomeNegocioSugerido}
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Setor: <strong className="text-slate-200">{researchReport.setor}</strong> • Praça: <strong className="text-slate-200">{researchReport.cidadeUf}</strong>
                </p>
              </div>

              {/* Botões de Ação Principal: Criar no PNBOX e Injetar Dados */}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  onClick={handleCriarNovoPlanoNoPnbox}
                  disabled={isCreatingPlan || !!planoCriado}
                  className={`px-4 py-2.5 rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg cursor-pointer ${
                    planoCriado
                      ? 'bg-emerald-950 text-emerald-300 border border-emerald-500/50'
                      : 'bg-indigo-600 hover:bg-indigo-500 text-white shadow-indigo-600/30'
                  }`}
                >
                  {isCreatingPlan ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : planoCriado ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  ) : (
                    <Building2 className="w-4 h-4" />
                  )}
                  <span>{planoCriado ? `Plano Registrado (${planoCriado.idPlano})` : 'Registrar Plano no PNBOX'}</span>
                </button>

                <button
                  onClick={handlePreencherLoteNovoPlano}
                  disabled={isAutoFillingBatch || !dadosSintetizados}
                  className="px-4 py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition-all flex items-center gap-2 shadow-lg shadow-emerald-600/30 cursor-pointer disabled:opacity-50"
                >
                  {isAutoFillingBatch ? (
                    <RefreshCw className="w-4 h-4 animate-spin" />
                  ) : (
                    <Play className="w-4 h-4 fill-white" />
                  )}
                  <span>Injetar 14 Ferramentas no Sebrae</span>
                </button>

                <button
                  onClick={handleGerarScriptPlaywright}
                  className="px-3.5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-semibold border border-slate-700 transition-colors flex items-center gap-1.5"
                  title="Exportar automação Playwright para CLI"
                >
                  <FileCode className="w-4 h-4 text-indigo-400" />
                  <span>Script Playwright</span>
                </button>
              </div>
            </div>

            {/* Grid com Destaques da Pesquisa de Mercado */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {/* Oportunidade e Resumo */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2 md:col-span-2">
                <div className="flex items-center gap-2 text-indigo-400 text-xs font-bold">
                  <TrendingUp className="w-4 h-4" />
                  <span>Proposta de Valor & Resumo Executivo</span>
                </div>
                <p className="text-xs text-slate-300 leading-relaxed">
                  {researchReport.resumoExecutivo}
                </p>
                <div className="pt-2 border-t border-slate-800/80">
                  <span className="text-[11px] font-semibold text-slate-400">Oportunidade Mapeada: </span>
                  <span className="text-[11px] text-slate-300">{researchReport.oportunidadeMercado}</span>
                </div>
              </div>

              {/* Indicadores Financeiros */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-3">
                <div className="flex items-center gap-2 text-emerald-400 text-xs font-bold">
                  <DollarSign className="w-4 h-4" />
                  <span>Estimativas Financeiras Iniciais</span>
                </div>
                <div className="space-y-2 text-xs font-mono">
                  <div className="flex justify-between">
                    <span className="text-slate-500">CAPEX Inicial:</span>
                    <span className="text-white font-bold">R$ {researchReport.investimentoEstimado?.capexTotal?.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">OPEX Mensal:</span>
                    <span className="text-slate-300">R$ {researchReport.investimentoEstimado?.opexMensal?.toLocaleString('pt-BR')}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Faturamento Projetado:</span>
                    <span className="text-emerald-400 font-bold">R$ {researchReport.investimentoEstimado?.faturamentoEstimadoMensal?.toLocaleString('pt-BR')}/mês</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-slate-500">Ponto de Equilíbrio:</span>
                    <span className="text-indigo-300">{researchReport.investimentoEstimado?.pontoEquilibrioMeses} meses</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Persona e Concorrentes */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Buyer Persona */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-blue-400 text-xs font-bold">
                  <Users className="w-4 h-4" />
                  <span>Buyer Persona: {researchReport.buyerPersona?.nome} ({researchReport.buyerPersona?.idade})</span>
                </div>
                <p className="text-xs text-slate-300">{researchReport.buyerPersona?.perfil}</p>
                <div className="text-xs space-y-1 pt-1">
                  <div>
                    <span className="text-slate-500 font-semibold">Dores: </span>
                    <span className="text-slate-300">{Array.isArray(researchReport.buyerPersona?.dores) ? researchReport.buyerPersona.dores.join(', ') : ''}</span>
                  </div>
                  <div>
                    <span className="text-slate-500 font-semibold">Ticket Médio Estimado: </span>
                    <span className="text-emerald-400 font-mono font-bold">R$ {researchReport.buyerPersona?.ticketMedio}</span>
                  </div>
                </div>
              </div>

              {/* Concorrentes e Diferenciais */}
              <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
                <div className="flex items-center gap-2 text-amber-400 text-xs font-bold">
                  <Swords className="w-4 h-4" />
                  <span>Concorrentes & Diferenciação Estratégica</span>
                </div>
                <div className="space-y-2 max-h-36 overflow-y-auto pr-1">
                  {researchReport.concorrentesMapeados?.map((c, i) => (
                    <div key={i} className="p-2 bg-slate-900 rounded-xl border border-slate-800 text-xs">
                      <span className="font-bold text-slate-200">{c.nome}</span>
                      <p className="text-[11px] text-slate-400 mt-0.5">Diferencial: <strong className="text-emerald-300">{c.diferenciacao}</strong></p>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Aspectos Legais, CNAE e Fontes */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 text-xs">
              <div className="space-y-1">
                <span className="font-bold text-slate-300 flex items-center gap-1.5">
                  <Scale className="w-4 h-4 text-purple-400" />
                  Aspectos Tributários & CNAE
                </span>
                <p className="text-slate-400">
                  CNAE: <strong className="text-slate-200">{researchReport.aspectosLegaisTributarios?.cnaeSugerido}</strong> • Regime: <strong className="text-slate-200">{researchReport.aspectosLegaisTributarios?.regimeTributario}</strong>
                </p>
              </div>

              <div className="flex flex-wrap items-center gap-2 text-[11px] font-mono">
                {researchReport.fontesPesquisa?.slice(0, 3).map((f, idx) => (
                  <a
                    key={idx}
                    href={f.uri}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-indigo-300 rounded-lg border border-slate-700 flex items-center gap-1 transition-colors"
                  >
                    <span className="truncate max-w-[130px]">{f.titulo}</span>
                    <ExternalLink className="w-3 h-3" />
                  </a>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Script Playwright */}
      {scriptPlaywrightModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-3xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl p-6 space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <FileCode className="w-5 h-5 text-indigo-400" />
                <h3 className="text-base font-bold text-white">Script Playwright de Automação Oficial</h3>
              </div>
              <button
                onClick={() => setScriptPlaywrightModal(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-slate-400">
              Este script executa o fluxo completo de criação do plano e preenchimento de todas as 14 ferramentas no portal oficial do Sebrae PNBOX via navegador headless ou CLI.
            </p>

            <div className="flex-1 bg-slate-950 border border-slate-800 rounded-2xl p-4 overflow-auto font-mono text-xs text-slate-300 max-h-96">
              <pre>{scriptPlaywrightModal}</pre>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                onClick={() => setScriptPlaywrightModal(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs font-semibold"
              >
                Fechar
              </button>
              <button
                onClick={handleCopiarScript}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-md"
              >
                {copiedScript ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copiedScript ? 'Copiado!' : 'Copiar Script Playwright'}</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
