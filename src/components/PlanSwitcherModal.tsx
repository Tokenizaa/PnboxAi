import React, { useState, useEffect } from 'react';
import {
  Building2,
  CheckCircle2,
  ExternalLink,
  Plus,
  Trash2,
  Search,
  Sparkles,
  ArrowRight,
  ShieldCheck,
  AlertCircle,
  Copy,
  Check,
  Globe,
  Layers,
  FileCheck2
} from 'lucide-react';
import { PlanoCriadoInfo } from '../types/pnbox';
import {
  extrairIdPlano,
  validarIdPlano,
  carregarPlanosSalvos,
  salvarPlanoNoHistorico,
  removerPlanoDoHistorico
} from '../utils/planUtils';

interface PlanSwitcherModalProps {
  isOpen: boolean;
  onClose: () => void;
  activePlanId: string;
  onSelectPlanId: (idPlano: string) => void;
  onNavigateTab?: (tab: string) => void;
}

export const PlanSwitcherModal: React.FC<PlanSwitcherModalProps> = ({
  isOpen,
  onClose,
  activePlanId,
  onSelectPlanId,
  onNavigateTab
}) => {
  const [inputValor, setInputValor] = useState('');
  const [nomeNovoPlano, setNomeNovoPlano] = useState('');
  const [setorNovoPlano, setSetorNovoPlano] = useState('Comércio & Serviços');
  const [planos, setPlanos] = useState<PlanoCriadoInfo[]>([]);
  const [filtro, setFiltro] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [modoAdicionar, setModoAdicionar] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      setPlanos(carregarPlanosSalvos());
      setInputValor('');
      setErrorMsg(null);
      setModoAdicionar(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const idExtraidoAtual = extrairIdPlano(inputValor);
  const isValid = validarIdPlano(idExtraidoAtual);

  const handleSalvarEAtivar = () => {
    if (!isValid) {
      setErrorMsg('Por favor, informe um ID de plano válido ou cole uma URL completa do Sebrae PNBOX.');
      return;
    }

    const novoPlanoObj: PlanoCriadoInfo = {
      idPlano: idExtraidoAtual,
      nomePlano: nomeNovoPlano.trim() || `Plano ${idExtraidoAtual.substring(0, 8)}...`,
      setor: setorNovoPlano.trim() || 'Geral',
      descricao: `Plano de negócio cadastrado no PNBOX Hub (${idExtraidoAtual})`,
      cidadeUf: 'Brasil',
      criadoEm: new Date().toISOString(),
      status: 'criado_pnbox_ddp',
      metodoCriacao: 'ddp_direct',
      ferramentasPreenchidas: 0
    };

    const listaAtualizada = salvarPlanoNoHistorico(novoPlanoObj);
    setPlanos(listaAtualizada);
    onSelectPlanId(idExtraidoAtual);
    onClose();
  };

  const handleSelecionarExistente = (p: PlanoCriadoInfo) => {
    onSelectPlanId(p.idPlano);
    onClose();
  };

  const handleRemover = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    if (id === activePlanId && planos.length <= 1) {
      alert('Você não pode remover o único plano ativo.');
      return;
    }
    const atualizados = removerPlanoDoHistorico(id);
    setPlanos(atualizados);
    if (id === activePlanId && atualizados.length > 0) {
      onSelectPlanId(atualizados[0].idPlano);
    }
  };

  const handleCopiar = (e: React.MouseEvent, id: string) => {
    e.stopPropagation();
    navigator.clipboard.writeText(id);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const planosFiltrados = planos.filter(
    (p) =>
      p.nomePlano.toLowerCase().includes(filtro.toLowerCase()) ||
      p.idPlano.toLowerCase().includes(filtro.toLowerCase()) ||
      p.setor.toLowerCase().includes(filtro.toLowerCase())
  );

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-slate-900 border border-slate-700 rounded-3xl max-w-2xl w-full max-h-[90vh] flex flex-col shadow-2xl animate-in zoom-in-95">
        {/* Cabeçalho do Modal */}
        <div className="p-6 border-b border-slate-800 flex items-start justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center">
                <Building2 className="w-4 h-4" />
              </div>
              <h2 className="text-lg font-bold text-white">
                Gerenciador & Seletor de Planos Sebrae PNBOX
              </h2>
            </div>
            <p className="text-xs text-slate-300">
              O PNBOX Hub é <strong>100% dinâmico</strong> e compatível com <strong>qualquer ID de Plano</strong> do Sebrae.
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white rounded-lg bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Corpo do Modal */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1">
          {/* Card do Plano Ativo */}
          <div className="p-4 bg-gradient-to-r from-indigo-950/60 via-slate-950 to-slate-950 border border-indigo-500/40 rounded-2xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 font-mono flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Plano Atualmente Selecionado
              </span>
              <div className="text-sm font-bold text-white flex items-center gap-2">
                <span className="font-mono text-indigo-300 bg-indigo-950/80 px-2 py-0.5 rounded border border-indigo-500/30">
                  {activePlanId}
                </span>
                <button
                  onClick={(e) => handleCopiar(e, activePlanId)}
                  className="text-slate-400 hover:text-white transition-colors"
                  title="Copiar ID"
                >
                  {copiedId === activePlanId ? (
                    <Check className="w-3.5 h-3.5 text-emerald-400" />
                  ) : (
                    <Copy className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>

            <a
              href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${activePlanId}`}
              target="_blank"
              rel="noopener noreferrer"
              className="px-3 py-1.5 bg-indigo-600/20 hover:bg-indigo-600/40 text-indigo-200 text-xs font-semibold rounded-xl border border-indigo-500/40 flex items-center gap-1.5 transition-colors"
            >
              <Globe className="w-3.5 h-3.5 text-cyan-400" />
              <span>Abrir no PNBOX</span>
              <ExternalLink className="w-3 h-3 text-slate-400" />
            </a>
          </div>

          {/* Seção de Entrada Rápida de Novo ID ou URL */}
          <div className="bg-slate-950 p-4 rounded-2xl border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                <Plus className="w-3.5 h-3.5 text-indigo-400" />
                Inserir ID de Plano ou Colar URL do Sebrae:
              </label>
              <button
                type="button"
                onClick={() => setModoAdicionar(!modoAdicionar)}
                className="text-[11px] text-indigo-400 hover:underline"
              >
                {modoAdicionar ? 'Modo Simples' : '+ Adicionar com Detalhes (Nome/Setor)'}
              </button>
            </div>

            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row gap-2">
                <input
                  type="text"
                  value={inputValor}
                  onChange={(e) => {
                    setInputValor(e.target.value);
                    setErrorMsg(null);
                  }}
                  placeholder="Ex: HCOQIkjSk97gGcfGDPb0h ou cole a URL https://pnbox.sebrae.com.br/..."
                  className="flex-1 bg-slate-900 border border-slate-700 focus:border-indigo-500 rounded-xl px-3.5 py-2.5 text-xs text-white placeholder-slate-500 font-mono focus:outline-none"
                />

                <button
                  onClick={handleSalvarEAtivar}
                  disabled={!isValid}
                  className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-40 text-white text-xs font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer shrink-0"
                >
                  <Check className="w-4 h-4" />
                  <span>Definir e Ativar</span>
                </button>
              </div>

              {inputValor.trim() && (
                <div className="text-[11px] font-mono flex items-center justify-between text-slate-400 bg-slate-900/60 p-2 rounded-lg border border-slate-800">
                  <span>ID Detectado:</span>
                  <span className={isValid ? 'text-emerald-400 font-bold' : 'text-rose-400 font-bold'}>
                    {idExtraidoAtual || 'Inválido'}
                  </span>
                </div>
              )}

              {modoAdicionar && (
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-2 border-t border-slate-800">
                  <div>
                    <label className="text-[11px] text-slate-400">Nome / Apelido do Plano:</label>
                    <input
                      type="text"
                      value={nomeNovoPlano}
                      onChange={(e) => setNomeNovoPlano(e.target.value)}
                      placeholder="Ex: Minha Clínica Vet ou Padaria Artesanal"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 mt-0.5"
                    />
                  </div>
                  <div>
                    <label className="text-[11px] text-slate-400">Setor de Atuação:</label>
                    <input
                      type="text"
                      value={setorNovoPlano}
                      onChange={(e) => setSetorNovoPlano(e.target.value)}
                      placeholder="Ex: Saúde, Gastronomia, Tecnologia"
                      className="w-full bg-slate-900 border border-slate-700 rounded-lg px-2.5 py-1.5 text-xs text-slate-200 mt-0.5"
                    />
                  </div>
                </div>
              )}

              {errorMsg && (
                <div className="text-xs text-rose-400 flex items-center gap-1.5">
                  <AlertCircle className="w-3.5 h-3.5" />
                  <span>{errorMsg}</span>
                </div>
              )}
            </div>
          </div>

          {/* Atalho para Criação com IA */}
          {onNavigateTab && (
            <div className="p-4 bg-gradient-to-r from-indigo-950/40 via-purple-950/30 to-slate-900 border border-indigo-500/30 rounded-2xl flex items-center justify-between gap-3">
              <div className="space-y-0.5">
                <span className="text-xs font-bold text-indigo-300 flex items-center gap-1.5">
                  <Sparkles className="w-3.5 h-3.5 text-indigo-400 animate-pulse" />
                  Quer criar um novo plano do zero a partir de uma ideia?
                </span>
                <p className="text-[11px] text-slate-400">
                  Use o <strong>Gemini Deep Research</strong> para pesquisar mercado em tempo real e gerar o plano automaticamente no PNBOX.
                </p>
              </div>
              <button
                onClick={() => {
                  onClose();
                  onNavigateTab('criar_plano_ia');
                }}
                className="px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white text-xs font-bold rounded-xl flex items-center gap-1.5 shrink-0 shadow-lg cursor-pointer"
              >
                <span>Criar com IA</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          )}

          {/* Lista de Planos Salvos / Cadastrados */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
                Planos Salvos no seu Navegador ({planosFiltrados.length})
              </h3>

              <div className="relative w-48">
                <Search className="w-3 h-3 text-slate-500 absolute left-2.5 top-2.5" />
                <input
                  type="text"
                  value={filtro}
                  onChange={(e) => setFiltro(e.target.value)}
                  placeholder="Filtrar planos..."
                  className="w-full bg-slate-950 border border-slate-800 rounded-lg pl-7 pr-2 py-1 text-xs text-slate-200 placeholder-slate-500"
                />
              </div>
            </div>

            <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
              {planosFiltrados.map((p) => {
                const isSelected = p.idPlano === activePlanId;
                return (
                  <div
                    key={p.idPlano}
                    onClick={() => handleSelecionarExistente(p)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-950/50 border-indigo-500/60 ring-1 ring-indigo-500/30'
                        : 'bg-slate-950/60 border-slate-800 hover:border-slate-700 hover:bg-slate-950'
                    }`}
                  >
                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-white text-xs truncate">{p.nomePlano}</span>
                        {isSelected && (
                          <span className="px-1.5 py-0.5 text-[9px] font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 rounded">
                            ATIVO
                          </span>
                        )}
                        <span className="px-1.5 py-0.5 text-[9px] font-mono text-slate-400 bg-slate-900 rounded border border-slate-800 truncate">
                          {p.setor}
                        </span>
                      </div>
                      <div className="text-[11px] font-mono text-indigo-300 flex items-center gap-2">
                        <span>ID: {p.idPlano}</span>
                        {p.cidadeUf && <span className="text-slate-500">• {p.cidadeUf}</span>}
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      <button
                        onClick={(e) => handleCopiar(e, p.idPlano)}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-white transition-colors"
                        title="Copiar ID"
                      >
                        {copiedId === p.idPlano ? (
                          <Check className="w-3.5 h-3.5 text-emerald-400" />
                        ) : (
                          <Copy className="w-3.5 h-3.5" />
                        )}
                      </button>

                      <a
                        href={`https://pnbox.sebrae.com.br/planoNegocio/ferramentas/${p.idPlano}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        onClick={(e) => e.stopPropagation()}
                        className="p-1.5 rounded-lg bg-slate-900 hover:bg-slate-800 text-slate-400 hover:text-indigo-300 transition-colors"
                        title="Abrir no portal Sebrae PNBOX"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>

                      {planos.length > 1 && (
                        <button
                          onClick={(e) => handleRemover(e, p.idPlano)}
                          className="p-1.5 rounded-lg bg-slate-900 hover:bg-rose-950/50 text-slate-500 hover:text-rose-400 transition-colors"
                          title="Remover do histórico"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

        {/* Rodapé do Modal */}
        <div className="p-4 border-t border-slate-800 bg-slate-950 rounded-b-3xl flex items-center justify-between text-xs text-slate-400">
          <span>
            Todas as 14 ferramentas serão vinculadas automaticamente ao ID selecionado.
          </span>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-semibold"
          >
            Fechar
          </button>
        </div>
      </div>
    </div>
  );
};
