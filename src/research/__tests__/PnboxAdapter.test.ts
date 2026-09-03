import { PnboxAdapter } from "../mappers/PnboxAdapter";
import { FERRAMENTAS_PNBOX, ID_PLANO_PADRAO } from "../../automation/schemaCatalog";
import { CanonicalBusinessModel } from "../types";
import { testRunner, assert, assertDefined } from "./TestRunner";

function createMockCanonicalModel(): CanonicalBusinessModel {
  return {
    business: {
      name: "Cafeteria Teste",
      sector: "alimentação",
      location: "Curitiba/PR",
      description: "Cafeteria artesanal",
      businessModel: "cafeteria + coworking",
      estimatedBudget: 150000,
      targetAudience: "Profissionais remotos",
    },
    market: {
      size: { total: 5000000000, unit: "BRL", year: 2025, sourceIds: ["src1"], origin: "DIRECT_SOURCE", confidence: 0.85 },
      trends: [],
      demand: { description: "Demanda crescente", drivers: [], barriers: [], sourceIds: [], confidence: 0.7 },
    },
    customer: {
      segments: [{
        id: "seg1",
        name: "Profissionais Remotos",
        description: "Profissionais que trabalham de cafés",
        demographics: { ageRange: "25-40" },
        behaviors: ["Trabalham em cafeterias"],
        needs: ["Wi-Fi rápido"],
        sourceIds: ["src1"],
        confidence: 0.8,
      }],
      personas: [],
      journey: [],
      painPoints: ["Wi-Fi instável"],
      buyingBehavior: {
        decisionProcess: "",
        frequency: "",
        averageTicket: 35,
        paymentPreferences: ["Cartão", "Pix"],
        sourceIds: [],
        confidence: 0.7,
      },
    },
    competition: {
      competitors: [{
        id: "comp1",
        name: "Café Competidor",
        type: "direct",
        strengths: ["Localização"],
        weaknesses: ["Café ruim"],
        pricing: "Médio",
        differentiators: [],
        sourceIds: ["src2"],
        confidence: 0.7,
      }],
      competitiveLandscape: "Mercado competitivo",
      marketGaps: [],
      sourceIds: [],
    },
    valueProposition: {
      customerJobs: [],
      pains: [],
      gains: [],
      productsServices: [],
      painRelievers: [],
      gainCreators: [],
      sourceIds: [],
    },
    swot: {
      strengths: [{ description: "Equipe qualificada", importance: "high", sourceIds: [] }],
      weaknesses: [{ description: "Marca nova", importance: "medium", sourceIds: [] }],
      opportunities: [{ description: "Mercado crescendo", importance: "high", sourceIds: [] }],
      threats: [{ description: "Concorrência forte", importance: "medium", sourceIds: [] }],
      strategies: { development: "A", maintenance: "B", survival: "C" },
      sourceIds: [],
    },
    marketing: {
      channels: [{
        name: "Instagram Ads",
        strategy: "Anúncios locais",
        monthlyInvestment: 2000,
        conversionTarget: "50 leads/mês",
        frequency: "Diária",
        responsible: "Marketing",
        sourceIds: [],
        confidence: 0.6,
      }],
      budget: 2000,
      kpis: [],
      sourceIds: [],
    },
    operations: {
      processes: [],
      resources: [],
      keyPartners: [],
      sourceIds: [],
    },
    financials: {
      investment: {
        fixed: [{
          category: "Equipamentos",
          item: "Máquina de café",
          quantity: 1,
          unitCost: 25000,
          total: 25000,
          origin: "DIRECT_SOURCE",
          sourceIds: ["src3"],
        }],
        preOperational: [],
        initialStock: [],
        workingCapital: 20000,
        total: 45000,
        sourceIds: [],
      },
      costs: {
        fixed: [],
        variable: [],
        monthlyTotal: 15000,
        sourceIds: [],
      },
      revenue: {
        products: [],
        monthlyTotal: 30000,
        sourceIds: [],
      },
      projections: [],
      sourceIds: [],
    },
    viability: {
      breakEven: {
        monthlyRevenue: 30000,
        monthlyCosts: 15000,
        months: 6,
        origin: "CALCULATED",
        sourceIds: [],
      },
      roi: { percentage: 25, timeframe: "12 meses", origin: "CALCULATED", sourceIds: [] },
      payback: { months: 18, origin: "ESTIMATED", sourceIds: [] },
      riskFactors: [],
      sourceIds: [],
    },
    regulatory: {
      cnae: { code: "5611-2", description: "Restaurante", confidence: 0.8, sourceIds: [] },
      taxRegime: "Simples Nacional",
      licenses: [],
      compliance: [],
      sourceIds: [],
    },
    provenance: {
      fieldToClaim: {},
      claimToEvidence: {},
      evidenceToSource: {},
    },
  };
}

export async function runPnboxAdapterTests(): Promise<void> {
  await testRunner.test("PnboxAdapter.adapt generates all 14 collections", async () => {
    const adapter = new PnboxAdapter();
    const model = createMockCanonicalModel();
    const result = adapter.adapt(model, { skipValidation: true });
    assertDefined(result.collections);
    assertEqual(Object.keys(result.collections).length, FERRAMENTAS_PNBOX.length);
  });

  await testRunner.test("PnboxAdapter maps segmentacaoMercado correctly", async () => {
    const adapter = new PnboxAdapter();
    const model = createMockCanonicalModel();
    const result = adapter.adapt(model, { skipValidation: true });
    const items = result.collections.segmentacaoMercado;
    assert(items.length === 1, "Should have 1 segment");
    assertDefined(items[0].descricao);
    assertEqual(items[0].idPlano, ID_PLANO_PADRAO);
  });

  await testRunner.test("PnboxAdapter maps analiseConcorrencia correctly", async () => {
    const adapter = new PnboxAdapter();
    const model = createMockCanonicalModel();
    const result = adapter.adapt(model, { skipValidation: true });
    const items = result.collections.analiseConcorrencia;
    assert(items.length === 1, "Should have 1 competitor");
    assertEqual(items[0].nomeConcorrente, "Café Competidor");
  });

  await testRunner.test("PnboxAdapter maps investimentoFixo correctly", async () => {
    const adapter = new PnboxAdapter();
    const model = createMockCanonicalModel();
    const result = adapter.adapt(model, { skipValidation: true });
    const items = result.collections.investimentoFixo;
    assert(items.length === 1, "Should have 1 fixed investment item");
    assertEqual(items[0].valorUnitario, 25000);
  });

  await testRunner.test("PnboxAdapter validates against schemaCatalog", async () => {
    const adapter = new PnboxAdapter();
    const model = createMockCanonicalModel();
    const result = adapter.adapt(model, { skipValidation: false });
    assertDefined(result.validation);
    assert(typeof result.validation.valid === "boolean");
    assertEqual(result.validation.detailsByTool.segmentacaoMercado.status, "valid");
  });

  await testRunner.test("PnboxAdapter.getAllCollectionNames returns all 14", async () => {
    const names = PnboxAdapter.getAllCollectionNames();
    assertEqual(names.length, FERRAMENTAS_PNBOX.length);
    assert(names.includes("segmentacaoMercado"));
    assert(names.includes("produtoServico"));
  });
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}