import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from '../automation/schemaCatalog';
import { FerramentaInfo, DeepResearchReport } from '../types/pnbox';
import { TEMPLATES_NEGOCIO, BusinessTemplate } from '../automation/businessTemplates';

export interface BusinessTemplateArchetype {
  id: string;
  nome: string;
  setor: string;
  descricao: string;
  cidadeUf: string;
}

export const TEMPLATES_DISPONIVEIS: BusinessTemplateArchetype[] = [
  {
    id: 'cafeteria_coworking',
    nome: 'Cafeteria Especial & Coworking Criativo',
    setor: 'Alimentação & Espaços de Trabalho',
    descricao: 'Cafeteria de cafés especiais com estações de trabalho de alta conectividade.',
    cidadeUf: 'Curitiba / PR'
  },
  {
    id: 'clinica_veterinaria',
    nome: 'Clínica Veterinária 24h & UTI Móvel',
    setor: 'Saúde Animal & Serviços Especializados',
    descricao: 'Atendimento emergencial 24h, cirurgia, internação e atendimento domiciliar.',
    cidadeUf: 'São Paulo / SP'
  },
  {
    id: 'consultoria_ia',
    nome: 'Consultoria de IA & Automação para PMEs',
    setor: 'Tecnologia da Informação & Consultoria',
    descricao: 'Implementação de agentes inteligentes e automações operacionais para negócios.',
    cidadeUf: 'Florianópolis / SC'
  },
  {
    id: 'ecommerce_sustentavel',
    nome: 'E-commerce de Cosméticos Naturais & Veganos',
    setor: 'Comércio Eletrônico & Cosméticos',
    descricao: 'Linha sustentável de cosméticos sem testes em animais e embalagens biodegradáveis.',
    cidadeUf: 'Belo Horizonte / MG'
  },
  {
    id: 'dark_kitchen_fitness',
    nome: 'Dark Kitchen Saudável & Alimentação Funcional',
    setor: 'Gastronomia & Delivery',
    descricao: 'Refeições nutritivas e personalizadas para praticantes de atividade física.',
    cidadeUf: 'Rio de Janeiro / RJ'
  }
];

/**
 * Módulo SchemaGenerator: Mapeia os campos necessários de cada uma das 14 ferramentas PNBOX
 * e gera objetos JSON com dados de negócio realistas baseados em templates ou relatórios de Deep Research.
 */
export class SchemaGenerator {
  /**
   * Retorna o catálogo de todas as 14 ferramentas mapeadas
   */
  static getToolsCatalog(): FerramentaInfo[] {
    return FERRAMENTAS_PNBOX;
  }

  /**
   * Obtém a definição e schema de uma ferramenta específica
   */
  static getToolById(ferramentaId: string): FerramentaInfo | undefined {
    return FERRAMENTAS_PNBOX.find((f) => f.id === ferramentaId || f.collectionName === ferramentaId);
  }

  /**
   * Retorna a lista de campos obrigatórios de uma ferramenta
   */
  static getRequiredFields(ferramentaId: string): string[] {
    const f = this.getToolById(ferramentaId);
    if (!f) return [];
    return f.camposSchema.filter((c) => c.obrigatorio).map((c) => c.nome);
  }

  /**
   * Gera o conjunto completo de dados (14 coleções) para um template de negócio específico
   */
  static generateForTemplate(
    templateId: string = 'cafeteria_coworking',
    idPlano: string = ID_PLANO_PADRAO
  ): Record<string, Record<string, unknown>[]> {
    const template = TEMPLATES_NEGOCIO.find((t) => t.id === templateId) || TEMPLATES_NEGOCIO[0];
    const resultado: Record<string, Record<string, unknown>[]> = {};

    for (const f of FERRAMENTAS_PNBOX) {
      const dadosTemplate = template.dados[f.collectionName];
      if (Array.isArray(dadosTemplate) && dadosTemplate.length > 0) {
        resultado[f.collectionName] = dadosTemplate.map((item) => ({
          ...item,
          idPlano
        }));
      } else {
        resultado[f.collectionName] = [
          {
            ...f.exemploPayload,
            idPlano
          }
        ];
      }
    }

    return resultado;
  }

  /**
   * Gera payloads realistas para as 14 ferramentas a partir de um relatório de Deep Research
   */
  static generateFromResearch(
    research: DeepResearchReport,
    idPlano: string = ID_PLANO_PADRAO
  ): Record<string, Record<string, unknown>[]> {
    const nome = research.nomeNegocioSugerido || 'Novo Empreendimento';
    const persona = research.buyerPersona || {
      nome: 'Cliente Típico',
      idade: '30 a 45 anos',
      perfil: 'Consumidor exigente',
      dores: ['Falta de opções especializadas na região.'],
      desejos: ['Atendimento rápido e personalizado.'],
      ticketMedio: 150
    };
    const fin = research.investimentoEstimado || {
      capexTotal: 80000,
      opexMensal: 20000,
      faturamentoEstimadoMensal: 35000,
      pontoEquilibrioMeses: 12
    };
    const leg = research.aspectosLegaisTributarios || {
      cnaeSugerido: '6201-5/01 - Desenvolvimento e consultoria',
      regimeTributario: 'Simples Nacional',
      licencasExigidas: ['Alvará de Funcionamento', 'Vigilância Sanitária']
    };

    return {
      segmentacaoMercado: [
        {
          idPlano,
          segmento: `${persona.perfil} em ${research.cidadeUf || 'São Paulo'}`,
          criterioDemografico: `Faixa etária: ${persona.idade}, público focado em qualidade e inovação`,
          criterioGeografico: research.cidadeUf || 'Nacional / Polo Regional',
          criterioPsicografico: 'Busca conveniência, confiabilidade, sustentabilidade e excelente atendimento.',
          tamanhoMercadoEstimado: 25000,
          prioridade: 'Alta'
        }
      ],
      geradorPersonas: [
        {
          idPlano,
          nomePersona: persona.nome,
          idade: persona.idade,
          ocupacao: 'Profissional / Empreendedor / Consumidor Alvo',
          comportamento: persona.perfil,
          dores: Array.isArray(persona.dores) ? persona.dores.join(' • ') : 'Falta de opções especializadas na região.',
          desejos: Array.isArray(persona.desejos) ? persona.desejos.join(' • ') : 'Atendimento rápido e personalizado.',
          comoAjudar: `Prover solução de ${research.setor || 'serviços'} com padrão de excelência.`
        }
      ],
      propostaValor: [
        {
          idPlano,
          produtoServico: `Linha de Soluções e Produtos ${nome}`,
          doresAliviadas: Array.isArray(persona.dores) ? persona.dores[0] : 'Insegurança e perda de tempo',
          ganhosCriados: Array.isArray(persona.desejos) ? persona.desejos[0] : 'Praticidade, transparência e alto valor',
          diferencialCompetitivo: research.concorrentesMapeados?.[0]?.diferenciacao || 'Tecnologia de ponta e foco total na experiência do cliente.'
        }
      ],
      analiseConcorrencia: research.concorrentesMapeados && research.concorrentesMapeados.length > 0
        ? research.concorrentesMapeados.map((c) => ({
            idPlano,
            nomeConcorrente: c.nome,
            tipoConcorrente: 'Direto',
            pontosFortes: c.pontosFortes,
            pontosFracos: c.pontosFracos,
            estrategiaSuperacao: c.diferenciacao,
            nivelAmeaca: 'Média'
          }))
        : [
            {
              idPlano,
              nomeConcorrente: 'Concorrentes Tradicionais Locais',
              tipoConcorrente: 'Direto',
              pontosFortes: 'Marca já conhecida no bairro',
              pontosFracos: 'Pouca digitalização e atendimento burocrático',
              estrategiaSuperacao: 'Atendimento ágil, canais digitais e programa de fidelidade.',
              nivelAmeaca: 'Média'
            }
          ],
      modeloReceita: [
        {
          idPlano,
          fonteReceita: `Venda Direta & Planos ${nome}`,
          tipoCobranca: 'Recorrente / Pontual',
          precoMedio: persona.ticketMedio || 180,
          volumeEstimadoMensal: Math.round(fin.faturamentoEstimadoMensal / (persona.ticketMedio || 180)),
          faturamentoProjetadoMensal: fin.faturamentoEstimadoMensal
        }
      ],
      estrategiaMarketing: [
        {
          idPlano,
          canal: 'Instagram, Google Ads & Tráfego Local',
          objetivo: 'Atração de leads qualificados e conhecimento de marca',
          orcamentoMensal: Math.round(fin.opexMensal * 0.15),
          metricasChave: 'CAC < R$ 45, ROAS > 3.5, Taxa de Conversão > 4%'
        }
      ],
      canaisVenda: [
        {
          idPlano,
          nomeCanal: 'Canal Próprio Omnichannel (Loja Física + App/WhatsApp)',
          tipoCanal: 'Direto',
          custoOperacao: Math.round(fin.opexMensal * 0.1),
          capacidadeAtendimentoMensal: 1200
        }
      ],
      recursosPrincipais: [
        {
          idPlano,
          tipoRecurso: 'Equipamentos, Espaço Físico & Infraestrutura Cloud',
          descricao: `Estrutura operacional para ${research.setor || 'atendimento ao cliente'}`,
          custoAquisicao: Math.round(fin.capexTotal * 0.5),
          propriedade: 'Própria'
        }
      ],
      investimentoInicial: [
        {
          idPlano,
          item: 'Reforma, Instalações, Máquinas e Capital de Giro',
          categoria: 'Equipamentos & Infraestrutura',
          valor: fin.capexTotal,
          prioridade: 'Essencial'
        }
      ],
      custosFixos: [
        {
          idPlano,
          item: 'Aluguel, Folha de Pagamento, Sistemas & Contabilidade',
          valorMensal: Math.round(fin.opexMensal * 0.7),
          periodicidade: 'Mensal',
          observacao: 'Despesas fixas operacionais indispensáveis.'
        }
      ],
      custosVariaveis: [
        {
          idPlano,
          produtoServico: `Insumos e Taxas de Operação ${nome}`,
          custoUnitario: Math.round((persona.ticketMedio || 150) * 0.35),
          porcentagemImpostos: 6.5,
          comissaoPercentual: 3.0,
          custoTotalUnitario: Math.round((persona.ticketMedio || 150) * 0.45)
        }
      ],
      faturamentoMensal: [
        {
          idPlano,
          produtoServico: `Linha de Serviços e Produtos ${nome}`,
          quantidadeEstimada: Math.round(fin.faturamentoEstimadoMensal / (persona.ticketMedio || 150)),
          precoUnitarioVenda: persona.ticketMedio || 150,
          faturamentoTotal: fin.faturamentoEstimadoMensal
        }
      ],
      indicadoresViabilidade: [
        {
          idPlano,
          faturamentoTotalMensal: fin.faturamentoEstimadoMensal,
          custosTotaisMensais: fin.opexMensal,
          lucroLiquidoMensal: fin.faturamentoEstimadoMensal - fin.opexMensal,
          margemLucroPercentual: Number((((fin.faturamentoEstimadoMensal - fin.opexMensal) / fin.faturamentoEstimadoMensal) * 100).toFixed(1)),
          pontoEquilibrioMensal: Math.round(fin.opexMensal * 1.15),
          prazoRetornoMeses: fin.pontoEquilibrioMeses || 14
        }
      ],
      resumoExecutivo: [
        {
          idPlano,
          nomeEmpresa: nome,
          setorAtuacao: research.setor || 'Serviços Especializados',
          cidadeUf: research.cidadeUf || 'São Paulo / SP',
          investimentoInicial: fin.capexTotal,
          faturamentoMensalPrevisto: fin.faturamentoEstimadoMensal,
          prazoRetorno: `${fin.pontoEquilibrioMeses || 14} meses`,
          propostaValorResumo: research.resumoExecutivo || `${nome}: Inovação e alto padrão em ${research.setor}.`,
          cnae: leg.cnaeSugerido,
          regimeTributario: leg.regimeTributario
        }
      ]
    };
  }

  /**
   * Valida se um payload individual contém todos os campos obrigatórios
   */
  static validatePayload(
    ferramentaId: string,
    payload: Record<string, unknown>
  ): { valido: boolean; erros: string[]; avisos: string[] } {
    const f = this.getToolById(ferramentaId);
    if (!f) {
      return { valido: false, erros: [`Ferramenta "${ferramentaId}" não encontrada`], avisos: [] };
    }

    const erros: string[] = [];
    const avisos: string[] = [];

    for (const campo of f.camposSchema) {
      const val = payload[campo.nome];
      if (campo.obrigatorio) {
        if (val === undefined || val === null || val === '') {
          erros.push(`Campo obrigatório ausente ou vazio: "${campo.nome}" (${campo.descricao})`);
        }
      }

      if (val !== undefined && val !== null) {
        if (campo.tipo === 'number' && typeof val !== 'number') {
          if (isNaN(Number(val))) {
            erros.push(`Campo "${campo.nome}" deve ser numérico, recebido: ${typeof val}`);
          }
        }
      }
    }

    return {
      valido: erros.length === 0,
      erros,
      avisos
    };
  }

  /**
   * Helper unificado para gerar todos os schemas das 14 ferramentas
   */
  static gerarTodosOsSchemas(
    info: any,
    idPlano: string = ID_PLANO_PADRAO
  ): Record<string, Record<string, unknown>[]> {
    if (!info) {
      return this.generateForTemplate('defesai_adeus_multas', idPlano);
    }

    // Se já for um DeepResearchReport completo
    if (info.buyerPersona && info.investimentoEstimado) {
      return this.generateFromResearch(info as DeepResearchReport, idPlano);
    }

    // Normaliza para o formato esperado por generateFromResearch
    const reportNormalizado: DeepResearchReport = {
      promptOriginal: info.resumoExecutivo || info.descricao || 'Plano de Negócio Sebrae',
      nomeNegocioSugerido: info.nomeEmpresa || info.nomePlano || 'Novo Empreendimento',
      setor: info.setor || 'Serviços & Inovação',
      cidadeUf: info.cidadeUf || 'São Paulo / SP',
      resumoExecutivo: info.resumoExecutivo || info.descricao || 'Empresa inovadora com foco em alta eficiência e excelência.',
      oportunidadeMercado: 'Crescimento de demanda qualificada com necessidade de soluções digitais.',
      tendencias2025_2026: ['Automação digital', 'Inteligência Artificial', 'Atendimento sob demanda'],
      concorrentesMapeados: [
        {
          nome: 'Operadores Tradicionais',
          pontosFortes: 'Reconhecimento de mercado local',
          pontosFracos: 'Lentidão e custos elevados',
          diferenciacao: 'Atendimento inteligente e agilidade superior'
        }
      ],
      buyerPersona: {
        nome: 'Cliente Qualificado',
        idade: '28 a 55 anos',
        perfil: 'Pessoa física ou gestor de empresa que valoriza tempo e segurança',
        dores: ['Processos burocráticos e perda de tempo'],
        desejos: ['Solução rápida, assertiva e confiável'],
        ticketMedio: 250
      },
      investimentoEstimado: {
        capexTotal: info.orcamentoEstimado || 85000,
        opexMensal: Math.round((info.orcamentoEstimado || 85000) * 0.25),
        pontoEquilibrioMeses: 12,
        faturamentoEstimadoMensal: Math.round((info.orcamentoEstimado || 85000) * 0.45)
      },
      aspectosLegaisTributarios: {
        cnaeSugerido: '6201-5/01 - Desenvolvimento e consultoria',
        regimeTributario: 'Simples Nacional',
        licencasExigidas: ['Alvará de Funcionamento']
      },
      fontesPesquisa: [{ titulo: 'Sebrae PNBOX Oficial', uri: 'https://pnbox.sebrae.com.br' }],
      geradoEm: new Date().toISOString()
    };

    return this.generateFromResearch(reportNormalizado, idPlano);
  }
}
