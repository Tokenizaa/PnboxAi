import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  CheckCircle2,
  XCircle,
  Loader2,
  AlertTriangle,
  Clock,
  Key,
  LogOut,
  Circle,
  Check
} from 'lucide-react';
import { getPlatformSession } from '../../components/PlatformGate';

export type PnboxConnectionStep =
  | 'initializing'
  | 'opening_pnbox'
  | 'waiting_login'
  | 'login_detected'
  | 'submitting_credentials'
  | 'authenticating'
  | 'obtaining_session'
  | 'validating_connection'
  | 'completed'
  | 'failed';

export type PnboxConnectionStatus = 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';

interface StepState {
  step: PnboxConnectionStep;
  status: 'PENDING' | 'RUNNING' | 'COMPLETED' | 'FAILED';
  message: string;
  timestamp: string;
}

interface ConnectionJob {
  jobId: string;
  status: PnboxConnectionStatus;
  currentStep: PnboxConnectionStep | null;
  steps: StepState[];
  errorCode?: string;
  errorMessage?: string;
  technicalMessage?: string;
  startedAt: string;
  updatedAt: string;
  completedAt?: string;
}

// Ordem de exibição no frontend
const STEP_DISPLAY_ORDER: PnboxConnectionStep[] = [
  'initializing',
  'opening_pnbox',
  'waiting_login',
  'login_detected',
  'submitting_credentials',
  'authenticating',
  'obtaining_session',
  'validating_connection',
  'completed',
];

// Labels amigáveis para o frontend
const STEP_LABELS: Record<PnboxConnectionStep, string> = {
  initializing: 'Preparando conexão',
  opening_pnbox: 'Abrindo o PNBOX',
  waiting_login: 'Localizando autenticação',
  login_detected: 'Tela de login encontrada',
  submitting_credentials: 'Enviando credenciais',
  authenticating: 'Validando com o Sebrae ID',
  obtaining_session: 'Obtendo sessão',
  validating_connection: 'Validando acesso',
  completed: 'Conectado',
  failed: 'Falha na conexão',
};

interface PnboxConnectionTimelineProps {
  isOpen: boolean;
  onConnected?: (job: ConnectionJob) => void;
  onFailed?: (job: ConnectionJob) => void;
  onDisconnect?: () => void;
  onClose?: () => void;
}

export const PnboxConnectionTimeline: React.FC<PnboxConnectionTimelineProps> = ({
  isOpen,
  onClose,
  onConnected,
  onFailed,
  onDisconnect
}) => {
  if (!isOpen) return null;

  const [cpf, setCpf] = useState('');
  const [password, setPassword] = useState('');
  const [consentimento, setConsentimento] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [job, setJob] = useState<ConnectionJob | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const activeJobIdRef = useRef<string | null>(null);

  // Limpar polling ao desmontar/close
  useEffect(() => {
    if (!isOpen) {
      if (pollingRef.current) clearInterval(pollingRef.current);
      pollingRef.current = null;
      activeJobIdRef.current = null;
      setJob(null);
      setElapsed(0);
    }
  }, [isOpen]);

  // Timer de tempo decorrido
  useEffect(() => {
    if (job && (job.status === 'RUNNING' || job.status === 'PENDING')) {
      const t = setInterval(() => {
        const start = new Date(job.startedAt).getTime();
        setElapsed(Math.floor((Date.now() - start) / 1000));
      }, 1000);
      return () => clearInterval(t);
    }
  }, [job?.status, job?.startedAt]);

  // Polling de status do job
  const pollStatus = useCallback(async (jobId: string) => {
    try {
      const token = getPlatformSession()?.accessToken;
      if (!token) return;
      const res = await fetch(`/api/pnbox/connect/${jobId}/status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.job) return;
      setJob(data.job);
      if (data.job.status === 'COMPLETED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        activeJobIdRef.current = null;
        onConnected?.(data.job);
      } else if (data.job.status === 'FAILED') {
        if (pollingRef.current) clearInterval(pollingRef.current);
        pollingRef.current = null;
        activeJobIdRef.current = null;
        onFailed?.(data.job);
      }
    } catch (err) {
      console.error('[PnboxConnectionTimeline] pollStatus: failed to poll job status', err);
      // ignora erros de polling transientes
    }
  }, [onConnected, onFailed]);

  const startPolling = useCallback((jobId: string) => {
    activeJobIdRef.current = jobId;
    if (pollingRef.current) clearInterval(pollingRef.current);
    pollingRef.current = setInterval(() => pollStatus(jobId), 1500);
    // Poll imediato
    pollStatus(jobId);
  }, [pollStatus]);

  const handleConnect = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentimento) return;
    if (!cpf || !password) return;

    // Bloquear duplicidade no cliente
    if (activeJobIdRef.current) return;

    try {
      const token = getPlatformSession()?.accessToken;
      if (!token) throw new Error('Sessão da plataforma expirada');

      const res = await fetch('/api/pnbox/connect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({ cpf: cpf.trim(), password, consentimentoAceito: true })
      });
      const data = await res.json();
      if (res.status === 409) {
        // Já existe job ativo
        const existingJobId = data.activeJobId;
        if (existingJobId) startPolling(existingJobId);
        return;
      }
      if (res.status === 202 && data.jobId) {
        setElapsed(0);
        startPolling(data.jobId);
      }
    } catch (err: any) {
      console.error('[PnboxConnectionTimeline] handleConnect: failed to start connection job', err);
    }
  };

  const handleLogout = async () => {
    try {
      const token = getPlatformSession()?.accessToken;
      if (token) {
        await fetch('/api/automation/auth/expire', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
        await fetch('/api/auth/pnbox-credentials', {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
      setCpf('');
      setPassword('');
      setConsentimento(false);
      setJob(null);
      onDisconnect?.();
    } catch (err) {
      console.error('[PnboxConnectionTimeline] handleLogout: failed to logout and clear session', err);
    }
  };

  const isRunning = job?.status === 'RUNNING' || job?.status === 'PENDING';
  const isConnected = job?.status === 'COMPLETED';
  const isFailed = job?.status === 'FAILED';
  const isAuthenticated = isConnected;

  return (
    <div className="fixed inset-0 bg-black/75 backdrop-blur-xs flex items-center justify-center p-4 z-50 overflow-y-auto">
      <div className="bg-[#18163f] border border-[#2d2a63] rounded-2xl max-w-2xl w-full p-6 text-white shadow-2xl my-8">
        {/* Header */}
        <div className="flex items-center justify-between pb-4 border-b border-[#2d2a63]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-full bg-indigo-500/20 text-indigo-300 flex items-center justify-center">
              <Key className="w-4 h-4" />
            </div>
            <div>
              <h2 className="text-lg font-bold text-white">Conectar PNBOX</h2>
              <p className="text-xs text-indigo-200/80">Conecte sua conta no ambiente oficial Sebrae</p>
            </div>
          </div>
          <div className="flex items-center gap-1">
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-300 hover:text-white transition-colors"
              title="Fechar"
            >
              <XCircle className="w-5 h-5" />
            </button>
            <button
              onClick={handleLogout}
              disabled={!isAuthenticated || isRunning}
              className="p-1.5 rounded-full hover:bg-white/10 text-red-400 hover:text-red-300 disabled:opacity-30 disabled:cursor-not-allowed"
              title="Deslogar"
            >
              <LogOut className="w-5 h-5" />
            </button>
          </div>
        </div>

        <div className="mt-4">
          {/* Estado: parado */}
          {!job && (
            <form onSubmit={handleConnect} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                    CPF (somente números)
                  </label>
                  <input
                    type="text"
                    value={cpf}
                    onChange={(e) => {
                      // Aceita apenas números e formatação visual de CPF
                      const raw = e.target.value.replace(/\D/g, '').slice(0, 11);
                      setCpf(raw);
                    }}
                    placeholder="51517884268"
                    inputMode="numeric"
                    pattern="[0-9]*"
                    className="w-full px-3 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-pink-500 font-mono"
                  />
                  <p className="text-[10px] text-slate-500 mt-1">CPF da conta Sebrae/PNBOX. NÃO é o email do Hub.</p>
                </div>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-indigo-300 mb-1">
                    Senha Sebrae ID
                  </label>
                  <div className="relative">
                    <input
                      type={showPassword ? 'text' : 'password'}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••••••"
                      className="w-full pl-3 pr-16 py-2.5 bg-slate-950 border border-slate-700 rounded-lg text-slate-200 text-sm focus:outline-none focus:border-pink-500 font-mono"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3 top-2.5 text-xs text-slate-400 hover:text-white"
                    >
                      {showPassword ? 'Ocultar' : 'Mostrar'}
                    </button>
                  </div>
                  <p className="text-[10px] text-slate-500 mt-1">Senha da conta Sebrae ID (sebrae.com.br). NÃO é a senha do Hub.</p>
                </div>
              </div>

              {/* Consentimento */}
              <label className="flex items-start gap-2 text-xs text-slate-300 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentimento}
                  onChange={(e) => setConsentimento(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-white/20 bg-slate-950 text-pink-500 focus:ring-pink-500"
                />
                <span>
                  Confirmo que sou o titular da conta Sebrae/PNBOX informada e autorizo o Hub a usar
                  minhas credenciais <strong className="text-pink-400">exclusivamente</strong> para
                  autenticar e automatizar o preenchimento dos meus planos no ambiente oficial Sebrae.
                </span>
              </label>

              <button
                type="submit"
                disabled={!consentimento || !cpf || !password}
                className="w-full py-3 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-xl text-sm font-bold shadow-lg disabled:opacity-40 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Conectar conta PNBOX
              </button>
            </form>
          )}

          {/* Estado: conectado */}
          {isConnected && job && (
            <div className="space-y-4">
              <div className="p-4 bg-emerald-950/30 border border-emerald-500/30 rounded-xl flex items-center gap-3">
                <CheckCircle2 className="w-8 h-8 text-emerald-400" />
                <div>
                  <p className="font-bold text-emerald-300">Conta PNBOX conectada</p>
                  <p className="text-xs text-emerald-200/80 mt-0.5">
                    Sessão autenticada no ambiente oficial Sebrae. Seus planos estão disponíveis.
                  </p>
                </div>
              </div>
              <Timeline job={job} />
            </div>
          )}

          {/* Estado: falhou */}
          {isFailed && job && (
            <div className="space-y-4">
              <div className="p-4 bg-amber-950/30 border border-amber-500/30 rounded-xl flex items-start gap-3">
                <AlertTriangle className="w-6 h-6 text-amber-400 mt-0.5" />
                <div>
                  <p className="font-bold text-amber-300">Não foi possível conectar</p>
                  <p className="text-xs text-amber-200/80 mt-0.5">
                    {job.errorMessage || 'Erro desconhecido durante a conexão.'}
                  </p>
                </div>
              </div>
              <Timeline job={job} />
              <button
                onClick={() => { setJob(null); setElapsed(0); }}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors flex items-center justify-center gap-2"
              >
                <Key className="w-4 h-4" />
                Tentar novamente
              </button>
            </div>
          )}

          {/* Estado: rodando */}
          {isRunning && job && (
            <div className="space-y-4">
              <div className="p-4 bg-blue-950/30 border border-blue-500/30 rounded-xl">
                <div className="flex items-center gap-3">
                  <Loader2 className="w-6 h-6 text-blue-300 animate-spin" />
                  <div>
                    <p className="font-bold text-blue-300">Conexão em andamento</p>
                    <p className="text-xs text-blue-200/80 mt-0.5">
                      O processo pode levar alguns segundos. Não feche esta janela.
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1.5 mt-2 text-xs text-indigo-300">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Tempo decorrido: {elapsed}s</span>
                </div>
              </div>
              <Timeline job={job} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

function Timeline({ job }: { job: ConnectionJob }) {
  // Ordena por ordem de exibição, filtrando 'failed' (mostrado no erro)
  const steps = [...job.steps].sort((a, b) => {
    const iA = STEP_DISPLAY_ORDER.indexOf(a.step);
    const iB = STEP_DISPLAY_ORDER.indexOf(b.step);
    return (iA === -1 ? 99 : iA) - (iB === -1 ? 99 : iB);
  });

  return (
    <div className="space-y-2">
      {steps.map((s, i) => {
        const isLast = i === steps.length - 1;
        const isRunning = s.status === 'RUNNING';
        const isDone = s.status === 'COMPLETED';
        const isFail = s.status === 'FAILED';
        const isPending = s.status === 'PENDING';
        const label = STEP_LABELS[s.step] || s.step;

        return (
          <div key={s.step} className="flex items-start gap-3">
            {/* Ícone de status */}
            <div className="mt-0.5">
              {isDone && <Check className="w-4 h-4 text-emerald-400" />}
              {isRunning && <Loader2 className="w-4 h-4 text-blue-400 animate-spin" />}
              {isFail && <XCircle className="w-4 h-4 text-red-400" />}
              {isPending && <Circle className="w-4 h-4 text-slate-500" />}
            </div>

            {/* Linha conectora */}
            <div className="flex-1">
              <div className={`flex items-center gap-2 ${isRunning ? 'text-blue-200' : isDone ? 'text-slate-200' : isFail ? 'text-red-300' : 'text-slate-500'}`}>
                <span className={`text-sm ${isRunning ? 'font-bold' : 'font-medium'}`}>{label}</span>
                {isRunning && <span className="text-[10px] text-blue-300 font-mono uppercase">em andamento</span>}
              </div>
              {!isLast && <div className="w-px h-4 bg-slate-700 ml-1.5" />}
            </div>
          </div>
        );
      })}

      {/* Erro detalhado no final se falhou */}
      {job.status === 'FAILED' && job.errorCode && (
        <div className="mt-3 p-3 bg-slate-950 border border-slate-800 rounded-lg">
          <p className="text-[10px] text-slate-500 font-mono uppercase">Código do erro</p>
          <p className="text-xs text-slate-300 font-mono mt-0.5">{job.errorCode}</p>
        </div>
      )}
    </div>
  );
}
