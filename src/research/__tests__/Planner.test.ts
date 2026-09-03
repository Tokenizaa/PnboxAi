import { BusinessAnalyzerAgent } from "../planner/BusinessAnalyzer";
import { ResearchPlannerAgent } from "../planner/ResearchPlanner";
import { testRunner, assert, assertDefined } from "./TestRunner";

export async function runPlannerTests(): Promise<void> {
  await testRunner.test("BusinessAnalyzer.analyze detects 'cafeteria' as sector 'alimentação'", async () => {
    const analyzer = new BusinessAnalyzerAgent();
    const result = await analyzer.analyze({
      prompt: "Quero abrir uma cafeteria especial em São Paulo",
    });
    assertDefined(result.businessDefinition);
    assertEqual(result.businessDefinition.sector, "alimentação");
  });

  await testRunner.test("BusinessAnalyzer.analyze extracts location from prompt", async () => {
    const analyzer = new BusinessAnalyzerAgent();
    const result = await analyzer.analyze({
      prompt: "Quero abrir um restaurante em Curitiba",
    });
    assertEqual(result.businessDefinition.location, "Curitiba");
  });

  await testRunner.test("BusinessAnalyzer.analyze generates critical questions", async () => {
    const analyzer = new BusinessAnalyzerAgent();
    const result = await analyzer.analyze({
      prompt: "Quero abrir uma loja virtual",
      modeloAprofundado: true,
    });
    const criticalQuestions = result.researchQuestions.filter((q) => q.priority === "critical");
    assert(criticalQuestions.length >= 3, "Should generate at least 3 critical questions");
    assert(
      result.researchQuestions.some((q) => q.category === "market"),
      "Should have market questions"
    );
    assert(
      result.researchQuestions.some((q) => q.category === "financial"),
      "Should have financial questions"
    );
  });

  await testRunner.test("BusinessAnalyzer.createResearchPlan creates plan with tasks", async () => {
    const analyzer = new BusinessAnalyzerAgent();
    const analysis = await analyzer.analyze({
      prompt: "Padaria artesanal em Porto Alegre",
    });
    const plan = analyzer.createResearchPlan(analysis);
    assertDefined(plan.id);
    assert(plan.tasks.length > 0, "Plan should have tasks");
    assert(plan.tasks.every((t) => t.status === "pending"), "All tasks should start as pending");
  });

  await testRunner.test("ResearchPlannerAgent.createPlan creates valid plan with DAG", async () => {
    const planner = new ResearchPlannerAgent();
    const result = await planner.createPlan({
      prompt: "Cafeteria com coworking em Curitiba",
      orcamentoEstimado: 150000,
      modeloAprofundado: true,
    });
    assertDefined(result.plan);
    assert(result.executionOrder.length > 0, "Should have execution order");
    assert(result.criticalPath.length > 0, "Should have critical path");
  });

  await testRunner.test("ResearchPlannerAgent.validatePlan detects missing fields", async () => {
    const planner = new ResearchPlannerAgent();
    const result = await planner.createPlan({
      prompt: "Negócio teste",
    });
    const validation = planner.validatePlan(result.plan);
    assert(validation.errors.length === 0, "Valid plan should have no errors");
  });

  await testRunner.test("ResearchPlannerAgent detects circular dependencies", async () => {
    const planner = new ResearchPlannerAgent();
    const result = await planner.createPlan({ prompt: "Test" });
    result.plan.tasks[0].dependencies.push(result.plan.tasks[1].id);
    result.plan.tasks[1].dependencies.push(result.plan.tasks[0].id);

    const validation = planner.validatePlan(result.plan);
    assert(!validation.valid, "Circular deps should make plan invalid");
  });
}

function assertEqual<T>(actual: T, expected: T, msg?: string): void {
  if (actual !== expected) {
    throw new Error(msg || `Expected ${JSON.stringify(expected)}, got ${JSON.stringify(actual)}`);
  }
}