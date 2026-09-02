import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from './schemaCatalog';
import { FerramentaInfo, CampoSchemaInfo } from '../types/pnbox';
import { BusinessTemplate } from './businessTemplates';

// ==========================================
// 1. TIPOS E INTERFACES DO SCHEMA GENERATOR
// ==========================================

export type BusinessArchetypeId =
  | 'tecnologia_saas'
  | 'cafeteria_gastronomia'
  | 'saude_odontologia'
  | 'barbearia_estetica'
  | 'educacao_edtech'
  | 'varejo_sustentavel'
  | 'consultoria_agencia'
  | 'energia_solar'
  | 'fitness_academia'
  | 'logistica_frotas'
  | 'random';

export interface BusinessArchetype {
  id: BusinessArchetypeId;
  nome: string;
  setor: string;
  sugestoesNomes: string[];
  descricaoPadrao: string;
  ticketMedio: 'baixo' | 'medio' | 'alto' | 'premium';
}

export interface SchemaAnalysisToolReport {
  toolId: string;
  nome: string;
  bloco: string;
  blocoLabel: string;
  collectionName: string;
  metodosDDP: string[];
  totalCampos: number;
  camposObrigatorios: string[];
  camposOpcionais: string[];
  tiposCampos: Record<string, string>;
  temCamposNumericos: boolean;
  camposNumericos: string[];
  camposTexto: string[];
  exemploPayload: Record<string, unknown>;
}

export interface SchemaAnalysisSummary {
  totalFerramentas: number;
  totalColecoes: number;
  totalCamposMapeados: number;
  totalCamposObrigatorios: number;
  totalCamposNumericos: number;
  totalCamposTexto: number;
  ferramentasPorBloco: Record<string, number>;
  ferramentas: SchemaAnalysisToolReport[];
}

export interface GenerateMockOptions {
  idPlano?: string;
  archetype?: BusinessArchetypeId;
  companyName?: string;
  businessSector?: string;
  businessDescription?: string;
  itemsPerTool?: number | Partial<Record<string, number>>;
  randomVariance?: number; // 0.0 (estático) a 1.0 (alta variação)
  selectedToolIds?: string[];
  includeComplementaryTools?: boolean;
}

export interface SchemaValidationResult {
  valido: boolean;
  totalErros: number;
  totalAvisos: number;
  detalhesPorFerramenta: Record<
    string,
    {
      collectionName: string;
      status: 'valido' | 'erro' | 'ausente';
      itensValidados: number;
      erros: string[];
      avisos: string[];
    }
  >;
}

// ==========================================
// 2. BANCO DE ARQUÉTIPOS E DADOS REALISTAS
// ==========================================

export const BUSINESS_ARCHETYPES: BusinessArchetype[] = [
  {
    id: 'tecnologia_saas',
    nome: 'SaaS B2B & Inteligência de Dados',
    setor: 'Tecnologia / Software como Serviço',
    sugestoesNomes: [
      'DataFlow Intelligence SaaS',
      'OmniSync Analytics B2B',
      'Vortex Cloud Automation',
      'PulseCore Gestão Integrada',
      'Nexura AI Solutions'
    ],
    descricaoPadrao: 'Plataforma SaaS B2B baseada em nuvem para automação de fluxos operacionais e BI com inteligência artificial para PMEs.',
    ticketMedio: 'alto'
  },
  {
    id: 'cafeteria_gastronomia',
    nome: 'Cafeteria Especial & Espaço Conexão',
    setor: 'Alimentos & Bebidas / Gastronomia',
    sugestoesNomes: [
      'Origem & Grão Café Especial',
      'Torra Nobre Cafeteria & Lounge',
      'Aroma & Foco Coffee Space',
      'Veludo Preto Microlotes',
      'Horizonte Brew & Co.'
    ],
    descricaoPadrao: 'Cafeteria gourmet focada em cafés especiais com pontuação SCA acima de 84 pontos, métodos artesanais e ambiente focado para trabalho remoto.',
    ticketMedio: 'medio'
  },
  {
    id: 'saude_odontologia',
    nome: 'Clínica Odontológica & Estética Facial',
    setor: 'Saúde & Odontologia Especializada',
    sugestoesNomes: [
      'Sorriso & Arte Odontologia Digital',
      'Inovare Implantes & Estética',
      'OdontoPrime Harmonização',
      'Clínica Vivence Odontologia',
      'Lumina Smile Care'
    ],
    descricaoPadrao: 'Centro odontológico com escaneamento 3D, alinhadores transparentes, implantes guiados e harmonização orofacial para o público A/B.',
    ticketMedio: 'premium'
  },
  {
    id: 'barbearia_estetica',
    nome: 'Barbearia Vintage & Bar Executivo',
    setor: 'Beleza & Cuidados Masculinos',
    sugestoesNomes: [
      'Dom Navalha Barber Club',
      'Old School Barbearia & Chope',
      'Barba & Bigode Executive Lounge',
      'Cavalheiro Barber & Tattoo',
      'The Gentleman Club'
    ],
    descricaoPadrao: 'Barbearia clássica com serviços de barba na toalha quente, corte de cabelo moderno, chopp artesanal e agendamento 100% digital via app.',
    ticketMedio: 'medio'
  },
  {
    id: 'educacao_edtech',
    nome: 'EdTech & Cursos Práticos de Alta Demanda',
    setor: 'Educação & Tecnologia',
    sugestoesNomes: [
      'NextSkills Hub Educacional',
      'AceleraTech Academy',
      'SkillCraft Cursos Profissionalizantes',
      'MestreTech Treinamentos',
      'Futuro Digital Cursos'
    ],
    descricaoPadrao: 'Plataforma de capacitação profissional em tecnologia, vendas e inteligência artificial com projetos práticos e mentorias ao vivo.',
    ticketMedio: 'medio'
  },
  {
    id: 'varejo_sustentavel',
    nome: 'E-commerce de Moda Sustentável & Eco',
    setor: 'Varejo & Moda Sustentável',
    sugestoesNomes: [
      'EcoFio Roupas Orgânicas',
      'Verde Raiz Moda Circular',
      'Trama Nobre Sustentabilidade',
      'Harmonia Eco Wear',
      'Pura Fibra Vestuário'
    ],
    descricaoPadrao: 'Marca de vestuário e acessórios ecológicos com tecidos reciclados, tingimento natural e cadeia de fornecedores 100% rastreada e justa.',
    ticketMedio: 'medio'
  },
  {
    id: 'consultoria_agencia',
    nome: 'Agência de Marketing & Growth Hacking',
    setor: 'Serviços Profissionais / Marketing',
    sugestoesNomes: [
      'ScaleUp Growth Agency',
      'Vértice Marketing de Performance',
      'Impulso Digital 360',
      'Horizonte Performance & Branding',
      'Elevate Consultoria Estratégica'
    ],
    descricaoPadrao: 'Agência focada em aquisição de clientes, tráfego pago, SEO e estruturação de funis de vendas B2B com foco em ROI comprovado.',
    ticketMedio: 'alto'
  },
  {
    id: 'energia_solar',
    nome: 'Engenharia de Energia Solar Fotovoltaica',
    setor: 'Energia & Sustentabilidade',
    sugestoesNomes: [
      'Solarium Engenharia Solar',
      'VoltSun Energia Fotovoltaica',
      'EcoPower Geradores Solares',
      'Luz Pura Soluções Renováveis',
      'Solaris Integradores de Energia'
    ],
    descricaoPadrao: 'Projetos de engenharia, homologação junto a concessionárias e instalação de usinas solares residenciais e comerciais com redução de até 95% na conta.',
    ticketMedio: 'premium'
  },
  {
    id: 'fitness_academia',
    nome: 'Centro de Treinamento & CrossTraining',
    setor: 'Esporte, Fitness & Bem-Estar',
    sugestoesNomes: [
      'IronBox Centro de Treinamento',
      'Vigor & Força Cross Studio',
      'Apex Performance Academia',
      'Titans Functional Training',
      'PulseFit Studio Personal'
    ],
    descricaoPadrao: 'Box de treinamento funcional e musculação com acompanhamento nutricional, turmas reduzidas e metodologia esportiva de alta performance.',
    ticketMedio: 'medio'
  },
  {
    id: 'logistica_frotas',
    nome: 'Logística Express & Entrega Inteligente',
    setor: 'Logística & Transporte',
    sugestoesNomes: [
      'RotaCerta Logística Express',
      'Velox Transportes Urbanos',
      'AgileCargo Distribuição',
      'PrimeRoute Frotas e Entregas',
      'FlashLog Entregas Rápidas'
    ],
    descricaoPadrao: 'Operadora de logística urbana last-mile com roteirização inteligente por inteligência artificial e veículos elétricos para e-commerces.',
    ticketMedio: 'alto'
  }
];

// Nomes brasileiros para geração de personas realistas
const NOMES_BRASILEIROS = [
  'Lucas Silveira', 'Camila Rocha', 'Mariana Albuquerque', 'Rodrigo Mendes',
  'Juliana Barbosa', 'Felipe Castro', 'Beatriz Nogueira', 'Gabriel Carvalho',
  'Larissa Monteiro', 'Thiago Vasconcelos', 'Fernanda Lima', 'Rafael Moreira',
  'Aline Guimarães', 'Eduardo Paiva', 'Carolina Farias', 'Marcelo Antunes'
];

const CARGOS_POR_SETOR: Record<string, string[]> = {
  tecnologia_saas: ['Tech Lead', 'Diretor de Operações', 'Gerente de TI', 'Product Manager', 'Empreendedor Digital'],
  cafeteria_gastronomia: ['Designer de Produto', 'Engenheiro de Software Remoto', 'Advogado Corporativo', 'Consultor Autônomo', 'Arquiteta'],
  saude_odontologia: ['Empresária', 'Executivo Financeiro', 'Médica', 'Professora Universitária', 'Gerente Comercial'],
  barbearia_estetica: ['Empresário', 'Advogado', 'Analista de Sistemas', 'Consultor Financeiro', 'Arquiteto'],
  educacao_edtech: ['Estudante de Graduação', 'Desenvolvedor Júnior', 'Analista de Suporte', 'Transição de Carreira', 'Coordenador Pedagógico'],
  varejo_sustentavel: ['Designer de Interiores', 'Bióloga', 'Publicitária', 'Nutricionista', 'Estilista'],
  consultoria_agencia: ['CMO / Diretora de Marketing', 'Sócio-Fundador', 'Gerente de E-commerce', 'Head de Vendas', 'Consultor'],
  energia_solar: ['Proprietário Rural', 'Engenheiro Civil', 'Empresário Industrial', 'Síndico Profissional', 'Aposentado Investidor'],
  fitness_academia: ['Profissional Liberal', 'Corredor Amador', 'Empresário', 'Fisioterapeuta', 'Nutricionista Esportiva'],
  logistica_frotas: ['Gerente de Logística', 'Diretor de Supply Chain', 'Dono de E-commerce', 'Coordenador de Transportes', 'Despachante']
};

// ==========================================
// 3. CLASSE PRINCIPAL SCHEMA GENERATOR
// ==========================================

export class SchemaGenerator {
  /**
   * Analisa profundamente a estrutura técnica das 14 ferramentas PNBOX e seus esquemas DDP.
   */
  public static analyzeSchemas(ferramentas: FerramentaInfo[] = FERRAMENTAS_PNBOX): SchemaAnalysisSummary {
    const reports: SchemaAnalysisToolReport[] = [];
    let totalCamposMapeados = 0;
    let totalCamposObrigatorios = 0;
    let totalCamposNumericos = 0;
    let totalCamposTexto = 0;
    const ferramentasPorBloco: Record<string, number> = {};

    for (const f of ferramentas) {
      ferramentasPorBloco[f.bloco] = (ferramentasPorBloco[f.bloco] || 0) + 1;

      const camposObrigatorios = f.camposSchema.filter((c) => c.obrigatorio).map((c) => c.nome);
      const camposOpcionais = f.camposSchema.filter((c) => !c.obrigatorio).map((c) => c.nome);
      const tiposCampos: Record<string, string> = {};
      const camposNumericos: string[] = [];
      const camposTexto: string[] = [];

      for (const c of f.camposSchema) {
        totalCamposMapeados++;
        tiposCampos[c.nome] = c.tipo;
        if (c.obrigatorio) totalCamposObrigatorios++;

        if (c.tipo === 'number') {
          totalCamposNumericos++;
          camposNumericos.push(c.nome);
        } else {
          totalCamposTexto++;
          camposTexto.push(c.nome);
        }
      }

      reports.push({
        toolId: f.id,
        nome: f.nome,
        bloco: f.bloco,
        blocoLabel: f.blocoLabel,
        collectionName: f.collectionName,
        metodosDDP: f.metodosDDP,
        totalCampos: f.camposSchema.length,
        camposObrigatorios,
        camposOpcionais,
        tiposCampos,
        temCamposNumericos: camposNumericos.length > 0,
        camposNumericos,
        camposTexto,
        exemploPayload: f.exemploPayload
      });
    }

    return {
      totalFerramentas: ferramentas.length,
      totalColecoes: new Set(ferramentas.map((f) => f.collectionName)).size,
      totalCamposMapeados,
      totalCamposObrigatorios,
      totalCamposNumericos,
      totalCamposTexto,
      ferramentasPorBloco,
      ferramentas: reports
    };
  }

  /**
   * Retorna a lista de arquétipos de negócios prontos para geração.
   */
  public static getAvailableArchetypes(): BusinessArchetype[] {
    return [...BUSINESS_ARCHETYPES];
  }

  /**
   * Obtém um arquétipo pelo ID ou escolhe aleatoriamente se for 'random' ou não informado.
   */
  public static resolveArchetype(archetypeId?: BusinessArchetypeId): BusinessArchetype {
    if (!archetypeId || archetypeId === 'random') {
      const randomIndex = Math.floor(Math.random() * BUSINESS_ARCHETYPES.length);
      return BUSINESS_ARCHETYPES[randomIndex];
    }
    const found = BUSINESS_ARCHETYPES.find((a) => a.id === archetypeId);
    return found || BUSINESS_ARCHETYPES[0];
  }

  /**
   * Gera um template completo de negócio (BusinessTemplate) com metadados e dados dos 14 schemas.
   */
  public static generateBusinessTemplate(options: GenerateMockOptions = {}): BusinessTemplate {
    const archetype = this.resolveArchetype(options.archetype);
    const idPlano = options.idPlano || ID_PLANO_PADRAO;
    const companyName = options.companyName || this.pickRandom(archetype.sugestoesNomes);
    const setor = options.businessSector || archetype.setor;
    const descricao = options.businessDescription || archetype.descricaoPadrao;

    const dados = this.generateMockData({
      ...options,
      archetype: archetype.id,
      companyName,
      businessSector: setor,
      businessDescription: descricao,
      idPlano
    });

    const uniqueSlug = companyName
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^a-z0-9]+/g, '_')
      .replace(/^_+|_+$/g, '');

    return {
      id: `custom_${uniqueSlug}_${Date.now().toString(36)}`,
      nome: companyName,
      setor,
      descricao,
      planoId: idPlano,
      dados
    };
  }

  /**
   * Gera um objeto de dados compatível com as 14 coleções DDP do PNBOX, respeitando estritamente os schemas.
   */
  public static generateMockData(
    options: GenerateMockOptions = {}
  ): Record<string, Record<string, unknown>[]> {
    const archetype = this.resolveArchetype(options.archetype);
    const idPlano = options.idPlano || ID_PLANO_PADRAO;
    const companyName = options.companyName || this.pickRandom(archetype.sugestoesNomes);
    const variance = options.randomVariance !== undefined ? options.randomVariance : 0.2;
    const toolsFilter = options.selectedToolIds ? new Set(options.selectedToolIds) : null;

    const getItemCount = (toolId: string, defaultMin: number, defaultMax: number): number => {
      if (typeof options.itemsPerTool === 'number') {
        return Math.max(1, options.itemsPerTool);
      }
      if (options.itemsPerTool && typeof options.itemsPerTool === 'object' && options.itemsPerTool[toolId]) {
        return options.itemsPerTool[toolId]!;
      }
      return this.randomInt(defaultMin, defaultMax);
    };

    const resultado: Record<string, Record<string, unknown>[]> = {};

    // 1. SEGMENTAÇÃO DE MERCADO
    if (!toolsFilter || toolsFilter.has('segmentacaoMercado')) {
      const count = getItemCount('segmentacaoMercado', 2, 3);
      resultado.segmentacaoMercado = this.generateSegmentacaoMercado(idPlano, archetype, companyName, count);
    }

    // 2. GERADOR DE PERSONAS
    if (!toolsFilter || toolsFilter.has('geradorPersonas')) {
      const count = getItemCount('geradorPersonas', 2, 3);
      resultado.geradorPersonas = this.generatePersonas(idPlano, archetype, count);
    }

    // 3. JORNADA DO CLIENTE
    if (!toolsFilter || toolsFilter.has('jornadaCliente')) {
      const count = getItemCount('jornadaCliente', 3, 4);
      resultado.jornadaCliente = this.generateJornadaCliente(idPlano, archetype, companyName, count);
    }

    // 4. PROPOSTA DE VALOR
    if (!toolsFilter || toolsFilter.has('propostaValor')) {
      const count = getItemCount('propostaValor', 1, 1);
      resultado.propostaValor = this.generatePropostaValor(idPlano, archetype, companyName, count);
    }

    // 5. ANÁLISE DA CONCORRÊNCIA
    if (!toolsFilter || toolsFilter.has('analiseConcorrencia')) {
      const count = getItemCount('analiseConcorrencia', 2, 3);
      resultado.analiseConcorrencia = this.generateAnaliseConcorrencia(idPlano, archetype, count);
    }

    // 6. FORÇAS E FRAQUEZAS
    if (!toolsFilter || toolsFilter.has('forcasFraquezas')) {
      const count = getItemCount('forcasFraquezas', 3, 4);
      resultado.forcasFraquezas = this.generateForcasFraquezas(idPlano, archetype, count);
    }

    // 7. OPORTUNIDADES E AMEAÇAS
    if (!toolsFilter || toolsFilter.has('oportunidadesAmeacas')) {
      const count = getItemCount('oportunidadesAmeacas', 3, 4);
      resultado.oportunidadesAmeacas = this.generateOportunidadesAmeacas(idPlano, archetype, count);
    }

    // 8. ANÁLISE SWOT CONSOLIDADA
    if (!toolsFilter || toolsFilter.has('analiseSwot')) {
      const count = getItemCount('analiseSwot', 1, 1);
      resultado.analiseSwot = this.generateAnaliseSwot(idPlano, archetype, count);
    }

    // 9. INVESTIMENTO FIXO
    if (!toolsFilter || toolsFilter.has('investimentoFixo')) {
      const count = getItemCount('investimentoFixo', 3, 5);
      resultado.investimentoFixo = this.generateInvestimentoFixo(idPlano, archetype, variance, count);
    }

    // 10. INVESTIMENTO PRÉ-OPERACIONAL
    if (!toolsFilter || toolsFilter.has('investimentoPreOperacional')) {
      const count = getItemCount('investimentoPreOperacional', 3, 4);
      resultado.investimentoPreOperacional = this.generateInvestimentoPreOperacional(idPlano, archetype, variance, count);
    }

    // 11. ESTOQUE INICIAL
    if (!toolsFilter || toolsFilter.has('estoqueInicial')) {
      const count = getItemCount('estoqueInicial', 2, 4);
      resultado.estoqueInicial = this.generateEstoqueInicial(idPlano, archetype, variance, count);
    }

    // 12. CAPITAL DE GIRO
    if (!toolsFilter || toolsFilter.has('capitalGiro')) {
      const count = getItemCount('capitalGiro', 1, 1);
      resultado.capitalGiro = this.generateCapitalGiro(idPlano, archetype, variance, count);
    }

    // 13. CUSTO FIXO
    if (!toolsFilter || toolsFilter.has('custoFixo')) {
      const count = getItemCount('custoFixo', 3, 5);
      resultado.custoFixo = this.generateCustoFixo(idPlano, archetype, variance, count);
    }

    // 14. PRODUTO / SERVIÇO
    if (!toolsFilter || toolsFilter.has('produtoServico')) {
      const count = getItemCount('produtoServico', 3, 5);
      resultado.produtoServico = this.generateProdutoServico(idPlano, archetype, variance, count);
    }

    // Ferramentas complementares opcionais
    if (options.includeComplementaryTools) {
      if (!toolsFilter || toolsFilter.has('quadroExperimentacao')) {
        resultado.quadroExperimentacaoHipotese = this.generateQuadroExperimentacao(idPlano, archetype, 2);
      }
      if (!toolsFilter || toolsFilter.has('funilVendas')) {
        resultado.funilVendas = this.generateFunilVendas(idPlano, archetype, variance, 2);
      }
    }

    return resultado;
  }

  /**
   * Valida minuciosamente um conjunto de dados arbitrários contra a definição dos 14 schemas.
   */
  public static validateData(
    data: Record<string, Record<string, unknown>[]>,
    ferramentas: FerramentaInfo[] = FERRAMENTAS_PNBOX
  ): SchemaValidationResult {
    let totalErros = 0;
    let totalAvisos = 0;
    const detalhes: SchemaValidationResult['detalhesPorFerramenta'] = {};

    for (const f of ferramentas) {
      const itens = data[f.collectionName] || data[f.id];
      const toolReport: {
        collectionName: string;
        status: 'valido' | 'erro' | 'ausente';
        itensValidados: number;
        erros: string[];
        avisos: string[];
      } = {
        collectionName: f.collectionName,
        status: 'valido',
        itensValidados: Array.isArray(itens) ? itens.length : 0,
        erros: [],
        avisos: []
      };

      if (!itens || !Array.isArray(itens) || itens.length === 0) {
        toolReport.status = 'ausente';
        toolReport.avisos.push(`Nenhum registro encontrado para a coleção "${f.collectionName}".`);
        totalAvisos++;
      } else {
        itens.forEach((item, index) => {
          for (const campo of f.camposSchema) {
            const val = item[campo.nome];

            // Campo obrigatório ausente ou vazio
            if (campo.obrigatorio) {
              if (val === undefined || val === null || val === '') {
                toolReport.erros.push(`[Item ${index + 1}] Campo obrigatório "${campo.nome}" está ausente ou vazio.`);
                totalErros++;
              }
            }

            // Validação de tipo
            if (val !== undefined && val !== null && val !== '') {
              if (campo.tipo === 'number') {
                if (typeof val !== 'number' || isNaN(val)) {
                  toolReport.erros.push(`[Item ${index + 1}] Campo "${campo.nome}" deve ser numérico, mas recebeu tipo "${typeof val}".`);
                  totalErros++;
                }
              } else if (campo.tipo === 'string') {
                if (typeof val !== 'string') {
                  toolReport.erros.push(`[Item ${index + 1}] Campo "${campo.nome}" deve ser texto (string).`);
                  totalErros++;
                }
              }
            }
          }
        });

        if (toolReport.erros.length > 0) {
          toolReport.status = 'erro';
        }
      }

      detalhes[f.id] = toolReport;
    }

    return {
      valido: totalErros === 0,
      totalErros,
      totalAvisos,
      detalhesPorFerramenta: detalhes
    };
  }

  /**
   * Gera múltiplos templates aleatórios e variados em lote.
   */
  public static generateRandomBatch(
    count: number = 3,
    options: Partial<GenerateMockOptions> = {}
  ): BusinessTemplate[] {
    const templates: BusinessTemplate[] = [];
    const archetypesList = this.shuffleArray([...BUSINESS_ARCHETYPES]);

    for (let i = 0; i < count; i++) {
      const arch = archetypesList[i % archetypesList.length];
      const template = this.generateBusinessTemplate({
        ...options,
        archetype: arch.id,
        randomVariance: 0.25
      });
      templates.push(template);
    }

    return templates;
  }

  // =========================================================
  // GERADORES INDIVIDUAIS ESPECÍFICOS POR FERRAMENTA (1 a 14)
  // =========================================================

  private static generateSegmentacaoMercado(
    idPlano: string,
    arch: BusinessArchetype,
    company: string,
    count: number
  ): Record<string, unknown>[] {
    const pool = {
      tecnologia_saas: [
        {
          descricao: 'Empresas PMEs em fase de digitalização (10-100 colaboradores)',
          variavel1: 'Faturamento anual entre R$ 2M e R$ 15M com processos manuais',
          variavel1Oposto: 'Grandes corporações com ERPs legados pesados',
          variavel2: 'Busca por implementação ágil em menos de 7 dias sem taxa de setup',
          variavel2Oposto: 'Desenvolvimento interno proprietário',
          segmento: 'B2B PMEs'
        },
        {
          descricao: 'Startups e Scale-ups de Tecnologia e Serviços',
          variavel1: 'Crescimento acelerado e foco em métricas de retenção e churn',
          variavel1Oposto: 'Negócios tradicionais estagnados',
          variavel2: 'Necessidade de integração via API e Webhooks com múltiplos sistemas',
          variavel2Oposto: 'Sistemas fechados e sem conectividade',
          segmento: 'B2B Tech'
        },
        {
          descricao: 'Consultorias e Agências de Serviços Digitais',
          variavel1: 'Necessidade de gerar relatórios white-label para clientes finais',
          variavel1Oposto: 'Uso exclusivamente interno',
          variavel2: 'Usuários com múltiplos acessos e permissões por cliente',
          variavel2Oposto: 'Acesso individual simplificado',
          segmento: 'B2B Parceiros'
        }
      ],
      cafeteria_gastronomia: [
        {
          descricao: 'Profissionais Remotos e Nômades Digitais',
          variavel1: 'Idade 24-42 anos, alta escolaridade e renda superior a R$ 6.000',
          variavel1Oposto: 'Consumidores de passagem rápida',
          variavel2: 'Exigência de Wi-Fi de alta estabilidade, tomadas e ambiente focado',
          variavel2Oposto: 'Ambientes com música alta e sem estações de apoio',
          segmento: 'B2C / Freelancers'
        },
        {
          descricao: 'Apreciadores de Cafés Especiais e Métodos Filtrados',
          variavel1: 'Busca por cafés pontuados acima de 84 pontos SCA e microlotes',
          variavel1Oposto: 'Consumo de café comercial tradicional',
          variavel2: 'Interesse na história da torra, origem do grão e compra para casa',
          variavel2Oposto: 'Apenas cafezinho rápido de balcão',
          segmento: 'Consumidores Gourmet'
        },
        {
          descricao: 'Público Executivo e Reuniões Informais',
          variavel1: 'Encontros de negócios e alinhamentos rápidos durante a tarde',
          variavel1Oposto: 'Eventos noturnos de entretenimento',
          variavel2: 'Consumo combinado de cafés com doces e salgados artesanais',
          variavel2Oposto: 'Consumo restrito a bebidas',
          segmento: 'B2B / Corporativo'
        }
      ],
      saude_odontologia: [
        {
          descricao: 'Adultos e Executivos buscando Harmonização e Alinhadores Invisíveis',
          variavel1: 'Faixa etária 28-55 anos com alta exigência estética e discrição',
          variavel1Oposto: 'Aparelhos metálicos convencionais',
          variavel2: 'Busca por previsibilidade com escaneamento digital e tecnologia 3D',
          variavel2Oposto: 'Métodos tradicionais de moldagem com gesso',
          segmento: 'B2C Premium'
        },
        {
          descricao: 'Famílias de Classe Média-Alta para Prevenção e Odontopediatria',
          variavel1: 'Pais preocupados com atendimento humanizado e sem dor para os filhos',
          variavel1Oposto: 'Atendimento emergencial pontual',
          variavel2: 'Planos de acompanhamento preventivo semestral continuado',
          variavel2Oposto: 'Consultas esporádicas avulsas',
          segmento: 'B2C Famílias'
        }
      ]
    };

    const baseList = (pool as Record<string, typeof pool.cafeteria_gastronomia>)[arch.id] || pool.cafeteria_gastronomia;
    return baseList.slice(0, count).map((item) => ({
      idPlano,
      ...item
    }));
  }

  private static generatePersonas(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    const nomes = this.shuffleArray([...NOMES_BRASILEIROS]);
    const cargos = CARGOS_POR_SETOR[arch.id] || CARGOS_POR_SETOR.cafeteria_gastronomia;

    const templatesPersonas: Record<string, Record<string, string>[]> = {
      tecnologia_saas: [
        {
          escolaridade: 'Superior em Engenharia ou Administração',
          renda: 'R$ 16.000,00',
          habitos: 'Consome conteúdos sobre produtividade, utiliza ferramentas SaaS no dia a dia e toma decisões baseadas em dados.',
          dores: 'Sistemas lentos, falta de suporte técnico qualificado e perda de tempo com planilhas manuais desconexas.',
          objetivos: 'Centralizar a operação da equipe em um único painel e reduzir custos operacionais em pelo menos 25%.'
        },
        {
          escolaridade: 'Pós-graduação em Gestão de Projetos',
          renda: 'R$ 11.500,00',
          habitos: 'Gerencia times multidisciplinares remotos, prioriza automação de tarefas repetitivas e valoriza UX intuitiva.',
          dores: 'Falta de visibilidade em tempo real sobre entregas e retrabalho por falhas de comunicação entre áreas.',
          objetivos: 'Aumentar a produtividade do time e ter métricas claras para apresentação à diretoria.'
        }
      ],
      cafeteria_gastronomia: [
        {
          escolaridade: 'Pós-graduação em Tecnologia ou Design',
          renda: 'R$ 13.000,00',
          habitos: 'Trabalha em regime híbrido 3x na semana, frequenta cafeterias com boa internet e aprecia cafés artesanais.',
          dores: 'Falta de tomadas em cafés tradicionais, ruído de conversas altas durante chamadas e café industrial de baixa qualidade.',
          objetivos: 'Ter um local inspirador e calmo para produzir com foco e desfrutar de cafés especiais premiados.'
        },
        {
          escolaridade: 'Superior Completo em Comunicação',
          renda: 'R$ 7.800,00',
          habitos: 'Produz conteúdo digital, consome alimentação saudável e busca novos ambientes para reuniões com clientes.',
          dores: 'Espaços impessoais, atendimento frio e cardápios sem opções saudáveis ou veganas.',
          objetivos: 'Encontrar um ponto de encontro aconchegante com atmosfera criativa e produtos frescos.'
        }
      ]
    };

    const baseDetails = templatesPersonas[arch.id] || templatesPersonas.cafeteria_gastronomia;

    const personas: Record<string, unknown>[] = [];
    for (let i = 0; i < count; i++) {
      const nome = nomes[i % nomes.length];
      const cargo = cargos[i % cargos.length];
      const detail = baseDetails[i % baseDetails.length];
      const idade = `${this.randomInt(26, 48)} anos`;

      personas.push({
        idPlano,
        nome,
        idade,
        profissao: cargo,
        escolaridade: detail.escolaridade,
        renda: detail.renda,
        habitos: detail.habitos,
        dores: detail.dores,
        objetivos: detail.objetivos
      });
    }

    return personas;
  }

  private static generateJornadaCliente(
    idPlano: string,
    arch: BusinessArchetype,
    company: string,
    count: number
  ): Record<string, unknown>[] {
    const etapasPadrao = [
      {
        etapa: '1. Descoberta & Atração',
        acoes: `Pesquisa no Google ou vê publicações recomendadas da ${company} nas redes sociais.`,
        pontosContato: 'Instagram, Google Meu Negócio, Anúncios patrocinados, Indicação de conhecidos.',
        emocoes: 'Curioso e comparando alternativas no mercado.',
        oportunidadesMelhoria: 'Fortalecer prova social com avaliações reais 5 estrelas e cases de sucesso destacados.'
      },
      {
        etapa: '2. Avaliação & Primeiro Contato',
        acoes: 'Acessa o site/cardápio digital, tira dúvidas via WhatsApp e confere a tabela de valores.',
        pontosContato: 'Site responsivo, Chatbot de atendimento humanizado, WhatsApp Business.',
        emocoes: 'Interessado, buscando clareza sobre diferenciais e garantias.',
        oportunidadesMelhoria: 'Tempo de resposta inferior a 3 minutos e envio de material explicativo direto.'
      },
      {
        etapa: '3. Experiência de Compra / Consumo',
        acoes: 'Realiza a contratação ou consumo presencial com suporte e orientação em cada etapa.',
        pontosContato: 'Ambiente físico/plataforma digital, equipe treinada, checkout transparente.',
        emocoes: 'Satisfeito, impressionado com a agilidade e cuidado nos detalhes.',
        oportunidadesMelhoria: 'Oferecer onboarding guiado ou brinde de boas-vindas na primeira experiência.'
      },
      {
        etapa: '4. Pós-Venda & Fidelização',
        acoes: 'Recebe contato de acompanhamento, participa do clube de benefícios e indica para parceiros.',
        pontosContato: 'Pesquisa de NPS via WhatsApp, e-mail marketing com conteúdos exclusivos, clube de pontos.',
        emocoes: 'Fiel à marca e confiante na recomendação para sua rede de contatos.',
        oportunidadesMelhoria: 'Programa de indicação premiada com descontos progressivos na próxima compra.'
      }
    ];

    return etapasPadrao.slice(0, count).map((e) => ({
      idPlano,
      ...e
    }));
  }

  private static generatePropostaValor(
    idPlano: string,
    arch: BusinessArchetype,
    company: string,
    count: number
  ): Record<string, unknown>[] {
    const propostas: Record<string, Record<string, string>> = {
      tecnologia_saas: {
        tarefasCliente: 'Automatizar rotinas manuais de gestão e obter relatórios estratégicos em tempo real.',
        dores: 'Sistemas complexos, perda de dados em planilhas e dificuldade para escalar a operação com segurança.',
        ganhos: 'Economia de 20 horas semanais da equipe, assertividade nas decisões e suporte técnico prioritário.',
        produtosServicos: `${company} - Plataforma Cloud de Gestão com IA, dashboards customizáveis e integrações nativas.`,
        aliviadoresDores: 'Interface intuitiva sem curva de aprendizado íngreme e migração gratuita de dados legados.',
        criadoresGanhos: 'Insights automáticos preditivos de vendas e automações ilimitadas de WhatsApp e e-mail.'
      },
      cafeteria_gastronomia: {
        tarefasCliente: 'Trabalhar fora de casa com foco produtivo e degustar café artesanal de altíssima qualidade.',
        dores: 'Ambientes barulhentos, conexão de internet instável, falta de tomadas e cafés amargos comerciais.',
        ganhos: 'Ambiente acolhedor com ergonomia, cardápio artesanal diferenciado e networking de alto nível.',
        produtosServicos: `${company} - Cafeteria Especializada + Estações Ergonômicas + Cabines Acústicas Privativas.`,
        aliviadoresDores: 'Internet redundante de 600 Mbps, isolamento acústico e tomadas universais em 100% dos assentos.',
        criadoresGanhos: 'Torrefação semanal própria, grãos premiados SCA 86+ e eventos exclusivos de degustação.'
      }
    };

    const selecionada = propostas[arch.id] || propostas.cafeteria_gastronomia;
    return [{ idPlano, ...selecionada }];
  }

  private static generateAnaliseConcorrencia(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    const poolsConcorrentes: Record<string, Record<string, string>[]> = {
      tecnologia_saas: [
        {
          nomeConcorrente: 'LegacySoft Enterprise',
          pontosFortes: 'Marca consolidada no mercado há mais de 15 anos e base instalada de grandes clientes.',
          pontosFracos: 'Interface visual antiga, lentidão no suporte e preços de implantação exorbitantes.',
          preco: 'Muito Alto',
          diferencial: 'Nossa plataforma é 100% moderna, roda direto no navegador, tem setup instantâneo e suporte humano ágil.'
        },
        {
          nomeConcorrente: 'FastApp Starter',
          pontosFortes: 'Preço de entrada baixo e agressividade em anúncios nas redes sociais.',
          pontosFracos: 'Poucas funcionalidades, ausência de IA preditiva e limites rígidos de armazenamento.',
          preco: 'Baixo',
          diferencial: 'Oferecemos recursos avançados de BI, IA integrada e limites flexíveis adequados para empresas em expansão.'
        }
      ],
      cafeteria_gastronomia: [
        {
          nomeConcorrente: 'Rede Multinacional de Cafés',
          pontosFortes: 'Marca de grande alcance global, alta capilaridade e padronização visual.',
          pontosFracos: 'Ambiente ruidoso e impessoal, café com perfil de torra industrial escura e poucas tomadas.',
          preco: 'Alto',
          diferencial: 'Experiência sensorial com grãos de pequenos produtores, torra fresca e infraestrutura planejada para trabalho.'
        },
        {
          nomeConcorrente: 'Padaria Tradicional do Bairro',
          pontosFortes: 'Ponto comercial tradicional e fluxo diário constante de moradores locais.',
          pontosFracos: 'Não possui cafés especiais, ambiente barulhento e sem mesas adequadas para notebooks.',
          preco: 'Médio',
          diferencial: 'Foco exclusivo na cultura de café especial de alta pontuação e cardápio de comidas funcionais.'
        }
      ]
    };

    const baseList = poolsConcorrentes[arch.id] || poolsConcorrentes.cafeteria_gastronomia;
    return baseList.slice(0, count).map((item) => ({
      idPlano,
      ...item
    }));
  }

  private static generateForcasFraquezas(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      {
        tipo: 'forca',
        descricao: 'Equipe multidisciplinar altamente qualificada com certificações e experiência prática de mercado.',
        grauImportancia: 'Alta'
      },
      {
        tipo: 'forca',
        descricao: 'Tecnologia e infraestrutura modernas que reduzem custos operacionais e aumentam a qualidade de entrega.',
        grauImportancia: 'Alta'
      },
      {
        tipo: 'fraqueza',
        descricao: 'Marca nova no mercado com menor reconhecimento inicial em comparação aos concorrentes tradicionais.',
        grauImportancia: 'Média'
      },
      {
        tipo: 'fraqueza',
        descricao: 'Orçamento de marketing inicial mais enxuto exigindo forte eficiência em canais orgânicos e indicações.',
        grauImportancia: 'Média'
      }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      ...item
    }));
  }

  private static generateOportunidadesAmeacas(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      {
        tipo: 'oportunidade',
        descricao: 'Crescimento de mais de 25% ao ano na demanda por serviços especializados e experiências personalizadas no nicho.',
        impacto: 'Alto'
      },
      {
        tipo: 'oportunidade',
        descricao: 'Possibilidade de parcerias estratégicas com empresas locais e influenciadores do setor para expansão rápida.',
        impacto: 'Alto'
      },
      {
        tipo: 'ameaca',
        descricao: 'Oscilações macroeconômicas e aumento nos custos de insumos e matérias-primas importadas.',
        impacto: 'Médio'
      },
      {
        tipo: 'ameaca',
        descricao: 'Entrada de concorrentes indiretos oferecendo serviços simplificados com guerra de preços.',
        impacto: 'Médio'
      }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      ...item
    }));
  }

  private static generateAnaliseSwot(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    return [
      {
        idPlano,
        estrategiaDesenvolvimento: 'Aproveitar a infraestrutura moderna e equipe qualificada para capturar o crescimento de mercado com planos recorrentes.',
        estrategiaManutencao: 'Firmar contratos de longo prazo com fornecedores estratégicos para blindar margens contra a inflação de insumos.',
        estrategiaSobrevivencia: 'Manter controle rigoroso de custos fixos e focar em programas de fidelidade e retenção para maximizar o LTV.'
      }
    ];
  }

  private static generateInvestimentoFixo(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const poolItens: Record<string, { desc: string; qtd: number; unit: number }[]> = {
      tecnologia_saas: [
        { desc: 'Servidores Dedicados e Firewalls de Borda', qtd: 2, unit: 14000 },
        { desc: 'Notebooks de Alta Performance para Time de Engenharia', qtd: 4, unit: 8500 },
        { desc: 'Monitores 4K e Suportes Ergonômicos', qtd: 6, unit: 2200 },
        { desc: 'Mobiliário e Cadeiras Ergonômicas com Laudo NR-17', qtd: 6, unit: 1800 }
      ],
      cafeteria_gastronomia: [
        { desc: 'Máquina de Espresso Profissional La Marzocco 2 Grupos', qtd: 1, unit: 38000 },
        { desc: 'Moinho Sob Demanda Mahlkönig com Balança Integrada', qtd: 2, unit: 9500 },
        { desc: 'Refrigerador Comercial Expositor Inox 4 Portas', qtd: 1, unit: 8200 },
        { desc: 'Estações de Trabalho e Mesas de Madeira Maciça com Tomadas', qtd: 8, unit: 1600 },
        { desc: 'Cabines Acústicas com Vidro Duplo para Chamadas', qtd: 2, unit: 7500 }
      ],
      saude_odontologia: [
        { desc: 'Scanner Intraoral 3D com Software Integrado', qtd: 1, unit: 65000 },
        { desc: 'Cadeira Odontológica Completa com Foco LED e Sensor', qtd: 2, unit: 28000 },
        { desc: 'Autoclave Digital Inox 21L para Biossegurança', qtd: 1, unit: 7800 },
        { desc: 'Aparelho de Raio-X Odontológico Digital de Coluna', qtd: 1, unit: 16500 }
      ]
    };

    const base = poolItens[arch.id] || poolItens.cafeteria_gastronomia;
    return base.slice(0, count).map((item) => {
      const valorUnitario = this.applyVariance(item.unit, variance);
      const subtotal = valorUnitario * item.qtd;
      return {
        idPlano,
        descricao: item.desc,
        quantidade: item.qtd,
        valorUnitario,
        subtotal
      };
    });
  }

  private static generateInvestimentoPreOperacional(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      { desc: 'Abertura de Empresa, Alvarás, Licenças e Registro de Marca no INPI', valor: 4500 },
      { desc: 'Projeto Arquitetônico, Elétrico e Adequação do Ponto Comercial', valor: 28000 },
      { desc: 'Identidade Visual Completa, UI/UX do Site e Branding', valor: 6500 },
      { desc: 'Treinamento Inicial da Equipe, Protocolos de Atendimento e Certificações', valor: 3800 }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      descricao: item.desc,
      valor: this.applyVariance(item.valor, variance)
    }));
  }

  private static generateEstoqueInicial(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const pool: Record<string, { desc: string; qtd: number; unit: number }[]> = {
      tecnologia_saas: [
        { desc: 'Licenças de Software Cloud e Ambientes de Homologação (Créditos)', qtd: 3, unit: 1500 },
        { desc: 'Kits de Onboarding Corporativo e Materiais de Boas-Vindas', qtd: 50, unit: 45 }
      ],
      cafeteria_gastronomia: [
        { desc: 'Grãos de Café Especial Microlote Arábica (kg)', qtd: 60, unit: 85 },
        { desc: 'Leites Vegetais Artesanais e Laticínios Frescos (L)', qtd: 120, unit: 12 },
        { desc: 'Embalagens Ecológicas e Copos Biodegradáveis para Viagem', qtd: 1500, unit: 1.8 }
      ],
      saude_odontologia: [
        { desc: 'Kits Cirúrgicos Descartáveis e Luvas de Procedimento (caixas)', qtd: 80, unit: 65 },
        { desc: 'Resinas Estéticas Importadas de Alta Fluidez e Adesivos', qtd: 25, unit: 220 }
      ]
    };

    const base = pool[arch.id] || pool.cafeteria_gastronomia;
    return base.slice(0, count).map((item) => ({
      idPlano,
      descricao: item.desc,
      quantidade: item.qtd,
      valorUnitario: this.applyVariance(item.unit, variance, 2)
    }));
  }

  private static generateCapitalGiro(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    return [
      {
        idPlano,
        prazoMedioVendas: this.randomInt(5, 14),
        prazoMedioCompras: this.randomInt(25, 35),
        reservaFinanceira: this.applyVariance(25000, variance)
      }
    ];
  }

  private static generateCustoFixo(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      { desc: 'Aluguel do Imóvel Comercial / Escritório + Condomínio e IPTU', valor: 5500 },
      { desc: 'Folha de Pagamento Salarial + Encargos Trabalhistas', valor: 14500 },
      { desc: 'Internet Fibra Óptica Dedicada + Link de Backup + Telefonia', valor: 550 },
      { desc: 'Serviços Contábeis e Assessoria Jurídica Mensal', valor: 1200 },
      { desc: 'Investimento Contínuo em Marketing Digital e Mídias Pagas', valor: 3000 }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      descricao: item.desc,
      valor: this.applyVariance(item.valor, variance)
    }));
  }

  private static generateProdutoServico(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const pool: Record<string, { desc: string; preco: number; custo: number; vendas: number }[]> = {
      tecnologia_saas: [
        { desc: 'Plano Starter (Até 5 usuários + 10GB)', preco: 199, custo: 35, vendas: 120 },
        { desc: 'Plano Pro com IA Preditiva (Até 20 usuários)', preco: 499, custo: 80, vendas: 65 },
        { desc: 'Plano Enterprise Customizado com SLA Dedicado', preco: 1490, custo: 210, vendas: 18 }
      ],
      cafeteria_gastronomia: [
        { desc: 'Café Filtrado Especial V60 / Aeropress (300ml)', preco: 16.5, custo: 4.2, vendas: 920 },
        { desc: 'Cappuccino Italiano com Leite Vaporizado e Canela', preco: 14.0, custo: 3.8, vendas: 1100 },
        { desc: 'Combo Diária Coworking + 2 Cafés Especiais + Água', preco: 48.0, custo: 9.5, vendas: 240 },
        { desc: 'Pacote Grãos Especiais 250g para Viagem (Moído na Hora)', preco: 45.0, custo: 18.0, vendas: 160 }
      ],
      saude_odontologia: [
        { desc: 'Consulta de Profilaxia, Raspagem e Aplicação de Flúor', preco: 280, custo: 45, vendas: 80 },
        { desc: 'Tratamento com Alinhador Invisível Digital (Mensalidade)', preco: 650, custo: 190, vendas: 35 },
        { desc: 'Procedimento de Clareamento Dental a Laser em Consultório', preco: 1100, custo: 220, vendas: 22 }
      ]
    };

    const base = pool[arch.id] || pool.cafeteria_gastronomia;
    return base.slice(0, count).map((item) => ({
      idPlano,
      descricao: item.desc,
      precoVenda: this.applyVariance(item.preco, variance, 2),
      custoUnitario: this.applyVariance(item.custo, variance, 2),
      estimativaVendasMes: this.applyVariance(item.vendas, variance)
    }));
  }

  private static generateQuadroExperimentacao(
    idPlano: string,
    arch: BusinessArchetype,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      {
        descricao: 'Clientes pagam uma taxa mensal recorrente para ter acesso ilimitado com reserva prévia.',
        categoria: 'Solução',
        nivelIncerteza: 'Médio',
        nivelImportancia: 'Alta'
      },
      {
        descricao: 'Pelo menos 35% dos clientes realizam recompras no primeiro trimestre após o primeiro contato.',
        categoria: 'Cliente',
        nivelIncerteza: 'Alto',
        nivelImportancia: 'Alta'
      }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      ...item
    }));
  }

  private static generateFunilVendas(
    idPlano: string,
    arch: BusinessArchetype,
    variance: number,
    count: number
  ): Record<string, unknown>[] {
    const itens = [
      {
        nome: 'Campanha de Tráfego Local no Instagram & Google Ads',
        orcamento: 1500,
        qtdPessoasAlcancadas: 24000,
        qtdPessoasChamadas: 620
      },
      {
        nome: 'Parcerias com Micro-Influenciadores e Ações de Indicação',
        orcamento: 800,
        qtdPessoasAlcancadas: 9500,
        qtdPessoasChamadas: 340
      }
    ];

    return itens.slice(0, count).map((item) => ({
      idPlano,
      nome: item.nome,
      orcamento: this.applyVariance(item.orcamento, variance),
      qtdPessoasAlcancadas: this.applyVariance(item.qtdPessoasAlcancadas, variance),
      qtdPessoasChamadas: this.applyVariance(item.qtdPessoasChamadas, variance)
    }));
  }

  // ==========================================
  // HELPERS MATEMÁTICOS E RANDOMIZADORES
  // ==========================================

  private static randomInt(min: number, max: number): number {
    return Math.floor(Math.random() * (max - min + 1)) + min;
  }

  private static applyVariance(val: number, variance: number, decimals: number = 0): number {
    if (variance <= 0) return val;
    const factor = 1 + (Math.random() * 2 - 1) * variance;
    const res = val * factor;
    return decimals === 0 ? Math.round(res) : Number(res.toFixed(decimals));
  }

  private static pickRandom<T>(arr: T[]): T {
    return arr[Math.floor(Math.random() * arr.length)];
  }

  private static shuffleArray<T>(arr: T[]): T[] {
    const result = [...arr];
    for (let i = result.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [result[i], result[j]] = [result[j], result[i]];
    }
    return result;
  }
}
