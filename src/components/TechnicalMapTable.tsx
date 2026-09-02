import React, { useState } from 'react';
import {
  Layers,
  Search,
  Code2,
  CheckCircle2,
  Zap,
  ExternalLink,
  ChevronRight,
  Send,
  SlidersHorizontal,
  FileCheck
} from 'lucide-react';
import { FerramentaInfo } from '../types/pnbox';

interface TechnicalMapTableProps {
  ferramentas: FerramentaInfo[];
  onSelectFerramentaForValidation: (ferramenta: FerramentaInfo) => void;
  onSelectFerramentaForExecution: (ferramenta: FerramentaInfo) => void;
}

export const TechnicalMapTable: React.FC<TechnicalMapTableProps> = ({
  ferramentas,
  onSelectFerramentaForValidation,
  onSelectFerramentaForExecution
}) => {
  const [blocoFiltro, setBlocoFiltro] = useState<string>('TODOS');
  const [busca, setBusca] = useState<string>('');
  const [ferramentaDetalhada, setFerramentaDetalhada] = useState<FerramentaInfo | null>(null);

  const blocos = [
    { id: 'TODOS', label: 'Todos os Blocos' },
    { id: 'CLIENTE_MERCADO', label: '1. Cliente - Mercado' },
    { id: 'PROBLEMA_SOLUCAO', label: '2. Problema - Solução' },
    { id: 'ESTRATEGIA', label: '3. Estratégia' },
    { id: 'FINANCAS', label: '4. Finanças' },
    { id: 'COMPLEMENTARES', label: '5. Complementares' }
  ];

  const ferramentasFiltradas = ferramentas.filter((f) => {
    const matchBloco = blocoFiltro === 'TODOS' || f.bloco === blocoFiltro;
    const matchBusca =
      busca === '' ||
      f.nome.toLowerCase().includes(busca.toLowerCase()) ||
      f.collectionName.toLowerCase().includes(busca.toLowerCase()) ||
      f.id.toLowerCase().includes(busca.toLowerCase());
    return matchBloco && matchBusca;
  });

  const getBlocoBadgeColor = (bloco: FerramentaInfo['bloco']) => {
    switch (bloco) {
      case 'CLIENTE_MERCADO':
        return 'bg-blue-500/20 text-blue-300 border-blue-500/30';
      case 'PROBLEMA_SOLUCAO':
        return 'bg-amber-500/20 text-amber-300 border-amber-500/30';
      case 'ESTRATEGIA':
        return 'bg-purple-500/20 text-purple-300 border-purple-500/30';
      case 'FINANCAS':
        return 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30';
      case 'COMPLEMENTARES':
        return 'bg-indigo-500/20 text-indigo-300 border-indigo-500/30';
      default:
        return 'bg-slate-700 text-slate-300 border-slate-600';
    }
  };

  return (
    <div className="space-y-6">
      {/* Barra de Filtros e Busca */}
      <div className="bg-slate-900 p-4 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-center justify-between gap-4 shadow-sm">
        {/* Filtro por Bloco */}
        <div className="flex items-center gap-2 overflow-x-auto w-full md:w-auto pb-2 md:pb-0">
          <SlidersHorizontal className="w-4 h-4 text-slate-400 hidden sm:block shrink-0" />
          {blocos.map((b) => (
            <button
              key={b.id}
              onClick={() => setBlocoFiltro(b.id)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg whitespace-nowrap transition-colors ${
                blocoFiltro === b.id
                  ? 'bg-indigo-600 text-white shadow-md shadow-indigo-600/30'
                  : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white border border-slate-700/50'
              }`}
            >
              {b.label}
            </button>
          ))}
        </div>

        {/* Input de Busca */}
        <div className="relative w-full md:w-72">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={busca}
            onChange={(e) => setBusca(e.target.value)}
            placeholder="Buscar ferramenta ou collection..."
            className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-700 rounded-xl text-slate-200 text-xs focus:outline-none focus:border-indigo-500"
          />
        </div>
      </div>

      {/* Tabela do Mapa Técnico */}
      <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 text-slate-400 uppercase tracking-wider font-semibold border-b border-slate-800">
              <tr>
                <th className="py-3.5 px-4">Ferramenta & Bloco</th>
                <th className="py-3.5 px-4">Collection / Identificador</th>
                <th className="py-3.5 px-4">Protocolo & Endpoint</th>
                <th className="py-3.5 px-4">Métodos DDP / CRUD</th>
                <th className="py-3.5 px-4 text-center">Execução Direta</th>
                <th className="py-3.5 px-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60 font-sans">
              {ferramentasFiltradas.map((f) => (
                <tr key={f.id} className="hover:bg-slate-800/40 transition-colors group">
                  {/* Nome & Bloco */}
                  <td className="py-3.5 px-4">
                    <div className="font-semibold text-slate-100 text-sm">{f.nome}</div>
                    <div className="flex items-center gap-2 mt-1">
                      <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full border ${getBlocoBadgeColor(f.bloco)}`}>
                        {f.blocoLabel}
                      </span>
                      <span className="text-[11px] text-slate-500 font-mono">/{f.id}</span>
                    </div>
                  </td>

                  {/* Collection */}
                  <td className="py-3.5 px-4">
                    <div className="font-mono text-cyan-400 font-medium">{f.collectionName}</div>
                    <div className="text-[11px] text-slate-500 mt-0.5">
                      {f.camposSchema.length} campos mapeados
                    </div>
                  </td>

                  {/* Endpoint */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-1.5 font-mono text-[11px] text-indigo-300">
                      <span className="px-1.5 py-0.5 rounded bg-indigo-500/20 text-indigo-300 text-[10px] font-semibold">
                        {f.metodoHttp}
                      </span>
                      <span className="truncate max-w-[170px]" title={f.endpointHttp}>
                        {f.endpointHttp}
                      </span>
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 font-mono">
                      Sub: {f.collectionName}.default
                    </div>
                  </td>

                  {/* Métodos DDP */}
                  <td className="py-3.5 px-4">
                    <div className="flex flex-wrap gap-1">
                      {f.metodosDDP.slice(0, 3).map((m, idx) => (
                        <span
                          key={idx}
                          className="px-1.5 py-0.5 bg-slate-950 text-slate-300 border border-slate-700/60 rounded font-mono text-[10px]"
                        >
                          {m.split('.')[1] || m}
                        </span>
                      ))}
                    </div>
                  </td>

                  {/* Status Sem Renderização */}
                  <td className="py-3.5 px-4 text-center">
                    <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-emerald-950/40 border border-emerald-500/30 text-emerald-300 text-[11px] font-medium">
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                      100% Headless
                    </span>
                  </td>

                  {/* Ações */}
                  <td className="py-3.5 px-4 text-right whitespace-nowrap">
                    <div className="flex items-center justify-end gap-1.5">
                      <button
                        onClick={() => setFerramentaDetalhada(f)}
                        title="Ver Schema e Payload Completo"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-lg border border-slate-700 transition-colors"
                      >
                        <Code2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectFerramentaForValidation(f)}
                        title="Validar JSON no Comparador"
                        className="p-1.5 bg-slate-800 hover:bg-slate-700 text-indigo-300 hover:text-indigo-200 rounded-lg border border-slate-700 transition-colors"
                      >
                        <FileCheck className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => onSelectFerramentaForExecution(f)}
                        title="Disparar Gravação Direta Sem Renderização"
                        className="px-2.5 py-1.5 bg-indigo-600/90 hover:bg-indigo-500 text-white rounded-lg text-[11px] font-medium transition-colors flex items-center gap-1 shadow-sm"
                      >
                        <Send className="w-3 h-3" />
                        <span>Executar</span>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Detalhes do Schema da Ferramenta */}
      {ferramentaDetalhada && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl w-full max-w-3xl max-h-[90vh] overflow-y-auto shadow-2xl p-6 space-y-6 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-start justify-between border-b border-slate-800 pb-4">
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-lg font-bold text-white">{ferramentaDetalhada.nome}</h3>
                  <span className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${getBlocoBadgeColor(ferramentaDetalhada.bloco)}`}>
                    {ferramentaDetalhada.blocoLabel}
                  </span>
                </div>
                <p className="text-xs text-slate-400 mt-1">{ferramentaDetalhada.descricao}</p>
              </div>
              <button
                onClick={() => setFerramentaDetalhada(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
              >
                ✕
              </button>
            </div>

            {/* Metadados Técnicos */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs font-mono">
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Collection:</span>
                <span className="text-cyan-400 font-semibold">{ferramentaDetalhada.collectionName}</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Protocolo / Gateway:</span>
                <span className="text-indigo-400 font-semibold">WebSocket DDP</span>
              </div>
              <div className="p-3 bg-slate-950 rounded-xl border border-slate-800">
                <span className="text-slate-500 block text-[10px] uppercase">Rota Visual PNBOX:</span>
                <span className="text-slate-300 truncate block" title={ferramentaDetalhada.rotaInterface}>
                  {ferramentaDetalhada.rotaInterface}
                </span>
              </div>
            </div>

            {/* Tabela de Campos do Schema */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-3 flex items-center gap-2">
                <Layers className="w-4 h-4 text-indigo-400" />
                Estrutura de Campos do Schema (Payload de Gravação)
              </h4>
              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-900/80 text-slate-400 font-mono text-[11px] border-b border-slate-800">
                    <tr>
                      <th className="py-2.5 px-3">Campo</th>
                      <th className="py-2.5 px-3">Tipo</th>
                      <th className="py-2.5 px-3">Obrigatório</th>
                      <th className="py-2.5 px-3">Descrição</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 font-mono text-[11px]">
                    {ferramentaDetalhada.camposSchema.map((c, idx) => (
                      <tr key={idx}>
                        <td className="py-2 px-3 text-indigo-300 font-semibold">{c.nome}</td>
                        <td className="py-2 px-3 text-cyan-400">{c.tipo}</td>
                        <td className="py-2 px-3">
                          {c.obrigatorio ? (
                            <span className="text-amber-400 font-semibold">Sim</span>
                          ) : (
                            <span className="text-slate-500">Opcional</span>
                          )}
                        </td>
                        <td className="py-2 px-3 text-slate-400 font-sans">{c.descricao}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Exemplo de Payload JSON Real */}
            <div>
              <h4 className="text-xs font-semibold uppercase tracking-wider text-slate-300 mb-2 flex items-center gap-2">
                <Code2 className="w-4 h-4 text-indigo-400" />
                Exemplo de Payload Válido para Automação Direta
              </h4>
              <pre className="p-4 bg-slate-950 rounded-xl border border-slate-800 font-mono text-xs text-emerald-400 overflow-x-auto">
                {JSON.stringify(ferramentaDetalhada.exemploPayload, null, 2)}
              </pre>
            </div>

            {/* Rodapé de Ações do Modal */}
            <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800">
              <button
                onClick={() => {
                  onSelectFerramentaForValidation(ferramentaDetalhada);
                  setFerramentaDetalhada(null);
                }}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium rounded-xl border border-slate-700"
              >
                Abrir no Validador Diff
              </button>
              <button
                onClick={() => {
                  onSelectFerramentaForExecution(ferramentaDetalhada);
                  setFerramentaDetalhada(null);
                }}
                className="px-4 py-2 bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-medium rounded-xl shadow-lg shadow-indigo-600/30 flex items-center gap-1.5"
              >
                <Zap className="w-3.5 h-3.5" />
                Disparar Execução Direta DDP
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
