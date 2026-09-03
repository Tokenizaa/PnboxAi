import {
  ResearchPlan,
  ResearchTask,
  ResearchQuestion,
  ResearchCategory,
} from "../types";
import { RESEARCH_POLICIES } from "../policies";
import { businessAnalyzer, BusinessAnalyzerOutput } from "./BusinessAnalyzer";

function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

export interface PlannerInput {
  prompt: string;
  cidadeUf?: string;
  orcamentoEstimado?: number;
  publicoAlvo?: string;
  modeloAprofundado?: boolean;
  existingPlan?: ResearchPlan;
}

export interface PlannerOutput {
  plan: ResearchPlan;
  executionOrder: string[][];
  criticalPath: string[];
}

const CATEGORY_DEPENDENCIES: Record<ResearchCategory, ResearchCategory[]> = {
  market: [],
  customer: ["market"],
  competition: ["market"],
  pricing: ["market", "customer", "competition"],
  operations: ["market", "customer"],
  financial: ["market", "customer", "competition", "pricing", "operations"],
  regulatory: ["market"],
  strategy: ["market", "customer", "competition", "financial"],
};

const QUESTION_DEPENDENCIES: Record<string, string[]> = {
  "market_size": [],
  "market_trends": ["market_size"],
  "customer_segments": ["market_size"],
  "customer_pain_points": ["customer_segments"],
  "competitor_list": ["market_size"],
  "competitor_swot": ["competitor_list"],
  "capex": ["market_size", "competitor_list"],
  "opex": ["capex"],
  "revenue_projection": ["customer_segments", "competitor_swot", "pricing"],
  "break_even": ["capex", "opex", "revenue_projection"],
  "cnae": ["market_size"],
  "licenses": ["cnae"],
  "marketing_channels": ["customer_segments", "competitor_swot"],
  "pricing_strategy": ["competitor_swot", "customer_pain_points"],
  "risk_analysis": ["financial", "competition", "regulatory"],
};

export class ResearchPlannerAgent {
  async createPlan(input: PlannerInput): Promise<PlannerOutput> {
    const analyzerOutput = await businessAnalyzer.analyze({
      prompt: input.prompt,
      cidadeUf: input.cidadeUf,
      orcamentoEstimado: input.orcamentoEstimado,
      publicoAlvo: input.publicoAlvo,
      modeloAprofundado: input.modeloAprofundado,
    });

    let plan: ResearchPlan;

    if (input.existingPlan) {
      plan = this.extendPlan(input.existingPlan, analyzerOutput);
    } else {
      plan = businessAnalyzer.createResearchPlan(analyzerOutput);
    }

    const enrichedTasks = this.enrichTasksWithDependencies(plan.tasks, plan.researchQuestions);
    plan.tasks = enrichedTasks;

    const { executionOrder, criticalPath } = this.computeExecutionOrder(enrichedTasks);
    plan.updatedAt = new Date().toISOString();

    return { plan, executionOrder, criticalPath };
  }

  private extendPlan(existingPlan: ResearchPlan, analyzerOutput: BusinessAnalyzerOutput): ResearchPlan {
    const newQuestions = analyzerOutput.researchQuestions.filter(
      (nq) => !existingPlan.researchQuestions.some((eq) => eq.question === nq.question)
    );

    const newTasks = newQuestions.map((q) => ({
      id: generateId("task"),
      question: q.question,
      objective: analyzerOutput.researchObjectives.find((o) => o.category === q.category)?.description || "",
      category: q.category,
      priority: q.priority,
      dependencies: this.inferDependencies(q, existingPlan.tasks),
      status: "pending" as const,
      queries: businessAnalyzer["generateQueriesForQuestion"](q),
      requiredEvidence: q.requiredEvidenceTypes,
      confidence: 0,
      iteration: existingPlan.iterations.length + 1,
    }));

    return {
      ...existingPlan,
      researchQuestions: [...existingPlan.researchQuestions, ...newQuestions],
      researchObjectives: [...existingPlan.researchObjectives, ...analyzerOutput.researchObjectives.filter(
        (no) => !existingPlan.researchObjectives.some((eo) => eo.description === no.description)
      )],
      unknowns: [...new Set([...existingPlan.unknowns, ...analyzerOutput.unknowns])],
      criticalVariables: [...new Set([...existingPlan.criticalVariables, ...analyzerOutput.criticalVariables])],
      tasks: [...existingPlan.tasks, ...newTasks],
    };
  }

  private inferDependencies(question: ResearchQuestion, existingTasks: ResearchTask[]): string[] {
    const deps: string[] = [];

    for (const depCategory of CATEGORY_DEPENDENCIES[question.category] || []) {
      const tasksInCategory = existingTasks.filter((t) => t.category === depCategory && t.status === "completed");
      for (const t of tasksInCategory) {
        deps.push(t.id);
      }
    }

    return deps;
  }

  private enrichTasksWithDependencies(tasks: ResearchTask[], questions: ResearchQuestion[]): ResearchTask[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));

    for (const task of tasks) {
      if (task.dependencies.length === 0) {
        task.dependencies = this.inferTaskDependencies(task, questions, taskMap);
      }
    }

    return tasks;
  }

  private inferTaskDependencies(
    task: ResearchTask,
    questions: ResearchQuestion[],
    taskMap: Map<string, ResearchTask>
  ): string[] {
    const deps: string[] = [];

    for (const [key, depKeys] of Object.entries(QUESTION_DEPENDENCIES)) {
      if (task.question.toLowerCase().includes(key.replace("_", " "))) {
        for (const depKey of depKeys) {
          const depTask = Array.from(taskMap.values()).find(
            (t) => t.question.toLowerCase().includes(depKey.replace("_", " ")) && t.status === "completed"
          );
          if (depTask) deps.push(depTask.id);
        }
      }
    }

    return deps;
  }

  private computeExecutionOrder(tasks: ResearchTask[]): { executionOrder: string[][]; criticalPath: string[] } {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const visiting = new Set<string>();
    const order: string[] = [];
    const levels: Map<string, number> = new Map();

    function visit(taskId: string): number {
      if (visiting.has(taskId)) {
        throw new Error(`Circular dependency detected involving ${taskId}`);
      }
      if (visited.has(taskId)) {
        return levels.get(taskId) || 0;
      }

      visiting.add(taskId);
      const task = taskMap.get(taskId);
      if (!task) {
        visiting.delete(taskId);
        return 0;
      }

      let maxLevel = 0;
      for (const depId of task.dependencies) {
        const depLevel = visit(depId);
        maxLevel = Math.max(maxLevel, depLevel + 1);
      }

      levels.set(taskId, maxLevel);
      visiting.delete(taskId);
      visited.add(taskId);
      order.push(taskId);

      return maxLevel;
    }

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        visit(task.id);
      }
    }

    const maxLevel = Math.max(...levels.values());
    const executionOrder: string[][] = Array.from({ length: maxLevel + 1 }, () => []);

    for (const [taskId, level] of levels.entries()) {
      executionOrder[level].push(taskId);
    }

    const criticalPath = this.findCriticalPath(tasks, levels);

    return { executionOrder, criticalPath };
  }

  private findCriticalPath(tasks: ResearchTask[], levels: Map<string, number>): string[] {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const criticalTasks = tasks
      .filter((t) => t.priority === "critical")
      .sort((a, b) => (levels.get(b.id) || 0) - (levels.get(a.id) || 0));

    return criticalTasks.map((t) => t.id);
  }

  validatePlan(plan: ResearchPlan): { valid: boolean; errors: string[]; warnings: string[] } {
    const errors: string[] = [];
    const warnings: string[] = [];
    const taskMap = new Map(plan.tasks.map((t) => [t.id, t]));

    for (const task of plan.tasks) {
      for (const depId of task.dependencies) {
        if (!taskMap.has(depId)) {
          errors.push(`Task ${task.id} depends on non-existent task ${depId}`);
        }
      }
    }

    const hasCycles = this.detectCycles(plan.tasks);
    if (hasCycles) {
      errors.push("Circular dependency detected in task graph");
    }

    const criticalTasks = plan.tasks.filter((t) => t.priority === "critical");
    if (criticalTasks.length === 0) {
      warnings.push("No critical priority tasks defined");
    }

    const categoriesCovered = new Set(plan.tasks.map((t) => t.category));
    const requiredCategories: ResearchCategory[] = ["market", "customer", "competition", "financial"];
    for (const cat of requiredCategories) {
      if (!categoriesCovered.has(cat)) {
        warnings.push(`Missing required category: ${cat}`);
      }
    }

    return { valid: errors.length === 0, errors, warnings };
  }

  private detectCycles(tasks: ResearchTask[]): boolean {
    const taskMap = new Map(tasks.map((t) => [t.id, t]));
    const visited = new Set<string>();
    const recStack = new Set<string>();

    function dfs(taskId: string): boolean {
      visited.add(taskId);
      recStack.add(taskId);

      const task = taskMap.get(taskId);
      if (task) {
        for (const depId of task.dependencies) {
          if (!visited.has(depId)) {
            if (dfs(depId)) return true;
          } else if (recStack.has(depId)) {
            return true;
          }
        }
      }

      recStack.delete(taskId);
      return false;
    }

    for (const task of tasks) {
      if (!visited.has(task.id)) {
        if (dfs(task.id)) return true;
      }
    }

    return false;
  }

  getReadyTasks(plan: ResearchTask[], completedTaskIds: Set<string>): ResearchTask[] {
    return plan.filter((task) => {
      if (task.status !== "pending") return false;
      return task.dependencies.every((depId) => completedTaskIds.has(depId));
    });
  }

  getNextIterationTasks(
    plan: ResearchPlan,
    gaps: { questionId: string; suggestedTasks: ResearchTask[] }[]
  ): ResearchTask[] {
    const newTasks: ResearchTask[] = [];
    const existingIds = new Set(plan.tasks.map((t) => t.id));

    for (const gap of gaps) {
      for (const suggested of gap.suggestedTasks) {
        const task: ResearchTask = {
          ...suggested,
          id: generateId("task"),
          status: "pending",
          confidence: 0,
          iteration: plan.iterations.length + 1,
          dependencies: this.inferDependencies(
            { category: suggested.category, priority: suggested.priority, question: suggested.question } as ResearchQuestion,
            plan.tasks
          ),
        };

        if (!existingIds.has(task.id)) {
          newTasks.push(task);
          existingIds.add(task.id);
        }
      }
    }

    return newTasks.slice(0, RESEARCH_POLICIES.execution.maxParallelTasks);
  }
}

export const researchPlanner = new ResearchPlannerAgent();