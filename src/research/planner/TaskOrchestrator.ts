import { ResearchPlan, ResearchTask, TaskStatus, ResearchIteration } from "../types";
import { RESEARCH_POLICIES } from "../policies";
import { evidenceStore } from "../evidence";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface TaskExecutor {
  execute(task: ResearchTask, plan: ResearchPlan): Promise<ResearchTask>;
}

export interface OrchestratorCallbacks {
  onTaskStart?: (task: ResearchTask) => void;
  onTaskComplete?: (task: ResearchTask) => void;
  onTaskError?: (task: ResearchTask, error: Error) => void;
  onIterationComplete?: (iteration: ResearchIteration) => void;
}

export class TaskOrchestrator {
  private plan: ResearchPlan;
  private executors: Map<string, TaskExecutor> = new Map();
  private callbacks: OrchestratorCallbacks = {};
  private completedTaskIds = new Set<string>();
  private failedTaskIds = new Set<string>();
  private isRunning = false;
  private abortSignal = false;
  private currentIteration = 0;

  constructor(plan: ResearchPlan, callbacks?: OrchestratorCallbacks) {
    this.plan = plan;
    if (callbacks) this.callbacks = callbacks;

    this.completedTaskIds = new Set(plan.tasks.filter((t) => t.status === "completed").map((t) => t.id));
    this.failedTaskIds = new Set(plan.tasks.filter((t) => t.status === "failed").map((t) => t.id));
    this.currentIteration = plan.iterations.length;
  }

  registerExecutor(category: string, executor: TaskExecutor): void {
    this.executors.set(category, executor);
  }

  registerDefaultExecutor(executor: TaskExecutor): void {
    this.executors.set("default", executor);
  }

  async executeIteration(): Promise<ResearchIteration> {
    if (this.isRunning) throw new Error("Orchestrator already running");
    if (this.abortSignal) throw new Error("Orchestrator aborted");

    this.isRunning = true;
    this.currentIteration++;

    const iterationStart = new Date().toISOString();
    const tasksToRun = this.getRunnableTasks();
    const executedTaskIds: string[] = [];

    const maxParallel = RESEARCH_POLICIES.execution.maxParallelTasks;
    const taskQueue = [...tasksToRun];

    const runningTasks: Promise<void>[] = [];

    while (taskQueue.length > 0 || runningTasks.length > 0) {
      if (this.abortSignal) break;

      while (runningTasks.length < maxParallel && taskQueue.length > 0) {
        const task = taskQueue.shift()!;
        const executor = this.executors.get(task.category) || this.executors.get("default");

        if (!executor) {
          task.status = "failed";
          task.error = `No executor registered for category: ${task.category}`;
          this.failedTaskIds.add(task.id);
          this.callbacks.onTaskError?.(task, new Error(task.error));
          continue;
        }

        const promise = this.executeTask(task, executor);
        runningTasks.push(promise);
        executedTaskIds.push(task.id);
      }

      if (runningTasks.length > 0) {
        await Promise.race(runningTasks);
        const completedIdx = runningTasks.findIndex((p) => {
          return true;
        });
        runningTasks.splice(completedIdx, 1);
      }
    }

    const iterationEnd = new Date().toISOString();

    const newSources = this.countNewSourcesSince(iterationStart);
    const newEvidence = this.countNewEvidenceSince(iterationStart);
    const newClaims = this.countNewClaimsSince(iterationStart);

    const iteration: ResearchIteration = {
      number: this.currentIteration,
      tasksExecuted: executedTaskIds,
      newSources,
      newEvidence,
      newClaims,
      gapsFound: [],
      contradictionsFound: [],
      sufficiencyScore: {},
      startedAt: iterationStart,
      completedAt: iterationEnd,
    };

    this.plan.iterations.push(iteration);
    this.plan.updatedAt = new Date().toISOString();

    this.callbacks.onIterationComplete?.(iteration);
    this.isRunning = false;

    return iteration;
  }

  private async executeTask(task: ResearchTask, executor: TaskExecutor): Promise<void> {
    task.status = "running";
    task.startedAt = new Date().toISOString();
    this.callbacks.onTaskStart?.(task);

    try {
      const result = await executor.execute(task, this.plan);
      task.status = "completed";
      task.completedAt = new Date().toISOString();
      task.results = result.results;
      task.confidence = this.calculateTaskConfidence(result);
      this.completedTaskIds.add(task.id);
      this.callbacks.onTaskComplete?.(task);
    } catch (error) {
      task.status = "failed";
      task.error = error instanceof Error ? error.message : String(error);
      task.completedAt = new Date().toISOString();
      this.failedTaskIds.add(task.id);
      this.callbacks.onTaskError?.(task, error instanceof Error ? error : new Error(String(error)));
    }
  }

  private calculateTaskConfidence(task: ResearchTask): number {
    if (!task.results) return 0;
    const { sources, evidence, claims } = task.results;
    if (claims.length === 0) return 0;
    return claims.reduce((sum, c) => sum + c.confidence, 0) / claims.length;
  }

  private getRunnableTasks(): ResearchTask[] {
    return this.plan.tasks.filter((task) => {
      if (task.status !== "pending") return false;
      if (this.failedTaskIds.has(task.id)) return false;
      return task.dependencies.every((depId) => this.completedTaskIds.has(depId));
    });
  }

  private countNewSourcesSince(since: string): number {
    const sinceTime = new Date(since).getTime();
    return Array.from(evidenceStore["sources"].values()).filter(
      (s) => new Date(s.retrievedAt).getTime() >= sinceTime
    ).length;
  }

  private countNewEvidenceSince(since: string): number {
    const sinceTime = new Date(since).getTime();
    return Array.from(evidenceStore["evidence"].values()).filter(
      (e) => new Date(e.retrievedAt).getTime() >= sinceTime
    ).length;
  }

  private countNewClaimsSince(since: string): number {
    const sinceTime = new Date(since).getTime();
    return Array.from(evidenceStore["claims"].values()).filter(
      (c) => new Date(c.createdAt).getTime() >= sinceTime
    ).length;
  }

  async runUntilSufficiency(
    checkSufficiency: (plan: ResearchPlan) => { sufficient: boolean; gaps: any[]; contradictions: any[] }
  ): Promise<ResearchPlan> {
    const maxIterations = RESEARCH_POLICIES.iterations.maximum;
    const minIterations = RESEARCH_POLICIES.iterations.minimum;

    for (let i = 0; i < maxIterations; i++) {
      if (this.abortSignal) break;

      await this.executeIteration();

      const { sufficient, gaps, contradictions } = checkSufficiency(this.plan);

      this.plan.iterations[this.currentIteration - 1].gapsFound = gaps;
      this.plan.iterations[this.currentIteration - 1].contradictionsFound = contradictions;

      if (sufficient && this.currentIteration >= minIterations) {
        break;
      }

      if (!sufficient && gaps.length > 0) {
        const newTasks = this.generateGapTasks(gaps);
        this.plan.tasks.push(...newTasks);
      }
    }

    return this.plan;
  }

  private generateGapTasks(gaps: any[]): ResearchTask[] {
    const newTasks: ResearchTask[] = [];
    const existingIds = new Set(this.plan.tasks.map((t) => t.id));

    for (const gap of gaps) {
      if (gap.suggestedTasks) {
        for (const suggested of gap.suggestedTasks) {
          const task: ResearchTask = {
            ...suggested,
            id: generateId("task"),
            status: "pending",
            confidence: 0,
            iteration: this.currentIteration + 1,
            dependencies: suggested.dependencies || [],
          };

          if (!existingIds.has(task.id)) {
            newTasks.push(task);
            existingIds.add(task.id);
          }
        }
      }
    }

    return newTasks.slice(0, RESEARCH_POLICIES.execution.maxParallelTasks);
  }

  abort(): void {
    this.abortSignal = true;
  }

  getProgress(): {
    total: number;
    completed: number;
    failed: number;
    pending: number;
    running: number;
    completionRate: number;
  } {
    const total = this.plan.tasks.length;
    const completed = this.completedTaskIds.size;
    const failed = this.failedTaskIds.size;
    const running = this.plan.tasks.filter((t) => t.status === "running").length;
    const pending = total - completed - failed - running;

    return {
      total,
      completed,
      failed,
      pending,
      running,
      completionRate: total > 0 ? completed / total : 0,
    };
  }

  getPlan(): ResearchPlan {
    return this.plan;
  }

  setPlan(plan: ResearchPlan): void {
    this.plan = plan;
    this.completedTaskIds = new Set(plan.tasks.filter((t) => t.status === "completed").map((t) => t.id));
    this.failedTaskIds = new Set(plan.tasks.filter((t) => t.status === "failed").map((t) => t.id));
    this.currentIteration = plan.iterations.length;
  }

  getState(): {
    plan: ResearchPlan;
    completedTaskIds: string[];
    failedTaskIds: string[];
    currentIteration: number;
    isRunning: boolean;
  } {
    return {
      plan: this.plan,
      completedTaskIds: Array.from(this.completedTaskIds),
      failedTaskIds: Array.from(this.failedTaskIds),
      currentIteration: this.currentIteration,
      isRunning: this.isRunning,
    };
  }

  restoreState(state: {
    plan: ResearchPlan;
    completedTaskIds: string[];
    failedTaskIds: string[];
    currentIteration: number;
  }): void {
    this.plan = state.plan;
    this.completedTaskIds = new Set(state.completedTaskIds);
    this.failedTaskIds = new Set(state.failedTaskIds);
    this.currentIteration = state.currentIteration;
  }
}

export const createTaskOrchestrator = (plan: ResearchPlan, callbacks?: OrchestratorCallbacks) => {
  return new TaskOrchestrator(plan, callbacks);
};