import React, { useState } from 'react';
import {
  X,
  Sparkles,
  Send,
  Bot,
  User,
  CheckCircle2,
  RefreshCw,
  Lightbulb,
  ArrowRight,
  TrendingUp,
  Users,
  ShieldCheck,
  Building2,
  Check,
  Copy
} from 'lucide-react';
import { PlanoCriadoInfo, AuthSessionState } from '../../types/pnbox';

interface PnboxAiCopilotDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  planoAtivo: PlanoCriadoInfo;
  onApplyDataToPlan: (toolId: string, data: Record<string, unknown>[]) => void;
  onAutoFillFullPlan: () => void;
}

interface Message {
  id: string;
  sender: 'ai' | 'user';
  text: string;
  timestamp: string;
  actionPayload?: {
    toolId: string;
    label: string;
    data: Record<string, unknown>[];
  };
}

export const PnboxAiCopilotDrawer: React.FC<PnboxAiCopilotDrawerProps> = ({
  isOpen,
  onClose,
  planoAtivo,
  onApplyDataToPlan,
  onAutoFillFullPlan
}) => {
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      sender: 'ai',
      text: `Olá! Sou seu Copiloto IA PNBOX integrado ao Gemini. Estou analisando o plano **${planoAtivo.nomePlano}** (${planoAtivo.setor}). Posso sugerir segmentações, personas, concorrentes, estratégias SWOT e projeções financeiras. O que você gostaria de explorar agora?`,
      timestamp: 'Agora'
    }
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [appliedActions, setAppliedActions] = useState<Record<string, boolean>>({});

  if (!isOpen) return null;

  const handleSendMessage = async (textToSend?: string) => {
    const prompt = (textToSend || inputText).trim();
    if (!prompt || isLoading) return;

    const userMsg: Message = {
      id: Date.now().toString(),
      sender: 'user',
      text: prompt,
      timestamp: 'Agora'
    };

    setMessages((prev) => [...prev, userMsg]);
    setInputText('');
    setIsLoading(true);

    try {
      // Chama o backend Gemini com o contexto do plano ativo
      const response = await fetch('/api/ai/deep-research', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          prompt: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}. Setor: ${planoAtivo.setor}. Cidade: ${planoAtivo.cidadeUf}. Solicitação: ${prompt}`,
          ideiaNegocio: `${planoAtivo.nomePlano} - ${planoAtivo.descricao}. Setor: ${planoAtivo.setor}. Cidade: ${planoAtivo.cidadeUf}. Solicitação: ${prompt}`,
          cidadeUf: planoAtivo.cidadeUf,
          orcamentoEstimado: 80000,
          provider: 'gemini'
        })
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => ({}));
        throw new Error(errJson.mensagem || `Erro na chamada de IA (status ${response.status})`);
      }

      const data = await response.json();

      let aiText = `Com base na análise de mercado para **${planoAtivo.nomePlano}**, formulei recomendações estratégicas alinhadas às 14 ferramentas do Sebrae:`;
      let actionPayload;

      if (prompt.toLowerCase().includes('persona')) {
        const p = data.report?.buyerPersona;
        if (p) {
          aiText = `Para **${planoAtivo.nomePlano}**, mapeei a persona estratégica ideal com base em dados de mercado:\n\n` +
            `• **Nome:** ${p.nome} (${p.idade})\n` +
            `• **Perfil:** ${p.perfil}\n` +
            `• **Principais Dores:** ${p.dores?.join('; ')}\n` +
            `• **Desejos & Metas:** ${p.desejos?.join('; ')}\n` +
            `• **Ticket Médio:** R$ ${p.ticketMedio}`;
          actionPayload = {
            toolId: 'geradorPersonas',
            label: 'Aplicar Persona no Plano',
            data: [
              {
                idPlano: planoAtivo.idPlano,
                nome: p.nome,
                profissao: p.perfil?.split(',')[0] || 'Cliente Alvo',
                idade: p.idade,
                dores: p.dores?.join('; ') || '',
                objetivos: p.desejos?.join('; ') || '',
                renda: `Ticket médio R$ ${p.ticketMedio}`
              }
            ]
          };
        } else {
          aiText = data.report?.resumoExecutivo || `Não foram identificados dados de persona para ${planoAtivo.nomePlano}.`;
        }
      } else if (prompt.toLowerCase().includes('concorr')) {
        const concs = data.report?.concorrentesMapeados;
        if (concs && concs.length > 0) {
          aiText = `Mapeamento competitivo para **${planoAtivo.nomePlano}**:\n\n` +
            concs.map((c: any) => `• **${c.nome}**\n  - Fortes: ${c.pontosFortes}\n  - Fracos: ${c.pontosFracos}\n  - Diferencial: ${c.diferenciacao}`).join('\n\n');
          actionPayload = {
            toolId: 'analiseConcorrencia',
            label: 'Aplicar Análise de Concorrência',
            data: concs.map((c: any) => ({
              idPlano: planoAtivo.idPlano,
              nomeConcorrente: c.nome,
              concorrente: c.nome,
              pontosFortes: c.pontosFortes,
              pontosFracos: c.pontosFracos,
              diferencial: c.diferenciacao
            }))
          };
        } else {
          aiText = data.report?.oportunidadeMercado || `Análise competitiva detalhada para ${planoAtivo.nomePlano}.`;
        }
      } else if (prompt.toLowerCase().includes('swot')) {
        const tendencias = data.report?.tendencias2025_2026 || [];
        aiText = `Matriz SWOT estratégica para **${planoAtivo.nomePlano}**:\n\n` +
          `• **Forças:** Modelo focado em inovação para ${planoAtivo.setor}.\n` +
          `• **Fraquezas:** Fase inicial de estruturação de marca.\n` +
          `• **Oportunidades:** ${tendencias[0] || data.report?.oportunidadeMercado || 'Crescimento de mercado'}\n` +
          `• **Ameaças:** Concorrentes consolidados na região.`;
        actionPayload = {
          toolId: 'analiseSwot',
          label: 'Aplicar SWOT no Plano',
          data: [
            {
              idPlano: planoAtivo.idPlano,
              forcas: `Modelo focado em inovação para ${planoAtivo.setor}`,
              fraquezas: 'Fase inicial de estruturação de marca',
              oportunidades: tendencias[0] || 'Crescimento de demanda no segmento',
              ameacas: 'Pressão de concorrentes estabelecidos'
            }
          ]
        };
      } else if (prompt.toLowerCase().includes('financ') || prompt.toLowerCase().includes('invest')) {
        const inv = data.report?.investimentoEstimado;
        if (inv) {
          aiText = `Projeção financeira estimada para **${planoAtivo.nomePlano}**:\n\n` +
            `• **Investimento Inicial (CAPEX):** R$ ${inv.capexTotal?.toLocaleString('pt-BR')}\n` +
            `• **Custos Fixos Mensais (OPEX):** R$ ${inv.opexMensal?.toLocaleString('pt-BR')}\n` +
            `• **Faturamento Mensal Estimado:** R$ ${inv.faturamentoEstimadoMensal?.toLocaleString('pt-BR')}\n` +
            `• **Payback Estimado:** ${inv.pontoEquilibrioMeses} meses`;
          actionPayload = {
            toolId: 'indicadoresViabilidade',
            label: 'Aplicar Finanças no Plano',
            data: [
              {
                idPlano: planoAtivo.idPlano,
                faturamentoTotalMensal: inv.faturamentoEstimadoMensal,
                custosTotaisMensais: inv.opexMensal,
                pontoEquilibrioMensal: inv.opexMensal,
                prazoRetornoMeses: inv.pontoEquilibrioMeses
              }
            ]
          };
        } else {
          aiText = data.report?.resumoExecutivo || 'Dados financeiros calculados a partir da pesquisa de mercado.';
        }
      } else {
        if (data.report?.resumoExecutivo) {
          aiText = data.report.resumoExecutivo;
        } else {
          aiText = `Analisei seu negócio **${planoAtivo.nomePlano}**. Sua proposta de valor possui forte aderência com alto potencial de escala no segmento ${planoAtivo.setor}.`;
        }
      }

      const aiMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: aiText,
        timestamp: 'Agora',
        actionPayload
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err) {
      console.error('Erro ao chamar a IA:', err);
      const errMsg: Message = {
        id: (Date.now() + 1).toString(),
        sender: 'ai',
        text: `Não foi possível consultar a IA: ${err instanceof Error ? err.message : 'Erro de conexão'}. Verifique sua configuração e tente novamente.`,
        timestamp: 'Agora'
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
       setIsLoading(false);
     }
  };

  const quickPrompts = [
    { label: '👥 Sugerir Personas', prompt: 'Sugira as personas ideais para este negócio' },
    { label: '🎯 Analisar Concorrentes', prompt: 'Mapeie os concorrentes diretos e nosso diferencial' },
    { label: '💡 Estratégia SWOT', prompt: 'Elabore a matriz SWOT para este plano' },
    { label: '💰 Projeção Financeira', prompt: 'Como estruturar o investimento e custos para este negócio?' }
  ];

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="absolute inset-0 bg-black/60 backdrop-blur-xs transition-opacity"
      />

      {/* Drawer */}
      <div className="absolute inset-y-0 right-0 max-w-full flex pl-10">
        <div className="w-screen max-w-md sm:max-w-lg bg-[#18163f] border-l border-[#2d2a63] text-white flex flex-col shadow-2xl">
          {/* Header do Copiloto */}
          <div className="p-4 sm:p-5 bg-[#131135] border-b border-[#2d2a63] flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center text-white shadow-md">
                <Sparkles className="w-4 h-4 text-pink-200" />
              </div>
              <div>
                <h3 className="font-bold text-sm text-white flex items-center gap-1.5">
                  <span>Copiloto IA PNBOX</span>
                  <span className="px-1.5 py-0.2 bg-pink-500/20 text-pink-300 text-[10px] font-mono rounded">
                    Gemini 2.5
                  </span>
                </h3>
                <p className="text-[11px] text-indigo-200/80">
                  Plano Ativo: <strong>{planoAtivo.nomePlano}</strong>
                </p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Ação em Destaque: Preencher Tudo com 1 Clique */}
          <div className="p-3 bg-gradient-to-r from-pink-900/30 to-indigo-900/30 border-b border-white/5 flex items-center justify-between gap-2">
            <div className="text-xs text-indigo-200">
              ⚡ Preenchimento instantâneo das 14 ferramentas:
            </div>
            <button
              onClick={() => {
                onAutoFillFullPlan();
                onClose();
              }}
              className="px-3 py-1 bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white rounded-full text-xs font-bold shadow transition-all hover:scale-105"
            >
              Preencher Tudo
            </button>
          </div>

          {/* Histórico de Mensagens */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 ${
                  msg.sender === 'user' ? 'justify-end' : 'justify-start'
                }`}
              >
                {msg.sender === 'ai' && (
                  <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-pink-600 to-indigo-600 flex items-center justify-center shrink-0 mt-0.5">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                )}

                <div
                  className={`max-w-[85%] rounded-2xl p-3.5 text-xs sm:text-sm leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-[#1877f2] text-white rounded-tr-none shadow-md'
                      : 'bg-[#24225b] text-slate-100 border border-[#3b387e] rounded-tl-none shadow-md'
                  }`}
                >
                  <p className="whitespace-pre-line">{msg.text}</p>

                  {/* Ação Executável gerada pela IA */}
                  {msg.actionPayload && (
                    <div className="mt-3 pt-2.5 border-t border-white/10 flex items-center justify-between">
                      <span className="text-[11px] text-pink-300 font-medium">
                        Sugestão pronta para o Sebrae
                      </span>
                      <button
                        onClick={() => {
                          if (msg.actionPayload) {
                            onApplyDataToPlan(
                              msg.actionPayload.toolId,
                              msg.actionPayload.data
                            );
                            setAppliedActions((prev) => ({
                              ...prev,
                              [msg.id]: true
                            }));
                          }
                        }}
                        disabled={appliedActions[msg.id]}
                        className={`px-3 py-1 rounded-full text-xs font-bold transition-all flex items-center gap-1 ${
                          appliedActions[msg.id]
                            ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                            : 'bg-pink-600 hover:bg-pink-500 text-white shadow'
                        }`}
                      >
                        {appliedActions[msg.id] ? (
                          <>
                            <Check className="w-3 h-3" />
                            <span>Aplicado!</span>
                          </>
                        ) : (
                          <>
                            <Sparkles className="w-3 h-3 text-pink-200" />
                            <span>{msg.actionPayload.label}</span>
                          </>
                        )}
                      </button>
                    </div>
                  )}
                </div>

                {msg.sender === 'user' && (
                  <div className="w-7 h-7 rounded-full bg-slate-700 flex items-center justify-center shrink-0 mt-0.5">
                    <User className="w-4 h-4 text-white" />
                  </div>
                )}
              </div>
            ))}

            {isLoading && (
              <div className="flex items-center gap-2 text-xs text-indigo-300 py-2">
                <RefreshCw className="w-4 h-4 animate-spin text-pink-400" />
                <span>O Copiloto IA está pesquisando e elaborando a resposta...</span>
              </div>
            )}
          </div>

          {/* Sugestões Rápidas de Prompt */}
          <div className="px-4 py-2 bg-[#131135] border-t border-white/5 flex gap-2 overflow-x-auto no-scrollbar">
            {quickPrompts.map((q, i) => (
              <button
                key={i}
                onClick={() => handleSendMessage(q.prompt)}
                className="px-2.5 py-1 bg-[#24225b] hover:bg-[#2c296f] border border-white/10 rounded-full text-[11px] text-indigo-200 hover:text-white whitespace-nowrap transition-colors"
              >
                {q.label}
              </button>
            ))}
          </div>

          {/* Campo de Entrada de Mensagem */}
          <div className="p-3 sm:p-4 bg-[#131135] border-t border-[#2d2a63]">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleSendMessage();
              }}
              className="flex items-center gap-2"
            >
              <input
                type="text"
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                placeholder="Pergunte ou peça sugestões ao Copiloto..."
                className="flex-1 bg-[#24225b] border border-white/10 rounded-full px-4 py-2.5 text-xs sm:text-sm text-white focus:outline-none focus:border-pink-500 transition-colors"
              />
              <button
                type="submit"
                disabled={!inputText.trim() || isLoading}
                className="w-10 h-10 rounded-full bg-gradient-to-r from-pink-600 to-indigo-600 hover:from-pink-500 hover:to-indigo-500 text-white flex items-center justify-center shadow disabled:opacity-40 transition-all hover:scale-105 active:scale-95"
              >
                <Send className="w-4 h-4" />
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
};
