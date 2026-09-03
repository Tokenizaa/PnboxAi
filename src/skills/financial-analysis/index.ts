import { aiProvider } from '../../ai/unifiedProvider';

export interface FinancialPlanMetrics {
  capexTotal: number;
  capitalGiroInicial: number;
  investimentoTotalInicial: number;
  custosFixosMensais: number;
  custosVariaveisPct: number;
  impostosSimplesNacionalPct: number;
  ticketMedio: number;
  faturamentoEstimadoMensal: number;
  margemContribuicaoPct: number;
  lucroLiquidoMensalEstimado: number;
  pontoEquilibrioMensalBrl: number;
  pontoEquilibrioMesesPayback: number;
  dreSimplificada: {
    receitaBruta: number;
    impostos: number;
    receitaLiquida: number;
    custosVariaveis: number;
    margemContribuicao: number;
    custosFixos: number;
    lucroLiquido: number;
    margemLiquidaPct: number;
  };
}

export class FinancialAnalysisSkill {
  public async analyze(
    setor: string,
    orcamentoMaximo: number,
    ticketSugerido: number = 180,
    cidadeUf: string = 'Brasil'
  ): Promise<FinancialPlanMetrics> {
    const systemPrompt = `Você é um consultor financeiro sênior do Sebrae especializado em viabilidade econômico-financeira de PMEs no Brasil.
Calcule com precisão matemática o plano financeiro, DRE e ponto de equilíbrio.`;

    const userPrompt = `Calcule as métricas financeiras completas para:
Setor: "${setor}"
Orçamento de Investimento Disponível: R$ ${orcamentoMaximo}
Ticket Médio de Referência: R$ ${ticketSugerido}
Região: "${cidadeUf}"

Retorne estritamente em JSON com números válidos (sem strings formatadas nos campos numéricos).`;

    const schemaDescription = `{
  "capexTotal": 65000,
  "capitalGiroInicial": 20000,
  "investimentoTotalInicial": 85000,
  "custosFixosMensais": 14000,
  "custosVariaveisPct": 25.0,
  "impostosSimplesNacionalPct": 6.0,
  "ticketMedio": 180,
  "faturamentoEstimadoMensal": 36000,
  "margemContribuicaoPct": 69.0,
  "lucroLiquidoMensalEstimado": 10840,
  "pontoEquilibrioMensalBrl": 20289,
  "pontoEquilibrioMesesPayback": 12,
  "dreSimplificada": {
    "receitaBruta": 36000,
    "impostos": 2160,
    "receitaLiquida": 33840,
    "custosVariaveis": 9000,
    "margemContribuicao": 24840,
    "custosFixos": 14000,
    "lucroLiquido": 10840,
    "margemLiquidaPct": 30.1
  }
}`;

    const raw = await aiProvider.generateStructured<FinancialPlanMetrics>(
      userPrompt,
      systemPrompt,
      schemaDescription
    );

    // Validação de sanidade numérica
    const capex = raw.capexTotal || orcamentoMaximo * 0.75;
    const capitalGiro = raw.capitalGiroInicial || orcamentoMaximo * 0.25;
    const invTotal = raw.investimentoTotalInicial || capex + capitalGiro;
    const custosFixos = raw.custosFixosMensais || Math.round(invTotal * 0.18);
    const faturamento = raw.faturamentoEstimadoMensal || Math.round(invTotal * 0.45);
    const lucro = raw.lucroLiquidoMensalEstimado || Math.round(faturamento * 0.25);
    const payback = lucro > 0 ? Math.ceil(invTotal / lucro) : 18;

    return {
      capexTotal: Math.round(capex),
      capitalGiroInicial: Math.round(capitalGiro),
      investimentoTotalInicial: Math.round(invTotal),
      custosFixosMensais: Math.round(custosFixos),
      custosVariaveisPct: raw.custosVariaveisPct || 25,
      impostosSimplesNacionalPct: raw.impostosSimplesNacionalPct || 6,
      ticketMedio: raw.ticketMedio || ticketSugerido,
      faturamentoEstimadoMensal: Math.round(faturamento),
      margemContribuicaoPct: raw.margemContribuicaoPct || 69,
      lucroLiquidoMensalEstimado: Math.round(lucro),
      pontoEquilibrioMensalBrl: raw.pontoEquilibrioMensalBrl || Math.round(custosFixos / 0.69),
      pontoEquilibrioMesesPayback: Math.min(Math.max(payback, 3), 36),
      dreSimplificada: raw.dreSimplificada || {
        receitaBruta: faturamento,
        impostos: Math.round(faturamento * 0.06),
        receitaLiquida: Math.round(faturamento * 0.94),
        custosVariaveis: Math.round(faturamento * 0.25),
        margemContribuicao: Math.round(faturamento * 0.69),
        custosFixos: custosFixos,
        lucroLiquido: lucro,
        margemLiquidaPct: Math.round((lucro / faturamento) * 1000) / 10
      }
    };
  }
}

export const financialAnalysisSkill = new FinancialAnalysisSkill();
