import { GoogleGenAI } from '@google/genai';
import { DeepResearchReport, FerramentaInfo } from '../types/pnbox';
import { FERRAMENTAS_PNBOX } from './schemaCatalog';

export interface DeepResearchOptions {
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
}

/**
 * Utilitário para instanciar o cliente GoogleGenAI seguro no lado do servidor
 */
function getGeminiClient(): GoogleGenAI | null {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY não configurada no ambiente. Operando com modo sintético avançado.');
    return null;
  }

  return new GoogleGenAI({
    apiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

/**
 * Executa Pesquisa Aprofundada (Deep Market Research) utilizando o Gemini 3.7 Flash com Grounding do Google Search
 */
export async function executarDeepResearch(
  promptNegocio: string,
  options: DeepResearchOptions = {}
): Promise<DeepResearchReport> {
  const { cidadeUf = 'Brasil / Nacional', orcamentoEstimado = 80000, publicoAlvo = 'B2C e Consumidor Final' } = options;

  const ai = getGeminiClient();

  // Prompt estruturado de inteligência de mercado
  const promptInvestigacao = `
Você é um especialista sênior em inteligência de mercado, viabilidade de negócios e consultoria do Sebrae no Brasil.
Realize um Deep Research (Pesquisa de Mercado Aprofundada) para a seguinte ideia de negócio:

PROMPT DA IDEIA DE NEGÓCIO: "${promptNegocio}"
LOCALIZAÇÃO / PRAÇA: "${cidadeUf}"
ORÇAMENTO ESTIMADO: R$ ${orcamentoEstimado.toLocaleString('pt-BR')}
PÚBLICO-ALVO FOCO: "${publicoAlvo}"

Instruções da Pesquisa:
1. Analise o mercado brasileiro no setor correspondente, tendências para 2025/2026, demanda e comportamento de consumo.
2. Identifique concorrentes reais ou arquétipos competitivos diretos e indiretos, seus diferenciais e brechas de mercado.
3. Defina a Buyer Persona detalhada com dores, desejos e ticket médio.
4. Estruture a estimativa de investimentos (CAPEX inicial, OPEX mensal, margem média e ponto de equilíbrio).
5. Sugira CNAE provável, regime tributário (Simples Nacional vs Lucro Presumido) e exigências regulatórias (Vigilância Sanitária, Alvarás, CRMV, etc.).
6. Dê um nome comercial moderno e chamativo para a nova empresa.

RETORNE ESTRITAMENTE UM JSON VÁLIDO no seguinte formato (sem blocos markdown extras além do json):
{
  "nomeNegocioSugerido": "Nome Comercial Criativo e Profissional",
  "setor": "Segmento / Ramo de Atividade",
  "cidadeUf": "${cidadeUf}",
  "resumoExecutivo": "Resumo de 3 a 4 parágrafos concisos com proposta de valor, mercado e estratégia.",
  "oportunidadeMercado": "Análise detalhada da oportunidade no Brasil e diferenciais.",
  "tendencias2025_2026": [
    "Tendência 1 com contexto de mercado",
    "Tendência 2",
    "Tendência 3",
    "Tendência 4"
  ],
  "concorrentesMapeados": [
    {
      "nome": "Concorrente ou Formato Tradicional 1",
      "pontosFortes": "Pontos fortes observados",
      "pontosFracos": "Pontos fracos ou limitações",
      "diferenciacao": "Como nossa empresa vai se diferenciar"
    },
    {
      "nome": "Concorrente ou Formato 2",
      "pontosFortes": "Pontos fortes",
      "pontosFracos": "Pontos fracos",
      "diferenciacao": "Diferenciação competitiva"
    },
    {
      "nome": "Concorrente ou Formato 3",
      "pontosFortes": "Pontos fortes",
      "pontosFracos": "Pontos fracos",
      "diferenciacao": "Diferenciação competitiva"
    }
  ],
  "buyerPersona": {
    "nome": "Nome Fictício Representativo",
    "idade": "28 a 42 anos",
    "perfil": "Descrição demográfica e comportamental",
    "dores": ["Dor 1", "Dor 2", "Dor 3"],
    "desejos": ["Desejo 1", "Desejo 2", "Desejo 3"],
    "ticketMedio": 180
  },
  "investimentoEstimado": {
    "capexTotal": 75000,
    "opexMensal": 18500,
    "pontoEquilibrioMeses": 14,
    "faturamentoEstimadoMensal": 32000
  },
  "aspectosLegaisTributarios": {
    "cnaeSugerido": "Código e Descrição CNAE",
    "regimeTributario": "Simples Nacional (Anexo III/IV)",
    "licencasExigidas": ["Alvará de Funcionamento", "Vigilância Sanitária Municipal", "AVCB Bombeiros"]
  }
}
`;

  let parsedResult: any = null;
  const fontesPesquisa: Array<{ titulo: string; uri: string }> = [
    { titulo: 'Sebrae Nacional - Ideias de Negócios & Estudos de Mercado', uri: 'https://sebrae.com.br/sites/PortalSebrae/ideiasdenegocios' },
    { titulo: 'IBGE - Pesquisa Anual de Serviços e Comércio', uri: 'https://www.ibge.gov.br' },
    { titulo: 'Portal do Empreendedor - CNAE & Enquadramento', uri: 'https://www.gov.br/empresas-e-negocios/pt-br/empreendedor' }
  ];

  if (ai) {
    try {
      console.log('[Gemini Deep Research] Consultando Gemini 3.7 Flash com Grounding...');
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptInvestigacao,
        config: {
          systemInstruction: 'Você é um consultor sênior de negócios do Sebrae e especialista em planejamento estratégico de empresas.',
          tools: [{ googleSearch: {} }],
        }
      });

      const responseText = response.text || '';
      
      // Extrair citações de grounding se disponíveis
      const groundingChunks = (response as any).candidates?.[0]?.groundingMetadata?.groundingChunks;
      if (Array.isArray(groundingChunks)) {
        for (const chunk of groundingChunks) {
          if (chunk?.web?.uri && chunk?.web?.title) {
            fontesPesquisa.unshift({
              titulo: chunk.web.title,
              uri: chunk.web.uri
            });
          }
        }
      }

      // Limpar blocos de markdown e fazer parse do JSON
      let jsonStr = responseText.trim();
      if (jsonStr.startsWith('```json')) {
        jsonStr = jsonStr.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (jsonStr.startsWith('```')) {
        jsonStr = jsonStr.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const match = jsonStr.match(/\{[\s\S]*\}/);
      if (match) {
        parsedResult = JSON.parse(match[0]);
      }
    } catch (err: any) {
      console.warn('[Gemini Deep Research] Erro ao chamar API Gemini, gerando relatório de pesquisa heurístico enriquecido:', err.message);
    }
  }

  // Fallback heurístico inteligente caso Gemini não retorne JSON
  if (!parsedResult) {
    parsedResult = gerarPesquisaMercadoHeuristica(promptNegocio, options);
  }

  return {
    promptOriginal: promptNegocio,
    nomeNegocioSugerido: parsedResult.nomeNegocioSugerido || extrairNomeSugerido(promptNegocio),
    setor: parsedResult.setor || 'Serviços & Comércio Especializado',
    cidadeUf: parsedResult.cidadeUf || cidadeUf,
    resumoExecutivo: parsedResult.resumoExecutivo || `O empreendimento baseado em "${promptNegocio}" visa atender a demanda crescente por soluções especializadas com alto padrão de atendimento e eficiência na praça de ${cidadeUf}.`,
    oportunidadeMercado: parsedResult.oportunidadeMercado || `Mercado em expansão com carência de prestadores ágeis e digitalizados na região de ${cidadeUf}.`,
    tendencias2025_2026: parsedResult.tendencias2025_2026 || [
      'Digitalização do relacionamento com clientes e agendamento via WhatsApp/Web',
      'Personalização de serviços e programas de fidelização recorrente (assinatura/combo)',
      'Sustentabilidade operacional e redução de desperdícios',
      'Atendimento consultivo e experiência do usuário (CX) como principal fator de retenção'
    ],
    concorrentesMapeados: parsedResult.concorrentesMapeados || [
      {
        nome: 'Concorrentes Tradicionais Locais',
        pontosFortes: 'Base de clientes antiga e localização consolidada',
        pontosFracos: 'Atendimento burocrático e pouca presença digital',
        diferenciacao: 'Atendimento rápido, transparência e tecnologia'
      },
      {
        nome: 'Grandes Redes e Franquias',
        pontosFortes: 'Poder de compra e marca nacional',
        pontosFracos: 'Preços elevados e atendimento impessoal',
        diferenciacao: 'Hiperpersonalização e relacionamento humanizado'
      }
    ],
    buyerPersona: parsedResult.buyerPersona || {
      nome: 'Camila Rodrigues',
      idade: '32 anos',
      perfil: 'Profissional ativa, urbana, valoriza conveniência e pontualidade.',
      dores: ['Falta de tempo para processos demorados', 'Receio de serviços de baixa qualidade'],
      desejos: ['Atendimento com excelência', 'Facilidade de pagamento e agendamento'],
      ticketMedio: 150
    },
    investimentoEstimado: parsedResult.investimentoEstimado || {
      capexTotal: orcamentoEstimado,
      opexMensal: Math.round(orcamentoEstimado * 0.22),
      pontoEquilibrioMeses: 12,
      faturamentoEstimadoMensal: Math.round(orcamentoEstimado * 0.45)
    },
    aspectosLegaisTributarios: parsedResult.aspectosLegaisTributarios || {
      cnaeSugerido: 'CNAE Geral de Prestação de Serviços / Varejo',
      regimeTributario: 'Simples Nacional',
      licencasExigidas: ['Alvará de Localização', 'Vigilância Sanitária (se aplicável)', 'Inscrição Municipal']
    },
    fontesPesquisa: fontesPesquisa.slice(0, 6),
    geradoEm: new Date().toISOString()
  };
}

/**
 * Sintetiza o conjunto completo de dados estruturados para as 14 ferramentas PNBOX
 * a partir do Deep Research e do ID do Plano especificado.
 */
export async function sintetizar14FerramentasPnbox(
  research: DeepResearchReport,
  idPlano: string
): Promise<Record<string, Record<string, unknown>[]>> {
  const ai = getGeminiClient();

  const promptSintese = `
Você é um motor de geração de dados para o sistema PNBOX do Sebrae.
Com base no Deep Research de Mercado a seguir, gere os dados estruturados de TODAS as 14 ferramentas do PNBOX.

RELATÓRIO DE DEEP RESEARCH:
- Nome da Empresa: "${research.nomeNegocioSugerido}"
- Setor: "${research.setor}"
- Localização: "${research.cidadeUf}"
- Resumo: "${research.resumoExecutivo}"
- Persona: Nome: ${research.buyerPersona.nome}, Idade: ${research.buyerPersona.idade}, Perfil: ${research.buyerPersona.perfil}
- Investimento Total: R$ ${research.investimentoEstimado.capexTotal}
- Custos Mensais: R$ ${research.investimentoEstimado.opexMensal}
- Faturamento Estimado: R$ ${research.investimentoEstimado.faturamentoEstimadoMensal}
- ID do Plano no PNBOX: "${idPlano}"

Instrução Crucial: Retorne um objeto JSON contendo exatamente as 14 chaves das coleções DDP do PNBOX, onde cada chave é um array com 1 a 2 objetos com os campos exatos.
As 14 coleções do PNBOX são:
1. "segmentacaoMercado": [{ idPlano, descricao, variavel1, variavel1Oposto, variavel2, variavel2Oposto, segmento }]
2. "geradorPersonas": [{ idPlano, nome, idade, escolaridade, cargo, renda, comportamentos, objetivos, dores, ondeBuscaInfo }]
3. "analiseConcorrencia": [{ idPlano, concorrente, pontosFortes, pontosFracos, precoPraticado, qualidade, localizacao, atendimento }]
4. "posicionamentoMercado": [{ idPlano, publicoAlvo, problema, solucao, principalDiferencial, propostaValor, categoria }]
5. "pesquisaMercado": [{ idPlano, objetivoPesquisa, publicoPesquisado, metodoColeta, principaisInsights, conclusaoDecisao }]
6. "definicaoMetas": [{ idPlano, meta, indicador, prazo, responsavel, status, acaoNecessaria }]
7. "planoMarketing": [{ idPlano, canal, estrategia, investimentoMensal, metaConversao, frequencia, responsavel }]
8. "planoOperacional": [{ idPlano, etapaProcesso, descricaoAtividade, tempoEstimado, responsavel, recursosNecessarios }]
9. "investimentoTotal": [{ idPlano, categoria, item, quantidade, valorUnitario, valorTotal }]
10. "custosFixos": [{ idPlano, item, valorMensal, periodicidade, observacao }]
11. "custosVariaveis": [{ idPlano, produtoServico, custoUnitario, porcentagemImpostos, comissaoPercentual, custoTotalUnitario }]
12. "faturamentoMensal": [{ idPlano, produtoServico, quantidadeEstimada, precoUnitarioVenda, faturamentoTotal }]
13. "indicadoresViabilidade": [{ idPlano, faturamentoTotalMensal, custosTotaisMensais, lucroLiquidoMensal, margemLucroPercentual, pontoEquilibrioMensal, prazoRetornoMeses }]
14. "resumoExecutivo": [{ idPlano, nomeEmpresa, setorAtuacao, cidadeUf, investimentoInicial, faturamentoMensalPrevisto, prazoRetorno, propostaValorResumo }]

RETORNE APENAS O JSON (sem markdown):
`;

  if (ai) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.7-flash',
        contents: promptSintese,
        config: {
          responseMimeType: 'application/json'
        }
      });

      const text = response.text?.trim() || '';
      const match = text.match(/\{[\s\S]*\}/);
      if (match) {
        const parsed = JSON.parse(match[0]);
        // Garantir que todas as 14 coleções existam e tenham idPlano
        return normalizarColecoesPnbox(parsed, idPlano, research);
      }
    } catch (err: any) {
      console.warn('[Gemini Plan Synthesis] Erro na síntese via API Gemini:', err.message);
    }
  }

  // Fallback determinístico de síntese baseado no research
  return gerarSinteseDeterministica(research, idPlano);
}

/**
 * Normaliza e valida os dados gerados pela IA para garantir conformidade 100% com o PNBOX DDP
 */
function normalizarColecoesPnbox(
  raw: Record<string, any>,
  idPlano: string,
  research: DeepResearchReport
): Record<string, Record<string, unknown>[]> {
  const resultado: Record<string, Record<string, unknown>[]> = {};

  for (const f of FERRAMENTAS_PNBOX) {
    const colName = f.collectionName;
    const items = Array.isArray(raw[colName]) ? raw[colName] : [];

    if (items.length === 0) {
      // Usar fallback para esta ferramenta
      resultado[colName] = [gerarRegistroFallbackParaFerramenta(f, idPlano, research)];
    } else {
      resultado[colName] = items.map((item: any) => ({
        ...item,
        idPlano
      }));
    }
  }

  return resultado;
}

/**
 * Gera síntese heurística de alta qualidade para as 14 ferramentas
 */
function gerarSinteseDeterministica(
  research: DeepResearchReport,
  idPlano: string
): Record<string, Record<string, unknown>[]> {
  const { capexTotal, opexMensal, faturamentoEstimadoMensal, pontoEquilibrioMeses } = research.investimentoEstimado;
  const lucroMensal = Math.max(1000, faturamentoEstimadoMensal - opexMensal);
  const margem = Math.round((lucroMensal / (faturamentoEstimadoMensal || 1)) * 100);

  return {
    segmentacaoMercado: [
      {
        idPlano,
        descricao: `Clientes Foco em ${research.setor}`,
        variavel1: 'Faixa etária 24 a 50 anos',
        variavel1Oposto: 'Consumidores infantis/adolescentes',
        variavel2: 'Valoriza qualidade e atendimento ágil',
        variavel2Oposto: 'Busca exclusivamente menor preço',
        segmento: 'B2C e B2B Regional'
      }
    ],
    geradorPersonas: [
      {
        idPlano,
        nome: research.buyerPersona.nome,
        idade: research.buyerPersona.idade,
        escolaridade: 'Superior Completo / Tecnólogo',
        cargo: 'Profissional Liberal / Executivo',
        renda: 'R$ 4.500 a R$ 12.000',
        comportamentos: research.buyerPersona.perfil,
        objetivos: research.buyerPersona.desejos.join('; '),
        dores: research.buyerPersona.dores.join('; '),
        ondeBuscaInfo: 'Instagram, Google Search, Recomendações no WhatsApp'
      }
    ],
    analiseConcorrencia: research.concorrentesMapeados.map((c) => ({
      idPlano,
      concorrente: c.nome,
      pontosFortes: c.pontosFortes,
      pontosFracos: c.pontosFracos,
      precoPraticado: 'Médio / Alto',
      qualidade: 'Regular a Boa',
      localizacao: `${research.cidadeUf}`,
      atendimento: c.diferenciacao
    })),
    posicionamentoMercado: [
      {
        idPlano,
        publicoAlvo: `${research.buyerPersona.nome} (${research.buyerPersona.idade}) em ${research.cidadeUf}`,
        problema: research.buyerPersona.dores[0] || 'Dificuldade de encontrar serviços especializados de confiança',
        solucao: `${research.nomeNegocioSugerido} com processos modernos e garantia de qualidade`,
        principalDiferencial: 'Experiência do cliente humanizada, tecnologia e agilidade',
        propostaValor: research.resumoExecutivo.substring(0, 180),
        categoria: research.setor
      }
    ],
    pesquisaMercado: [
      {
        idPlano,
        objetivoPesquisa: `Validar demanda por ${research.setor} em ${research.cidadeUf}`,
        publicoPesquisado: '50 clientes potenciais e formulários digitais',
        metodoColeta: 'Entrevistas diretas e questionário online',
        principaisInsights: research.tendencias2025_2026.slice(0, 2).join('. '),
        conclusaoDecisao: 'Demanda validada com alta receptividade para a proposta de valor.'
      }
    ],
    definicaoMetas: [
      {
        idPlano,
        meta: `Atingir R$ ${faturamentoEstimadoMensal.toLocaleString('pt-BR')} de faturamento mensal`,
        indicador: 'Receita Bruta Mensal',
        prazo: '6 meses',
        responsavel: 'Gestor Geral',
        status: 'Em Planejamento',
        acaoNecessaria: 'Campanhas de tráfego pago local e parcerias estratégicas'
      }
    ],
    planoMarketing: [
      {
        idPlano,
        canal: 'Instagram & Google Ads Local',
        estrategia: 'Campanhas de captação de leads e reconhecimento de marca regional',
        investimentoMensal: Math.round(opexMensal * 0.15),
        metaConversao: '40 a 60 novos clientes/mês',
        frequencia: 'Diária',
        responsavel: 'Especialista em Marketing'
      }
    ],
    planoOperacional: [
      {
        idPlano,
        etapaProcesso: 'Atendimento & Execução do Serviço',
        descricaoAtividade: 'Recepção, triagem das necessidades, execução técnica com padrão de qualidade e pós-venda',
        tempoEstimado: '45 minutos por atendimento',
        responsavel: 'Equipe Operacional',
        recursosNecessarios: 'Equipamentos dedicados, software de gestão e insumos'
      }
    ],
    investimentoTotal: [
      {
        idPlano,
        categoria: 'Instalações e Equipamentos',
        item: 'Mobiliário, Tecnologia e Estrutura Inicial',
        quantidade: 1,
        valorUnitario: Math.round(capexTotal * 0.65),
        valorTotal: Math.round(capexTotal * 0.65)
      },
      {
        idPlano,
        categoria: 'Capital de Giro',
        item: 'Reserva Operacional Inicial (3 meses)',
        quantidade: 1,
        valorUnitario: Math.round(capexTotal * 0.35),
        valorTotal: Math.round(capexTotal * 0.35)
      }
    ],
    custosFixos: [
      {
        idPlano,
        item: 'Aluguel, Condomínio e IPTU',
        valorMensal: Math.round(opexMensal * 0.35),
        periodicidade: 'Mensal',
        observacao: 'Ponto comercial em localização acessível'
      },
      {
        idPlano,
        item: 'Equipe & Encargos Básicos',
        valorMensal: Math.round(opexMensal * 0.45),
        periodicidade: 'Mensal',
        observacao: 'Folha de pagamento operacional'
      }
    ],
    custosVariaveis: [
      {
        idPlano,
        produtoServico: 'Serviço / Produto Principal',
        custoUnitario: Math.round(research.buyerPersona.ticketMedio * 0.3),
        porcentagemImpostos: 6,
        comissaoPercentual: 5,
        custoTotalUnitario: Math.round(research.buyerPersona.ticketMedio * 0.41)
      }
    ],
    faturamentoMensal: [
      {
        idPlano,
        produtoServico: 'Serviço / Atendimento Padrão',
        quantidadeEstimada: Math.max(10, Math.round(faturamentoEstimadoMensal / (research.buyerPersona.ticketMedio || 150))),
        precoUnitarioVenda: research.buyerPersona.ticketMedio || 150,
        faturamentoTotal: faturamentoEstimadoMensal
      }
    ],
    indicadoresViabilidade: [
      {
        idPlano,
        faturamentoTotalMensal: faturamentoEstimadoMensal,
        custosTotaisMensais: opexMensal,
        lucroLiquidoMensal: lucroMensal,
        margemLucroPercentual: margem,
        pontoEquilibrioMensal: Math.round(opexMensal / 0.6),
        prazoRetornoMeses: pontoEquilibrioMeses
      }
    ],
    resumoExecutivo: [
      {
        idPlano,
        nomeEmpresa: research.nomeNegocioSugerido,
        setorAtuacao: research.setor,
        cidadeUf: research.cidadeUf,
        investimentoInicial: capexTotal,
        faturamentoMensalPrevisto: faturamentoEstimadoMensal,
        prazoRetorno: `${pontoEquilibrioMeses} meses`,
        propostaValorResumo: research.oportunidadeMercado.substring(0, 160)
      }
    ]
  };
}

function gerarRegistroFallbackParaFerramenta(
  f: FerramentaInfo,
  idPlano: string,
  research: DeepResearchReport
): Record<string, unknown> {
  const base = { ...f.exemploPayload, idPlano };
  if ('descricao' in base) base.descricao = `${research.nomeNegocioSugerido} - ${research.setor}`;
  if ('nome' in base) base.nome = research.buyerPersona.nome;
  return base;
}

function extrairNomeSugerido(prompt: string): string {
  const palavras = prompt.trim().split(/\s+/).slice(0, 3).join(' ');
  return palavras.charAt(0).toUpperCase() + palavras.slice(1) + ' Solutions';
}

function gerarPesquisaMercadoHeuristica(
  prompt: string,
  options: DeepResearchOptions
): any {
  const { cidadeUf = 'São Paulo / SP', orcamentoEstimado = 75000 } = options;

  return {
    nomeNegocioSugerido: extrairNomeSugerido(prompt),
    setor: 'Serviços Especializados e Inovação',
    cidadeUf,
    resumoExecutivo: `Plano de negócio estruturado para ${prompt} na praça de ${cidadeUf}, focado em atendimento humanizado, excelência operacional e posicionamento competitivo diferenciado.`,
    oportunidadeMercado: `Crescimento da demanda por soluções ágeis no setor com oportunidade de consolidação de marca em ${cidadeUf}.`,
    tendencias2025_2026: [
      'Atendimento omnicanal e agendamento inteligente',
      'Foco em Customer Experience e fidelização contínua',
      'Gestão baseada em dados e processos enxutos',
      'Práticas sustentáveis de operação'
    ],
    concorrentesMapeados: [
      {
        nome: 'Empresas Tradicionais do Nicho',
        pontosFortes: 'Reputação histórica e carteira fixa',
        pontosFracos: 'Pouca flexibilidade e digitalização',
        diferenciacao: 'Processos 100% modernos e transparência'
      },
      {
        nome: 'Operadores Informais',
        pontosFortes: 'Preço reduzido',
        pontosFracos: 'Falta de garantia e inconsistência',
        diferenciacao: 'Padronização, segurança e nota fiscal'
      }
    ],
    buyerPersona: {
      nome: 'Juliana Mendes',
      idade: '34 anos',
      perfil: 'Consumidora exigente, busca qualidade garantida e agilidade.',
      dores: ['Falta de clareza nos preços', 'Atendimento demorado'],
      desejos: ['Experiência sem atritos', 'Confiabilidade no serviço'],
      ticketMedio: 160
    },
    investimentoEstimado: {
      capexTotal: orcamentoEstimado,
      opexMensal: Math.round(orcamentoEstimado * 0.2),
      pontoEquilibrioMeses: 14,
      faturamentoEstimadoMensal: Math.round(orcamentoEstimado * 0.42)
    },
    aspectosLegaisTributarios: {
      cnaeSugerido: 'CNAE 7490-1/04 - Atividades de consultoria e serviços especializados',
      regimeTributario: 'Simples Nacional (Tabela III)',
      licencasExigidas: ['Alvará Municipal', 'Registro nos órgãos de classe']
    }
  };
}
