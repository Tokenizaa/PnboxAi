export type DataOrigin =
  | "USER_PROVIDED"
  | "DIRECT_SOURCE"
  | "CALCULATED"
  | "INFERRED"
  | "ESTIMATED";

export type ResearchCategory =
  | "market"
  | "customer"
  | "competition"
  | "pricing"
  | "operations"
  | "financial"
  | "regulatory"
  | "strategy";

export type TaskStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "skipped";

export type ResearchStatus =
  | "planning"
  | "executing"
  | "analyzing"
  | "synthesizing"
  | "completed"
  | "failed";

export type SourceType =
  | "official_gov"
  | "official_org"
  | "academic"
  | "industry_report"
  | "corporate"
  | "specialized_press"
  | "blog"
  | "secondary";

export type ContradictionStatus =
  | "unresolved"
  | "resolved_primary"
  | "resolved_recent"
  | "resolved_specific"
  | "resolved_methodological"
  | "partial";

export type GapSeverity =
  | "critical"
  | "high"
  | "medium"
  | "low";

export interface Source {
  id: string;
  url: string;
  title: string;
  publisher: string;
  type: SourceType;
  retrievedAt: string;
  publishedAt?: string;
  reliability: number;
  metadata?: Record<string, unknown>;
}

export interface Evidence {
  id: string;
  sourceId: string;
  excerpt: string;
  dataPoint: unknown;
  unit?: string;
  period?: string;
  context?: string;
  retrievedAt: string;
  confidence: number;
}

export interface Claim {
  id: string;
  questionId: string;
  statement: string;
  value: unknown;
  unit?: string;
  period?: string;
  evidenceIds: string[];
  origin: DataOrigin;
  confidence: number;
  formula?: string;
  inputs?: string[];
  createdAt: string;
}

export interface ResearchTask {
  id: string;
  question: string;
  objective: string;
  category: ResearchCategory;
  priority: "critical" | "high" | "medium" | "low";
  dependencies: string[];
  status: TaskStatus;
  queries: string[];
  requiredEvidence: string[];
  results?: {
    sources: Source[];
    evidence: Evidence[];
    claims: Claim[];
  };
  confidence: number;
  iteration: number;
  assignedAgent?: string;
  startedAt?: string;
  completedAt?: string;
  error?: string;
}

export interface ResearchGap {
  id: string;
  questionId: string;
  description: string;
  severity: GapSeverity;
  missingEvidence: string[];
  suggestedQueries: string[];
  suggestedTasks: Omit<ResearchTask, "id" | "status" | "results" | "confidence" | "iteration">[];
  createdAt: string;
}

export interface Contradiction {
  id: string;
  claimA: Claim;
  claimB: Claim;
  sources: Source[];
  difference: string;
  possibleReason?: string;
  status: ContradictionStatus;
  resolution?: string;
  confidence: number;
  createdAt: string;
}

export interface ResearchIteration {
  number: number;
  tasksExecuted: string[];
  newSources: number;
  newEvidence: number;
  newClaims: number;
  gapsFound: ResearchGap[];
  contradictionsFound: Contradiction[];
  sufficiencyScore: Record<ResearchCategory, number>;
  startedAt: string;
  completedAt: string;
}

export interface ResearchSufficiency {
  overall: number;
  byCategory: Record<ResearchCategory, number>;
  criticalGaps: ResearchGap[];
  minimumIterations: number;
  targetIterations: number;
  maximumIterations: number;
  canConclude: boolean;
}

export interface ResearchPlan {
  id: string;
  prompt: string;
  businessDefinition: BusinessDefinition;
  researchObjectives: ResearchObjective[];
  researchQuestions: ResearchQuestion[];
  unknowns: string[];
  criticalVariables: string[];
  tasks: ResearchTask[];
  iterations: ResearchIteration[];
  createdAt: string;
  updatedAt: string;
}

export interface BusinessDefinition {
  concept: string;
  sector: string;
  location: string;
  estimatedBudget: number;
  targetAudience: string;
  businessModel?: string;
}

export interface ResearchObjective {
  id: string;
  description: string;
  category: ResearchCategory;
  priority: "critical" | "high" | "medium" | "low";
  successCriteria: string[];
}

export interface ResearchQuestion {
  id: string;
  question: string;
  category: ResearchCategory;
  priority: "critical" | "high" | "medium" | "low";
  requiredEvidenceTypes: string[];
}

export interface ResearchReport {
  plan: ResearchPlan;
  sources: Source[];
  evidence: Evidence[];
  claims: Claim[];
  gaps: ResearchGap[];
  contradictions: Contradiction[];
  sufficiency: ResearchSufficiency;
  canonicalModel: CanonicalBusinessModel;
  pnboxCollections: Record<string, Record<string, unknown>[]>;
  validation: SchemaValidationResult;
  completedAt: string;
}

export interface CanonicalBusinessModel {
  business: BusinessCore;
  market: MarketAnalysis;
  customer: CustomerAnalysis;
  competition: CompetitionAnalysis;
  valueProposition: ValueProposition;
  swot: SwotAnalysis;
  marketing: MarketingPlan;
  operations: OperationsPlan;
  financials: FinancialModel;
  viability: ViabilityAnalysis;
  regulatory: RegulatoryAnalysis;
  provenance: ProvenanceMap;
}

export interface BusinessCore {
  name: string;
  sector: string;
  location: string;
  description: string;
  businessModel: string;
  estimatedBudget: number;
  targetAudience: string;
}

export interface MarketAnalysis {
  size: MarketSize;
  trends: MarketTrend[];
  demand: DemandAnalysis;
  seasonality?: string;
  growthRate?: number;
}

export interface MarketSize {
  total: number;
  unit: string;
  year: number;
  sourceIds: string[];
  origin: DataOrigin;
  confidence: number;
}

export interface MarketTrend {
  id: string;
  description: string;
  impact: "high" | "medium" | "low";
  timeframe: string;
  sourceIds: string[];
  confidence: number;
}

export interface DemandAnalysis {
  description: string;
  drivers: string[];
  barriers: string[];
  sourceIds: string[];
  confidence: number;
}

export interface CustomerAnalysis {
  segments: CustomerSegment[];
  personas: Persona[];
  journey: JourneyStage[];
  painPoints: string[];
  buyingBehavior: BuyingBehavior;
}

export interface CustomerSegment {
  id: string;
  name: string;
  description: string;
  demographics: Demographics;
  behaviors: string[];
  needs: string[];
  size?: number;
  sourceIds: string[];
  confidence: number;
}

export interface Demographics {
  ageRange?: string;
  gender?: string;
  incomeRange?: string;
  education?: string;
  occupation?: string;
  location?: string;
}

export interface Persona {
  id: string;
  name: string;
  age: string;
  profession: string;
  education: string;
  income: string;
  habits: string;
  painPoints: string[];
  goals: string[];
  informationSources: string[];
  sourceIds: string[];
  confidence: number;
}

export interface JourneyStage {
  stage: string;
  actions: string;
  touchpoints: string[];
  emotions: string;
  opportunities: string[];
  sourceIds: string[];
}

export interface BuyingBehavior {
  decisionProcess: string;
  frequency: string;
  averageTicket: number;
  paymentPreferences: string[];
  sourceIds: string[];
  confidence: number;
}

export interface CompetitionAnalysis {
  competitors: Competitor[];
  competitiveLandscape: string;
  marketGaps: string[];
  sourceIds: string[];
}

export interface Competitor {
  id: string;
  name: string;
  type: "direct" | "indirect" | "substitute";
  strengths: string[];
  weaknesses: string[];
  pricing: string;
  differentiators: string[];
  marketShare?: number;
  sourceIds: string[];
  confidence: number;
}

export interface ValueProposition {
  customerJobs: string[];
  pains: string[];
  gains: string[];
  productsServices: string[];
  painRelievers: string[];
  gainCreators: string[];
  sourceIds: string[];
}

export interface SwotAnalysis {
  strengths: SwotItem[];
  weaknesses: SwotItem[];
  opportunities: SwotItem[];
  threats: SwotItem[];
  strategies: SwotStrategies;
  sourceIds: string[];
}

export interface SwotItem {
  description: string;
  importance: "high" | "medium" | "low";
  sourceIds: string[];
}

export interface SwotStrategies {
  development: string;
  maintenance: string;
  survival: string;
}

export interface MarketingPlan {
  channels: MarketingChannel[];
  budget: number;
  kpis: KPI[];
  sourceIds: string[];
}

export interface MarketingChannel {
  name: string;
  strategy: string;
  monthlyInvestment: number;
  conversionTarget: string;
  frequency: string;
  responsible: string;
  sourceIds: string[];
  confidence: number;
}

export interface KPI {
  name: string;
  target: string;
  timeframe: string;
  responsible: string;
}

export interface OperationsPlan {
  processes: Process[];
  resources: Resource[];
  keyPartners: string[];
  sourceIds: string[];
}

export interface Process {
  name: string;
  description: string;
  estimatedTime: string;
  responsible: string;
  resources: string[];
}

export interface Resource {
  name: string;
  type: "human" | "physical" | "digital" | "financial";
  quantity: number;
  cost?: number;
}

export interface FinancialModel {
  investment: InvestmentBreakdown;
  costs: CostStructure;
  revenue: RevenueModel;
  projections: FinancialProjection[];
  sourceIds: string[];
}

export interface InvestmentBreakdown {
  fixed: InvestmentItem[];
  preOperational: InvestmentItem[];
  initialStock: InvestmentItem[];
  workingCapital: number;
  total: number;
  sourceIds: string[];
}

export interface InvestmentItem {
  category: string;
  item: string;
  quantity: number;
  unitCost: number;
  total: number;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface CostStructure {
  fixed: CostItem[];
  variable: CostItem[];
  monthlyTotal: number;
  sourceIds: string[];
}

export interface CostItem {
  item: string;
  monthlyValue: number;
  periodicity: string;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface RevenueModel {
  products: ProductRevenue[];
  monthlyTotal: number;
  sourceIds: string[];
}

export interface ProductRevenue {
  product: string;
  estimatedQuantity: number;
  unitPrice: number;
  monthlyRevenue: number;
  unitCost: number;
  margin: number;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface FinancialProjection {
  month: number;
  revenue: number;
  costs: number;
  profit: number;
  cumulativeCashFlow: number;
  origin: DataOrigin;
  sourceIds?: string[];
}

export interface ViabilityAnalysis {
  breakEven: BreakEvenAnalysis;
  roi: ROIAnalysis;
  payback: PaybackAnalysis;
  riskFactors: RiskFactor[];
  sourceIds: string[];
}

export interface BreakEvenAnalysis {
  monthlyRevenue: number;
  monthlyCosts: number;
  months: number;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface ROIAnalysis {
  percentage: number;
  timeframe: string;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface PaybackAnalysis {
  months: number;
  origin: DataOrigin;
  sourceIds?: string[];
  formula?: string;
  inputs?: string[];
}

export interface RiskFactor {
  description: string;
  probability: "high" | "medium" | "low";
  impact: "high" | "medium" | "low";
  mitigation: string;
}

export interface RegulatoryAnalysis {
  cnae: CNAEInfo;
  taxRegime: string;
  licenses: License[];
  compliance: string[];
  sourceIds: string[];
}

export interface CNAEInfo {
  code: string;
  description: string;
  confidence: number;
  sourceIds: string[];
}

export interface License {
  name: string;
  authority: string;
  estimatedCost: number;
  estimatedTime: string;
  mandatory: boolean;
  sourceIds: string[];
  confidence: number;
}

export interface ProvenanceMap {
  fieldToClaim: Record<string, string>;
  claimToEvidence: Record<string, string[]>;
  evidenceToSource: Record<string, string>;
}

export interface SchemaValidationResult {
  valid: boolean;
  totalErrors: number;
  totalWarnings: number;
  detailsByTool: Record<string, {
    collectionName: string;
    status: "valid" | "error" | "missing";
    itemsValidated: number;
    errors: string[];
    warnings: string[];
  }>;
  detailsByCollection?: Record<string, {
    ferramentaId: string;
    collectionName: string;
    status: "valid" | "error" | "missing";
    itemsValidated: number;
    errors: string[];
    warnings: string[];
  }>;
}

export interface ResearchConfig {
  minimumIterations: number;
  targetIterations: number;
  maximumIterations: number;
  sufficiencyThreshold: number;
  criticalGapThreshold: number;
  maxParallelTasks: number;
  defaultTimeoutMs: number;
  searchGrounding: boolean;
  enableNvidiaFallback: boolean;
}