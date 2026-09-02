import React, { useState } from 'react';
import {
  Activity,
  ArrowUpRight,
  ArrowDownLeft,
  Filter,
  Trash2,
  RefreshCw,
  Code2,
  CheckCircle2,
  AlertTriangle,
  Send,
  Zap
} from 'lucide-react';
import { InterceptedTrafficEvent, FerramentaInfo } from '../types/pnbox';

interface TrafficMonitorPanelProps {
  eventos: InterceptedTrafficEvent[];
  ferramentas: FerramentaInfo[];
  onLimparTrafego: () => void;
  onRecarregarTrafego: () => void;
  onSendToValidator: (json: unknown, ferramentaId?: string) => void;
}

export const TrafficMonitorPanel: React.FC<TrafficMonitorPanelProps> = ({
  eventos,
  ferramentas,
  onLimparTrafego,
  onRecarregarTrafego,
  onSendToValidator
}) => {
  const [filtroTipo, setFiltroTipo] = useState<string>('all');
  const [apenasSalvamento, setApenasSalvamento] = useState<boolean>(false);
  const [filtroFerramenta, setFiltroFerramenta] = useState<string>('all');
  const [eventoSelecionado, setEventoSelecionado] = useState<InterceptedTrafficEvent | null>(
    eventos.length > 0 ? eventos[0] : null
  );

  const eventosFiltrados = eventos.filter((e) => {
    if (filtroTipo !== 'all' && e.tipo !== filtroTipo) return false;
    if (
      apenasSalvamento &&
      e.operacaoDetectada?.acao !== 'insert' &&
      e.operacaoDetectada?.acao !== 'update' &&
      e.operacaoDetectada?.acao !== 'save' &&
      !['POST', 'PUT', 'PATCH'].includes(e.metodo)
    ) {
      return false;
    }
    if (
      filtroFerramenta !== 'all' &&
      e.operacaoDetectada?.ferramentaId !== filtroFerramenta &&
      e.operacaoDetectada?.collection !== filtroFerramenta
    ) {
      return false;
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Barra de Filtros & Ações do Monitor */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-wrap items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <Filter className="w-3.5 h-3.5 text-indigo-400" />
            <span className="text-slate-400">Tipo:</span>
            <select
              value={filtroTipo}
              onChange={(e) => setFiltroTipo(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer"
            >
              <option value="all" className="bg-slate-900">Todos os Protocolos</option>
              <option value="websocket_ddp" className="bg-slate-900">WebSocket (Meteor DDP)</option>
              <option value="fetch" className="bg-slate-900">Fetch / REST</option>
              <option value="xhr" className="bg-slate-900">XHR</option>
            </select>
          </div>

          <div className="flex items-center gap-1.5 bg-slate-950 px-3 py-1.5 rounded-xl border border-slate-800 text-xs">
            <span className="text-slate-400">Ferramenta:</span>
            <select
              value={filtroFerramenta}
              onChange={(e) => setFiltroFerramenta(e.target.value)}
              className="bg-transparent text-slate-200 font-medium focus:outline-none cursor-pointer max-w-[160px] truncate"
            >
              <option value="all" className="bg-slate-900">Todas as Ferramentas</option>
              {ferramentas.map((f) => (
                <option key={f.id} value={f.id} className="bg-slate-900">
                  {f.nome}
                </option>
              ))}
            </select>
          </div>

          <button
            onClick={() => setApenasSalvamento(!apenasSalvamento)}
            className={`px-3 py-1.5 text-xs font-medium rounded-xl border transition-colors flex items-center gap-1.5 ${
              apenasSalvamento
                ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                : 'bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200'
            }`}
          >
            <Zap className="w-3.5 h-3.5" />
            <span>Apenas Endpoints de Salvamento</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRecarregarTrafego}
            className="p-2 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl border border-slate-700 transition-colors"
            title="Recarregar eventos de tráfego"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
          <button
            onClick={onLimparTrafego}
            className="p-2 bg-slate-800 hover:bg-rose-950/40 text-slate-300 hover:text-rose-300 rounded-xl border border-slate-700 hover:border-rose-500/30 transition-colors"
            title="Limpar histórico"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Grid: Lista de Requisições + Detalhes do Payload */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Lista de Eventos Interceptados */}
        <div className="lg:col-span-5 bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
          <div className="p-3.5 bg-slate-950/80 border-b border-slate-800 flex items-center justify-between text-xs font-semibold text-slate-300">
            <div className="flex items-center gap-2">
              <Activity className="w-4 h-4 text-indigo-400" />
              <span>Eventos Interceptados ({eventosFiltrados.length})</span>
            </div>
            <span className="text-[11px] font-mono text-slate-500">Auto-Captura Ativa</span>
          </div>

          <div className="divide-y divide-slate-800/60 max-h-[600px] overflow-y-auto">
            {eventosFiltrados.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-xs">
                Nenhum evento corresponde aos filtros selecionados.
              </div>
            ) : (
              eventosFiltrados.map((evt) => {
                const isSelected = eventoSelecionado?.id === evt.id;
                const isSave =
                  evt.operacaoDetectada?.acao === 'insert' ||
                  evt.operacaoDetectada?.acao === 'update' ||
                  evt.operacaoDetectada?.acao === 'save';

                return (
                  <div
                    key={evt.id}
                    onClick={() => setEventoSelecionado(evt)}
                    className={`p-3.5 cursor-pointer transition-colors ${
                      isSelected
                        ? 'bg-indigo-600/15 border-l-4 border-indigo-500'
                        : 'hover:bg-slate-800/40'
                    }`}
                  >
                    <div className="flex items-center justify-between gap-2 mb-1">
                      <div className="flex items-center gap-1.5">
                        <span
                          className={`px-1.5 py-0.5 rounded text-[10px] font-mono font-bold ${
                            evt.tipo === 'websocket_ddp'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-blue-500/20 text-blue-300 border border-blue-500/30'
                          }`}
                        >
                          {evt.metodo}
                        </span>

                        {isSave && (
                          <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                            SALVAMENTO
                          </span>
                        )}
                      </div>

                      <span className="text-[10px] font-mono text-slate-500">
                        {evt.timestamp.split('T')[1]?.substring(0, 8)}
                      </span>
                    </div>

                    <div className="font-mono text-xs text-slate-200 truncate" title={evt.url}>
                      {evt.operacaoDetectada?.collection
                        ? `${evt.operacaoDetectada.collection}.${evt.operacaoDetectada.acao}`
                        : evt.url}
                    </div>

                    <div className="flex items-center justify-between mt-2 text-[11px] text-slate-400">
                      <span>Status: <strong className={evt.status === 200 || evt.status === 101 ? 'text-emerald-400' : 'text-amber-400'}>{evt.status}</strong></span>
                      {evt.duracaoMs && <span>{evt.duracaoMs}ms</span>}
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        {/* Visualizador de Payload & Resposta Inspecionada */}
        <div className="lg:col-span-7 space-y-4">
          {eventoSelecionado ? (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-5 space-y-5 shadow-sm">
              <div className="flex items-start justify-between border-b border-slate-800 pb-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-semibold px-2 py-0.5 bg-indigo-500/20 text-indigo-300 rounded border border-indigo-500/30">
                      {eventoSelecionado.metodo}
                    </span>
                    <h4 className="text-sm font-bold text-slate-100 font-mono break-all">
                      {eventoSelecionado.url}
                    </h4>
                  </div>
                  <p className="text-xs text-slate-400 mt-1">
                    Interceptado em: <span className="font-mono text-slate-300">{eventoSelecionado.timestamp}</span>
                  </p>
                </div>

                <button
                  onClick={() => {
                    const payload =
                      eventoSelecionado.payloadEnviado?.params?.[0] || eventoSelecionado.payloadEnviado;
                    onSendToValidator(payload, eventoSelecionado.operacaoDetectada?.ferramentaId);
                  }}
                  className="px-3 py-1.5 bg-indigo-600 hover:bg-indigo-500 text-white rounded-xl text-xs font-medium flex items-center gap-1.5 shadow-md shadow-indigo-600/30 whitespace-nowrap cursor-pointer"
                >
                  <Send className="w-3 h-3" />
                  <span>Validar Payload no Diff</span>
                </button>
              </div>

              {/* Payload Enviado (Request Body / DDP Message) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowUpRight className="w-4 h-4 text-indigo-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    Payload Enviado (Request / Params DDP)
                  </span>
                </div>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-indigo-300 overflow-x-auto max-h-64">
                  {JSON.stringify(eventoSelecionado.payloadEnviado, null, 2)}
                </pre>
              </div>

              {/* Resposta Recebida (Response / Result DDP) */}
              <div>
                <div className="flex items-center gap-2 mb-2">
                  <ArrowDownLeft className="w-4 h-4 text-emerald-400" />
                  <span className="text-xs font-semibold uppercase tracking-wider text-slate-300 font-mono">
                    Resposta do Servidor (Response / Result)
                  </span>
                </div>
                <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto max-h-64">
                  {JSON.stringify(eventoSelecionado.respostaRecebida, null, 2)}
                </pre>
              </div>
            </div>
          ) : (
            <div className="bg-slate-900 rounded-2xl border border-slate-800 p-12 text-center text-slate-500 text-xs">
              Selecione um evento de tráfego na lista à esquerda para inspecionar os payloads e respostas.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
