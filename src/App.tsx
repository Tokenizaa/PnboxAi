import React, { useState, useEffect } from 'react';
import { Header } from './components/Header';
import { OfficialFillerPanel } from './components/OfficialFillerPanel';
import { BatchProcessingQueue } from './components/BatchProcessingQueue';
import { DocumentationGuide } from './components/DocumentationGuide';
import { TechnicalMapTable } from './components/TechnicalMapTable';
import { TrafficMonitorPanel } from './components/TrafficMonitorPanel';
import { JsonDiffValidator } from './components/JsonDiffValidator';
import { AuthSessionCard } from './components/AuthSessionCard';
import { DirectExecutionModal } from './components/DirectExecutionModal';
import { AiPlanCreatorStudio } from './components/AiPlanCreatorStudio';
import { PlanSwitcherModal } from './components/PlanSwitcherModal';
import {
  AuthSessionState,
  FerramentaInfo,
  InterceptedTrafficEvent
} from './types/pnbox';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './automation/schemaCatalog';
import { CREDENCIAIS_PADRAO } from './automation/auth';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './automation/businessTemplates';
import { salvarPlanoNoHistorico } from './utils/planUtils';
import { Building2, Edit3, ExternalLink, Plus, Sparkles, CheckCircle2 } from 'lucide-react';

export function App() {
  const [activeTab, setActiveTab] = useState<string>('criar_plano_ia');
  const [ferramentas, setFerramentas] = useState<FerramentaInfo[]>(FERRAMENTAS_PNBOX);
  const [templates, setTemplates] = useState<BusinessTemplate[]>(TEMPLATES_NEGOCIO);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('cafeteria_coworking');
  const [customData, setCustomData] = useState<Record<string, Record<string, unknown>[]> | undefined>(undefined);
  const [eventosTrafego, setEventosTrafego] = useState<InterceptedTrafficEvent[]>([]);
  const [showGlobalPlanModal, setShowGlobalPlanModal] = useState<boolean>(false);
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    status: 'authenticated',
    cpf: CREDENCIAIS_PADRAO.cpf,
    idPlano: ID_PLANO_PADRAO,
    meteorLoginToken: 'pnbox_session_live_ddp_token',
    meteorUserId: 'usr_sebrae_pnbox_official',
    autenticadoEm: new Date().toISOString(),
    logs: [
      {
        timestamp: new Date().toISOString(),
        mensagem: 'Painel e sessão inicializados para automação do Sebrae PNBOX.',
        level: 'success'
      }
    ]
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [ferramentaParaValidar, setFerramentaParaValidar] = useState<FerramentaInfo | undefined>(undefined);
  const [jsonParaValidar, setJsonParaValidar] = useState<unknown | undefined>(undefined);
  const [ferramentaParaExecutar, setFerramentaParaExecutar] = useState<FerramentaInfo | null>(null);

  const handleUpdateActivePlanId = (novoId: string) => {
    setAuthSession((prev) => ({
      ...prev,
      idPlano: novoId,
      logs: [
        {
          timestamp: new Date().toISOString(),
          mensagem: `Plano de negócio ativo alterado para ${novoId}`,
          level: 'success'
        },
        ...prev.logs
      ]
    }));

    salvarPlanoNoHistorico({
      idPlano: novoId,
      nomePlano: `Plano ${novoId.substring(0, 8)}...`,
      setor: 'Geral',
      descricao: `Plano de negócio ativo no PNBOX Hub (${novoId})`,
      cidadeUf: 'Brasil',
      criadoEm: new Date().toISOString(),
      status: 'criado_pnbox_ddp',
      metodoCriacao: 'ddp_direct',
      ferramentasPreenchidas: 0
    });
  };

  const handleApplyDataToQueue = (dados: Record<string, Record<string, unknown>[]>, idPlano: string) => {
    setCustomData(dados);
    handleUpdateActivePlanId(idPlano);
    setActiveTab('fila_lote');
  };

  // Carregar dados iniciais do servidor
  const carregarDados = async () => {
    try {
      // 1. Catálogo de Ferramentas
      const resCat = await fetch('/api/automation/catalog');
      if (resCat.ok) {
        const dataCat = await resCat.json();
        if (dataCat.ferramentas) {
          setFerramentas(dataCat.ferramentas);
        }
      }

      // 2. Status de Autenticação
      const resAuth = await fetch('/api/automation/auth/status');
      if (resAuth.ok) {
        const dataAuth = await resAuth.json();
        if (dataAuth.session) {
          setAuthSession(dataAuth.session);
        }
      }

      // 3. Tráfego de Rede
      const resTraffic = await fetch('/api/automation/traffic');
      if (resTraffic.ok) {
        const dataTraffic = await resTraffic.json();
        if (dataTraffic.eventos) {
          setEventosTrafego(dataTraffic.eventos);
        }
      }
    } catch (err) {
      console.warn('Carregando dados com valores padrão em memória:', err);
    }
  };

  useEffect(() => {
    carregarDados();
  }, []);

  const handleLogin = async (cred: { cpf: string; password: string; idPlano: string }) => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/automation/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      const data = await res.json();
      if (data.session) {
        setAuthSession(data.session);
      }
      // Atualizar lista de tráfego
      const resTraffic = await fetch('/api/automation/traffic');
      if (resTraffic.ok) {
        const dataTraffic = await resTraffic.json();
        setEventosTrafego(dataTraffic.eventos || []);
      }
    } catch (err: any) {
      alert(`Erro na autenticação: ${err.message}`);
    } finally {
      setIsLoadingAuth(false);
    }
  };

  const handleLimparTrafego = async () => {
    try {
      await fetch('/api/automation/traffic/clear', { method: 'POST' });
      setEventosTrafego([]);
    } catch (err: any) {
      alert(`Erro ao limpar tráfego: ${err.message}`);
    }
  };

  const handleRecarregarTrafego = async () => {
    try {
      const res = await fetch('/api/automation/traffic');
      const data = await res.json();
      setEventosTrafego(data.eventos || []);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSelectFerramentaForValidation = (ferramenta: FerramentaInfo) => {
    setFerramentaParaValidar(ferramenta);
    setJsonParaValidar(ferramenta.exemploPayload);
    setActiveTab('validador');
  };

  const handleSendJsonToValidator = (json: unknown, ferramentaId?: string) => {
    if (ferramentaId) {
      const found = ferramentas.find((f) => f.id === ferramentaId);
      if (found) setFerramentaParaValidar(found);
    }
    setJsonParaValidar(json);
    setActiveTab('validador');
  };

  const handleSelectFerramentaForExecution = (ferramenta: FerramentaInfo) => {
    setFerramentaParaExecutar(ferramenta);
  };

  const handleDirectExecutionSuccess = () => {
    handleRecarregarTrafego();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans antialiased">
      {/* Cabeçalho de Navegação e Status */}
      <Header
        authSession={authSession}
        onRefreshAuth={carregarDados}
        onOpenAuthModal={() => setActiveTab('autenticacao')}
        onUpdateActivePlanId={handleUpdateActivePlanId}
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        trafficCount={eventosTrafego.length}
      />

      {/* Conteúdo Principal */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {/* Banner de Estratégia de Automação & Seletor de Plano Ativo */}
        <div className="bg-gradient-to-r from-slate-900 via-indigo-950/40 to-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping"></span>
                Execução no PNBOX Oficial do Sebrae
              </span>
              <span className="px-2 py-0.5 text-[10px] font-semibold bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full">
                Compatível com Qualquer Plano
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2 pt-1">
              <h2 className="text-base font-bold text-white">
                Preenchimento Direto das 14 Ferramentas no Plano:
              </h2>
              <button
                onClick={() => setShowGlobalPlanModal(true)}
                className="flex items-center gap-1.5 px-3 py-1 bg-indigo-950/90 hover:bg-indigo-900 text-indigo-200 border border-indigo-500/50 rounded-xl font-mono text-xs font-bold transition-all shadow-sm cursor-pointer group"
                title="Clique para trocar para outro plano ou colar qualquer URL do Sebrae"
              >
                <Building2 className="w-3.5 h-3.5 text-indigo-400 group-hover:scale-110 transition-transform" />
                <span>{authSession.idPlano}</span>
                <Edit3 className="w-3 h-3 text-indigo-300 ml-1" />
              </button>

              <button
                onClick={() => setShowGlobalPlanModal(true)}
                className="flex items-center gap-1 px-2.5 py-1 bg-slate-900 hover:bg-slate-800 text-slate-300 hover:text-white rounded-xl border border-slate-700 text-xs transition-colors cursor-pointer"
              >
                <Plus className="w-3 h-3 text-emerald-400" />
                <span>Colar outro ID/URL</span>
              </button>

              <a
                href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${authSession.idPlano}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-1 px-2.5 py-1 bg-indigo-600/20 hover:bg-indigo-600/30 text-indigo-300 rounded-xl border border-indigo-500/30 text-xs transition-colors"
                title="Abrir página deste plano no Sebrae PNBOX"
              >
                <span>Acessar no Sebrae</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>

            <p className="text-xs text-slate-400 mt-1 max-w-3xl">
              Você pode alternar para qualquer plano existente na sua conta Sebrae, colar o link de um plano ou criar um novo plano automaticamente via IA.
            </p>
          </div>

          <div className="flex items-center gap-2 font-mono text-xs text-slate-400 shrink-0">
            <span className="px-2.5 py-1 bg-slate-900 rounded-lg border border-slate-800 text-emerald-300 font-bold">
              14/14 Ferramentas Prontas
            </span>
          </div>
        </div>

        {/* Renderização Condicional de Abas */}
        {activeTab === 'criar_plano_ia' && (
          <AiPlanCreatorStudio
            authSession={authSession}
            onUpdateActivePlanId={handleUpdateActivePlanId}
            onApplyDataToQueue={handleApplyDataToQueue}
            onNavigateTab={setActiveTab}
            onRefreshTraffic={handleRecarregarTrafego}
          />
        )}

        {activeTab === 'preenchedor' && (
          <OfficialFillerPanel
            ferramentas={ferramentas}
            authSession={authSession}
            onRefreshTraffic={handleRecarregarTrafego}
            onOpenAuthModal={() => setActiveTab('autenticacao')}
            onUpdateActivePlanId={handleUpdateActivePlanId}
            onNavigateTab={setActiveTab}
          />
        )}

        {activeTab === 'fila_lote' && (
          <BatchProcessingQueue
            ferramentas={ferramentas}
            authSession={authSession}
            templates={templates}
            selectedTemplateId={selectedTemplateId}
            onSelectTemplateId={setSelectedTemplateId}
            onRefreshTraffic={handleRecarregarTrafego}
            onOpenAuthModal={() => setActiveTab('autenticacao')}
            onUpdateActivePlanId={handleUpdateActivePlanId}
            onNavigateTab={setActiveTab}
            customData={customData}
          />
        )}

        {activeTab === 'guia_dados' && (
          <DocumentationGuide
            ferramentas={ferramentas}
            idPlano={authSession.idPlano}
            onApplyCustomDataToQueue={(data) => {
              setCustomData(data);
            }}
            onNavigateToQueue={() => setActiveTab('fila_lote')}
          />
        )}

        {activeTab === 'mapa' && (
          <TechnicalMapTable
            ferramentas={ferramentas}
            onSelectFerramentaForValidation={handleSelectFerramentaForValidation}
            onSelectFerramentaForExecution={handleSelectFerramentaForExecution}
          />
        )}

        {activeTab === 'trafego' && (
          <TrafficMonitorPanel
            eventos={eventosTrafego}
            ferramentas={ferramentas}
            onLimparTrafego={handleLimparTrafego}
            onRecarregarTrafego={handleRecarregarTrafego}
            onSendToValidator={handleSendJsonToValidator}
          />
        )}

        {activeTab === 'validador' && (
          <JsonDiffValidator
            ferramentas={ferramentas}
            ferramentaSelecionada={ferramentaParaValidar}
            jsonInicial={jsonParaValidar}
            onExecuteDirect={(ferramentaId, payload) => {
              const f = ferramentas.find((item) => item.id === ferramentaId);
              if (f) {
                setFerramentaParaExecutar(f);
              }
            }}
          />
        )}

        {activeTab === 'autenticacao' && (
          <AuthSessionCard
            authSession={authSession}
            onLogin={handleLogin}
            isLoading={isLoadingAuth}
            trafficEvents={eventosTrafego}
            onRefreshTraffic={handleRecarregarTrafego}
          />
        )}
      </main>

      {/* Modal de Execução Direta */}
      {ferramentaParaExecutar && (
        <DirectExecutionModal
          ferramenta={ferramentaParaExecutar}
          idPlano={authSession.idPlano}
          onClose={() => setFerramentaParaExecutar(null)}
          onSuccess={handleDirectExecutionSuccess}
        />
      )}

      {/* Modal Global de Seleção / Alteração de Plano */}
      <PlanSwitcherModal
        isOpen={showGlobalPlanModal}
        onClose={() => setShowGlobalPlanModal(false)}
        activePlanId={authSession.idPlano}
        onSelectPlanId={(novoId) => {
          handleUpdateActivePlanId(novoId);
          setShowGlobalPlanModal(false);
        }}
        onNavigateTab={setActiveTab}
      />

      {/* Rodapé */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        Sebrae PNBOX Oficial • Engenharia Reversa, Validação de Schema & Preenchimento Automatizado • Plano: {authSession.idPlano}
      </footer>
    </div>
  );
}

export default App;
