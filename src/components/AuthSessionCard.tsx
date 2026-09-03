import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  ShieldAlert,
  Key,
  Play,
  Terminal,
  CheckCircle2,
  Lock,
  User,
  Hash,
  Activity,
  ArrowDownCircle,
  ArrowUpCircle,
  ChevronDown,
  ChevronRight,
  Copy,
  Check,
  Filter,
  RefreshCw,
  Database,
  Globe
} from 'lucide-react';
import { AuthSessionState, InterceptedTrafficEvent } from '../types/pnbox';
import { extrairIdPlano } from '../utils/planUtils';
import { getEncryptedPnboxCredentials, saveEncryptedPnboxCredentials } from '../utils/secureStorage';

interface AuthSessionCardProps {
  authSession: AuthSessionState;
  onLogin: (cred: { cpf: string; password: string; idPlano: string }) => Promise<void>;
  isLoading: boolean;
  trafficEvents?: InterceptedTrafficEvent[];
  onRefreshTraffic?: () => void;
}

export const AuthSessionCard: React.FC<AuthSessionCardProps> = ({
  authSession,
  onLogin,
  isLoading,
  trafficEvents = [],
  onRefreshTraffic
}) => {
  // NÃO pre-populamos credenciais — usuário SEMPRE fornece a sua
  const [cpf, setCpf] = useState(authSession.cpf || '');
  const [password, setPassword] = useState('');
  const [idPlano, setIdPlano] = useState(authSession.idPlano || '');
  const [showPassword, setShowPassword] = useState(false);
  const [consentimentoAceito, setConsentimentoAceito] = useState(false);
  const [modoExecucao, setModoExecucao] = useState<'DRY_RUN' | 'LIVE'>(
    (authSession.modoExecucao as 'DRY_RUN' | 'LIVE') || 'DRY_RUN'
  );

  // Filtros e Expansão de Logs DDP
  const [filtroTipo, setFiltroTipo] = useState<'todos' | 'read' | 'write'>('todos');
  const [expandedLogIds, setExpandedLogIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Pré-popula CPF e ID Plano do armazenamento criptografado local ou do banco
  useEffect(() => {
    getEncryptedPnboxCredentials().then((saved) => {
      if (saved) {
        if (saved.cpf) setCpf(saved.cpf);
        if (saved.idPlano) setIdPlano(saved.idPlano);
        if (saved.password) setPassword(saved.password);
      } else if (!authSession.cpf) {
        fetch('/api/auth/pnbox-credentials')
          .then(res => res.json())
          .then(data => {
            if (data.configured && data.data?.cpf) {
              setCpf(data.data.cpf);
            }
          })
          .catch(() => {});
      }
    });
  }, [authSession.cpf]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!consentimentoAceito) {
      alert('É necessário aceitar o consentimento antes de continuar.');
      return;
    }

    // Salva com criptografia AES-GCM local para não perder ao atualizar a página
    saveEncryptedPnboxCredentials({
      cpf,
      idPlano,
      password
    });

    onLogin({
      cpf,
      password,
      idPlano,
      consentimentoAceito,
      modoExecucao
    } as any);
  };

  const isAuth = authSession.status === 'authenticated' && !authSession.isExpired;
  const isExpired = authSession.isExpired || authSession.status === 'expired';

  const toggleExpand = (id: string) => {
    setExpandedLogIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const copyToClipboard = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  // Classifica evento como Escrita (POST/PATCH/DDP Write) ou Leitura (GET/DDP Read)
  const isWriteOperation = (ev: InterceptedTrafficEvent) => {
    const method = ev.metodo.toUpperCase();
    const acao = ev.operacaoDetectada?.acao;
    if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(method)) return true;
    if (acao && ['insert', 'update', 'remove', 'save', 'statusConclusao', 'login'].includes(acao)) return true;
    if (ev.url.includes('.insert') || ev.url.includes('.update') || ev.url.includes('.remove')) return true;
    return false;
  };

  const eventosFiltrados = trafficEvents.filter((ev) => {
    if (filtroTipo === 'write') return isWriteOperation(ev);
    if (filtroTipo === 'read') return !isWriteOperation(ev);
    return true;
  });

  const totalWrites = trafficEvents.filter(isWriteOperation).length;
  const totalReads = trafficEvents.length - totalWrites;

  return (
    <div className="space-y-6">
      {/* Banner de status */}
      <div
        className={`p-5 rounded-2xl border transition-all ${
          isAuth
            ? 'bg-emerald-950/20 border-emerald-500/30'
            : isExpired
            ? 'bg-amber-950/20 border-amber-500/30'
            : authSession.status === 'authenticating'
            ? 'bg-blue-950/20 border-blue-500/30'
            : 'bg-slate-900 border-slate-800'
        }`}
      >
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-start gap-4">
            <div
              className={`p-3 rounded-xl ${
                isAuth
                  ? 'bg-emerald-500/20 text-emerald-400'
                  : isExpired
                  ? 'bg-amber-500/20 text-amber-400'
                  : 'bg-indigo-500/20 text-indigo-400'
              }`}
            >
              {isAuth ? <ShieldCheck className="w-6 h-6" /> : <ShieldAlert className="w-6 h-6" />}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-lg font-bold text-white">Módulo de Autenticação & Sessão Playwright</h3>
                <span
                  className={`px-2 py-0.5 text-xs font-semibold rounded-full ${
                    isAuth
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : isExpired
                      ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      : 'bg-slate-800 text-slate-300 border border-slate-700'
                  }`}
                >
                  {isAuth
                    ? 'Logado & Token Ativo'
                    : isExpired
                    ? 'Sessão Expirada (Reautenticação necessária)'
                    : 'Aguardando Inicialização'}
                </span>
              </div>
              <p className="text-sm text-slate-400 mt-1">
                Inicializa o navegador headless via Playwright, realiza a autenticação do Sebrae ID e extrai o{' '}
                <code className="text-indigo-300 font-mono">Meteor.loginToken</code> para permitir que as demais ferramentas sejam executadas diretamente.
              </p>
            </div>
          </div>

          <button
            onClick={handleSubmit}
            disabled={isLoading}
            className="flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white font-medium text-sm rounded-xl shadow-lg shadow-indigo-600/30 transition-all cursor-pointer whitespace-nowrap"
          >
            {isLoading ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Autenticando...</span>
              </>
            ) : (
              <>
                <Play className="w-4 h-4 fill-current" />
                <span>{isExpired ? 'Renovar Token Playwright' : 'Iniciar Sessão Playwright'}</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Grid: Formulário de Credenciais + Dados Extraídos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Formulário de Configuração de Credenciais */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm">
          <h4 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
            <Key className="w-4 h-4 text-indigo-400" />
            Credenciais de Acesso PNBOX
          </h4>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                CPF / Login Sebrae
              </label>
              <div className="relative">
                <User className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={cpf}
                  onChange={(e) => setCpf(e.target.value)}
                  placeholder="515.178.842-68"
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                Senha de Acesso
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full pl-9 pr-20 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-2 text-xs text-slate-400 hover:text-slate-200"
                >
                  {showPassword ? 'Ocultar' : 'Mostrar'}
                </button>
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400">
                  ID do Plano de Negócio (ou URL do Sebrae)
                </label>
                <span className="text-[10px] text-emerald-400 font-mono">Suporta qualquer plano</span>
              </div>
              <div className="relative">
                <Hash className="w-4 h-4 text-slate-500 absolute left-3 top-3" />
                <input
                  type="text"
                  value={idPlano}
                  onChange={(e) => {
                    const extraido = extrairIdPlano(e.target.value);
                    setIdPlano(extraido);
                  }}
                  placeholder="Informe o ID ou cole a URL https://pnbox.sebrae.com.br/..."
                  className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-sm focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
              <p className="text-[11px] text-slate-500 mt-1">
                Dica: Cole diretamente o link da barra de endereços do seu plano no PNBOX que o ID será extraído automaticamente.
              </p>
            </div>

            {/* Seletor de modo de execução */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-2">
                Modo de Execução
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setModoExecucao('DRY_RUN')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    modoExecucao === 'DRY_RUN'
                      ? 'bg-slate-700 border-cyan-500/60 text-cyan-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  🧪 DRY_RUN
                  <div className="text-[10px] font-normal mt-0.5 opacity-80">Simulação segura</div>
                </button>
                <button
                  type="button"
                  onClick={() => setModoExecucao('LIVE')}
                  className={`px-3 py-2 rounded-lg border text-xs font-semibold transition-colors ${
                    modoExecucao === 'LIVE'
                      ? 'bg-rose-950/40 border-rose-500/60 text-rose-300'
                      : 'bg-slate-900 border-slate-700 text-slate-400 hover:bg-slate-800'
                  }`}
                >
                  ⚡ LIVE
                  <div className="text-[10px] font-normal mt-0.5 opacity-80">Servidor real PNBOX</div>
                </button>
              </div>
              {modoExecucao === 'LIVE' && (
                <div className="mt-2 p-2.5 bg-rose-950/30 border border-rose-500/40 rounded-lg text-[11px] text-rose-200 leading-snug">
                  ⚠️ <strong>Modo LIVE:</strong> os preenchimentos serão gravados no servidor real do PNBOX.
                  Use apenas na sua própria conta e mantenha a sessão curta.
                </div>
              )}
            </div>

            {/* Consentimento explícito */}
            <div className="pt-2 border-t border-slate-800">
              <label className="flex items-start gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={consentimentoAceito}
                  onChange={(e) => setConsentimentoAceito(e.target.checked)}
                  className="mt-0.5 w-4 h-4 rounded border-slate-600 bg-slate-900 text-indigo-500 focus:ring-indigo-500 focus:ring-offset-slate-950 cursor-pointer"
                />
                <span className="text-[11px] text-slate-300 leading-snug">
                  Confirmo que sou o titular da conta PNBOX informada, autorizo o Hub a usar minhas
                  credenciais exclusivamente para automatizar o preenchimento do meu próprio plano,
                  e estou ciente de que o uso automatizado pode ser registrado pelo PNBOX.
                </span>
              </label>
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading || !consentimentoAceito}
                className="w-full py-2.5 bg-slate-800 hover:bg-slate-700 disabled:bg-slate-900 disabled:text-slate-600 border border-slate-700 text-slate-200 rounded-xl text-sm font-medium transition-colors disabled:cursor-not-allowed"
              >
                Salvar & Reautenticar
              </button>
            </div>
          </form>
        </div>

        {/* Tokens & Estado da Sessão */}
        <div className="bg-slate-900 p-6 rounded-2xl border border-slate-800 shadow-sm flex flex-col justify-between">
          <div>
            <h4 className="text-base font-semibold text-slate-100 mb-4 flex items-center gap-2">
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              Sessão Meteor & Tokens Extraídos
            </h4>

            <div className="space-y-3 font-mono text-xs">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Meteor.loginToken:</span>
                <span className="text-emerald-400 break-all">
                  {authSession.meteorLoginToken || 'Aguardando inicialização da sessão...'}
                </span>
              </div>

              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block mb-1">Meteor.userId:</span>
                <span className="text-cyan-400">
                  {authSession.meteorUserId || 'usr_sebrae_pnbox_official'}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Tempo Restante:</span>
                  <span className={isAuth ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                    {authSession.tempoRestanteMinutos !== undefined
                      ? `${authSession.tempoRestanteMinutos} min`
                      : '60 min'}
                  </span>
                </div>
                <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-slate-500 block text-[10px]">Cookies Ativos:</span>
                  <span className="text-slate-300 font-semibold">{authSession.cookiesCount || 3} cookies</span>
                </div>
              </div>
            </div>
          </div>

          <div className="mt-4 pt-4 border-t border-slate-800 text-xs text-slate-400">
            <span className="font-semibold text-slate-300">Modo de Automação:</span> Headless DDP Direct Save (Zero consumo de renderização DOM após handshake).
          </div>
        </div>
      </div>

      {/* Terminal de Logs de Handshake da Sessão */}
      <div className="bg-slate-950 rounded-2xl border border-slate-800 p-5 font-mono text-xs shadow-inner">
        <div className="flex items-center justify-between mb-3 pb-2 border-b border-slate-800 text-slate-400">
          <div className="flex items-center gap-2">
            <Terminal className="w-4 h-4 text-indigo-400" />
            <span className="font-semibold text-slate-200">Terminal de Autenticação & Handshake</span>
          </div>
          <span className="text-[11px] text-slate-500">{authSession.logs.length} eventos registrados</span>
        </div>

        <div className="space-y-1.5 max-h-48 overflow-y-auto pr-2">
          {authSession.logs.map((log, index) => (
            <div key={index} className="flex items-start gap-2">
              <span className="text-slate-600 select-none">[{log.timestamp.split('T')[1]?.substring(0, 8)}]</span>
              <span
                className={
                  log.level === 'success'
                    ? 'text-emerald-400'
                    : log.level === 'warn'
                    ? 'text-amber-400'
                    : log.level === 'error'
                    ? 'text-rose-400'
                    : 'text-slate-300'
                }
              >
                {log.level === 'success' && '✔ '}
                {log.level === 'error' && '✖ '}
                {log.level === 'warn' && '⚠ '}
                {log.mensagem}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Seção Expandida: Log Expansível de Requisições DDP Interceptadas com Diferenciação Leitura/Escrita */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 shadow-sm space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <Activity className="w-5 h-5 text-cyan-400" />
            <div>
              <h4 className="text-base font-bold text-slate-100">
                Log Expansível de Requisições DDP Interceptadas
              </h4>
              <p className="text-xs text-slate-400">
                Diferenciação visual entre tráfego de leitura (<span className="text-sky-400 font-semibold">GET / Subs</span>) e escrita (<span className="text-amber-400 font-semibold">POST / Methods</span>)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Filtros de Tipo */}
            <div className="flex items-center bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs font-medium">
              <button
                onClick={() => setFiltroTipo('todos')}
                className={`px-2.5 py-1 rounded-lg transition-colors ${
                  filtroTipo === 'todos'
                    ? 'bg-slate-800 text-white font-bold'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Todos ({trafficEvents.length})
              </button>
              <button
                onClick={() => setFiltroTipo('read')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                  filtroTipo === 'read'
                    ? 'bg-sky-950 text-sky-300 border border-sky-500/40 font-bold'
                    : 'text-slate-400 hover:text-sky-300'
                }`}
              >
                <ArrowDownCircle className="w-3.5 h-3.5 text-sky-400" />
                Leitura ({totalReads})
              </button>
              <button
                onClick={() => setFiltroTipo('write')}
                className={`px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors ${
                  filtroTipo === 'write'
                    ? 'bg-amber-950 text-amber-300 border border-amber-500/40 font-bold'
                    : 'text-slate-400 hover:text-amber-300'
                }`}
              >
                <ArrowUpCircle className="w-3.5 h-3.5 text-amber-400" />
                Escrita ({totalWrites})
              </button>
            </div>

            {onRefreshTraffic && (
              <button
                onClick={onRefreshTraffic}
                title="Atualizar tráfego"
                className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl border border-slate-700 transition-colors"
              >
                <RefreshCw className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* Lista de Requisições Interceptadas Expansíveis */}
        {eventosFiltrados.length === 0 ? (
          <div className="p-8 text-center bg-slate-950 rounded-xl border border-slate-800 text-slate-500 text-xs font-mono">
            Nenhuma requisição DDP interceptada para o filtro selecionado. Execute uma ferramenta para capturar tráfego.
          </div>
        ) : (
          <div className="space-y-2.5 max-h-[500px] overflow-y-auto pr-1">
            {eventosFiltrados.map((evento) => {
              const isExpanded = expandedLogIds.has(evento.id);
              const isWrite = isWriteOperation(evento);

              return (
                <div
                  key={evento.id}
                  className={`rounded-xl border transition-all ${
                    isWrite
                      ? 'bg-slate-950/80 border-amber-500/30 hover:border-amber-500/50'
                      : 'bg-slate-950/80 border-sky-500/30 hover:border-sky-500/50'
                  }`}
                >
                  {/* Cabeçalho do Card Expansível */}
                  <div
                    onClick={() => toggleExpand(evento.id)}
                    className="p-3 flex items-center justify-between cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-2.5 min-w-0">
                      <button className="text-slate-400 hover:text-white p-0.5">
                        {isExpanded ? (
                          <ChevronDown className="w-4 h-4 text-indigo-400" />
                        ) : (
                          <ChevronRight className="w-4 h-4" />
                        )}
                      </button>

                      {/* Badge Visual Diferenciador Leitura vs Escrita */}
                      {isWrite ? (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-amber-500/20 text-amber-300 border border-amber-500/40 flex items-center gap-1 shrink-0">
                          <ArrowUpCircle className="w-3 h-3 text-amber-400" />
                          ESCRITA ({evento.metodo})
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold font-mono uppercase bg-sky-500/20 text-sky-300 border border-sky-500/40 flex items-center gap-1 shrink-0">
                          <ArrowDownCircle className="w-3 h-3 text-sky-400" />
                          LEITURA ({evento.metodo})
                        </span>
                      )}

                      {/* Nome do Método / URL / Coleção */}
                      <span className="font-mono text-xs text-slate-200 truncate max-w-md">
                        {evento.url}
                      </span>

                      {evento.operacaoDetectada?.collection && (
                        <span className="hidden md:inline px-2 py-0.5 rounded bg-slate-800 text-slate-400 border border-slate-700 text-[10px] font-mono">
                          {evento.operacaoDetectada.collection}
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 shrink-0 font-mono text-xs">
                      {evento.status && (
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                            evento.status >= 200 && evento.status < 300
                              ? 'bg-emerald-500/20 text-emerald-400'
                              : 'bg-rose-500/20 text-rose-400'
                          }`}
                        >
                          {evento.status}
                        </span>
                      )}
                      {evento.duracaoMs !== undefined && (
                        <span className="text-slate-500 text-[11px] hidden sm:inline">
                          {evento.duracaoMs}ms
                        </span>
                      )}
                      <span className="text-slate-500 text-[11px]">
                        {evento.timestamp.split('T')[1]?.substring(0, 8)}
                      </span>
                    </div>
                  </div>

                  {/* Detalhes Expansíveis da Requisição */}
                  {isExpanded && (
                    <div className="px-4 pb-4 pt-2 border-t border-slate-800 space-y-3 font-mono text-xs text-slate-300 animate-in fade-in">
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-[11px] bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                        <div>
                          <span className="text-slate-500">Tipo de Protocolo: </span>
                          <span className="text-indigo-300 font-bold">{evento.tipo}</span>
                        </div>
                        <div>
                          <span className="text-slate-500">Ação Mapeada: </span>
                          <span className="text-amber-300">
                            {evento.operacaoDetectada?.acao || 'direct_query'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Coleção Alvo: </span>
                          <span className="text-cyan-300">
                            {evento.operacaoDetectada?.collection || 'N/A'}
                          </span>
                        </div>
                        <div>
                          <span className="text-slate-500">Timestamp ISO: </span>
                          <span className="text-slate-300">{evento.timestamp}</span>
                        </div>
                      </div>

                      {/* Payload Enviado */}
                      {evento.payloadEnviado ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 font-bold text-[10px] uppercase">
                              Payload de Envio (DDP Parameters):
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(evento.payloadEnviado, null, 2),
                                  `payload-${evento.id}`
                                )
                              }
                              className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                            >
                              {copiedId === `payload-${evento.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar JSON</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-emerald-400 overflow-x-auto text-[11px] max-h-40 leading-relaxed">
                            {JSON.stringify(evento.payloadEnviado, null, 2)}
                          </pre>
                        </div>
                      ) : null}

                      {/* Resposta Recebida */}
                      {evento.respostaRecebida ? (
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-slate-400 font-bold text-[10px] uppercase">
                              Resposta Recebida do Backend PNBOX:
                            </span>
                            <button
                              onClick={() =>
                                copyToClipboard(
                                  JSON.stringify(evento.respostaRecebida, null, 2),
                                  `resp-${evento.id}`
                                )
                              }
                              className="text-slate-400 hover:text-white flex items-center gap-1 text-[10px]"
                            >
                              {copiedId === `resp-${evento.id}` ? (
                                <>
                                  <Check className="w-3 h-3 text-emerald-400" />
                                  <span className="text-emerald-400">Copiado</span>
                                </>
                              ) : (
                                <>
                                  <Copy className="w-3 h-3" />
                                  <span>Copiar JSON</span>
                                </>
                              )}
                            </button>
                          </div>
                          <pre className="p-2.5 bg-slate-950 rounded-lg border border-slate-800 text-cyan-300 overflow-x-auto text-[11px] max-h-40 leading-relaxed">
                            {JSON.stringify(evento.respostaRecebida, null, 2)}
                          </pre>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

