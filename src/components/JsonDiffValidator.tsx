import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Code2,
  Zap,
  ArrowRightLeft,
  Sparkles,
  Layers,
  Send
} from 'lucide-react';
import { FerramentaInfo, JsonDiffResult } from '../types/pnbox';

interface JsonDiffValidatorProps {
  ferramentas: FerramentaInfo[];
  ferramentaSelecionada?: FerramentaInfo;
  jsonInicial?: unknown;
  onExecuteDirect?: (ferramentaId: string, payload: unknown) => void;
}

export const JsonDiffValidator: React.FC<JsonDiffValidatorProps> = ({
  ferramentas,
  ferramentaSelecionada,
  jsonInicial,
  onExecuteDirect
}) => {
  const [selectedId, setSelectedId] = useState<string>(
    ferramentaSelecionada?.id || ferramentas[0]?.id || 'segmentacaoMercado'
  );
  const [jsonText, setJsonText] = useState<string>('');
  const [diffResult, setDiffResult] = useState<JsonDiffResult | null>(null);
  const [modoComparacao, setModoComparacao] = useState<'schema' | 'custom'>('schema');
  const [jsonEsperadoText, setJsonEsperadoText] = useState<string>('');
  const [isValidating, setIsValidating] = useState<boolean>(false);

  const ferramentaAtual = ferramentas.find((f) => f.id === selectedId) || ferramentas[0];

  useEffect(() => {
    if (jsonInicial) {
      setJsonText(JSON.stringify(jsonInicial, null, 2));
    } else if (ferramentaAtual) {
      setJsonText(JSON.stringify(ferramentaAtual.exemploPayload, null, 2));
    }
  }, [selectedId, jsonInicial]);

  const handleValidar = async () => {
    setIsValidating(true);
    try {
      let parsedCapturado: unknown;
      try {
        parsedCapturado = JSON.parse(jsonText);
      } catch (err: any) {
        setDiffResult({
          isValido: false,
          conformidadePercentual: 0,
          camposCorretos: [],
          camposFaltantes: [],
          camposExtras: [],
          errosDeTipo: [],
          resumo: `Erro de sintaxe no JSON: ${err.message}`,
          detalhes: [
            {
              campo: 'sintaxe',
              status: 'type_mismatch',
              mensagem: 'O texto inserido não possui formatação JSON válida.'
            }
          ]
        });
        setIsValidating(false);
        return;
      }

      let bodyPayload: Record<string, unknown> = {
        jsonCapturado: parsedCapturado
      };

      if (modoComparacao === 'custom') {
        try {
          bodyPayload.jsonEsperado = JSON.parse(jsonEsperadoText);
        } catch {
          alert('O JSON de referência esperado contém erros de sintaxe.');
          setIsValidating(false);
          return;
        }
      } else {
        bodyPayload.ferramentaId = selectedId;
      }

      const res = await fetch('/api/automation/validate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(bodyPayload)
      });

      const data = await res.json();
      if (data.status === 'ok') {
        setDiffResult(data.diff);
      }
    } catch (err: any) {
      alert(`Falha na validação: ${err.message}`);
    } finally {
      setIsValidating(false);
    }
  };

  const handleCarregarExemplo = () => {
    if (ferramentaAtual) {
      setJsonText(JSON.stringify(ferramentaAtual.exemploPayload, null, 2));
    }
  };

  const handleCarregarInvalido = () => {
    // Carrega um exemplo com campo ausente e tipo incorreto para demonstrar a robustez do validador
    if (ferramentaAtual) {
      const copy = { ...ferramentaAtual.exemploPayload } as any;
      delete copy[ferramentaAtual.camposSchema[0]?.nome || ''];
      copy['campo_nao_existente_aleatorio'] = 'teste';
      setJsonText(JSON.stringify(copy, null, 2));
    }
  };

  return (
    <div className="space-y-6">
      {/* Controles de Configuração da Validação */}
      <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-sm">
        <div className="flex flex-wrap items-center gap-3">
          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Ferramenta Alvo
            </label>
            <select
              value={selectedId}
              onChange={(e) => setSelectedId(e.target.value)}
              className="bg-slate-950 border border-slate-700 text-slate-200 text-xs rounded-xl px-3 py-2 font-medium focus:outline-none focus:border-indigo-500"
            >
              {ferramentas.map((f) => (
                <option key={f.id} value={f.id}>
                  {f.nome} ({f.collectionName})
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-1">
              Modo de Comparação
            </label>
            <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 text-xs">
              <button
                onClick={() => setModoComparacao('schema')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  modoComparacao === 'schema'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                Schema Catalog (Oficial)
              </button>
              <button
                onClick={() => setModoComparacao('custom')}
                className={`px-3 py-1 rounded-lg font-medium transition-colors ${
                  modoComparacao === 'custom'
                    ? 'bg-indigo-600 text-white'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                JSON Custom vs JSON
              </button>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleCarregarExemplo}
            className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white rounded-xl text-xs font-medium border border-slate-700 transition-colors"
          >
            Carregar Payload Válido
          </button>
          <button
            onClick={handleCarregarInvalido}
            className="px-3 py-1.5 bg-slate-800 hover:bg-amber-950/40 text-slate-300 hover:text-amber-300 rounded-xl text-xs font-medium border border-slate-700 hover:border-amber-500/30 transition-colors"
          >
            Simular Inconsistência
          </button>
        </div>
      </div>

      {/* Grid: Editores de JSON + Painel de Conformidade */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Editor de JSON Capturado */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-3 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Code2 className="w-4 h-4 text-indigo-400" />
              <h4 className="text-sm font-bold text-slate-100 font-mono">
                JSON Capturado / Payload da Automação
              </h4>
            </div>
            <span className="text-[11px] text-slate-500 font-mono">Formato Objeto JSON</span>
          </div>

          <textarea
            value={jsonText}
            onChange={(e) => setJsonText(e.target.value)}
            placeholder='{\n  "descricao": "...",\n  "quantidade": 1\n}'
            rows={14}
            className="w-full p-4 bg-slate-950 border border-slate-800 rounded-xl text-indigo-300 font-mono text-xs focus:outline-none focus:border-indigo-500 leading-relaxed resize-y"
          />

          {modoComparacao === 'custom' && (
            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div className="flex items-center gap-2 text-xs text-slate-300 font-mono">
                <ArrowRightLeft className="w-3.5 h-3.5 text-indigo-400" />
                <span>JSON de Referência Esperado</span>
              </div>
              <textarea
                value={jsonEsperadoText}
                onChange={(e) => setJsonEsperadoText(e.target.value)}
                placeholder='{\n  "descricao": "String",\n  "quantidade": 0\n}'
                rows={6}
                className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-slate-300 font-mono text-xs focus:outline-none focus:border-indigo-500 leading-relaxed"
              />
            </div>
          )}

          <div className="pt-2">
            <button
              onClick={handleValidar}
              disabled={isValidating}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-indigo-600/30 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              {isValidating ? (
                <>
                  <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Validando Conformidade...</span>
                </>
              ) : (
                <>
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>Executar Validação & Diff Contra o Schema</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Painel de Resultados do Diff & Conformidade */}
        <div className="bg-slate-900 p-5 rounded-2xl border border-slate-800 space-y-5 shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-800 pb-3">
            <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
              <FileCheck className="w-4 h-4 text-emerald-400" />
              Resultado da Validação de Schema
            </h4>
            {diffResult && (
              <span
                className={`px-2 py-0.5 text-xs font-semibold rounded-full border ${
                  diffResult.isValido
                    ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30'
                    : 'bg-rose-500/20 text-rose-300 border-rose-500/30'
                }`}
              >
                {diffResult.isValido ? '100% VÁLIDO' : 'INCONSISTENTE'}
              </span>
            )}
          </div>

          {diffResult ? (
            <div className="space-y-4">
              {/* Barra de Score de Conformidade */}
              <div className="p-4 bg-slate-950 rounded-xl border border-slate-800 space-y-2">
                <div className="flex items-center justify-between text-xs">
                  <span className="font-semibold text-slate-300">Índice de Conformidade de API:</span>
                  <span
                    className={`font-mono font-bold text-sm ${
                      diffResult.conformidadePercentual >= 90
                        ? 'text-emerald-400'
                        : diffResult.conformidadePercentual >= 60
                        ? 'text-amber-400'
                        : 'text-rose-400'
                    }`}
                  >
                    {diffResult.conformidadePercentual}%
                  </span>
                </div>
                <div className="w-full bg-slate-800 h-2 rounded-full overflow-hidden">
                  <div
                    className={`h-full transition-all duration-500 ${
                      diffResult.conformidadePercentual >= 90
                        ? 'bg-emerald-500'
                        : diffResult.conformidadePercentual >= 60
                        ? 'bg-amber-500'
                        : 'bg-rose-500'
                    }`}
                    style={{ width: `${diffResult.conformidadePercentual}%` }}
                  />
                </div>
                <p className="text-xs text-slate-400 pt-1">{diffResult.resumo}</p>
              </div>

              {/* Badges de Contagem */}
              <div className="grid grid-cols-3 gap-2 text-center text-xs font-mono">
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-emerald-400 block text-base font-bold">
                    {diffResult.camposCorretos.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Campos Válidos</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-rose-400 block text-base font-bold">
                    {diffResult.camposFaltantes.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Obrigatórios Ausentes</span>
                </div>
                <div className="p-2.5 bg-slate-950 rounded-xl border border-slate-800">
                  <span className="text-amber-400 block text-base font-bold">
                    {diffResult.camposExtras.length}
                  </span>
                  <span className="text-[10px] text-slate-400">Campos Extras</span>
                </div>
              </div>

              {/* Lista Detalhada de Campos */}
              <div>
                <h5 className="text-[11px] font-semibold uppercase tracking-wider text-slate-400 mb-2 font-mono">
                  Inspeção Item a Item:
                </h5>
                <div className="space-y-1.5 max-h-56 overflow-y-auto pr-1">
                  {diffResult.detalhes.map((item, idx) => (
                    <div
                      key={idx}
                      className={`p-2 rounded-lg text-xs font-mono flex items-start gap-2 border ${
                        item.status === 'ok'
                          ? 'bg-emerald-950/20 border-emerald-500/20 text-emerald-300'
                          : item.status === 'missing'
                          ? 'bg-rose-950/20 border-rose-500/20 text-rose-300'
                          : item.status === 'type_mismatch'
                          ? 'bg-amber-950/20 border-amber-500/20 text-amber-300'
                          : 'bg-slate-950 border-slate-800 text-slate-400'
                      }`}
                    >
                      {item.status === 'ok' && <CheckCircle2 className="w-3.5 h-3.5 shrink-0 mt-0.5 text-emerald-400" />}
                      {item.status === 'missing' && <XCircle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-rose-400" />}
                      {item.status === 'type_mismatch' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-amber-400" />}
                      {item.status === 'unexpected' && <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5 text-slate-400" />}
                      <span>{item.mensagem}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Ação de Disparo Direto se Válido */}
              {diffResult.isValido && onExecuteDirect && (
                <div className="pt-2">
                  <button
                    onClick={() => {
                      try {
                        const payload = JSON.parse(jsonText);
                        onExecuteDirect(selectedId, payload);
                      } catch {
                        alert('JSON inválido.');
                      }
                    }}
                    className="w-full py-2.5 bg-emerald-600 hover:bg-emerald-500 text-white font-medium text-xs rounded-xl shadow-lg shadow-emerald-600/30 flex items-center justify-center gap-1.5 transition-all cursor-pointer"
                  >
                    <Zap className="w-3.5 h-3.5 fill-current" />
                    <span>Executar Gravação Direta Sem Renderização (DDP)</span>
                  </button>
                </div>
              )}
            </div>
          ) : (
            <div className="p-12 text-center text-slate-500 text-xs">
              Cole ou selecione o JSON e clique em &quot;Executar Validação&quot; para comparar contra o schema oficial do PNBOX.
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
