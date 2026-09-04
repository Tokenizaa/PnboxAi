import {
  ResearchPlan,
  ResearchReport,
  ResearchTask,
  ResearchGap,
  Contradiction,
  ResearchSufficiency,
} from "./types";
import {
  BusinessAnalyzerAgent,
  ResearchPlannerAgent,
  TaskOrchestrator,
  TaskExecutor,
} from "./planner";
import {
  SourceEngine,
  GapAnalyzer,
  ContradictionAnalyzer,
  ResearchSufficiencyAnalyzer,
} from "./engine";
import { EvidenceStore, EvidenceAnalyst } from "./evidence";
import { ResearchSynthesizer } from "./synthesis";
import { PnboxAdapter } from "./mappers";

export interface DeepResearchV2Input {
  prompt: string;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
  idPlano?: string;
  maxIterations?: number;
}

export interface DeepResearchV2Result {
  report: ResearchReport;
  iterations: number;
  durationMs: number;
}

export class ResearchEngine {
  private businessAnalyzer: BusinessAnalyzerAgent;
  private researchPlanner: ResearchPlannerAgent;
  private evidenceStore: EvidenceStore;
  private evidenceAnalyst: EvidenceAnalyst;
  private sourceEngine: SourceEngine;
  private gapAnalyzer: GapAnalyzer;
  private contradictionAnalyzer: ContradictionAnalyzer;
  private sufficiencyAnalyzer: ResearchSufficiencyAnalyzer;
  private synthesizer: ResearchSynthesizer;

  constructor() {
    this.businessAnalyzer = new BusinessAnalyzerAgent();
    this.researchPlanner = new ResearchPlannerAgent();
    this.evidenceStore = new EvidenceStore();
    this.evidenceAnalyst = new EvidenceAnalyst(this.evidenceStore);
    
    this.sourceEngine = new SourceEngine();
    
    this.gapAnalyzer = new GapAnalyzer();
    this.contradictionAnalyzer = new ContradictionAnalyzer();
    this.sufficiencyAnalyzer = new ResearchSufficiencyAnalyzer();
    this.synthesizer = new ResearchSynthesizer();
  }

  async execute(input: DeepResearchV2Input): Promise<DeepResearchV2Result> {
    const startTime = Date.now();
    const idPlano = input.idPlano;
    if (!idPlano) {
      throw new Error("idPlano is required for research execution. Cannot proceed without a valid plan identifier.");
    }

    this.evidenceStore.clear();

    const plannerOutput = await this.researchPlanner.createPlan({
      prompt: input.prompt,
      cidadeUf: input.cidadeUf,
      orcamentoEstimado: input.orcamentoEstimado,
      publicoAlvo: input.publicoAlvo,
      modeloAprofundado: input.modeloAprofundado,
    });

    let plan = plannerOutput.plan;
    const validation = this.researchPlanner.validatePlan(plan);
    if (!validation.valid) {
      throw new Error(`Invalid research plan: ${validation.errors.join("; ")}`);
    }

    const orchestrator = new TaskOrchestrator(plan, {
      onIterationComplete: (iteration) => {
        console.log(
          `[ResearchEngine] Iteration ${iteration.number} completed: ${iteration.newClaims} claims, ${iteration.newSources} sources`
        );
      },
    });

    const defaultExecutor: TaskExecutor = {
      execute: async (task: ResearchTask, p: ResearchPlan) => {
        return this.executeTask(task, p);
      },
    };
    orchestrator.registerDefaultExecutor(defaultExecutor);

    const maxIterations = input.maxIterations || 3;
    let iterations = 0;
    let sufficiency: ResearchSufficiency | null = null;
    const allGaps: ResearchGap[] = [];
    const allContradictions: Contradiction[] = [];

    while (iterations < maxIterations) {
      iterations++;

      await orchestrator.executeIteration();

      const currentPlan = orchestrator.getPlan();

      const claims = this.evidenceStore.getAllClaims();
      const contradictions = this.contradictionAnalyzer.analyze(claims);
      const gaps = this.gapAnalyzer.analyze(currentPlan);

      allContradictions.push(...contradictions);
      allGaps.push(...gaps);

      sufficiency = this.sufficiencyAnalyzer.analyze(currentPlan, gaps, contradictions);

      if (sufficiency.canConclude && iterations >= 2) {
        break;
      }

      if (gaps.filter((g) => g.severity === "critical").length > 0) {
        const newTasks = this.researchPlanner.getNextIterationTasks(currentPlan, gaps.map((g) => ({
          questionId: g.questionId,
          suggestedTasks: g.suggestedTasks as any,
        })));

        if (newTasks.length > 0) {
          currentPlan.tasks.push(...newTasks);
          orchestrator.setPlan(currentPlan);
        }
      }
    }

    plan = orchestrator.getPlan();

    const finalClaims = this.evidenceStore.getAllClaims();
    const finalContradictions = this.contradictionAnalyzer.analyze(finalClaims);
    const finalGaps = this.gapAnalyzer.analyze(plan);
    const finalSufficiency = sufficiency || this.sufficiencyAnalyzer.analyze(plan, finalGaps, finalContradictions);

    const canonicalModel = await this.synthesizer.synthesize({
      plan,
      claims: finalClaims,
      evidence: this.evidenceStore.getAllEvidence(),
      sources: this.evidenceStore.getAllSources(),
    });

    const adapter = new PnboxAdapter(idPlano);
    const adapterResult = adapter.adapt(canonicalModel, { skipValidation: false, strictMode: false });

    const report: ResearchReport = {
      plan,
      sources: this.evidenceStore.getAllSources(),
      evidence: this.evidenceStore.getAllEvidence(),
      claims: finalClaims,
      gaps: finalGaps,
      contradictions: finalContradictions,
      sufficiency: finalSufficiency,
      canonicalModel,
      pnboxCollections: adapterResult.collections,
      validation: adapterResult.validation,
      completedAt: new Date().toISOString(),
    };

    return {
      report,
      iterations,
      durationMs: Date.now() - startTime,
    };
  }

  private async executeTask(task: ResearchTask, plan: ResearchPlan): Promise<ResearchTask> {
    const sources = await this.sourceEngine.processTaskQueries({
      queries: task.queries,
      category: task.category,
    });

    const evidence = [];
    const claims = [];

    for (const source of sources) {
      try {
        const extraction = await this.evidenceAnalyst.processSource(
          source.url,
          source.title,
          source.publisher,
          `Pesquisa via query: ${task.queries.join("; ")}. Contexto: ${task.question}`,
          task.category,
          task.question || task.id
        );
        evidence.push(...this.evidenceStore.getEvidenceBySource(source.id));
      } catch (error) {
        console.warn(`[ResearchEngine] Failed to process source ${source.url}:`, error);
      }
    }

    claims.push(...this.evidenceStore.getClaimsByQuestion(task.question || task.id));

    return {
      ...task,
      results: {
        sources,
        evidence,
        claims,
      },
    };
  }
}

export const researchEngine = new ResearchEngine();