import { classifySourceType, getSourceReliability, calculateSufficiency, RESEARCH_POLICIES, validateClaimOrigin } from "../policies";
import { ResearchGap, Contradiction, Claim } from "../types";
import { testRunner, assert, assertEqual } from "./TestRunner";

export async function runPoliciesTests(): Promise<void> {
  await testRunner.test("classifySourceType correctly classifies IBGE as official_gov", async () => {
    const type = classifySourceType("https://www.ibge.gov.br/estatisticas", "IBGE Estatísticas");
    assertEqual(type, "official_gov");
  });

  await testRunner.test("classifySourceType correctly classifies USP as academic", async () => {
    const type = classifySourceType("https://www.usp.br/artigo", "USP Artigo");
    assertEqual(type, "academic");
  });

  await testRunner.test("classifySourceType classifies unknown URLs as secondary", async () => {
    const type = classifySourceType("https://random-site.com/page", "Random Article");
    assertEqual(type, "secondary");
  });

  await testRunner.test("getSourceReliability returns correct base values", async () => {
    assert(getSourceReliability("official_gov") >= 0.9, "official_gov should have high reliability");
    assert(getSourceReliability("blog") <= 0.5, "blog should have low reliability");
  });

  await testRunner.test("calculateSufficiency returns scores in 0-1 range", async () => {
    const gaps: ResearchGap[] = [];
    const contradictions: Contradiction[] = [];
    const claimsByCategory = {
      market: [], customer: [], competition: [], pricing: [],
      operations: [], financial: [], regulatory: [], strategy: [],
    };

    const sufficiency = calculateSufficiency(claimsByCategory, gaps, contradictions);
    assert(sufficiency.overall >= 0 && sufficiency.overall <= 1, "Overall score must be in [0,1]");
    for (const cat of Object.keys(sufficiency.byCategory) as Array<keyof typeof sufficiency.byCategory>) {
      const score = sufficiency.byCategory[cat];
      assert(score >= 0 && score <= 1, `Category ${cat} score must be in [0,1]`);
    }
  });

  await testRunner.test("validateClaimOrigin rejects ESTIMATED financial fields without sources", async () => {
    const claim: Claim = {
      id: "c1",
      questionId: "Q1",
      statement: "capex: 50000",
      value: 50000,
      evidenceIds: [],
      origin: "ESTIMATED",
      confidence: 0.3,
      createdAt: new Date().toISOString(),
    };
    const result = validateClaimOrigin(claim, "capexTotal");
    assert(!result.valid, "Should reject financial claim with ESTIMATED origin and no sources");
    assert(result.errors.length > 0, "Should have errors");
  });

  await testRunner.test("validateClaimOrigin accepts DIRECT_SOURCE financial claims", async () => {
    const claim: Claim = {
      id: "c1",
      questionId: "Q1",
      statement: "capex: 50000",
      value: 50000,
      evidenceIds: ["ev1"],
      origin: "DIRECT_SOURCE",
      confidence: 0.8,
      createdAt: new Date().toISOString(),
    };
    const result = validateClaimOrigin(claim, "capexTotal");
    assert(result.valid, "Should accept DIRECT_SOURCE financial claim");
  });

  await testRunner.test("RESEARCH_POLICIES has expected iteration limits", async () => {
    assert(RESEARCH_POLICIES.iterations.minimum <= RESEARCH_POLICIES.iterations.target, "min <= target");
    assert(RESEARCH_POLICIES.iterations.target <= RESEARCH_POLICIES.iterations.maximum, "target <= max");
    assert(RESEARCH_POLICIES.iterations.maximum <= 10, "max should be reasonable");
  });

  await testRunner.test("RESEARCH_POLICIES forbids hardcoded ratios", async () => {
    const ratios = RESEARCH_POLICIES.financials.forbiddenHardcodedRatios;
    assert(ratios.some((r) => r.field === "opexMensal" && r.value === 0.22), "Should forbid 0.22 ratio");
    assert(ratios.some((r) => r.field === "faturamentoEstimadoMensal" && r.value === 0.45), "Should forbid 0.45 ratio");
  });
}