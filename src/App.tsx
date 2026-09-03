import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from './components/Header';
import { AppSidebar } from './components/layout/AppSidebar';
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
import { Toast, ToastMessage } from './components/Toast';
import {
  AuthSessionState,
  FerramentaInfo,
  InterceptedTrafficEvent
} from './types/pnbox';
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './automation/schemaCatalog';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from './automation/businessTemplates';
import { salvarPlanoNoHistorico } from './utils/planUtils';
import { Building2, Edit3, ExternalLink, Plus, Sparkles, CheckCircle2 } from 'lucide-react';
import { getPlatformSession } from './components/PlatformGate';

// ====== Persistência das credenciais PNBOX ======
// As credenciais PNBOX ficam NO BANCO (Supabase), atreladas ao usuário da
// plataforma logado. O frontend nuca guarda a senha em localStorage.
interface PnboxCreds {
  cpf: string;
  password: string;
  idPlano: string;
}

// Token da plataforma (Supabase) para chamadas autenticadas ao banco.
function platformToken(): string | null {
  return getPlatformSession()?.accessToken || null;
}

// Salva as credenciais PNBOX do usuário logado no banco.
async function persistirCredenciaisNoBanco(creds: PnboxCreds): Promise<boolean> {
  const token = platformToken();
  if (!token) return false;
  try {
    const res = await fetch('/api/auth/pnbox-credentials', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify(creds),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export function App() {
  const [activeTab, setActiveTab] = useState<string>('criar_plano_ia');
  const [sidebarOpen, setSidebarOpen] = useState<boolean>(false);
  const [ferramentas, setFerramentas] = useState<FerramentaInfo[]>(FERRAMENTAS_PNBOX);
  const [templates, setTemplates] = useState<BusinessTemplate[]>(TEMPLATES_NEGOCIO);
  const [selectedTemplateId, setSelectedTemplateId] = useState<string>('cafeteria_coworking');
  const [customData, setCustomData] = useState<Record<string, Record<string, unknown>[]> | undefined>(undefined);
  const [eventosTrafego, setEventosTrafego] = useState<InterceptedTrafficEvent[]>([]);
  const [showGlobalPlanModal, setShowGlobalPlanModal] = useState<boolean>(false);
  const [authSession, setAuthSession] = useState<AuthSessionState>({
    status: 'idle',
    cpf: '',
    idPlano: ID_PLANO_PADRAO,
    modoExecucao: 'DRY_RUN',
    logs: [
      {
        timestamp: new Date().toISOString(),
        mensagem: 'Painel pronto. Forneça CPF/senha na aba "Sessão Playwright" para conectar.',
        level: 'info'
      }
    ]
  });

  const [isLoadingAuth, setIsLoadingAuth] = useState<boolean>(false);
  const [ferramentaParaValidar, setFerramentaParaValidar] = useState<FerramentaInfo | undefined>(undefined);
  const [jsonParaValidar, setJsonParaValidar] = useState<unknown | undefined>(undefined);
const [ferramentaParaExecutar, setFerramentaParaExecutar] = useState<FerramentaInfo | null>(null);

// ====== Persistência das credenciais PNBOX ======
// As credenciais PNBOX ficam NO BANCO (Supabase), atreladas ao usuário da
// plataforma logado. O frontend nuca guarda a senha em localStorage.
interface PnboxCreds {
  cpf: string;
  password: string;
  idPlano: string;
}

// Token da plataforma (Supabase) para chamadas autenticadas ao banco.
function platformToken(): string | null {
  return getPlatformSession()?.accessToken || null;
}

// Salva as credenciais PNBOX do usuário logado no banco.
async function persistirCredenciaisNoBanco(creds: PnboxCreds): Promise<boolean> {
  const token = platformToken();
  if (!token) return false;
try {
     const res = await fetch('/api/auth/pnbox-credentials', {
       method: 'PUT',
       headers: {
         'Content-Type': 'application/json',
         Authorization: `Bearer ${token}`
       },
       body: JSON.stringify(creds),
     });
     return res.ok;
   } catch {
     return false;
   }
}

// Toast system for notifications


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

       // NEW: Trigger immediate reconnect if we have platform token and session is not authenticated
       if (platformToken() && authSession.status !== 'authenticated') {
         try {
           const res = await fetch('/api/auth/pnbox-credentials/reconnect', {
             method: 'POST',
             headers: {
               'Content-Type': 'application/json',
               Authorization: `Bearer ${platformToken()}`
             }
           });
           if (!res.ok) {
             // Handle error
             const data = await res.json();
             if (res.status === 400 && data?.mensagem === 'Nenhuma credencial PNBOX salva') {
               pushToast({
                 level: 'warn',
                 title: 'Credenciais PNBOX não configuradas',
                 message: 'Para conexão automática, salve seu CPF/senha do PNBOX em Configurações → Sessão Playwright',
                 duration: 8000,
                 icon: 'warn'
               });
             }
           }
           // Note: If the reconnect succeeds, we might get a new session? 
           // But we are not updating the authSession here because the existing polling/update will catch it.
           // However, to be consistent, we could update the session if we get a new one.
           // But the instruction does not specify. We'll leave it to the existing mechanisms.
         } catch (err) {
           console.error('Erro ao tentar reconectar imediatamente:', err);
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

  // Efeito "boot" antigo removido — o novo "Efeito 1" abaixo já chama carregarDados().

  const handleLogin = async (cred: { cpf: string; password: string; idPlano: string; consentimentoAceito: boolean; modoExecucao: 'DRY_RUN' | 'LIVE' }) => {
    setIsLoadingAuth(true);
    try {
      const res = await fetch('/api/automation/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(cred)
      });
      const data = await res.json();
      if (!res.ok) {
        pushToast({
          level: 'error',
          title: 'Falha no login',
          message: data.mensagem || `HTTP ${res.status}`,
          duration: 6000,
          icon: 'error'
        });
        return;
      }
      if (data.session) {
        setAuthSession(data.session);
        const isLive = cred.modoExecucao === 'LIVE';
        // Se logou na plataforma (Supabase) e a conexão PNBOX autenticou
        // com consentimento, persiste as credenciais PNBOX no BANCO.
        if (data.session.status === 'authenticated' && cred.consentimentoAceito) {
          persistirCredenciaisNoBanco({
            cpf: cred.cpf,
            password: cred.password,
            idPlano: cred.idPlano || ID_PLANO_PADRAO,
          });
        }
        pushToast({
          level: isLive ? 'warn' : 'success',
          title: isLive ? 'Login LIVE concluído' : 'Login DRY_RUN concluído',
          message: isLive
            ? `Sessão autenticada no PNBOX real. Preenchimentos serão gravados no servidor.`
            : `Sessão autenticada (simulação). Preenchimentos não tocam o servidor real.`,
          duration: 5000,
          icon: isLive ? 'warn' : 'check'
        });
      }
      // Atualizar lista de tráfego
      const resTraffic = await fetch('/api/automation/traffic');
      if (resTraffic.ok) {
        const dataTraffic = await resTraffic.json();
        setEventosTrafego(dataTraffic.eventos || []);
      }
    } catch (err: any) {
      pushToast({
        level: 'error',
        title: 'Erro na autenticação',
        message: err?.message || 'Falha desconhecida',
        duration: 6000,
        icon: 'error'
      });
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

  // ============== AUTO-RECONEXÃO DE SESSÃO EXPIRADA ==============
  // Quando a sessão expira (por tempo ou por recarga), reconectamos
  // automaticamente com as credenciais padrão, sem exigir clique do usuário.
  // Estratégia:
  //   1. Na carga inicial (já presente em carregarDados)
  //   2. No polling de 60s (useEffect abaixo)
  //   3. No refresh manual (chamado pelo Header onRefreshAuth)
  // Anti-loop: timestamp mínimo entre tentativas (60s).
  // ============================================================================
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [isAutoReconnecting, setIsAutoReconnecting] = useState<boolean>(false);
  const lastAutoReconnectAttemptRef = useRef<number>(0);
  const AUTO_RECONNECT_DEBOUNCE_MS = 60_000; // máx 1 tentativa a cada 60s

  const pushToast = useCallback((toast: Omit<ToastMessage, 'id'>) => {
    const id = 'toast_' + Date.now() + '_' + Math.random().toString(36).substring(2, 6);
    const newToast: ToastMessage = { id, ...toast };
    setToasts((prev) => [...prev, newToast]);
    // Auto-dismiss depois de duration ms (default 4s, exceto 'reconnecting' = 0)
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

  const autoReconnect = useCallback(async () => {
    const agora = Date.now();
    // Anti-loop: respeitar debounce
    if (agora - lastAutoReconnectAttemptRef.current < AUTO_RECONNECT_DEBOUNCE_MS) {
      return false;
    }
    // Se já estamos tentando, não tenta de novo
    if (isAutoReconnecting) {
      return false;
    }
    // Só tenta se está expirada (ou falhou)
    const sessaoAtualExpirada =
      authSession.status === 'expired' ||
      authSession.isExpired === true ||
      authSession.status === 'failed';
    if (!sessaoAtualExpirada) {
      return false;
    }

    lastAutoReconnectAttemptRef.current = agora;
    setIsAutoReconnecting(true);

    const reconnectingToastId = pushToast({
      level: 'info',
      title: 'Reconectando sessão PNBOX',
      message: 'Detectamos que sua sessão expirou. Renovando automaticamente...',
      duration: 2500, // visual de progresso (sucesso/falha sempre substitui ou remove)
      icon: 'loading'
    });

    try {
      // Requer sessão da plataforma (token Supabase) para ler as credenciais
      // PNBOX do banco e reconectar.
      if (!platformToken()) {
        dismissToast(reconnectingToastId);
        pushToast({
          level: 'warn',
          title: 'Sessão PNBOX expirada',
          message: 'Faça login na plataforma e informe suas credenciais PNBOX na aba "Sessão Playwright" para que possamos reconectar automaticamente.',
          duration: 8000,
          icon: 'warn'
        });
        return false;
      }

      const res = await fetch('/api/auth/pnbox-credentials/reconnect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${platformToken()}`
        }
      });
      const data = await res.json();

      dismissToast(reconnectingToastId);
      if (res.ok && data.session?.status === 'authenticated') {
        setAuthSession(data.session);
        pushToast({
          level: 'success',
          title: 'Sessão PNBOX renovada',
          message: 'Conexão reconectada automaticamente usando as credenciais salvas no banco.',
          duration: 4000,
          icon: 'check'
        });
        return true;
      }

      pushToast({
        level: 'error',
        title: 'Falha na reconexão automática',
        message: data?.mensagem || `HTTP ${res.status}`,
        duration: 6000,
        icon: 'error'
      });
      return false;
    } catch (err: any) {
      dismissToast(reconnectingToastId);
      pushToast({
        level: 'error',
        title: 'Falha na reconexão automática',
        message: err?.message || 'Erro desconhecido',
        duration: 6000,
        icon: 'error'
      });
      return false;
    } finally {
      setIsAutoReconnecting(false);
    }
  }, [authSession, isAutoReconnecting, pushToast, dismissToast]);

  // Efeito 1: ao montar, carregar dados. Se vier expirado, tenta reconectar.
  useEffect(() => {
    carregarDados();
  }, []);

  // Efeito 2: polling a cada 60s para detectar expiração durante uso prolongado.
  useEffect(() => {
    const intervalId = setInterval(async () => {
      try {
        const res = await fetch('/api/automation/auth/status');
        if (!res.ok) return;
        const data = await res.json();
        if (data.session) {
          setAuthSession(data.session);
          // Se o servidor reportou expirada, tenta reconectar
          if (data.session.status === 'expired' || data.session.isExpired === true) {
            autoReconnect();
          }
        }
      } catch (e) {
        // Silencioso — não perturba o usuário em falha de polling
        console.warn('[Polling auth] Falha ao checar sessão:', e);
      }
    }, 60_000); // 60 segundos
    return () => clearInterval(intervalId);
  }, [autoReconnect]);

  // Efeito 3: sempre que o status mudar para 'expired', tenta reconectar.
  useEffect(() => {
    if (authSession.status === 'expired' || authSession.isExpired === true) {
      autoReconnect();
    }
  }, [authSession.status, authSession.isExpired, autoReconnect]);

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
    <div className="min-h-screen bg-slate-950 text-slate-100 flex font-sans antialiased">
      {/* Sidebar de Navegação */}
      <AppSidebar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        authSession={authSession}
        isOpen={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
      />

      {/* Conteúdo Principal */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Cabeçalho de Navegação e Status */}
        <Header
          authSession={authSession}
          onRefreshAuth={carregarDados}
          onOpenAuthModal={() => setActiveTab('autenticacao')}
          onUpdateActivePlanId={handleUpdateActivePlanId}
          activeTab={activeTab}
          setActiveTab={setActiveTab}
          trafficCount={eventosTrafego.length}
          onOpenSidebar={() => setSidebarOpen(true)}
        />

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

      {/* Container de Toasts (auto-reconexão, avisos, etc.) */}
      <Toast toasts={toasts} onDismiss={dismissToast} />

      {/* Rodapé */}
      <footer className="border-t border-slate-900 bg-slate-950 py-4 text-center text-xs text-slate-500 font-mono">
        Sebrae PNBOX Oficial • Engenharia Reversa, Validação de Schema & Preenchimento Automatizado • Plano: {authSession.idPlano}
      </footer>
      </div>
    </div>
  );
}

export default App;
