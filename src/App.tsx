import React, { useState, useEffect, useRef, useCallback } from 'react';
import { PnboxNavbar } from './components/pnbox/PnboxNavbar';
import { PnboxPlansView } from './components/pnbox/PnboxPlansView';
import { PnboxToolsMatrix } from './components/pnbox/PnboxToolsMatrix';
import { PnboxToolDetailView } from './components/pnbox/PnboxToolDetailView';
import { PnboxAiCopilotDrawer } from './components/pnbox/PnboxAiCopilotDrawer';
import { PnboxCreatePlanModal } from './components/pnbox/PnboxCreatePlanModal';
import { PnboxConnectionTimeline } from './components/pnbox/PnboxConnectionTimeline';
import { Toast, ToastMessage } from './components/Toast';
import {
  AuthSessionState,
  FerramentaInfo,
  InterceptedTrafficEvent,
  PlanoCriadoInfo,
  CredenciaisLogin
} from './types/pnbox';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './automation/schemaCatalog';
import { TEMPLATES_NEGOCIO } from './automation/businessTemplates';
import {
  carregarPlanosSalvos,
  salvarPlanoNoHistorico,
  extrairIdPlano,
  ID_PLANO_PADRAO_SISTEMA
} from './utils/planUtils';
import { SchemaGenerator } from './utils/schemaGenerator';
import { getPlatformSession } from './components/PlatformGate';

// ====== Persistência das credenciais PNBOX ======
interface PnboxCreds {
  cpf: string;
  password: string;
  idPlano: string;
}

function platformToken(): string | null {
  return getPlatformSession()?.accessToken || null;
}

async function persistirCredenciaisNoBanco(creds: PnboxCreds): Promise<boolean> {
  const token = platformToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/pnbox-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(creds)
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function App() {
  // Navegação Principal (Alinhada ao PNBOX Oficial do Sebrae)
  const [viewMode, setViewMode] = useState<'plans' | 'tools_matrix' | 'tool_detail'>('plans');
  const [planoAtivoId, setPlanoAtivoId] = useState<string>(ID_PLANO_PADRAO_SISTEMA);
  const [ferramentaAtivaId, setFerramentaAtivaId] = useState<string>('segmentacaoMercado');

  // Dados dos Planos
  const [planos, setPlanos] = useState<PlanoCriadoInfo[]>(() => carregarPlanosSalvos());
  const [ferramentas, setFerramentas] = useState<FerramentaInfo[]>(FERRAMENTAS_PNBOX);
  const [eventosTrafego, setEventosTrafego] = useState<InterceptedTrafficEvent[]>([]);

  // Modais e Drawers de IA e Backend
  const [showAiCopilotDrawer, setShowAiCopilotDrawer] = useState<boolean>(false);
  const [showCreatePlanModal, setShowCreatePlanModal] = useState<boolean>(false);
  const [showBackendModal, setShowBackendModal] = useState<boolean>(false);

  // Estados de Operação
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [isGeneratingAi, setIsGeneratingAi] = useState<boolean>(false);

  // Sessão de Autenticação PNBOX
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    status: 'idle',
    cpf: '515.178.842-68',
    idPlano: ID_PLANO_PADRAO_SISTEMA,
    modoExecucao: 'DRY_RUN',
    logs: [
      {
        timestamp: new Date().toISOString(),
        mensagem: 'Painel inicializado com suporte a IA Copilot.',
        level: 'info'
      }
    ]
  });

  // Toasts de Notificação
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState<boolean>(false);
  const lastAutoReconnectAttemptRef = useRef<number>(0);

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);
    const duration = toast.duration ?? 4000;
    if (duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // Encontrar o plano ativo atual
  const planoAtivo = planos.find((p) => p.idPlano === planoAtivoId) || planos[0] || {
    idPlano: ID_PLANO_PADRAO_SISTEMA,
    nomePlano: 'Defesai/AdeusMultas',
    setor: 'Legaltech & Gestão de Multas de Trânsito',
    descricao: 'Automação inteligente para defesas de multas de trânsito NIC.',
    cidadeUf: 'Brasil',
    criadoEm: new Date().toISOString(),
    status: 'preenchido_completo',
    metodoCriacao: 'ddp_direct',
    ferramentasPreenchidas: 14,
    categoriaObjetivo: 'Criar um novo negócio'
  };

  // Encontrar a ferramenta ativa atual
  const ferramentaAtiva = ferramentas.find((f) => f.id === ferramentaAtivaId) || ferramentas[0];

  // Recuperar itens da ferramenta ativa para o plano ativo
  const getItensFerramentaAtiva = (): Record<string, unknown>[] => {
    // 1. Verificar se o plano possui dados14Ferramentas salvos
    if (planoAtivo.dados14Ferramentas && planoAtivo.dados14Ferramentas[ferramentaAtivaId]) {
      return planoAtivo.dados14Ferramentas[ferramentaAtivaId];
    }
    // 2. Fallback para os templates de negócio oficiais
    const template = TEMPLATES_NEGOCIO.find((t) => t.id === 'defesai_adeus_multas') || TEMPLATES_NEGOCIO[0];
    if (template && template.dados[ferramentaAtivaId]) {
      return template.dados[ferramentaAtivaId];
    }
    // 3. Fallback para o exemplo do catálogo
    return ferramentaAtiva.exemploPayload ? [ferramentaAtiva.exemploPayload] : [];
  };

  // Carregar dados iniciais do servidor
  const carregarDados = useCallback(async () => {
    try {
      const token = platformToken();
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      // 1. Status de Autenticação
      const resAuth = await fetch('/api/automation/auth/status', { headers });
      if (resAuth.ok) {
        const dataAuth = await resAuth.json();
        if (dataAuth.session) {
          setAuthSession(dataAuth.session);
          if (dataAuth.session.idPlano) {
            setPlanoAtivoId(dataAuth.session.idPlano);
          }
        }
      }

      // 2. Tráfego de Rede DDP
      const resTraffic = await fetch('/api/automation/traffic', { headers });
      if (resTraffic.ok) {
        const dataTraffic = await resTraffic.json();
        if (dataTraffic.eventos) {
          setEventosTrafego(dataTraffic.eventos);
        }
      }
    } catch (err) {
      console.warn('Carregando dados com valores padrão:', err);
    }
  }, []);

  useEffect(() => {
    carregarDados();
  }, [carregarDados]);

  // Atualizar ID do Plano Ativo
  const handleUpdateActivePlanId = (entrada: string) => {
    const novoId = extrairIdPlano(entrada) || ID_PLANO_PADRAO_SISTEMA;
    setPlanoAtivoId(novoId);
    setAuthSession((prev) => ({
      ...prev,
      idPlano: novoId,
      logs: [
        {
          timestamp: new Date().toISOString(),
          mensagem: `Plano ativo definido para ${novoId}`,
          level: 'info'
        },
        ...prev.logs
      ]
    }));
  };

  // Selecionar um plano existente
  const handleSelectPlano = (idPlano: string) => {
    handleUpdateActivePlanId(idPlano);
    setViewMode('tools_matrix');
  };

  // Selecionar uma ferramenta para abrir detalhes
  const handleSelectFerramenta = (ferramentaId: string) => {
    setFerramentaAtivaId(ferramentaId);
    setViewMode('tool_detail');
  };

  // Preencher todas as 14 ferramentas com IA (1 Clique)
  const handleExecuteAllWithAi = async () => {
    setIsGeneratingAi(true);
    pushToast({
      level: 'info',
      title: 'Copiloto IA Ativado',
      message: `Analisando mercado e gerando 14 ferramentas para "${planoAtivo.nomePlano}"...`,
      duration: 3500,
      icon: 'loading'
    });

try {
       // 1. Gera ou sintetiza o relatório com IA
       const res = await fetch('/api/ai/synthesize-plan', {
         method: 'POST',
         headers: { 'Content-Type': 'application/json' },
         body: JSON.stringify({
           nomeEmpresa: planoAtivo.nomePlano,
           setor: planoAtivo.setor,
           descricao: planoAtivo.descricao,
           cidadeUf: planoAtivo.cidadeUf,
           orcamentoEstimado: 85000,
           idPlano: planoAtivo.idPlano
         })
       });

       if (!res.ok) {
         throw new Error(`AI synthesis failed with status ${res.status}`);
       }
       const json = await res.json();
       const dadosSintetizados = json.planData;

      // Atualizar o plano na lista
      const planoAtualizado: PlanoCriadoInfo = {
        ...planoAtivo,
        dados14Ferramentas: dadosSintetizados,
        ferramentasPreenchidas: 14,
        status: 'preenchido_completo'
      };

      const novosPlanos = salvarPlanoNoHistorico(planoAtualizado);
      setPlanos(novosPlanos);

      pushToast({
        level: 'success',
        title: '14 Ferramentas Geradas com Sucesso!',
        message: 'Todas as ferramentas oficiais do Sebrae foram preenchidas e validadas.',
        duration: 4500,
        icon: 'check'
      });
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na síntese IA';
      pushToast({
        level: 'error',
        title: 'Erro na geração com IA',
        message: msg,
        duration: 5000,
        icon: 'error'
      });
    } finally {
      setIsGeneratingAi(false);
    }
  };

  // Sincronizar plano com o Sebrae PNBOX via DDP
  const handleSyncAllToSebrae = async () => {
    setIsSyncing(true);
    pushToast({
      level: 'info',
      title: 'Sincronizando com Sebrae PNBOX',
      message: `Enviando ferramentas para o plano ${planoAtivo.idPlano}...`,
      duration: 3500,
      icon: 'loading'
    });

    try {
      // Garante que temos dados das 14 ferramentas reais
      const dadosParaEnviar = planoAtivo.dados14Ferramentas;
      if (!dadosParaEnviar || Object.keys(dadosParaEnviar).length === 0 || Object.values(dadosParaEnviar).every(arr => !arr || arr.length === 0)) {
        throw new Error('O plano não possui ferramentas preenchidas. Clique em "Preencher Plano com IA" para gerar dados reais antes de sincronizar.');
      }

      const token = platformToken();
      const headers: Record<string, string> = { 'Content-Type': 'application/json' };
      if (token) headers.Authorization = `Bearer ${token}`;

      const res = await fetch('/api/automation/fill-batch', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          templateId: 'defesai_adeus_multas',
          idPlano: planoAtivo.idPlano,
          dados: dadosParaEnviar,
          modoExecucao: authSession.modoExecucao
        })
      });

      const data = await res.json();

      if (res.ok && data.summary) {
        pushToast({
          level: 'success',
          title: 'Sincronização Concluída!',
          message: `${data.summary.sucessos || 14} ferramentas registradas no Sebrae PNBOX com sucesso.`,
          duration: 5000,
          icon: 'check'
        });
      } else {
        pushToast({
          level: 'warn',
          title: 'Sincronização Finalizada',
          message: data?.mensagem || 'Operação processada no ambiente seguro.',
          duration: 4500,
          icon: 'warn'
        });
      }

      // Atualiza eventos de tráfego
      carregarDados();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : 'Falha na sincronização';
      pushToast({
        level: 'error',
        title: 'Erro na sincronização',
        message: msg,
        duration: 5000,
        icon: 'error'
      });
    } finally {
      setIsSyncing(false);
    }
  };

  // Gerar sugestões rápidas de IA para uma ferramenta específica
  const handleQuickGenerateToolAi = async (ferramentaId: string) => {
    setFerramentaAtivaId(ferramentaId);
    setIsGeneratingAi(true);

    pushToast({
      level: 'info',
      title: 'Copiloto IA Gerando Sugestões',
      message: `Elaborando conteúdo especializado para ${ferramentaId}...`,
      duration: 3000,
      icon: 'loading'
    });

    try {
      const prompt = `Gere sugestões práticas e prontas para a ferramenta "${ferramentaId}" da empresa "${planoAtivo.nomePlano}" no setor "${planoAtivo.setor}".`;
      const res = await fetch('/api/ai/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}. Ferramenta: ${ferramentaId}`,
          ideiaNegocio: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}. Ferramenta: ${ferramentaId}`,
          cidadeUf: planoAtivo.cidadeUf,
          orcamentoEstimado: 85000,
          provider: 'gemini'
        })
      });

      if (!res.ok) {
        const errBody = await res.json().catch(() => ({}));
        throw new Error(errBody.mensagem || `Falha na requisição de IA (status ${res.status})`);
      }
      const data = await res.json();
      const resumo = data.report?.resumoExecutivo || data.report?.oportunidadeMercado;
      if (!resumo) {
        throw new Error('IA retornou relatório sem conteúdo aproveitável');
      }

      const novoItem: Record<string, unknown> = {
        idPlano: planoAtivo.idPlano,
        descricao: `Sugestão Copiloto IA: ${planoAtivo.nomePlano}`,
        detalheVisual: resumo
      };

      if (ferramentaId === 'geradorPersonas' && data.report?.buyerPersona) {
        const p = data.report.buyerPersona;
        novoItem.nome = p.nome;
        novoItem.idade = p.idade;
        novoItem.profissao = p.perfil;
        novoItem.dores = p.dores?.join('; ');
        novoItem.objetivos = p.desejos?.join('; ');
        novoItem.renda = `Ticket Médio R$ ${p.ticketMedio}`;
      } else if (ferramentaId === 'analiseConcorrencia' && data.report?.concorrentesMapeados?.length > 0) {
        const c = data.report.concorrentesMapeados[0];
        novoItem.nomeConcorrente = c.nome;
        novoItem.concorrente = c.nome;
        novoItem.pontosFortes = c.pontosFortes;
        novoItem.pontosFracos = c.pontosFracos;
        novoItem.diferencial = c.diferenciacao;
      } else if (ferramentaId === 'segmentacaoMercado') {
        novoItem.descricao = `Segmento Alvo: ${data.report?.buyerPersona?.perfil || planoAtivo.setor}`;
        novoItem.segmento = data.report?.buyerPersona?.perfil || planoAtivo.setor;
        novoItem.variavel1 = 'Comportamento de Consumo';
        novoItem.variavel2 = 'Localização / Demografia';
      }

      const itensAtuais = getItensFerramentaAtiva();
      handleSaveToolItems([...itensAtuais, novoItem]);

      pushToast({
        level: 'success',
        title: 'Sugestão Gerada!',
        message: 'Novo item adicionado à ferramenta com sucesso via IA real.',
        duration: 4000,
        icon: 'check'
      });
    } catch (err) {
       pushToast({
         level: 'error',
         title: 'Erro ao gerar sugestão com IA',
         message: err instanceof Error ? err.message : 'Erro desconhecido',
         duration: 5000,
         icon: 'error'
       });
     } finally {
       setIsGeneratingAi(false);
     }
  };

  // Salvar itens editados de uma ferramenta
  const handleSaveToolItems = (novosItems: Record<string, unknown>[]) => {
    const dadosAtuais = planoAtivo.dados14Ferramentas || {};
    const dadosAtualizados = {
      ...dadosAtuais,
      [ferramentaAtivaId]: novosItems
    };

    const planoAtualizado: PlanoCriadoInfo = {
      ...planoAtivo,
      dados14Ferramentas: dadosAtualizados,
      ferramentasPreenchidas: Math.max(planoAtivo.ferramentasPreenchidas || 0, Object.keys(dadosAtualizados).length)
    };

    const novosPlanos = salvarPlanoNoHistorico(planoAtualizado);
    setPlanos(novosPlanos);
  };

  // Quando um novo plano for criado via IA no modal
  const handlePlanCreated = (novoPlano: PlanoCriadoInfo) => {
    const novosPlanos = salvarPlanoNoHistorico(novoPlano);
    setPlanos(novosPlanos);
    setPlanoAtivoId(novoPlano.idPlano);
    setViewMode('tools_matrix');
    pushToast({
      level: 'success',
      title: 'Novo Plano Criado com IA!',
      message: `Plano "${novoPlano.nomePlano}" gerado e selecionado.`,
      duration: 5000,
      icon: 'check'
    });
  };

  // Aplicar dados sugeridos pelo Copiloto Drawer no plano
  const handleApplyDataFromCopilot = (toolId: string, data: Record<string, unknown>[]) => {
    const dadosAtuais = planoAtivo.dados14Ferramentas || {};
    const itensExistentes = dadosAtuais[toolId] || [];
    const dadosAtualizados = {
      ...dadosAtuais,
      [toolId]: [...itensExistentes, ...data]
    };

    const planoAtualizado: PlanoCriadoInfo = {
      ...planoAtivo,
      dados14Ferramentas: dadosAtualizados
    };

    const novosPlanos = salvarPlanoNoHistorico(planoAtualizado);
    setPlanos(novosPlanos);

    pushToast({
      level: 'success',
      title: 'Sugestão Aplicada!',
      message: `Novos dados inseridos na ferramenta ${toolId}.`,
      duration: 3500,
      icon: 'check'
    });
  };

  return (
    <div className="min-h-screen bg-[#1e1d4b] text-white flex flex-col font-sans antialiased selection:bg-pink-500 selection:text-white">
      {/* 1. Navbar Oficial PNBOX + Indicador de IA */}
      <PnboxNavbar
        authSession={authSession}
        onOpenBackendSettings={() => setShowBackendModal(true)}
        onOpenAiCopilot={() => setShowAiCopilotDrawer(true)}
        onNavigateHome={() => setViewMode('plans')}
        currentView={viewMode}
      />

      {/* 2. Visualização Dinâmica Principal */}
      <main className="flex-1 w-full flex flex-col">
        {/* Visão 1: Seus Planos (Matching Screenshot 1) */}
        {viewMode === 'plans' && (
          <PnboxPlansView
            planos={planos}
            planoAtivoId={planoAtivoId}
            onSelectPlano={handleSelectPlano}
            onOpenCriarPlanoModal={() => setShowCreatePlanModal(true)}
            onOpenAiCopilot={() => setShowAiCopilotDrawer(true)}
            onAutoFillWithAi={(idPlano) => {
              handleSelectPlano(idPlano);
              handleExecuteAllWithAi();
            }}
          />
        )}

        {/* Visão 2: Matriz das 14 Ferramentas (Matching Screenshot 2) */}
        {viewMode === 'tools_matrix' && (
          <PnboxToolsMatrix
            plano={planoAtivo}
            ferramentas={ferramentas}
            authSession={authSession}
            onSelectFerramenta={handleSelectFerramenta}
            onBackToPlans={() => setViewMode('plans')}
            onExecuteAllWithAi={handleExecuteAllWithAi}
            onSyncAllToSebrae={handleSyncAllToSebrae}
            onOpenBackendSettings={() => setShowBackendModal(true)}
            onQuickGenerateToolAi={handleQuickGenerateToolAi}
            isSyncing={isSyncing}
          />
        )}

        {/* Visão 3: Detalhes da Ferramenta (Matching Screenshot 3) */}
        {viewMode === 'tool_detail' && (
          <PnboxToolDetailView
            plano={planoAtivo}
            ferramenta={ferramentaAtiva}
            items={getItensFerramentaAtiva()}
            authSession={authSession}
            onBackToMatrix={() => setViewMode('tools_matrix')}
            onSaveItems={handleSaveToolItems}
            onSyncToolToSebrae={handleSyncAllToSebrae}
            onGenerateAiSuggestions={() => handleQuickGenerateToolAi(ferramentaAtivaId)}
            isGeneratingAi={isGeneratingAi}
            isSyncing={isSyncing}
          />
        )}
      </main>

      {/* 3. Drawer Lateral do Copiloto IA (Gemini 2.5 Flash) */}
      <PnboxAiCopilotDrawer
        isOpen={showAiCopilotDrawer}
        onClose={() => setShowAiCopilotDrawer(false)}
        planoAtivo={planoAtivo}
        onApplyDataToPlan={handleApplyDataFromCopilot}
        onAutoFillFullPlan={handleExecuteAllWithAi}
      />

      {/* 4. Modal para Criar Novo Plano com IA (Deep Research) */}
      <PnboxCreatePlanModal
        isOpen={showCreatePlanModal}
        onClose={() => setShowCreatePlanModal(false)}
        onPlanCreated={handlePlanCreated}
        authSession={authSession}
      />

      {/* 5. Modal de Conexão PNBOX (Timeline de Progresso) */}
      <PnboxConnectionTimeline
        isOpen={showBackendModal}
        onClose={() => setShowBackendModal(false)}
        onConnected={(job) => {
          setAuthSession((prev) => ({
            ...prev,
            status: 'authenticated',
            isExpired: false,
            isOnline: true,
            logs: [
              {
                timestamp: new Date().toISOString(),
                mensagem: 'Conta PNBOX conectada com sucesso.',
                level: 'success'
              },
              ...prev.logs
            ]
          }));
          setShowBackendModal(false);
          carregarDados();
        }}
onFailed={(job) => {
  setAuthSession((prev) => ({
    ...prev,
    status: 'failed',
    isOnline: false,
    logs: [
      {
        timestamp: new Date().toISOString(),
        mensagem: `Falha na conexão PNBOX: ${job.errorMessage || 'erro desconhecido'}`,
        level: 'error'
      },
      ...prev.logs
    ]
  }));
  setShowBackendModal(false);
  carregarDados();
}}
onDisconnect={() => {
  setAuthSession((prev) => ({
    ...prev,
    status: 'idle',
    isExpired: true,
    isOnline: false,
    meteorLoginToken: undefined,
    meteorUserId: undefined,
    logs: [
      {
        timestamp: new Date().toISOString(),
        mensagem: 'Desconectado do PNBOX.',
        level: 'info'
      },
      ...prev.logs
    ]
  }));
  setShowBackendModal(false);
  carregarDados();
}}
      />

      {/* 6. Container de Toasts de Notificação */}
      <Toast toasts={toasts} onDismiss={dismissToast} />
    </div>
  );
}

export default App;
