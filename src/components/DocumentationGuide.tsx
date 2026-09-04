import React, { useState, useMemo } from 'react';
import {
  BookOpen,
  Sparkles,
  Copy,
  Check,
  Download,
  FileJson,
  Layers,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  HelpCircle,
  Code2,
  Terminal,
  Upload,
  AlertTriangle,
  Lightbulb,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Wand2,
  RefreshCw,
  Sliders,
  CheckCheck,
  Zap,
  Cpu,
  Dices
} from 'lucide-react';
import { FerramentaInfo } from '../types/pnbox';
import { compararJsonComSchema } from '../automation/schemaValidator';
import {
  SchemaGenerator,
  BusinessArchetypeId,
  BUSINESS_ARCHETYPES,
  SchemaAnalysisSummary,
  SchemaValidationResult
} from '../automation/schemaGenerator';

interface DocumentationGuideProps {
  ferramentas: FerramentaInfo[];
  idPlano: string;
  onApplyCustomDataToQueue: (data: Record<string, Record<string, unknown>[]>) => void;
  onNavigateToQueue: () => void;
}

export const DocumentationGuide: React.FC<DocumentationGuideProps> = ({
  ferramentas,
  idPlano,
  onApplyCustomDataToQueue,
  onNavigateToQueue
}) => {
  const [activeSubTab, setActiveSubTab] = useState<'gerador_ia' | 'gerador_mock' | 'schemas_14' | 'importar_json' | 'passo_a_passo'>('gerador_mock');
  
  // Análise estática dos Schemas usando SchemaGenerator
  const schemaAnalysis: SchemaAnalysisSummary = useMemo(() => {
    return SchemaGenerator.analyzeSchemas(ferramentas);
  }, [ferramentas]);

  // Estado do Gerador Mock (SchemaGenerator)
  const [mockArchetype, setMockArchetype] = useState<BusinessArchetypeId>('tecnologia_saas');
  const [mockCompanyName, setMockCompanyName] = useState<string>('DataFlow Intelligence SaaS');
  const [mockItemsPerTool, setMockItemsPerTool] = useState<number>(2);
  const [mockVariance, setMockVariance] = useState<number>(0.2);
  const [mockIncludeComplementary, setMockIncludeComplementary] = useState<boolean>(true);
  const [copiedMockJson, setCopiedMockJson] = useState<boolean>(false);
  const [appliedMockSuccess, setAppliedMockSuccess] = useState<boolean>(false);

  // Dados Mock Gerados
  const [generatedMockData, setGeneratedMockData] = useState<Record<string, Record<string, unknown>[]>>(() => {
    return SchemaGenerator.generateMockData({
      idPlano,
      archetype: 'tecnologia_saas',
      companyName: 'DataFlow Intelligence SaaS',
      itemsPerTool: 2,
      randomVariance: 0.2,
      includeComplementaryTools: true,
      explicitlyGenerateMock: true
    });
  });

  // Validação dos dados gerados
  const mockValidationResult: SchemaValidationResult = useMemo(() => {
    return SchemaGenerator.validateData(generatedMockData, ferramentas);
  }, [generatedMockData, ferramentas]);

  // Handler para gerar novo mock
  const handleGenerateNewMock = (archId?: BusinessArchetypeId) => {
    const targetArch = archId || mockArchetype;
    const archObj = SchemaGenerator.resolveArchetype(targetArch);
    const company = mockCompanyName || archObj.sugestoesNomes[0];
    
    const freshData = SchemaGenerator.generateMockData({
      idPlano,
      archetype: targetArch,
      companyName: company,
      itemsPerTool: mockItemsPerTool,
      randomVariance: mockVariance,
      includeComplementaryTools: mockIncludeComplementary,
      explicitlyGenerateMock: true
    });

    setGeneratedMockData(freshData);
    setAppliedMockSuccess(false);
  };

  const handleRandomizeCompany = () => {
    const archObj = SchemaGenerator.resolveArchetype(mockArchetype);
    const randomIndex = Math.floor(Math.random() * archObj.sugestoesNomes.length);
    const newName = archObj.sugestoesNomes[randomIndex];
    setMockCompanyName(newName);

    const freshData = SchemaGenerator.generateMockData({
      idPlano,
      archetype: mockArchetype,
      companyName: newName,
      itemsPerTool: mockItemsPerTool,
      randomVariance: mockVariance,
      includeComplementaryTools: mockIncludeComplementary,
      explicitlyGenerateMock: true
    });
    setGeneratedMockData(freshData);
  };

  const handleApplyMockToQueue = () => {
    onApplyCustomDataToQueue(generatedMockData);
    setAppliedMockSuccess(true);
    setTimeout(() => {
      onNavigateToQueue();
    }, 700);
  };

  const handleDownloadMockJson = () => {
    const blob = new Blob([JSON.stringify(generatedMockData, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnbox_mock_${mockArchetype}_${idPlano}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Estado do Gerador de IA
  const [businessName, setBusinessName] = useState<string>('Barbearia Vintage & Lounge');
  const [businessSector, setBusinessSector] = useState<string>('Beleza, Estética e Cuidados Masculinos');
  const [businessDescription, setBusinessDescription] = useState<string>('Barbearia premium com agendamento por app, cervejaria artesanal e serviços de barba/cabelo em ambiente executivo.');
  const [copiedPrompt, setCopiedPrompt] = useState<boolean>(false);
  const [copiedSchemaId, setCopiedSchemaId] = useState<string | null>(null);

  // Estado do Importador de JSON
  const [customJsonInput, setCustomJsonInput] = useState<string>('');
  const [validationResult, setValidationResult] = useState<{
    valido: boolean;
    totalColecoes: number;
    detalhes: { nome: string; collection: string; status: 'ok' | 'aviso' | 'faltante'; mensagem: string }[];
  } | null>(null);
  const [appliedSuccess, setAppliedSuccess] = useState<boolean>(false);

  // Accordion de schemas
  const [expandedToolId, setExpandedToolId] = useState<string | null>(ferramentas[0]?.id || null);

  // Presets rápidos para o Gerador de Prompts
  const PRESETS_NEGOCIOS = [
    {
      nome: 'Barbearia Vintage & Lounge',
      setor: 'Serviços / Beleza',
      desc: 'Barbearia premium com agendamento por app, cervejaria artesanal e serviços de barba/cabelo em ambiente executivo.'
    },
    {
      nome: 'Clínica Odontológica Integrada',
      setor: 'Saúde & Odontologia',
      desc: 'Clínica com ortodontia digital, implantes e harmonização orofacial para famílias de classe média-alta.'
    },
    {
      nome: 'Padaria Artesanal & Café Orgânico',
      setor: 'Alimentos & Bebidas',
      desc: 'Panificação de fermentação natural, café orgânico e brunch artesanal de alta qualidade.'
    },
    {
      nome: 'SaaS B2B de Gestão de Frotas',
      setor: 'Tecnologia / Software',
      desc: 'Plataforma em nuvem com telemetria e rastreamento veicular para empresas de logística e transporte.'
    },
    {
      nome: 'E-commerce de Moda Sustentável',
      setor: 'Varejo & E-commerce',
      desc: 'Vestuário unissex ecológico produzido com algodão orgânico e tecidos reciclados com logística reversa.'
    }
  ];

  // Construção do Prompt Mestre para Inteligência Artificial
  const gerarPromptMestre = () => {
    const schemasCompactos = ferramentas.map((f) => {
      const camposObrigatorios = f.camposSchema.filter((c) => c.obrigatorio).map((c) => `${c.nome} (${c.tipo})`).join(', ');
      const camposOpcionais = f.camposSchema.filter((c) => !c.obrigatorio).map((c) => `${c.nome} (${c.tipo})`).join(', ');
      return `"${f.collectionName}": [
  // Exemplo para ${f.nome} (Coleção: ${f.collectionName}):
  ${JSON.stringify(f.exemploPayload, null, 4)}
]`;
    }).join(',\n\n');

    return `Atue como um Especialista Sênior em Planos de Negócios e Estratégia Empresarial do Sebrae.

Preciso que você gere a estrutura COMPLETA de dados em formato JSON estrito para alimentar as 14 ferramentas oficiais do Sebrae PNBOX para o seguinte negócio:

---
INFORMAÇÕES DA EMPRESA:
- Nome do Negócio: ${businessName}
- Setor / Ramo de Atuação: ${businessSector}
- Descrição da Operação: ${businessDescription}
- ID do Plano no Sebrae: "${idPlano}"
---

REQUISITOS E REGRAS MANDATÓRIAS:
1. Retorne APENAS um bloco JSON válido sem textos explicativos adicionais antes ou depois.
2. Cada chave raiz deve corresponder EXATAMENTE ao nome da coleção no Sebrae PNBOX.
3. Cada coleção deve conter um array com 1 a 4 registros realistas, aprofundados e de alto valor estratégico para a empresa.
4. Todos os objetos DEVEM conter o campo "idPlano": "${idPlano}".

ESTRUTURA DE SCHEMAS DAS 14 FERRAMENTAS REQUERIDAS:
{
${schemasCompactos}
}

Gere agora o JSON completo preenchido para o negócio "${businessName}".`;
  };

  const promptTexto = gerarPromptMestre();

  const handleCopyPrompt = () => {
    navigator.clipboard.writeText(promptTexto);
    setCopiedPrompt(true);
    setTimeout(() => setCopiedPrompt(false), 2000);
  };

  const handleCopySchemaJson = (tool: FerramentaInfo) => {
    const jsonStr = JSON.stringify({ [tool.collectionName]: [tool.exemploPayload] }, null, 2);
    navigator.clipboard.writeText(jsonStr);
    setCopiedSchemaId(tool.id);
    setTimeout(() => setCopiedSchemaId(null), 2000);
  };

  // Validar JSON colado pelo usuário
  const handleValidarCustomJson = () => {
    setAppliedSuccess(false);
    if (!customJsonInput.trim()) {
      alert('Cole o JSON gerado antes de validar.');
      return;
    }

    try {
      const parsed = JSON.parse(customJsonInput);
      if (typeof parsed !== 'object' || parsed === null) {
        throw new Error('O JSON precisa ser um objeto cujas chaves são as coleções.');
      }

      const detalhes = ferramentas.map((f) => {
        const registros = parsed[f.collectionName];
        if (!registros || !Array.isArray(registros) || registros.length === 0) {
          return {
            nome: f.nome,
            collection: f.collectionName,
            status: 'faltante' as const,
            mensagem: `Coleção "${f.collectionName}" não informada no JSON.`
          };
        }

        const validacaoPrimeiro = compararJsonComSchema(registros[0], f);
        if (validacaoPrimeiro.isValido) {
          return {
            nome: f.nome,
            collection: f.collectionName,
            status: 'ok' as const,
            mensagem: `${registros.length} registro(s) válido(s) com conformidade 100%.`
          };
        } else {
          return {
            nome: f.nome,
            collection: f.collectionName,
            status: 'aviso' as const,
            mensagem: validacaoPrimeiro.resumo
          };
        }
      });

      const totalValidos = detalhes.filter((d) => d.status === 'ok').length;
      setValidationResult({
        valido: totalValidos > 0,
        totalColecoes: Object.keys(parsed).length,
        detalhes
      });
    } catch (err: any) {
      alert(`Erro ao processar JSON: ${err.message}`);
    }
  };

  // Aplicar dados customizados na Fila de Execução em Lote
  const handleAplicarNaFila = () => {
    try {
      const parsed = JSON.parse(customJsonInput);
      onApplyCustomDataToQueue(parsed);
      setAppliedSuccess(true);
      setTimeout(() => {
        onNavigateToQueue();
      }, 800);
    } catch (e: any) {
      alert('JSON inválido: ' + e.message);
    }
  };

  // Download da Documentação em Markdown
  const handleDownloadDocMarkdown = () => {
    const md = `
# Guia Completo de Automação & Geração de Dados para o Sebrae PNBOX

Este documento técnico explica a arquitetura de dados e como gerar registros para preenchimento automatizado das 14 ferramentas do portal Sebrae PNBOX via protocolo Meteor DDP / WebSocket.

---

## 1. Visão Geral da Arquitetura
O portal Sebrae PNBOX utiliza o framework Meteor.js com MongoDB e comunicação em tempo real via **Distributed Data Protocol (DDP)** sobre WebSockets (\`wss://pnbox.sebrae.com.br/websocket\`).
Diferente de sistemas que exigem preenchimento visual e clique por clique em formulários, este ecossistema permite a invocação direta dos métodos Meteor (\`<collectionName>.insert\`), gravando dados estruturados em milissegundos sem necessidade de renderização DOM.

---

## 2. Como Gerar Dados com Inteligência Artificial
Você pode utilizar modelos de linguagem (ChatGPT, Google Gemini, Claude) para criar planos de negócios inteiros no formato compatível.

### Exemplo de Prompt de Geração:
\`\`\`
${promptTexto}
\`\`\`

---

## 3. Schemas das 14 Ferramentas Oficiais

${ferramentas
  .map(
    (f, idx) => `
### ${idx + 1}. ${f.nome} (\`${f.collectionName}\`)
- **Bloco**: ${f.blocoLabel}
- **Método DDP**: \`${f.collectionName}.insert\`
- **Campos do Schema**:
${f.camposSchema.map((c) => `  - \`${c.nome}\` (${c.tipo}) - ${c.obrigatorio ? '**Obrigatório**' : 'Opcional'}: ${c.descricao}`).join('\n')}

**Exemplo de Payload:**
\`\`\`json
${JSON.stringify({ [f.collectionName]: [f.exemploPayload] }, null, 2)}
\`\`\`
`
  )
  .join('\n---\n')}

---

## 4. Passo a Passo de Execução em Lote
1. Obtenha o identificador do seu plano (\`idPlano\`) no portal do Sebrae.
2. Gere os dados do seu plano de negócio utilizando o Gerador de Prompts ou selecione um modelo pronto.
3. Configure a taxa de intervalo (Delay) na Fila em Lote (sugerido: 800ms a 1500ms).
4. Clique em "Executar Fila".
5. Acompanhe a persistência em tempo real e consulte o Relatório de Conclusão.
`.trim();

    const blob = new Blob([md], { type: 'text/markdown;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `pnbox_guia_e_gerador_dados_${idPlano}.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      {/* Banner da Documentação */}
      <div className="bg-gradient-to-br from-slate-900 via-indigo-950/40 to-slate-900 p-6 rounded-2xl border border-slate-800 shadow-xl relative overflow-hidden">
        <div className="flex flex-col lg:flex-row items-start lg:items-center justify-between gap-6">
          <div className="space-y-2 max-w-3xl">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 flex items-center gap-1.5">
                <BookOpen className="w-3.5 h-3.5 text-indigo-400" />
                Documentação & Engenharia de Dados
              </span>
              <span className="px-2.5 py-0.5 rounded-full text-[11px] font-bold font-mono uppercase bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                14 Schemas Meteor DDP
              </span>
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white tracking-tight">
              Guia Completo: Como Gerar e Preencher os Dados do PNBOX
            </h2>
            <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
              Aprenda como funciona a estrutura de dados das 14 ferramentas do Sebrae PNBOX, utilize o Gerador de Prompts de IA
              para criar planos customizados em segundos e importe seus próprios arquivos JSON para execução em lote.
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={handleDownloadDocMarkdown}
              className="flex items-center gap-2 px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-all shadow-sm cursor-pointer"
            >
              <Download className="w-4 h-4 text-indigo-400" />
              <span>Baixar Guia (.md)</span>
            </button>
          </div>
        </div>

        {/* Sub-Navegação */}
        <div className="flex items-center gap-2 mt-6 pt-4 border-t border-slate-800/80 flex-wrap text-xs">
          <button
            onClick={() => setActiveSubTab('gerador_mock')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'gerador_mock'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Cpu className="w-3.5 h-3.5 text-indigo-400" />
            <span>Gerador Mock (SchemaGenerator)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('gerador_ia')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'gerador_ia'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>Gerador de Prompts para IA</span>
          </button>

          <button
            onClick={() => setActiveSubTab('schemas_14')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'schemas_14'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <FileJson className="w-3.5 h-3.5 text-indigo-400" />
            <span>Catálogo de Schemas (14 Módulos)</span>
          </button>

          <button
            onClick={() => setActiveSubTab('importar_json')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'importar_json'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Upload className="w-3.5 h-3.5 text-emerald-400" />
            <span>Importar JSON Personalizado</span>
          </button>

          <button
            onClick={() => setActiveSubTab('passo_a_passo')}
            className={`px-3.5 py-2 rounded-xl font-semibold flex items-center gap-1.5 transition-all ${
              activeSubTab === 'passo_a_passo'
                ? 'bg-indigo-600 text-white shadow-md'
                : 'bg-slate-950/80 text-slate-400 hover:text-slate-200 border border-slate-800'
            }`}
          >
            <Lightbulb className="w-3.5 h-3.5 text-yellow-400" />
            <span>Manual Passo a Passo</span>
          </button>
        </div>
      </div>

      {/* 0. ABA: GERADOR MOCK NATIVO (SCHEMAGENERATOR) */}
      {activeSubTab === 'gerador_mock' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Card de Análise Estrutural do Schema */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Cpu className="w-4 h-4 text-indigo-400" />
                  SchemaGenerator: Módulo de Análise e Geração de Dados Sintéticos
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Analisa os schemas das 14 ferramentas PNBOX e sintetiza templates de dados corporativos randomizados, consistentes e 100% tipados.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <span className="px-2.5 py-1 rounded-full text-xs font-bold font-mono bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1.5">
                  <CheckCheck className="w-3.5 h-3.5" />
                  {mockValidationResult.valido ? '100% Conforme com Schemas DDP' : 'Avisos Detectados'}
                </span>
              </div>
            </div>

            {/* Métricas da Análise Estrutural */}
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-3 text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Ferramentas Mapeadas</span>
                <p className="text-lg font-bold text-white font-mono">{schemaAnalysis.totalFerramentas}</p>
                <span className="text-[10px] text-indigo-400 font-mono">5 Blocos Estratégicos</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Total de Campos</span>
                <p className="text-lg font-bold text-indigo-400 font-mono">{schemaAnalysis.totalCamposMapeados}</p>
                <span className="text-[10px] text-slate-400 font-mono">Atributos DDP</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Campos Obrigatórios</span>
                <p className="text-lg font-bold text-amber-400 font-mono">{schemaAnalysis.totalCamposObrigatorios}</p>
                <span className="text-[10px] text-emerald-400 font-mono">100% Preenchidos</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1">
                <span className="text-[11px] text-slate-400 font-mono">Campos Numéricos</span>
                <p className="text-lg font-bold text-teal-400 font-mono">{schemaAnalysis.totalCamposNumericos}</p>
                <span className="text-[10px] text-slate-400 font-mono">Custos & Quantidades</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 space-y-1 col-span-2 sm:col-span-1">
                <span className="text-[11px] text-slate-400 font-mono">Registros no Mock</span>
                <p className="text-lg font-bold text-emerald-400 font-mono">
                  {Object.values(generatedMockData).reduce((acc: number, curr: Record<string, unknown>[]) => acc + (Array.isArray(curr) ? curr.length : 0), 0)}
                </p>
                <span className="text-[10px] text-slate-400 font-mono">Em 14 Coleções</span>
              </div>
            </div>
          </div>

          {/* Configuração do Mock e Escolha de Arquétipo */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-indigo-400" />
                <h3 className="text-sm font-bold text-white">Parâmetros do Gerador de Negócios</h3>
              </div>
              <button
                onClick={() => {
                  const randomArch = SchemaGenerator.resolveArchetype('random');
                  setMockArchetype(randomArch.id);
                  const randomName = randomArch.sugestoesNomes[Math.floor(Math.random() * randomArch.sugestoesNomes.length)];
                  setMockCompanyName(randomName);
                  handleGenerateNewMock(randomArch.id);
                }}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-indigo-300 border border-indigo-500/30 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                <Dices className="w-3.5 h-3.5 text-indigo-400" />
                <span>Sortear Nicho & Nome Aleatório</span>
              </button>
            </div>

            {/* Grid de Arquétipos */}
            <div className="space-y-2">
              <label className="block text-xs font-semibold text-slate-300">
                1. Selecione o Arquétipo / Nicho de Mercado:
              </label>
              <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                {BUSINESS_ARCHETYPES.map((arch) => (
                  <button
                    key={arch.id}
                    type="button"
                    onClick={() => {
                      setMockArchetype(arch.id);
                      setMockCompanyName(arch.sugestoesNomes[0]);
                      handleGenerateNewMock(arch.id);
                    }}
                    className={`p-2.5 text-left rounded-xl border text-xs transition-all cursor-pointer ${
                      mockArchetype === arch.id
                        ? 'bg-indigo-600/20 text-indigo-200 border-indigo-500 font-bold shadow-sm'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800 hover:bg-slate-800'
                    }`}
                  >
                    <p className="font-semibold text-white truncate">{arch.nome.split('&')[0]}</p>
                    <span className="text-[10px] text-slate-400 truncate block mt-0.5">{arch.setor.split('/')[0]}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Campos de Nome e Variação */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="font-semibold text-slate-300">Nome da Empresa Mock:</label>
                  <button
                    type="button"
                    onClick={handleRandomizeCompany}
                    className="text-[11px] text-indigo-400 hover:text-indigo-300 flex items-center gap-1 font-mono cursor-pointer"
                  >
                    <RefreshCw className="w-3 h-3" />
                    <span>Outro Nome</span>
                  </button>
                </div>
                <input
                  type="text"
                  value={mockCompanyName}
                  onChange={(e) => setMockCompanyName(e.target.value)}
                  placeholder="Nome fantasia da empresa"
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs text-white focus:border-indigo-500 focus:outline-none"
                />
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">Itens por Ferramenta (Profundidade):</label>
                <div className="flex items-center gap-1.5">
                  {[1, 2, 3, 4].map((num) => (
                    <button
                      key={num}
                      type="button"
                      onClick={() => {
                        setMockItemsPerTool(num);
                        const fresh = SchemaGenerator.generateMockData({
                          idPlano,
                          archetype: mockArchetype,
                          companyName: mockCompanyName,
                          itemsPerTool: num,
                          randomVariance: mockVariance,
                          includeComplementaryTools: mockIncludeComplementary
                        });
                        setGeneratedMockData(fresh);
                      }}
                      className={`flex-1 py-2 rounded-xl font-mono text-xs border transition-all ${
                        mockItemsPerTool === num
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {num} {num === 1 ? 'item' : 'itens'}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <label className="font-semibold text-slate-300 block">Variação Financeira (Randomness):</label>
                <div className="flex items-center gap-1.5">
                  {[
                    { label: 'Exato (0%)', val: 0 },
                    { label: 'Leve (15%)', val: 0.15 },
                    { label: 'Médio (30%)', val: 0.3 }
                  ].map((v) => (
                    <button
                      key={v.val}
                      type="button"
                      onClick={() => {
                        setMockVariance(v.val);
                        const fresh = SchemaGenerator.generateMockData({
                          idPlano,
                          archetype: mockArchetype,
                          companyName: mockCompanyName,
                          itemsPerTool: mockItemsPerTool,
                          randomVariance: v.val,
                          includeComplementaryTools: mockIncludeComplementary
                        });
                        setGeneratedMockData(fresh);
                      }}
                      className={`flex-1 py-2 rounded-xl text-xs border transition-all ${
                        mockVariance === v.val
                          ? 'bg-indigo-600 text-white border-indigo-500 font-bold'
                          : 'bg-slate-950 text-slate-400 hover:text-slate-200 border-slate-800'
                      }`}
                    >
                      {v.label}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Ações do Gerador */}
            <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-slate-800">
              <div className="flex items-center gap-3 text-xs text-slate-400">
                <span className="flex items-center gap-1">
                  <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
                  ID do Plano Vinculado: <code className="text-slate-300 font-mono">{idPlano}</code>
                </span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleGenerateNewMock()}
                  className="flex items-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  <Wand2 className="w-4 h-4" />
                  <span>Regenerar Dados Mock</span>
                </button>
              </div>
            </div>
          </div>

          {/* Preview do JSON Mock Gerado & Ações */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Code2 className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-white">JSON Estruturado Gerado pelo SchemaGenerator</h3>
              </div>

              <div className="flex items-center gap-2 flex-wrap">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(JSON.stringify(generatedMockData, null, 2));
                    setCopiedMockJson(true);
                    setTimeout(() => setCopiedMockJson(false), 2000);
                  }}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  {copiedMockJson ? (
                    <>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />
                      <span className="text-emerald-400">Copiado!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-3.5 h-3.5 text-slate-400" />
                      <span>Copiar JSON</span>
                    </>
                  )}
                </button>

                <button
                  onClick={handleDownloadMockJson}
                  className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-950 hover:bg-slate-800 text-slate-200 border border-slate-800 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-indigo-400" />
                  <span>Baixar .json</span>
                </button>

                <button
                  onClick={handleApplyMockToQueue}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold transition-all shadow-md cursor-pointer"
                >
                  {appliedMockSuccess ? (
                    <>
                      <CheckCircle2 className="w-4 h-4" />
                      <span>Aplicado! Redirecionando...</span>
                    </>
                  ) : (
                    <>
                      <Zap className="w-4 h-4" />
                      <span>Aplicar na Fila em Lote (Batch Queue)</span>
                    </>
                  )}
                </button>
              </div>
            </div>

            {/* Badges das Coleções no Mock */}
            <div className="flex items-center gap-1.5 flex-wrap">
              {Object.keys(generatedMockData).map((colName) => {
                const count = generatedMockData[colName]?.length || 0;
                return (
                  <span
                    key={colName}
                    className="px-2.5 py-1 bg-slate-950 border border-slate-800 rounded-lg text-[11px] font-mono text-slate-300 flex items-center gap-1"
                  >
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400"></span>
                    <span className="text-slate-400">{colName}:</span>
                    <span className="font-bold text-white">{count}</span>
                  </span>
                );
              })}
            </div>

            {/* Visualizador de Código JSON */}
            <div className="relative">
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800/80 text-xs font-mono text-emerald-400/90 overflow-x-auto max-h-[420px] select-all leading-relaxed">
                {JSON.stringify(generatedMockData, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* 1. ABA: GERADOR DE PROMPTS PARA IA */}
      {activeSubTab === 'gerador_ia' && (
        <div className="space-y-6 animate-in fade-in">
          {/* Card de Configuração do Negócio */}
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  Gerador Automático de Prompt para ChatGPT / Gemini / Claude
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Preencha os dados da sua empresa abaixo para gerar o prompt mestre formatado com os 14 schemas oficiais do Sebrae.
                </p>
              </div>

              {/* Botões de presets rápidos */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[11px] text-slate-400 font-mono">Exemplos rápidos:</span>
                {PRESETS_NEGOCIOS.map((p, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setBusinessName(p.nome);
                      setBusinessSector(p.setor);
                      setBusinessDescription(p.desc);
                    }}
                    className="px-2 py-1 bg-slate-950 hover:bg-slate-800 text-[11px] text-slate-300 rounded-lg border border-slate-800 transition-colors"
                  >
                    {p.nome.split(' ')[0]}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Nome da Empresa / Empreendimento:</label>
                <input
                  type="text"
                  value={businessName}
                  onChange={(e) => setBusinessName(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex: Pizzaria Artesanal Napoletana"
                />
              </div>

              <div className="space-y-1.5">
                <label className="block text-slate-300 font-semibold">Setor / Ramo de Atuação:</label>
                <input
                  type="text"
                  value={businessSector}
                  onChange={(e) => setBusinessSector(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200 focus:border-indigo-500 focus:outline-none"
                  placeholder="Ex: Gastronomia e Alimentação Fora do Lar"
                />
              </div>

              <div className="sm:col-span-2 space-y-1.5">
                <label className="block text-slate-300 font-semibold">Descrição do Modelo de Negócio e Diferenciais:</label>
                <textarea
                  rows={2}
                  value={businessDescription}
                  onChange={(e) => setBusinessDescription(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-slate-200 focus:border-indigo-500 focus:outline-none leading-relaxed"
                  placeholder="Descreva o que a empresa faz, diferenciais, público-alvo e modelo de receita..."
                />
              </div>
            </div>
          </div>

          {/* Box de Exibição do Prompt Gerado */}
          <div className="bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden shadow-lg space-y-0">
            <div className="p-4 bg-slate-900 border-b border-slate-800 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal className="w-4 h-4 text-emerald-400" />
                <span className="text-xs font-bold text-slate-200 font-mono">
                  Prompt Mestre Formatado (Pronto para Colar no ChatGPT / Gemini)
                </span>
              </div>

              <button
                onClick={handleCopyPrompt}
                className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-bold shadow-sm transition-all cursor-pointer"
              >
                {copiedPrompt ? <Check className="w-3.5 h-3.5 text-emerald-300" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedPrompt ? 'Prompt Copiado!' : 'Copiar Prompt para IA'}</span>
              </button>
            </div>

            <div className="p-4 font-mono text-xs text-slate-300 max-h-96 overflow-y-auto whitespace-pre-wrap select-text leading-relaxed bg-slate-950/80">
              {promptTexto}
            </div>

            <div className="p-4 bg-slate-900/60 border-t border-slate-800 text-xs text-slate-400 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Após gerar o JSON na IA, vá para a aba <strong>"Importar JSON Personalizado"</strong> e cole o conteúdo.</span>
              </div>

              <button
                onClick={() => setActiveSubTab('importar_json')}
                className="flex items-center gap-1 text-indigo-400 hover:text-indigo-300 font-semibold"
              >
                <span>Ir para Importador</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* 2. ABA: CATÁLOGO DE SCHEMAS DAS 14 FERRAMENTAS */}
      {activeSubTab === 'schemas_14' && (
        <div className="space-y-4 animate-in fade-in">
          <div className="p-4 bg-slate-900 rounded-2xl border border-slate-800 text-xs text-slate-300 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <span>Consulte a estrutura de campos, tipos e exemplos de cada um dos 14 módulos do Sebrae PNBOX.</span>
            </div>
            <span className="font-mono text-slate-400">Total: 14 Coleções Mapeadas</span>
          </div>

          <div className="space-y-3">
            {ferramentas.map((tool, index) => {
              const isExpanded = expandedToolId === tool.id;

              return (
                <div
                  key={tool.id}
                  className={`rounded-2xl border transition-all ${
                    isExpanded ? 'bg-slate-900 border-indigo-500/50 shadow-md' : 'bg-slate-900/60 border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div
                    onClick={() => setExpandedToolId(isExpanded ? null : tool.id)}
                    className="p-4 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-3">
                      <span className="w-6 h-6 rounded-full bg-slate-950 border border-slate-800 font-mono text-[11px] font-bold text-slate-400 flex items-center justify-center">
                        {index + 1}
                      </span>
                      <div>
                        <div className="flex items-center gap-2">
                          <h4 className="text-sm font-bold text-white">{tool.nome}</h4>
                          <span className="px-2 py-0.5 text-[10px] font-mono rounded bg-slate-950 text-indigo-300 border border-slate-800">
                            {tool.collectionName}
                          </span>
                        </div>
                        <p className="text-xs text-slate-400 mt-0.5">{tool.descricao}</p>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono text-slate-500 hidden sm:inline">
                        {tool.camposSchema.length} campos
                      </span>
                      {isExpanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
                    </div>
                  </div>

                  {isExpanded && (
                    <div className="p-5 border-t border-slate-800/80 space-y-4 font-mono text-xs">
                      {/* Tabela de Campos */}
                      <div>
                        <h5 className="font-sans font-semibold text-slate-200 mb-2">Campos Aceitos no Schema:</h5>
                        <div className="overflow-x-auto">
                          <table className="w-full text-left border-collapse">
                            <thead>
                              <tr className="border-b border-slate-800 text-slate-400 text-[11px]">
                                <th className="py-2 px-3">Campo</th>
                                <th className="py-2 px-3">Tipo</th>
                                <th className="py-2 px-3">Obrigatoriedade</th>
                                <th className="py-2 px-3">Descrição</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-slate-800/60">
                              {tool.camposSchema.map((campo, cIdx) => (
                                <tr key={cIdx} className="hover:bg-slate-950/40">
                                  <td className="py-2 px-3 text-indigo-300 font-bold">{campo.nome}</td>
                                  <td className="py-2 px-3 text-slate-400">{campo.tipo}</td>
                                  <td className="py-2 px-3">
                                    {campo.obrigatorio ? (
                                      <span className="text-rose-400 font-semibold">Obrigatório</span>
                                    ) : (
                                      <span className="text-slate-500">Opcional</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-3 text-slate-300 font-sans">{campo.descricao}</td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      </div>

                      {/* Exemplo de Payload JSON com botão de cópia */}
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <h5 className="font-sans font-semibold text-slate-200">Exemplo de Payload Formatado:</h5>
                          <button
                            onClick={() => handleCopySchemaJson(tool)}
                            className="flex items-center gap-1.5 px-3 py-1 bg-slate-950 hover:bg-slate-800 text-slate-300 border border-slate-800 rounded-lg text-xs transition-colors"
                          >
                            {copiedSchemaId === tool.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                            <span>{copiedSchemaId === tool.id ? 'Copiado!' : 'Copiar JSON'}</span>
                          </button>
                        </div>
                        <pre className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-[11px] text-emerald-300 overflow-x-auto">
                          {JSON.stringify({ [tool.collectionName]: [tool.exemploPayload] }, null, 2)}
                        </pre>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* 3. ABA: IMPORTAR JSON PERSONALIZADO */}
      {activeSubTab === 'importar_json' && (
        <div className="space-y-6 animate-in fade-in">
          <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Upload className="w-4 h-4 text-emerald-400" />
                  Importador de Plano de Negócio Customizado (JSON)
                </h3>
                <p className="text-xs text-slate-400 mt-0.5">
                  Cole o JSON retornado pela inteligência artificial contendo as coleções das ferramentas.
                </p>
              </div>

              <button
                onClick={() => {
                  const demoObj: Record<string, unknown[]> = {};
                  ferramentas.forEach((f) => {
                    demoObj[f.collectionName] = [f.exemploPayload];
                  });
                  setCustomJsonInput(JSON.stringify(demoObj, null, 2));
                }}
                className="text-xs font-semibold text-indigo-400 hover:text-indigo-300 px-3 py-1.5 bg-slate-950 rounded-lg border border-slate-800 transition-colors"
              >
                Preencher Exemplo de 14 Ferramentas
              </button>
            </div>

            <textarea
              rows={12}
              value={customJsonInput}
              onChange={(e) => setCustomJsonInput(e.target.value)}
              placeholder='Cole aqui seu JSON: { "segmentacaoMercado": [...], "geradorPersonas": [...], ... }'
              className="w-full bg-slate-950 font-mono text-xs text-slate-200 border border-slate-800 rounded-xl p-4 focus:border-indigo-500 focus:outline-none leading-relaxed"
            />

            <div className="flex flex-wrap items-center justify-between gap-3 pt-2">
              <button
                onClick={handleValidarCustomJson}
                className="px-5 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700 rounded-xl text-xs font-semibold transition-colors cursor-pointer"
              >
                Validar Estrutura de Schemas
              </button>

              {validationResult && validationResult.valido && (
                <button
                  onClick={handleAplicarNaFila}
                  className="flex items-center gap-2 px-6 py-2.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white rounded-xl text-xs font-bold shadow-lg transition-all cursor-pointer"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{appliedSuccess ? 'Aplicado com Sucesso! Redirecionando...' : 'Aplicar Dados na Fila de Execução em Lote'}</span>
                </button>
              )}
            </div>
          </div>

          {/* Relatório de Validação dos Dados Importados */}
          {validationResult && (
            <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 font-mono text-xs">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <span className="font-bold text-slate-200">Relatório de Conformidade com o Schema:</span>
                <span className="text-emerald-400">
                  {validationResult.detalhes.filter((d) => d.status === 'ok').length}/14 ferramentas válidas
                </span>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {validationResult.detalhes.map((detalhe, idx) => (
                  <div
                    key={idx}
                    className={`p-2.5 rounded-xl border flex items-start gap-2 ${
                      detalhe.status === 'ok'
                        ? 'bg-slate-950/80 border-emerald-500/30 text-emerald-300'
                        : detalhe.status === 'aviso'
                        ? 'bg-slate-950/80 border-amber-500/30 text-amber-300'
                        : 'bg-slate-950/80 border-slate-800 text-slate-500'
                    }`}
                  >
                    {detalhe.status === 'ok' ? (
                      <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                    ) : detalhe.status === 'aviso' ? (
                      <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <HelpCircle className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                    )}
                    <div>
                      <div className="font-bold text-slate-200">{detalhe.nome} ({detalhe.collection})</div>
                      <div className="text-[11px] opacity-90">{detalhe.mensagem}</div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {/* 4. ABA: MANUAL PASSO A PASSO DE EXECUÇÃO */}
      {activeSubTab === 'passo_a_passo' && (
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 space-y-6 text-xs text-slate-300 animate-in fade-in leading-relaxed">
          <div>
            <h3 className="text-base font-bold text-white">Manual Operacional de Execução</h3>
            <p className="text-xs text-slate-400 mt-1">
              Siga os 5 passos abaixo para realizar preenchimentos em lote seguros e auditados no Sebrae PNBOX.
            </p>
          </div>

          <div className="space-y-4">
            {/* Passo 1 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                  1
                </span>
                <span>Obter e Conectar a Sessão no Sebrae PNBOX</span>
              </div>
              <p className="text-slate-300">
                Acesse a aba <strong>"Sessão Playwright"</strong> e verifique se o status está como <strong>Online</strong>. O sistema
                utiliza o token de login Meteor DDP para autorizar a gravação de dados no seu plano de negócio.
              </p>
            </div>

            {/* Passo 2 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                  2
                </span>
                <span>Gerar ou Selecionar os Dados do Negócio</span>
              </div>
              <p className="text-slate-300">
                Utilize um dos <strong>modelos de negócio pré-validados</strong> (Cafeteria, SaaS, Clínica, etc.) ou utilize o{' '}
                <strong>Gerador de Prompts de IA</strong> para criar um plano customizado para o seu nicho.
              </p>
            </div>

            {/* Passo 3 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                  3
                </span>
                <span>Configurar a Fila em Lote e Rate Limiting</span>
              </div>
              <p className="text-slate-300">
                Acesse a aba <strong>"Fila em Lote (Batch)"</strong>, defina o intervalo entre requisições (ex: 800ms a 1500ms para rate limiting seguro)
                e selecione as ferramentas desejadas ou deixe todas as 14 marcadas.
              </p>
            </div>

            {/* Passo 4 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                  4
                </span>
                <span>Disparar a Execução e Auditar no Relatório</span>
              </div>
              <p className="text-slate-300">
                Clique em <strong>"Executar Fila"</strong>. Acompanhe a barra de progresso em tempo real e o tempo de resposta do servidor Meteor.
                Ao final, consulte a <strong>Taxa de Sucesso (%)</strong>, registros salvos e identificadores de documento gerados.
              </p>
            </div>

            {/* Passo 5 */}
            <div className="p-4 bg-slate-950 rounded-2xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-sm text-indigo-400">
                <span className="w-6 h-6 rounded-full bg-indigo-950 border border-indigo-500/40 flex items-center justify-center text-xs">
                  5
                </span>
                <span>Verificar no Portal Oficial do Sebrae</span>
              </div>
              <p className="text-slate-300">
                Clique no link externo ou acesse diretamente <a href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${idPlano}`} target="_blank" rel="noopener noreferrer" className="text-indigo-400 underline">pnbox.sebrae.com.br</a> para ver todas as 14 ferramentas instantaneamente preenchidas e salvas na sua conta oficial.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
