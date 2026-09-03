import { EvidenceStore } from "../evidence/EvidenceStore";
import { testRunner, assert, assertEqual, assertDefined } from "./TestRunner";

export async function runEvidenceStoreTests(): Promise<void> {
  await testRunner.test("EvidenceStore.addSource creates source with auto-classified type", async () => {
    const store = new EvidenceStore();
    const source = store.addSource({
      url: "https://www.ibge.gov.br/estatisticas",
      title: "IBGE - Estatísticas",
      publisher: "ibge.gov.br",
    });
    assertDefined(source);
    assert(source.type === "official_gov", `Expected official_gov, got ${source.type}`);
    assert(source.reliability >= 0.9, "IBGE source should have high reliability");
  });

  await testRunner.test("EvidenceStore.addSource deduplicates by URL", async () => {
    const store = new EvidenceStore();
    const s1 = store.addSource({
      url: "https://example.com/article",
      title: "Article",
      publisher: "example.com",
    });
    const s2 = store.addSource({
      url: "https://example.com/article#section1",
      title: "Article (with hash)",
      publisher: "example.com",
    });
    assertEqual(s1.id, s2.id, "Duplicate URLs should return same source");
  });

  await testRunner.test("EvidenceStore.addEvidence creates evidence linked to source", async () => {
    const store = new EvidenceStore();
    const source = store.addSource({
      url: "https://sebrae.com.br/estudo",
      title: "Sebrae Study",
      publisher: "sebrae.com.br",
    });
    const evidence = store.addEvidence({
      sourceId: source.id,
      excerpt: "Mercado de R$ 50 bilhões",
      dataPoint: 50000000000,
      unit: "BRL",
      confidence: 0.9,
    });
    assertDefined(evidence);
    assertEqual(evidence.sourceId, source.id);
    assert(store.getEvidence(evidence.id) !== undefined);
  });

  await testRunner.test("EvidenceStore.addClaim creates claim with origin tracking", async () => {
    const store = new EvidenceStore();
    const source = store.addSource({
      url: "https://example.com",
      title: "Example",
      publisher: "example.com",
    });
    const evidence = store.addEvidence({
      sourceId: source.id,
      excerpt: "Test",
      dataPoint: 1000,
      confidence: 0.8,
    });
    const claim = store.addClaim({
      questionId: "Q1",
      statement: "Market size: 1000 BRL",
      value: 1000,
      unit: "BRL",
      evidenceIds: [evidence.id],
      origin: "DIRECT_SOURCE",
      confidence: 0.8,
    });
    assertDefined(claim);
    assertEqual(claim.origin, "DIRECT_SOURCE");
    assertEqual(claim.evidenceIds.length, 1);
  });

  await testRunner.test("EvidenceStore.getProvenanceChain returns full chain", async () => {
    const store = new EvidenceStore();
    const source = store.addSource({
      url: "https://test.com",
      title: "Test",
      publisher: "test.com",
    });
    const evidence = store.addEvidence({
      sourceId: source.id,
      excerpt: "Evidence text",
      dataPoint: "value",
      confidence: 0.7,
    });
    const claim = store.addClaim({
      questionId: "Q1",
      statement: "Claim about market",
      value: "value",
      evidenceIds: [evidence.id],
      origin: "DIRECT_SOURCE",
      confidence: 0.7,
    });
    const chain = store.getProvenanceChain(claim.id);
    assertDefined(chain.claim);
    assertEqual(chain.evidence.length, 1);
    assertEqual(chain.sources.length, 1);
    assertEqual(chain.sources[0].id, source.id);
  });

  await testRunner.test("EvidenceStore.stats tracks totals correctly", async () => {
    const store = new EvidenceStore();
    store.addSource({ url: "https://a.com", title: "A", publisher: "a.com" });
    store.addSource({ url: "https://b.com", title: "B", publisher: "b.com" });
    const stats = store.getStats();
    assertEqual(stats.sources, 2);
  });

  await testRunner.test("EvidenceStore.clear removes all data", async () => {
    const store = new EvidenceStore();
    store.addSource({ url: "https://a.com", title: "A", publisher: "a.com" });
    store.clear();
    const stats = store.getStats();
    assertEqual(stats.sources, 0);
    assertEqual(stats.evidence, 0);
    assertEqual(stats.claims, 0);
  });
}