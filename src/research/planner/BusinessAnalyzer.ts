import {
  BusinessDefinition,
  ResearchObjective,
  ResearchQuestion,
  ResearchCategory,
  ResearchPlan,
} from "../types";
import { RESEARCH_POLICIES } from "../policies";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface BusinessAnalyzerInput {
  prompt: string;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
}

export interface BusinessAnalyzerOutput {
  businessDefinition: BusinessDefinition;
  researchObjectives: ResearchObjective[];
  researchQuestions: ResearchQuestion[];
  unknowns: string[];
  criticalVariables: string[];
}

const SECTOR_KEYWORDS: Record<string, string[]> = {
  "alimentação": ["restaurante", "cafeteria", "café", "lanchonete", "padaria", "food", "delivery", "hambúrguer", "pizza", "açai"],
  "varejo": ["loja", "ecommerce", "marketplace", "shopping", "boutique", "moda", "roupa", "calçado"],
  "serviços": ["consultoria", "agência", "escritório", "clínica", "salão", "barbearia", "estética", "manutenção"],
  "tecnologia": ["saas", "software", "app", "aplicativo", "plataforma", "sistema", "ia", "ai", "tech"],
  "construção": ["construção", "obra", "reforma", "engenharia", "arquitetura", "empreiteira"],
  "educação": ["curso", "escola", "faculdade", "treinamento", "capacitação", "edtech", "ensino"],
  "saúde": ["clínica", "hospital", "laboratório", "farmácia", "odontologia", "fisioterapia", "psicologia"],
  "logística": ["transporte", "entrega", "logística", "frota", "frete", "last mile"],
  "energia": ["solar", "fotovoltaico", "energia", "renovável", "sustentável"],
  "turismo": ["hotel", "pousada", "hostel", "turismo", "viagem", "hospedagem", "airbnb"],
};

function detectSector(prompt: string): string {
  const lower = prompt.toLowerCase();
  for (const [sector, keywords] of Object.entries(SECTOR_KEYWORDS)) {
    if (keywords.some((k) => lower.includes(k))) {
      return sector;
    }
  }
  return "serviços";
}

function extractLocation(prompt: string, cidadeUf?: string): string {
  if (cidadeUf) return cidadeUf;

  const locationPatterns = [
    /\b(?:em|na|no)\s+([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*(?:\s*\/\s*[A-Z]{2})?)/g,
    /\b([A-Z][a-z]+(?:\s+[A-Z][a-z]+)*,\s*[A-Z]{2})\b/g,
  ];

  for (const pattern of locationPatterns) {
    const matches = [...prompt.matchAll(pattern)];
    if (matches.length > 0) {
      return matches[0][1].trim();
    }
  }

  return "Brasil / Nacional";
}

function extractBudget(prompt: string, orcamentoEstimado?: number): number {
  if (orcamentoEstimado) return orcamentoEstimado;

  const budgetPatterns = [
    /(?:orçamento|investimento|capital|budget).{0,30}?(?:R\$\s*)?(\d+(?:[.,]\d+)?)\s*(?:mi|mil|milhões?|k|m|bilhões?|bi)/gi,
    /(?:R\$\s*)(\d+(?:[.,]\d+)?)\s*(?:mi|mil|milhões?|k|m|bilhões?|bi)/gi,
  ];

  for (const pattern of budgetPatterns) {
    const matches = [...prompt.matchAll(pattern)];
    if (matches.length > 0) {
      const value = parseFloat(matches[0][1].replace(",", "."));
      const unit = matches[0][0].toLowerCase();
      if (unit.includes("bi") || unit.includes("bilh")) return value * 1_000_000_000;
      if (unit.includes("mi") || unit.includes("milhões")) return value * 1_000_000;
      if (unit.includes("k") || unit.includes("mil ")) return value * 1_000;
      return value;
    }
  }

  return 100_000;
}

function extractTargetAudience(prompt: string, publicoAlvo?: string): string {
  if (publicoAlvo) return publicoAlvo;

  const audiencePatterns = [
    /(?:público|pessoas|clientes|target|público-alvo).{0,50}?([^.]{10,100})/gi,
    /(?:para|voltado a|focado em)\s+([^.]{10,100})/gi,
  ];

  for (const pattern of audiencePatterns) {
    const matches = [...prompt.matchAll(pattern)];
    if (matches.length > 0) {
      return matches[0][1].trim().substring(0, 200);
    }
  }

  return "Consumidor final / B2C";
}

function generateBusinessName(prompt: string, sector: string): string {
  const words = prompt
    .toLowerCase()
    .replace(/[^a-záêôç\s]/g, "")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .slice(0, 3);

  const prefixes = {
    alimentação: ["Sabor", "Gosto", "Mesa", "Prato", "Chef"],
    varejo: ["Loja", "Shop", "Mercado", "Boutique", "Estilo"],
    serviços: ["Pro", "Expert", "Prime", "Master", "Plus"],
    tecnologia: ["Tech", "Digital", "Smart", "Data", "Cloud"],
    construção: ["Obra", "Constru", "Estrutura", "Base", "Fundação"],
    educação: ["Aprende", "Saber", "Conhecimento", "Mestre", "Academia"],
    saúde: ["Vida", "Saúde", "Bem-estar", "Cuidado", "Vital"],
    logística: ["Rota", "Entrega", "Move", "Express", "Cargo"],
    energia: ["Sol", "Energia", "Luz", "Verde", "Sustentável"],
    turismo: ["Viagem", "Destino", "Rota", "Aventura", "Descanso"],
  };

  const sectorPrefixes = prefixes[sector as keyof typeof prefixes] || ["Novo", "Prime", "Smart", "Pro"];
  const prefix = sectorPrefixes[Math.floor(Math.random() * sectorPrefixes.length)];

  if (words.length > 0) {
    return `${prefix} ${words.map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ")}`;
  }

  return `${prefix} ${sector.charAt(0).toUpperCase() + sector.slice(1)}`;
}

export class BusinessAnalyzerAgent {
  async analyze(input: BusinessAnalyzerInput): Promise<BusinessAnalyzerOutput> {
    const sector = detectSector(input.prompt);
    const location = extractLocation(input.prompt, input.cidadeUf);
    const budget = extractBudget(input.prompt, input.orcamentoEstimado);
    const audience = extractTargetAudience(input.prompt, input.publicoAlvo);
    const name = generateBusinessName(input.prompt, sector);

    const businessDefinition: BusinessDefinition = {
      concept: input.prompt,
      sector,
      location,
      estimatedBudget: budget,
      targetAudience: audience,
      businessModel: this.inferBusinessModel(input.prompt, sector),
    };

    const researchObjectives = this.generateResearchObjectives(sector, budget, input.modeloAprofundado);
    const researchQuestions = this.generateResearchQuestions(sector, budget, input.modeloAprofundado);
    const unknowns = this.identifyUnknowns(sector, budget);
    const criticalVariables = this.identifyCriticalVariables(sector, budget);

    return {
      businessDefinition,
      researchObjectives,
      researchQuestions,
      unknowns,
      criticalVariables,
    };
  }

  private inferBusinessModel(prompt: string, sector: string): string {
    const models: Record<string, string[]> = {
      alimentação: ["restaurante próprio", "franquia", "dark kitchen", "food truck", "delivery only"],
      varejo: ["loja física", "e-commerce", "marketplace", "omnichannel", "dropshipping"],
      serviços: ["prestação direta", "assinatura", "marketplace de serviços", "franquia"],
      tecnologia: ["SaaS B2B", "SaaS B2C", "marketplace", "plataforma", "licenciamento"],
      construção: ["empreiteira", "subempreitada", "gerenciamento", "projeto e execução"],
      educação: ["cursos próprios", "marketplace", "corporativo", "assinatura"],
      saúde: ["clínica própria", "rede credenciada", "telemedicina", "home care"],
      logística: ["frota própria", "agregados", "tecnologia", "last mile"],
      energia: ["instalação", "EPC", "geração distribuída", "manutenção"],
      turismo: ["hospedagem própria", "gestão", "marketplace", "experiências"],
    };

    const sectorModels = models[sector] || ["prestação de serviços"];
    return sectorModels[0];
  }

  private generateResearchObjectives(sector: string, budget: number, deep: boolean): ResearchObjective[] {
    const baseObjectives: ResearchObjective[] = [
      {
        id: generateId("obj"),
        description: "Dimensionar o mercado endereçável e validar demanda",
        category: "market",
        priority: "critical",
        successCriteria: [
          "Tamanho do mercado (TAM/SAM/SOM) com fontes",
          "Taxa de crescimento anual (CAGR) dos últimos 3 anos",
          "Sazonalidade e ciclicidade identificadas",
        ],
      },
      {
        id: generateId("obj"),
        description: "Mapear perfil do cliente ideal e jornada de compra",
        category: "customer",
        priority: "critical",
        successCriteria: [
          "3+ segmentos de cliente com dados demográficos",
          "2+ personas detalhadas com dores e objetivos",
          "Jornada completa (descoberta → retenção)",
        ],
      },
      {
        id: generateId("obj"),
        description: "Analisar concorrência direta e indireta",
        category: "competition",
        priority: "critical",
        successCriteria: [
          "5+ concorrentes mapeados com forças/fraquezas",
          "Posicionamento de preço e diferenciais",
          "Gaps de mercado identificados",
        ],
      },
      {
        id: generateId("obj"),
        description: "Estruturar modelo financeiro viável",
        category: "financial",
        priority: "critical",
        successCriteria: [
          "CAPEX detalhado por categoria",
          "OPEX mensal com breakdown",
          "Projeção de receita por produto/serviço",
          "Ponto de equilíbrio e payback calculados",
        ],
      },
    ];

    if (deep) {
      baseObjectives.push(
        {
          id: generateId("obj"),
          description: "Validar viabilidade regulatória e tributária",
          category: "regulatory",
          priority: "high",
          successCriteria: [
            "CNAE sugerido com fundamentação",
            "Regime tributário otimizado",
            "Licenças e alvarás obrigatórios mapeados",
          ],
        },
        {
          id: generateId("obj"),
          description: "Definir estratégia de marketing e aquisição",
          category: "strategy",
          priority: "high",
          successCriteria: [
            "Canais de aquisição priorizados com CAC estimado",
            "Orçamento de marketing alocado",
            "KPIs de conversão definidos",
          ],
        },
        {
          id: generateId("obj"),
          description: "Planejar operações e processos-chave",
          category: "operations",
          priority: "medium",
          successCriteria: [
            "Processos críticos mapeados",
            "Recursos necessários dimensionados",
            "Parcerias estratégicas identificadas",
          ],
        }
      );
    }

    return baseObjectives;
  }

  private generateResearchQuestions(sector: string, budget: number, deep: boolean): ResearchQuestion[] {
    const baseQuestions: ResearchQuestion[] = [
      { id: generateId("q"), question: "Qual o tamanho do mercado total (TAM) e endereçável (SAM/SOM) para este setor na região?", category: "market", priority: "critical", requiredEvidenceTypes: ["market_size", "growth_rate", "geographic_breakdown"] },
      { id: generateId("q"), question: "Quais as principais tendências de consumo e tecnologia para 2024-2026 neste setor?", category: "market", priority: "high", requiredEvidenceTypes: ["trend_reports", "consumer_behavior", "technology_adoption"] },
      { id: generateId("q"), question: "Quem são os principais segmentos de clientes e suas características demográficas/comportamentais?", category: "customer", priority: "critical", requiredEvidenceTypes: ["demographics", "psychographics", "purchase_behavior"] },
      { id: generateId("q"), question: "Quais as dores, necessidades e desejos não atendidos do público-alvo?", category: "customer", priority: "critical", requiredEvidenceTypes: ["pain_points", "unmet_needs", "satisfaction_gaps"] },
      { id: generateId("q"), question: "Quem são os 5-10 principais concorrentes diretos e indiretos?", category: "competition", priority: "critical", requiredEvidenceTypes: ["competitor_list", "market_share", "positioning"] },
      { id: generateId("q"), question: "Quais os pontos fortes, fracos, preços e diferenciais de cada concorrente?", category: "competition", priority: "high", requiredEvidenceTypes: ["swot_competitor", "pricing", "differentiation"] },
      { id: generateId("q"), question: "Qual o investimento inicial necessário (CAPEX) detalhado por categoria?", category: "financial", priority: "critical", requiredEvidenceTypes: ["capex_breakdown", "supplier_quotes", "benchmarks"] },
      { id: generateId("q"), question: "Quais os custos operacionais mensais (OPEX) fixos e variáveis?", category: "financial", priority: "critical", requiredEvidenceTypes: ["opex_breakdown", "cost_benchmarks", "supplier_quotes"] },
      { id: generateId("q"), question: "Qual a projeção realista de faturamento mensal por produto/serviço?", category: "financial", priority: "critical", requiredEvidenceTypes: ["pricing", "demand_estimate", "conversion_rates"] },
      { id: generateId("q"), question: "Qual o ponto de equilíbrio (break-even) e prazo de retorno (payback)?", category: "financial", priority: "critical", requiredEvidenceTypes: ["break_even_calculation", "cash_flow_projection", "sensitivity_analysis"] },
    ];

    if (deep) {
      baseQuestions.push(
        { id: generateId("q"), question: "Qual o CNAE mais adequado e regime tributário otimizado?", category: "regulatory", priority: "high", requiredEvidenceTypes: ["cnae_classification", "tax_regime_comparison", "municipal_laws"] },
        { id: generateId("q"), question: "Quais licenças, alvarás e certificações são obrigatórios?", category: "regulatory", priority: "high", requiredEvidenceTypes: ["license_requirements", "municipal_regulations", "anvisa_requirements"] },
        { id: generateId("q"), question: "Quais canais de marketing têm melhor ROI para este público?", category: "strategy", priority: "high", requiredEvidenceTypes: ["channel_performance", "cac_benchmarks", "conversion_rates"] },
        { id: generateId("q"), question: "Qual a estratégia de precificação ótima (penetração, skim, value-based)?", category: "pricing", priority: "high", requiredEvidenceTypes: ["pricing_strategies", "price_elasticity", "competitor_pricing"] },
        { id: generateId("q"), question: "Quais os principais riscos operacionais, financeiros e de mercado?", category: "strategy", priority: "medium", requiredEvidenceTypes: ["risk_factors", "mitigation_strategies", "scenario_analysis"] }
      );
    }

    return baseQuestions;
  }

  private identifyUnknowns(sector: string, budget: number): string[] {
    return [
      "Tamanho real do mercado local (vs. nacional)",
      "Taxa de conversão realista para canais digitais",
      "Custo de aquisição de cliente (CAC) por canal",
      "Lifetime value (LTV) do cliente",
      "Sazonalidade específica da região",
      "Concorrentes informais não mapeados",
      "Custos regulatórios ocultos",
      "Prazo real para obtenção de alvarás",
    ];
  }

  private identifyCriticalVariables(sector: string, budget: number): string[] {
    return [
      "market_size_local",
      "customer_acquisition_cost",
      "average_ticket",
      "monthly_churn_rate",
      "gross_margin",
      "fixed_costs_monthly",
      "variable_cost_per_unit",
      "conversion_rate_lead_to_customer",
      "regulatory_timeline_months",
      "seasonality_factor",
    ];
  }

  createResearchPlan(output: BusinessAnalyzerOutput): ResearchPlan {
    const tasks = output.researchQuestions.map((q) => ({
      id: generateId("task"),
      question: q.question,
      objective: output.researchObjectives.find((o) => o.category === q.category)?.description || "",
      category: q.category,
      priority: q.priority,
      dependencies: [],
      status: "pending" as const,
      queries: this.generateQueriesForQuestion(q),
      requiredEvidence: q.requiredEvidenceTypes,
      confidence: 0,
      iteration: 0,
    }));

    return {
      id: generateId("plan"),
      prompt: output.businessDefinition.concept,
      businessDefinition: output.businessDefinition,
      researchObjectives: output.researchObjectives,
      researchQuestions: output.researchQuestions,
      unknowns: output.unknowns,
      criticalVariables: output.criticalVariables,
      tasks,
      iterations: [],
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
  }

  private generateQueriesForQuestion(question: ResearchQuestion): string[] {
    const baseQueries: Record<string, string[]> = {
      market: [
        `${question.question} Brasil 2024 2025`,
        `tamanho mercado ${question.question.toLowerCase()} IBGE Sebrae`,
        `tendências setor ${question.question.toLowerCase()} 2024`,
      ],
      customer: [
        `perfil cliente ${question.question.toLowerCase()} Brasil`,
        `comportamento consumidor ${question.question.toLowerCase()}`,
        `dores necessidades ${question.question.toLowerCase()}`,
      ],
      competition: [
        `principais concorrentes ${question.question.toLowerCase()} Brasil`,
        `market share ${question.question.toLowerCase()}`,
        `preços concorrentes ${question.question.toLowerCase()}`,
      ],
      financial: [
        `investimento inicial ${question.question.toLowerCase()} Brasil`,
        `custos operacionais ${question.question.toLowerCase()}`,
        `faturamento médio ${question.question.toLowerCase()}`,
      ],
      regulatory: [
        `CNAE ${question.question.toLowerCase()}`,
        `licenças alvarás ${question.question.toLowerCase()} Brasil`,
        `regime tributário ${question.question.toLowerCase()}`,
      ],
      pricing: [
        `estratégia precificação ${question.question.toLowerCase()}`,
        `price elasticity ${question.question.toLowerCase()}`,
        `valor percebido ${question.question.toLowerCase()}`,
      ],
      operations: [
        `processos operacionais ${question.question.toLowerCase()}`,
        `recursos necessários ${question.question.toLowerCase()}`,
        `fornecedores ${question.question.toLowerCase()}`,
      ],
      strategy: [
        `riscos ${question.question.toLowerCase()}`,
        `análise SWOT ${question.question.toLowerCase()}`,
        `estratégia entrada mercado ${question.question.toLowerCase()}`,
      ],
    };

    return baseQueries[question.category] || [`${question.question} Brasil 2024`];
  }
}

export const businessAnalyzer = new BusinessAnalyzerAgent();