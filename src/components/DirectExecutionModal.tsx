import React, { useState, useRef } from 'react';
import {
  Zap,
  Send,
  CheckCircle2,
  AlertCircle,
  RotateCw,
  Clock,
  ShieldCheck,
  AlertTriangle,
  XCircle,
  Sliders,
  Sparkles
} from 'lucide-react';
import { FerramentaInfo } from '../types/pnbox';

interface DirectExecutionModalProps {
  ferramenta: FerramentaInfo;
  idPlano: string;
  onClose: () => void;
  onSuccess: (resultado: any) => void;
}

interface RetryLogEntry {
  tentativa: number;
  tipo: 'erro_temporario' | 'timeout' | 'sucesso' | 'erro_fatal';
  mensagem: string;
  statusHttp?: number;
  tempoEsperaMs?: number;
  timestamp: string;
}

export const DirectExecutionModal: React.FC<DirectExecutionModalProps> = ({
  ferramenta,
  idPlano,
  onClose,
  onSuccess
}) => {
  const [payloadText, setPayloadText] = useState<string>(
    JSON.stringify(ferramenta.exemploPayload, null, 2)
  );
  const [isExecuting, setIsExecuting] = useState<boolean>(false);
  const [execResult, setExecResult] = useState<any>(null);

  // Configuração e Estado de Retry com Backoff Exponencial
  const [maxRetries, setMaxRetries] = useState<number>(3);
  const [baseDelayMs, setBaseDelayMs] = useState<number>(800);
  const [backoffMultiplier, setBackoffMultiplier] = useState<number>(2);
  const [simulateTemporary503, setSimulateTemporary503] = useState<boolean>(false);

  // Estado ativo de tentativas
  const [tentativaAtual, setTentativaAtual] = useState<number>(0);
  const [statusRetryMsg, setStatusRetryMsg] = useState<string | null>(null);
  const [countdownMs, setCountdownMs] = useState<number>(0);
  const [logsRetry, setLogsRetry] = useState<RetryLogEntry[]>([]);

  const abortControllerRef = useRef<AbortController | null>(null);
  const isCancelledRef = useRef<boolean>(false);

  // Função utilitária para delay com verificação de cancelamento
  const sleep = (ms: number) => {
    return new Promise((resolve, reject) => {
      let passed = 0;
      const step = 50;
      const interval = setInterval(() => {
        if (isCancelledRef.current) {
          clearInterval(interval);
          reject(new Error('Execução cancelada pelo usuário'));
          return;
        }
        passed += step;
        setCountdownMs(Math.max(0, ms - passed));
        if (passed >= ms) {
          clearInterval(interval);
          resolve(true);
        }
      }, step);
    });
  };

  const handleCancelRetry = () => {
    isCancelledRef.current = true;
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsExecuting(false);
    setStatusRetryMsg('Execução e retentativas canceladas pelo usuário.');
    setLogsRetry((prev) => [
      ...prev,
      {
        tentativa: tentativaAtual,
        tipo: 'erro_fatal',
        mensagem: 'Execução e ciclo de retentativas cancelados manualmente.',
        timestamp: new Date().toISOString()
      }
    ]);
  };

  const handleExecute = async () => {
    setIsExecuting(true);
    setExecResult(null);
    setLogsRetry([]);
    isCancelledRef.current = false;

    let parsedPayload: any;
    try {
      parsedPayload = JSON.parse(payloadText);
    } catch (err: any) {
      alert(`JSON inválido: ${err.message}`);
      setIsExecuting(false);
      return;
    }

    let tentativa = 1;
    const totalTentativasPermitidas = maxRetries + 1; // 1 inicial + N retentativas
    let sucesso = false;
    let ultimoErro: any = null;

    while (tentativa <= totalTentativasPermitidas && !isCancelledRef.current) {
      setTentativaAtual(tentativa);
      const isRetry = tentativa > 1;

      if (isRetry) {
        setStatusRetryMsg(
          `[Tentativa ${tentativa}/${totalTentativasPermitidas}] Executando requisição após backoff exponencial...`
        );
      } else {
        setStatusRetryMsg(`[Tentativa 1/${totalTentativasPermitidas}] Enviando payload ao backend Meteor DDP...`);
      }

      try {
        abortControllerRef.current = new AbortController();
        const timeoutId = setTimeout(() => {
          abortControllerRef.current?.abort();
        }, 5000); // 5s timeout por tentativa

        // Se estiver com teste de 503 marcado, simula 503 na 1ª tentativa e recupera na 2ª
        const deveSimularErroNestaTentativa = simulateTemporary503 && tentativa === 1;

        const res = await fetch('/api/automation/execute-direct', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          signal: abortControllerRef.current.signal,
          body: JSON.stringify({
            ferramentaId: ferramenta.id,
            payload: parsedPayload,
            idPlano,
            simulate503: deveSimularErroNestaTentativa
          })
        });

        clearTimeout(timeoutId);

        // Se for 5xx (500, 502, 503, 504), é erro temporário elegível para retry
        if (res.status >= 500 && res.status <= 599) {
          const errData = await res.json().catch(() => ({ mensagem: `Erro HTTP ${res.status}` }));
          throw {
            isTemporaryError: true,
            status: res.status,
            message: errData.mensagem || `HTTP ${res.status} Server Error`
          };
        }

        const data = await res.json();

        // Resposta recebida com sucesso
        setExecResult(data);
        sucesso = true;
        setStatusRetryMsg(
          tentativa > 1
            ? `Sucesso alcançado na tentativa ${tentativa} após recuperação automática por backoff!`
            : 'Sucesso na primeira tentativa!'
        );

        setLogsRetry((prev) => [
          ...prev,
          {
            tentativa,
            tipo: 'sucesso',
            mensagem: `Gravação DDP concluída com sucesso (Doc ID: ${data.docId || 'OK'})`,
            statusHttp: res.status,
            timestamp: new Date().toISOString()
          }
        ]);

        if (data.status === 'ok') {
          onSuccess(data);
        }
        break; // Sai do loop com sucesso
      } catch (err: any) {
        if (isCancelledRef.current) break;

        const isTimeout = err.name === 'AbortError' || err.message?.includes('aborted');
        const isTemporary5xx = err.isTemporaryError || (err.status >= 500 && err.status <= 599);
        const isNetworkFail = !err.status && !isTimeout;

        const isEligibleForRetry = (isTemporary5xx || isTimeout || isNetworkFail) && tentativa < totalTentativasPermitidas;

        const errorDesc = isTimeout
          ? 'Timeout de 5000ms atingido na requisição'
          : isTemporary5xx
          ? `Erro Temporário de Servidor (HTTP ${err.status}): ${err.message}`
          : `Falha de Conexão/Rede: ${err.message || 'Falha temporária'}`;

        ultimoErro = errorDesc;

        if (isEligibleForRetry) {
          // Cálculo do Backoff Exponencial: Base * (Multiplicador ^ (tentativa - 1)) + Jitter
          const backoffExponencial = baseDelayMs * Math.pow(backoffMultiplier, tentativa - 1);
          const jitter = Math.floor(Math.random() * 150);
          const delayCalculado = backoffExponencial + jitter;

          setLogsRetry((prev) => [
            ...prev,
            {
              tentativa,
              tipo: isTimeout ? 'timeout' : 'erro_temporario',
              mensagem: `${errorDesc}. Agendando nova tentativa com backoff exponencial...`,
              statusHttp: err.status || 0,
              tempoEsperaMs: delayCalculado,
              timestamp: new Date().toISOString()
            }
          ]);

          setStatusRetryMsg(
            `Falha temporária na tentativa ${tentativa}. Aguardando ${(delayCalculado / 1000).toFixed(
              1
            )}s (Backoff Exponencial) antes da tentativa ${tentativa + 1}...`
          );

          try {
            await sleep(delayCalculado);
          } catch {
            // Cancelado durante o sleep
            break;
          }

          tentativa++;
        } else {
          // Erro fatal ou esgotamento de tentativas
          setLogsRetry((prev) => [
            ...prev,
            {
              tentativa,
              tipo: 'erro_fatal',
              mensagem: `Tentativa ${tentativa} falhou: ${errorDesc}. Limite de retentativas atingido.`,
              statusHttp: err.status || 500,
              timestamp: new Date().toISOString()
            }
          ]);
          break;
        }
      }
    }

    if (!sucesso && !isCancelledRef.current) {
      setExecResult({
        status: 'error',
        mensagem: `Todas as ${totalTentativasPermitidas} tentativas falharam. Último erro: ${ultimoErro}`
      });
    }

    setIsExecuting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-5 animate-in fade-in zoom-in-95 duration-150">
        {/* Cabeçalho do Modal */}
        <div className="flex items-start justify-between border-b border-slate-800 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5 text-amber-400" />
              <h3 className="text-base font-bold text-white">
                Execução Direta Sem Renderização (DDP Headless)
              </h3>
            </div>
            <p className="text-xs text-slate-400 mt-1">
              Alvo: <strong className="text-slate-200">{ferramenta.nome}</strong> • Coleção:{' '}
              <span className="font-mono text-cyan-400">{ferramenta.collectionName}</span>
            </p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Banner Informativo */}
        <div className="p-3 bg-indigo-950/30 border border-indigo-500/30 rounded-xl text-xs text-indigo-300">
          Esta chamada grava dados diretamente via protocolo Meteor DDP{' '}
          <code className="font-mono font-bold text-white">({ferramenta.collectionName}.insert)</code>,
          sem precisar de carregamento de DOM, cliques ou renderização de interface.
        </div>

        {/* Seção de Configuração de Retry com Backoff Exponencial */}
        <div className="p-3.5 bg-slate-950/70 border border-slate-800 rounded-xl text-xs space-y-3">
          <div className="flex items-center justify-between">
            <span className="font-semibold text-slate-200 flex items-center gap-1.5">
              <RotateCw className="w-3.5 h-3.5 text-indigo-400" />
              Resiliência & Retry Automático com Backoff Exponencial
            </span>
            <span className="px-2 py-0.5 bg-indigo-500/20 text-indigo-300 border border-indigo-500/30 rounded-full text-[10px] font-mono">
              Auto-Recovery 5xx / Timeout
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1">
                Max Retentativas:
              </label>
              <select
                value={maxRetries}
                onChange={(e) => setMaxRetries(Number(e.target.value))}
                disabled={isExecuting}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
              >
                <option value={1}>1 retentativa</option>
                <option value={2}>2 retentativas</option>
                <option value={3}>3 retentativas (Recomendado)</option>
                <option value={5}>5 retentativas</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1">
                Delay Base:
              </label>
              <select
                value={baseDelayMs}
                onChange={(e) => setBaseDelayMs(Number(e.target.value))}
                disabled={isExecuting}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
              >
                <option value={400}>400ms</option>
                <option value={800}>800ms (Padrão)</option>
                <option value={1200}>1200ms</option>
                <option value={2000}>2000ms</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] uppercase text-slate-400 font-mono mb-1">
                Multiplicador:
              </label>
              <select
                value={backoffMultiplier}
                onChange={(e) => setBackoffMultiplier(Number(e.target.value))}
                disabled={isExecuting}
                className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1 text-xs text-slate-200 font-mono"
              >
                <option value={1.5}>1.5x</option>
                <option value={2}>2.0x (Exponencial Padrão)</option>
                <option value={3}>3.0x</option>
              </select>
            </div>
          </div>

          {/* Switch para Simulação de Falha Temporária 503 */}
          <div className="pt-2 border-t border-slate-800/80 flex items-center justify-between">
            <label className="flex items-center gap-2 cursor-pointer text-[11px] text-slate-300">
              <input
                type="checkbox"
                checked={simulateTemporary503}
                onChange={(e) => setSimulateTemporary503(e.target.checked)}
                disabled={isExecuting}
                className="rounded border-slate-700 bg-slate-900 text-indigo-600 focus:ring-0 w-3.5 h-3.5"
              />
              <span>Simular falha temporária (HTTP 503) na 1ª tentativa para testar auto-recovery</span>
            </label>
            <span className="text-[10px] text-slate-500 font-mono hidden sm:inline">
              Fórmula: Base * {backoffMultiplier}^(n-1) + Jitter
            </span>
          </div>
        </div>

        {/* Editor de Payload */}
        <div>
          <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
            Payload DDP (Parâmetros de Gravação)
          </label>
          <textarea
            value={payloadText}
            onChange={(e) => setPayloadText(e.target.value)}
            disabled={isExecuting}
            rows={7}
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-emerald-400 font-mono text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
          />
        </div>

        {/* Painel de Status do Retry e Contagem Regressiva */}
        {isExecuting && (
          <div className="p-4 bg-indigo-950/40 border border-indigo-500/40 rounded-xl text-xs space-y-2 animate-pulse">
            <div className="flex items-center justify-between text-indigo-300">
              <div className="flex items-center gap-2 font-bold">
                <RotateCw className="w-4 h-4 animate-spin text-indigo-400" />
                <span>Tentativa {tentativaAtual} de {maxRetries + 1}</span>
              </div>
              {countdownMs > 0 && (
                <span className="font-mono text-amber-300 bg-amber-950/60 px-2 py-0.5 rounded border border-amber-500/30">
                  Próxima tentativa em: {(countdownMs / 1000).toFixed(1)}s
                </span>
              )}
            </div>
            <p className="text-slate-300 text-[11px] font-mono">{statusRetryMsg}</p>
          </div>
        )}

        {/* Histórico e Logs de Retentativa */}
        {logsRetry.length > 0 && (
          <div className="p-3 bg-slate-950 border border-slate-800 rounded-xl text-[11px] font-mono space-y-1.5 max-h-36 overflow-y-auto">
            <div className="text-slate-400 font-bold uppercase text-[10px] pb-1 border-b border-slate-800 flex justify-between">
              <span>Trilha de Execução & Backoff Exponencial</span>
              <span>{logsRetry.length} evento(s)</span>
            </div>
            {logsRetry.map((log, idx) => (
              <div key={idx} className="flex items-start gap-2">
                <span className="text-slate-600">[{log.timestamp.split('T')[1]?.substring(0, 8)}]</span>
                <span className="text-slate-400 font-semibold">T#{log.tentativa}:</span>
                <span
                  className={
                    log.tipo === 'sucesso'
                      ? 'text-emerald-400'
                      : log.tipo === 'timeout'
                      ? 'text-amber-400'
                      : log.tipo === 'erro_temporario'
                      ? 'text-yellow-300'
                      : 'text-rose-400'
                  }
                >
                  {log.tipo === 'sucesso' && '✔ '}
                  {log.tipo === 'erro_temporario' && '⏳ '}
                  {log.tipo === 'timeout' && '⏱ '}
                  {log.tipo === 'erro_fatal' && '✖ '}
                  {log.mensagem}
                  {log.tempoEsperaMs && ` [Backoff: ${(log.tempoEsperaMs / 1000).toFixed(2)}s]`}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* Resultado da Execução */}
        {execResult && !isExecuting && (
          <div
            className={`p-4 rounded-xl border text-xs font-mono space-y-1.5 ${
              execResult.status === 'ok'
                ? 'bg-emerald-950/30 border-emerald-500/40 text-emerald-300'
                : 'bg-rose-950/30 border-rose-500/40 text-rose-300'
            }`}
          >
            <div className="flex items-center gap-2 font-bold">
              {execResult.status === 'ok' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              ) : (
                <AlertCircle className="w-4 h-4 text-rose-400" />
              )}
              <span>{execResult.mensagem}</span>
            </div>
            {execResult.docId && <div>ID Gerado no Banco: {execResult.docId}</div>}
            {execResult.method && <div>Método DDP Executado: {execResult.method}</div>}
          </div>
        )}

        {/* Botões de Ação do Rodapé */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-800">
          <div>
            {isExecuting && (
              <button
                type="button"
                onClick={handleCancelRetry}
                className="px-3 py-1.5 bg-rose-950/60 hover:bg-rose-900/60 border border-rose-500/40 text-rose-300 text-xs font-medium rounded-xl flex items-center gap-1.5"
              >
                <XCircle className="w-3.5 h-3.5" />
                <span>Cancelar Retentativas</span>
              </button>
            )}
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={onClose}
              disabled={isExecuting}
              className="px-4 py-2 bg-slate-800 hover:bg-slate-700 disabled:opacity-50 text-slate-300 text-xs font-medium rounded-xl border border-slate-700"
            >
              Fechar
            </button>
            <button
              onClick={handleExecute}
              disabled={isExecuting}
              className="px-5 py-2 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-2 cursor-pointer"
            >
              {isExecuting ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Executando Resiliente...</span>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5" />
                  <span>Enviar Direto com Auto-Retry</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

