import { EvidenceStore } from "../evidence/EvidenceStore";

export interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
  duration: number;
}

export class TestRunner {
  private tests: Array<{ name: string; fn: () => void | Promise<void> }> = [];
  private results: TestResult[] = [];

  test(name: string, fn: () => void | Promise<void>): void {
    this.tests.push({ name, fn });
  }

  async run(): Promise<TestResult[]> {
    this.results = [];
    for (const { name, fn } of this.tests) {
      const start = Date.now();
      try {
        await fn();
        this.results.push({ name, passed: true, duration: Date.now() - start });
      } catch (error) {
        this.results.push({
          name,
          passed: false,
          error: error instanceof Error ? error.message : String(error),
          duration: Date.now() - start,
        });
      }
    }
    return this.results;
  }

  printResults(): void {
    if (this.results.length === 0 && this.tests.length > 0) {
      console.log("⚠️  Tests were registered but never run. Call run() before printResults().");
    }
    const passed = this.results.filter((r) => r.passed).length;
    const failed = this.results.length - passed;

    console.log("\n" + "=".repeat(60));
    console.log("TEST RESULTS");
    console.log("=".repeat(60));

    for (const result of this.results) {
      const status = result.passed ? "✓ PASS" : "✗ FAIL";
      const duration = `${result.duration}ms`;
      console.log(`${status}  ${result.name.padEnd(45)} ${duration}`);
      if (!result.passed && result.error) {
        console.log(`        Error: ${result.error}`);
      }
    }

    console.log("=".repeat(60));
    console.log(`Total: ${this.results.length} | Passed: ${passed} | Failed: ${failed}`);
    console.log("=".repeat(60) + "\n");
  }
}

export function assert(condition: boolean, message: string = "Assertion failed"): void {
  if (!condition) {
    throw new Error(message);
  }
}

export function assertEqual<T>(actual: T, expected: T, message?: string): void {
  if (actual !== expected) {
    throw new Error(message || `Expected ${expected}, got ${actual}`);
  }
}

export function assertDefined<T>(value: T | undefined | null, message?: string): asserts value is T {
  if (value === undefined || value === null) {
    throw new Error(message || "Value should be defined");
  }
}

export const testRunner = new TestRunner();