import {
  Source,
  Evidence,
  Claim,
  ResearchGap,
  Contradiction,
  DataOrigin,
  SourceType,
  ResearchCategory,
} from "../types";
import { getSourceReliability, classifySourceType } from "../policies";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

function normalizeUrl(url: string): string {
  try {
    const u = new URL(url);
    u.hash = "";
    u.searchParams.sort();
    return u.toString();
  } catch {
    return url;
  }
}

export class EvidenceStore {
  private sources = new Map<string, Source>();
  private evidence = new Map<string, Evidence>();
  private claims = new Map<string, Claim>();
  private gaps = new Map<string, ResearchGap>();
  private contradictions = new Map<string, Contradiction>();
  private urlIndex = new Map<string, string>();
  private sourceByPublisher = new Map<string, Set<string>>();

  addSource(input: Omit<Source, "id" | "reliability" | "type" | "retrievedAt"> & { reliability?: number; type?: SourceType }): Source {
    const normalizedUrl = normalizeUrl(input.url);
    const existingId = this.urlIndex.get(normalizedUrl);
    if (existingId) {
      return this.sources.get(existingId)!;
    }

    const type = input.type || classifySourceType(input.url, input.title);
    const reliability = input.reliability ?? getSourceReliability(type);

    const source: Source = {
      id: generateId("src"),
      ...input,
      url: normalizedUrl,
      type,
      reliability,
      retrievedAt: new Date().toISOString(),
    };

    this.sources.set(source.id, source);
    this.urlIndex.set(normalizedUrl, source.id);

    const publisherSet = this.sourceByPublisher.get(input.publisher) || new Set();
    publisherSet.add(source.id);
    this.sourceByPublisher.set(input.publisher, publisherSet);

    return source;
  }

  getSource(id: string): Source | undefined {
    return this.sources.get(id);
  }

  getSourceByUrl(url: string): Source | undefined {
    const id = this.urlIndex.get(normalizeUrl(url));
    return id ? this.sources.get(id) : undefined;
  }

  getSourcesByPublisher(publisher: string): Source[] {
    const ids = this.sourceByPublisher.get(publisher);
    if (!ids) return [];
    return Array.from(ids).map((id) => this.sources.get(id)!).filter(Boolean);
  }

  getAllSources(): Source[] {
    return Array.from(this.sources.values());
  }

  addEvidence(input: Omit<Evidence, "id" | "retrievedAt">): Evidence {
    const evidence: Evidence = {
      id: generateId("evd"),
      ...input,
      retrievedAt: new Date().toISOString(),
    };
    this.evidence.set(evidence.id, evidence);
    return evidence;
  }

  getEvidence(id: string): Evidence | undefined {
    return this.evidence.get(id);
  }

  getEvidenceBySource(sourceId: string): Evidence[] {
    return Array.from(this.evidence.values()).filter((e) => e.sourceId === sourceId);
  }

  getAllEvidence(): Evidence[] {
    return Array.from(this.evidence.values());
  }

  addClaim(input: Omit<Claim, "id" | "createdAt">): Claim {
    const claim: Claim = {
      id: generateId("clm"),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.claims.set(claim.id, claim);
    return claim;
  }

  getClaim(id: string): Claim | undefined {
    return this.claims.get(id);
  }

  getClaimsByQuestion(questionId: string): Claim[] {
    return Array.from(this.claims.values()).filter((c) => c.questionId === questionId);
  }

  getClaimsByCategory(category: ResearchCategory): Claim[] {
    return Array.from(this.claims.values()).filter((c) => {
      return c.questionId.startsWith(category);
    });
  }

  getAllClaims(): Claim[] {
    return Array.from(this.claims.values());
  }

  addGap(input: Omit<ResearchGap, "id" | "createdAt">): ResearchGap {
    const gap: ResearchGap = {
      id: generateId("gap"),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.gaps.set(gap.id, gap);
    return gap;
  }

  getGap(id: string): ResearchGap | undefined {
    return this.gaps.get(id);
  }

  getGapsByQuestion(questionId: string): ResearchGap[] {
    return Array.from(this.gaps.values()).filter((g) => g.questionId === questionId);
  }

  getAllGaps(): ResearchGap[] {
    return Array.from(this.gaps.values());
  }

  getCriticalGaps(): ResearchGap[] {
    return Array.from(this.gaps.values()).filter((g) => g.severity === "critical");
  }

  addContradiction(input: Omit<Contradiction, "id" | "createdAt">): Contradiction {
    const contradiction: Contradiction = {
      id: generateId("ctr"),
      ...input,
      createdAt: new Date().toISOString(),
    };
    this.contradictions.set(contradiction.id, contradiction);
    return contradiction;
  }

  getContradiction(id: string): Contradiction | undefined {
    return this.contradictions.get(id);
  }

  getUnresolvedContradictions(): Contradiction[] {
    return Array.from(this.contradictions.values()).filter((c) => c.status === "unresolved");
  }

  getAllContradictions(): Contradiction[] {
    return Array.from(this.contradictions.values());
  }

  resolveContradiction(id: string, status: Contradiction["status"], resolution: string): boolean {
    const c = this.contradictions.get(id);
    if (!c) return false;
    c.status = status;
    c.resolution = resolution;
    return true;
  }

  getProvenanceChain(claimId: string): {
    claim: Claim | undefined;
    evidence: Evidence[];
    sources: Source[];
  } {
    const claim = this.claims.get(claimId);
    if (!claim) return { claim: undefined, evidence: [], sources: [] };

    const evidence = claim.evidenceIds.map((eid) => this.evidence.get(eid)).filter(Boolean) as Evidence[];
    const sources = evidence.map((e) => this.sources.get(e.sourceId)).filter(Boolean) as Source[];

    return { claim, evidence, sources };
  }

  getFieldProvenance(fieldPath: string): {
    claim: Claim | undefined;
    evidence: Evidence[];
    sources: Source[];
  } | null {
    for (const claim of this.claims.values()) {
      if (claim.statement.includes(fieldPath) || claim.id === fieldPath) {
        return this.getProvenanceChain(claim.id);
      }
    }
    return null;
  }

  clear(): void {
    this.sources.clear();
    this.evidence.clear();
    this.claims.clear();
    this.gaps.clear();
    this.contradictions.clear();
    this.urlIndex.clear();
    this.sourceByPublisher.clear();
  }

  getStats(): {
    sources: number;
    evidence: number;
    claims: number;
    gaps: number;
    contradictions: number;
    byType: Record<SourceType, number>;
    byOrigin: Record<DataOrigin, number>;
  } {
    const byType: Record<SourceType, number> = {
      official_gov: 0,
      official_org: 0,
      academic: 0,
      industry_report: 0,
      corporate: 0,
      specialized_press: 0,
      blog: 0,
      secondary: 0,
    };

    const byOrigin: Record<DataOrigin, number> = {
      USER_PROVIDED: 0,
      DIRECT_SOURCE: 0,
      CALCULATED: 0,
      INFERRED: 0,
      ESTIMATED: 0,
    };

    for (const s of this.sources.values()) {
      byType[s.type]++;
    }

    for (const c of this.claims.values()) {
      byOrigin[c.origin]++;
    }

    return {
      sources: this.sources.size,
      evidence: this.evidence.size,
      claims: this.claims.size,
      gaps: this.gaps.size,
      contradictions: this.contradictions.size,
      byType,
      byOrigin,
    };
  }

  exportSnapshot(): {
    sources: Source[];
    evidence: Evidence[];
    claims: Claim[];
    gaps: ResearchGap[];
    contradictions: Contradiction[];
  } {
    return {
      sources: this.getAllSources(),
      evidence: this.getAllEvidence(),
      claims: this.getAllClaims(),
      gaps: this.getAllGaps(),
      contradictions: this.getAllContradictions(),
    };
  }

  importSnapshot(snapshot: ReturnType<EvidenceStore["exportSnapshot"]>): void {
    this.clear();
    for (const s of snapshot.sources) this.sources.set(s.id, s);
    for (const e of snapshot.evidence) this.evidence.set(e.id, e);
    for (const c of snapshot.claims) this.claims.set(c.id, c);
    for (const g of snapshot.gaps) this.gaps.set(g.id, g);
    for (const c of snapshot.contradictions) this.contradictions.set(c.id, c);

    for (const s of snapshot.sources) {
      this.urlIndex.set(normalizeUrl(s.url), s.id);
      const pubSet = this.sourceByPublisher.get(s.publisher) || new Set();
      pubSet.add(s.id);
      this.sourceByPublisher.set(s.publisher, pubSet);
    }
  }
}

export const evidenceStore = new EvidenceStore();