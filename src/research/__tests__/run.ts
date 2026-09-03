import { testRunner } from "./TestRunner";
import { runEvidenceStoreTests } from "./EvidenceStore.test";
import { runPoliciesTests } from "./Policies.test";
import { runPlannerTests } from "./Planner.test";
import { runPnboxAdapterTests } from "./PnboxAdapter.test";

async function main(): Promise<void> {
  console.log("\n🧪 PNBOXAI Research Engine V2 - Unit Tests\n");

  await runEvidenceStoreTests();
  await runPoliciesTests();
  await runPlannerTests();
  await runPnboxAdapterTests();

  await testRunner.run();
  testRunner.printResults();

  const failed = testRunner["results"].filter((r: any) => !r.passed);
  if (failed.length > 0) {
    console.log("❌ Some tests failed");
    process.exit(1);
  } else {
    console.log("✅ All tests passed");
  }
}

main().catch((err) => {
  console.error("Test execution failed:", err);
  process.exit(1);
});