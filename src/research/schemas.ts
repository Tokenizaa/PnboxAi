export type DataOriginType = "USER_PROVIDED" | "DIRECT_SOURCE" | "CALCULATED" | "INFERRED" | "ESTIMATED";

export type ResearchCategoryType =
  | "market"
  | "customer"
  | "competition"
  | "pricing"
  | "operations"
  | "financial"
  | "regulatory"
  | "strategy";

export const DataOriginValues: DataOriginType[] = [
  "USER_PROVIDED",
  "DIRECT_SOURCE",
  "CALCULATED",
  "INFERRED",
  "ESTIMATED",
];

export const ResearchCategoryValues: ResearchCategoryType[] = [
  "market",
  "customer",
  "competition",
  "pricing",
  "operations",
  "financial",
  "regulatory",
  "strategy",
];

export type TaskStatusType = "pending" | "running" | "completed" | "failed" | "skipped";
export const TaskStatusValues: TaskStatusType[] = ["pending", "running", "completed", "failed", "skipped"];

export type ResearchStatusType = "planning" | "executing" | "analyzing" | "synthesizing" | "completed" | "failed";
export const ResearchStatusValues: ResearchStatusType[] = [
  "planning",
  "executing",
  "analyzing",
  "synthesizing",
  "completed",
  "failed",
];

export type SourceTypeType =
  | "official_gov"
  | "official_org"
  | "academic"
  | "industry_report"
  | "corporate"
  | "specialized_press"
  | "blog"
  | "secondary";
export const SourceTypeValues: SourceTypeType[] = [
  "official_gov",
  "official_org",
  "academic",
  "industry_report",
  "corporate",
  "specialized_press",
  "blog",
  "secondary",
];

export type ContradictionStatusType =
  | "unresolved"
  | "resolved_primary"
  | "resolved_recent"
  | "resolved_specific"
  | "resolved_methodological"
  | "partial";
export const ContradictionStatusValues: ContradictionStatusType[] = [
  "unresolved",
  "resolved_primary",
  "resolved_recent",
  "resolved_specific",
  "resolved_methodological",
  "partial",
];

export type GapSeverityType = "critical" | "high" | "medium" | "low";
export const GapSeverityValues: GapSeverityType[] = ["critical", "high", "medium", "low"];

export type PriorityType = "critical" | "high" | "medium" | "low";
export const PriorityValues: PriorityType[] = ["critical", "high", "medium", "low"];

export interface ValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateDataOrigin(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["DataOrigin must be a string"] };
  }
  if (!DataOriginValues.includes(value as DataOriginType)) {
    return { valid: false, errors: [`Invalid DataOrigin: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateResearchCategory(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["ResearchCategory must be a string"] };
  }
  if (!ResearchCategoryValues.includes(value as ResearchCategoryType)) {
    return { valid: false, errors: [`Invalid ResearchCategory: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateTaskStatus(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["TaskStatus must be a string"] };
  }
  if (!TaskStatusValues.includes(value as TaskStatusType)) {
    return { valid: false, errors: [`Invalid TaskStatus: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateSourceType(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["SourceType must be a string"] };
  }
  if (!SourceTypeValues.includes(value as SourceTypeType)) {
    return { valid: false, errors: [`Invalid SourceType: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validatePriority(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["Priority must be a string"] };
  }
  if (!PriorityValues.includes(value as PriorityType)) {
    return { valid: false, errors: [`Invalid Priority: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateUrl(url: unknown): ValidationResult {
  if (typeof url !== "string") {
    return { valid: false, errors: ["URL must be a string"] };
  }
  try {
    new URL(url);
    return { valid: true, errors: [] };
  } catch {
    return { valid: false, errors: [`Invalid URL: ${url}`] };
  }
}

export function validateConfidence(value: unknown): ValidationResult {
  if (typeof value !== "number") {
    return { valid: false, errors: ["Confidence must be a number"] };
  }
  if (value < 0 || value > 1) {
    return { valid: false, errors: [`Confidence must be between 0 and 1: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateISO8601(value: unknown): ValidationResult {
  if (typeof value !== "string") {
    return { valid: false, errors: ["ISO8601 must be a string"] };
  }
  const date = new Date(value);
  if (isNaN(date.getTime())) {
    return { valid: false, errors: [`Invalid ISO8601 date: ${value}`] };
  }
  return { valid: true, errors: [] };
}

export function validateSource(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Source must be an object"] };
  }
  const s = input as Record<string, unknown>;

  if (typeof s.id !== "string") errors.push("Source.id must be a string");
  errors.push(...validateUrl(s.url).errors);
  if (typeof s.title !== "string" || s.title.length === 0) errors.push("Source.title must be a non-empty string");
  if (typeof s.publisher !== "string" || s.publisher.length === 0) errors.push("Source.publisher must be a non-empty string");
  errors.push(...validateSourceType(s.type).errors);
  errors.push(...validateISO8601(s.retrievedAt).errors);
  errors.push(...validateConfidence(s.reliability).errors);

  return { valid: errors.length === 0, errors };
}

export function validateEvidence(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Evidence must be an object"] };
  }
  const e = input as Record<string, unknown>;

  if (typeof e.id !== "string") errors.push("Evidence.id must be a string");
  if (typeof e.sourceId !== "string") errors.push("Evidence.sourceId must be a string");
  if (typeof e.excerpt !== "string" || e.excerpt.length === 0) errors.push("Evidence.excerpt must be a non-empty string");
  errors.push(...validateISO8601(e.retrievedAt).errors);
  errors.push(...validateConfidence(e.confidence).errors);

  return { valid: errors.length === 0, errors };
}

export function validateClaim(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["Claim must be an object"] };
  }
  const c = input as Record<string, unknown>;

  if (typeof c.id !== "string") errors.push("Claim.id must be a string");
  if (typeof c.questionId !== "string") errors.push("Claim.questionId must be a string");
  if (typeof c.statement !== "string" || c.statement.length === 0) errors.push("Claim.statement must be a non-empty string");
  if (!Array.isArray(c.evidenceIds) || c.evidenceIds.length === 0) errors.push("Claim.evidenceIds must be a non-empty array");
  errors.push(...validateDataOrigin(c.origin).errors);
  errors.push(...validateConfidence(c.confidence).errors);
  errors.push(...validateISO8601(c.createdAt).errors);

  return { valid: errors.length === 0, errors };
}

export function validateResearchTask(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["ResearchTask must be an object"] };
  }
  const t = input as Record<string, unknown>;

  if (typeof t.id !== "string") errors.push("Task.id must be a string");
  if (typeof t.question !== "string" || t.question.length === 0) errors.push("Task.question must be a non-empty string");
  if (typeof t.objective !== "string") errors.push("Task.objective must be a string");
  errors.push(...validateResearchCategory(t.category).errors);
  errors.push(...validatePriority(t.priority).errors);
  if (!Array.isArray(t.dependencies)) errors.push("Task.dependencies must be an array");
  errors.push(...validateTaskStatus(t.status).errors);
  if (!Array.isArray(t.queries)) errors.push("Task.queries must be an array");
  if (!Array.isArray(t.requiredEvidence)) errors.push("Task.requiredEvidence must be an array");
  errors.push(...validateConfidence(t.confidence).errors);
  if (typeof t.iteration !== "number" || !Number.isInteger(t.iteration)) errors.push("Task.iteration must be an integer");

  return { valid: errors.length === 0, errors };
}

export function validateCanonicalBusinessModel(input: unknown): ValidationResult {
  const errors: string[] = [];
  if (!input || typeof input !== "object") {
    return { valid: false, errors: ["CanonicalBusinessModel must be an object"] };
  }
  const m = input as Record<string, unknown>;

  if (!m.business || typeof m.business !== "object") errors.push("model.business is required");
  if (!m.market || typeof m.market !== "object") errors.push("model.market is required");
  if (!m.customer || typeof m.customer !== "object") errors.push("model.customer is required");
  if (!m.competition || typeof m.competition !== "object") errors.push("model.competition is required");
  if (!m.valueProposition || typeof m.valueProposition !== "object") errors.push("model.valueProposition is required");
  if (!m.swot || typeof m.swot !== "object") errors.push("model.swot is required");
  if (!m.marketing || typeof m.marketing !== "object") errors.push("model.marketing is required");
  if (!m.operations || typeof m.operations !== "object") errors.push("model.operations is required");
  if (!m.financials || typeof m.financials !== "object") errors.push("model.financials is required");
  if (!m.viability || typeof m.viability !== "object") errors.push("model.viability is required");
  if (!m.regulatory || typeof m.regulatory !== "object") errors.push("model.regulatory is required");
  if (!m.provenance || typeof m.provenance !== "object") errors.push("model.provenance is required");

  return { valid: errors.length === 0, errors };
}

export interface ResearchConfigValidation {
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

export function validateResearchConfig(input: Partial<ResearchConfigValidation>): ResearchConfigValidation {
  return {
    minimumIterations: input.minimumIterations ?? 2,
    targetIterations: input.targetIterations ?? 3,
    maximumIterations: input.maximumIterations ?? 7,
    sufficiencyThreshold: input.sufficiencyThreshold ?? 0.75,
    criticalGapThreshold: input.criticalGapThreshold ?? 0.85,
    maxParallelTasks: input.maxParallelTasks ?? 4,
    defaultTimeoutMs: input.defaultTimeoutMs ?? 60000,
    searchGrounding: input.searchGrounding ?? true,
    enableNvidiaFallback: input.enableNvidiaFallback ?? true,
  };
}