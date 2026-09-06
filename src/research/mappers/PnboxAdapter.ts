import { FERRAMENTAS_PNBOX } from "../../automation/schemaCatalog";
import { FerramentaInfo } from "../../types/pnbox";
import { CanonicalBusinessModel } from "../types";
import { compararJsonComSchema } from "../../automation/schemaValidator";

export interface AdapterOptions {
  idPlano?: string;
  skipValidation?: boolean;
  strictMode?: boolean;
}

export interface AdapterResult {
  collections: Record<string, Record<string, unknown>[]>;
  validation: {
    valid: boolean;
    totalErrors: number;
    totalWarnings: number;
    detailsByCollection: Record<string, { ferramentaId: string; collectionName: string; status: "valid" | "error" | "missing"; itemsValidated: number; errors: string[]; warnings: string[] }>;
    detailsByTool: Record<string, { ferramentaId: string; collectionName: string; status: "valid" | "error" | "missing"; itemsValidated: number; errors: string[]; warnings: string[] }>;
  };
}

export class PnboxAdapter {
  private idPlano: string;

  constructor(idPlano = "") {
    this.idPlano = idPlano;
  }

  adapt(canonical: CanonicalBusinessModel, options: AdapterOptions = {}): AdapterResult {
    const idPlano = (options.idPlano || this.idPlano).trim();
    if (!idPlano || idPlano === ":idPlano" || idPlano.startsWith("plano_")) {
      throw new Error("PNBOX_REAL_PLAN_REQUIRED: o adapter exige o ID real retornado pelo PNBOX.");
    }

    const collections: Record<string, Record<string, unknown>[]> = {};
    const mappers: Record<string, (model: CanonicalBusinessModel) => Record<string, unknown>[]> = {
      segmentacaoMercado: (m) => this.mapSegmentacaoMercado(m, idPlano),
      geradorPersonas: (m) => this.mapGeradorPersonas(m, idPlano),
      jornadaCliente: (m) => this.mapJornadaCliente(m, idPlano),
      propostaValor: (m) => this.mapPropostaValor(m, idPlano),
      analiseConcorrencia: (m) => this.mapAnaliseConcorrencia(m, idPlano),
      forcasFraquezas: (m) => this.mapForcasFraquezas(m, idPlano),
      oportunidadesAmeacas: (m) => this.mapOportunidadesAmeacas(m, idPlano),
      analiseSwot: (m) => this.mapAnaliseSwot(m, idPlano),
      investimentoFixo: (m) => this.mapInvestimentoFixo(m, idPlano),
      investimentoPreOperacional: (m) => this.mapInvestimentoPreOperacional(m, idPlano),
      estoqueInicial: (m) => this.mapEstoqueInicial(m, idPlano),
      capitalGiro: (m) => this.mapCapitalGiro(m, idPlano),
      custoFixo: (m) => this.mapCustoFixo(m, idPlano),
      produtoServico: (m) => this.mapProdutoServico(m, idPlano),
      quadroExperimentacaoHipotese: (m) => this.mapQuadroExperimentacao(m, idPlano),
      funilVendas: (m) => this.mapFunilVendas(m, idPlano),
    };

    for (const ferramenta of FERRAMENTAS_PNBOX) {
      const mapper = mappers[ferramenta.collectionName];
      if (!mapper) continue;
      try {
        collections[ferramenta.collectionName] = mapper(canonical);
      } catch {
        collections[ferramenta.collectionName] = [];
      }
    }

    if (options.skipValidation) {
      return { collections, validation: { valid: true, totalErrors: 0, totalWarnings: 0, detailsByCollection: {}, detailsByTool: {} } };
    }

    const validation = this.validate(collections);
    return { collections, validation: { ...validation, detailsByTool: validation.detailsByCollection } };
  }

  private mapSegmentacaoMercado(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    if (m.customer.segments.length === 0) return [];
    return m.customer.segments.map((seg) => ({ idPlano, descricao: seg.name, variavel1: seg.demographics.ageRange, variavel1Oposto: undefined, variavel2: seg.behaviors[0], variavel2Oposto: undefined, segmento: seg.description.substring(0, 200) }));
  }
  private mapGeradorPersonas(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    if (m.customer.personas.length === 0) return [];
    return m.customer.personas.map((p) => ({ idPlano, nome: p.name, idade: p.age, profissao: p.profession, escolaridade: p.education, renda: p.income, habitos: p.habits, dores: p.painPoints.join("; "), objetivos: p.goals.join("; ") }));
  }
  private mapJornadaCliente(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    if (m.customer.journey.length === 0) return [];
    return m.customer.journey.map((j) => ({ idPlano, etapa: j.stage, acoes: j.actions, pontosContato: j.touchpoints.join("; "), emocoes: j.emotions, oportunidadesMelhoria: j.opportunities.join("; ") }));
  }
  private mapPropostaValor(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    const vp = m.valueProposition;
    return [{ idPlano, tarefasCliente: vp.customerJobs.join("; "), dores: vp.pains.join("; "), ganhos: vp.gains.join("; "), produtosServicos: vp.productsServices.join("; "), aliviadoresDores: vp.painRelievers.join("; "), criadoresGanhos: vp.gainCreators.join("; ") }];
  }
  private mapAnaliseConcorrencia(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    if (m.competition.competitors.length === 0) return [];
    return m.competition.competitors.map((c) => ({ idPlano, nomeConcorrente: c.name, pontosFortes: c.strengths.join("; "), pontosFracos: c.weaknesses.join("; "), preco: c.pricing, diferencial: c.differentiators.join("; ") }));
  }
  private mapForcasFraquezas(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    const items = [...m.swot.strengths.map((s) => ({ tipo: "forca", descricao: s.description })), ...m.swot.weaknesses.map((w) => ({ tipo: "fraqueza", descricao: w.description }))];
    return items.map((item) => ({ idPlano, tipo: item.tipo, descricao: item.descricao }));
  }
  private mapOportunidadesAmeacas(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    const items = [...m.swot.opportunities.map((o) => ({ tipo: "oportunidade", descricao: o.description })), ...m.swot.threats.map((t) => ({ tipo: "ameaca", descricao: t.description }))];
    return items.map((item) => ({ idPlano, tipo: item.tipo, descricao: item.descricao }));
  }
  private mapAnaliseSwot(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    const s = m.swot.strategies;
    return [{ idPlano, estrategiaDesenvolvimento: s.development, estrategiaManutencao: s.maintenance, estrategiaSobrevivencia: s.survival }];
  }
  private mapInvestimentoFixo(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.financials.investment.fixed.map((item) => ({ idPlano, descricao: item.item, quantidade: item.quantity, valorUnitario: item.unitCost, subtotal: item.total }));
  }
  private mapInvestimentoPreOperacional(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.financials.investment.preOperational.map((item) => ({ idPlano, descricao: item.item, valor: item.total }));
  }
  private mapEstoqueInicial(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.financials.investment.initialStock.map((item) => ({ idPlano, descricao: item.item, quantidade: item.quantity, valorUnitario: item.unitCost }));
  }
  private mapCapitalGiro(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    const wc = m.financials.investment.workingCapital;
    if (wc === 0) return [];
    return [{ idPlano, reservaFinanceira: wc }];
  }
  private mapCustoFixo(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.financials.costs.fixed.map((item) => ({ idPlano, descricao: item.item, valor: item.monthlyValue }));
  }
  private mapProdutoServico(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.financials.revenue.products.map((p) => ({ idPlano, descricao: p.product, precoVenda: p.unitPrice, custoUnitario: p.unitCost, estimativaVendasMes: p.estimatedQuantity }));
  }
  private mapQuadroExperimentacao(_m: CanonicalBusinessModel, _idPlano: string): Record<string, unknown>[] {
    return [];
  }
  private mapFunilVendas(m: CanonicalBusinessModel, idPlano: string): Record<string, unknown>[] {
    return m.marketing.channels.map((ch) => ({ idPlano, nome: ch.name, orcamento: ch.monthlyInvestment }));
  }

  private validate(collections: Record<string, Record<string, unknown>[]>): AdapterResult["validation"] {
    const detailsByCollection: AdapterResult["validation"]["detailsByCollection"] = {};
    const detailsByTool: AdapterResult["validation"]["detailsByTool"] = {};
    let totalErrors = 0;
    let totalWarnings = 0;

    for (const ferramenta of FERRAMENTAS_PNBOX) {
      const items = collections[ferramenta.collectionName] || [];
      const errors: string[] = [];
      const warnings: string[] = [];
      if (items.length === 0) {
        warnings.push(`Coleção vazia para ${ferramenta.nome}`);
        totalWarnings++;
      } else {
        items.forEach((item, idx) => {
          const result = compararJsonComSchema(item, ferramenta);
          if (!result.isValido) {
            errors.push(`Item ${idx + 1}: ${result.resumo}`);
            totalErrors += result.camposFaltantes.length;
            totalWarnings += result.camposExtras.length;
          }
        });
      }
      const status: "valid" | "error" | "missing" = errors.length === 0 ? (items.length === 0 ? "missing" : "valid") : "error";
      const detail = { ferramentaId: ferramenta.id, collectionName: ferramenta.collectionName, status, itemsValidated: items.length, errors, warnings };
      detailsByCollection[ferramenta.collectionName] = detail;
      detailsByTool[ferramenta.id] = detail;
    }

    return { valid: totalErrors === 0, totalErrors, totalWarnings, detailsByTool, detailsByCollection };
  }

  static getToolByCollection(collectionName: string): FerramentaInfo | undefined {
    return FERRAMENTAS_PNBOX.find((f) => f.collectionName === collectionName);
  }

  static getAllCollectionNames(): string[] {
    return FERRAMENTAS_PNBOX.map((f) => f.collectionName);
  }
}

export const pnboxAdapter = new PnboxAdapter();
