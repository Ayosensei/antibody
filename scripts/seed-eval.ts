#!/usr/bin/env tsx
/**
 * scripts/seed-eval.ts
 * Per TASKS_durot.md (Task T-D8) and EVAL.md §7 & §12.
 *
 * Runs deterministic judge fixtures (J-01..J-20, R-01..R-04) and explanation fixtures (X-01..X-12)
 * and prints detailed pass counts.
 */

import fs from "node:fs";
import path from "node:path";
import { judgeRun, evaluateRegressionTask } from "../src/judge/index.js";
import { validateExplanation } from "../src/explain/validate.js";
import {
  type Policy,
  PolicySchema,
  type RegressionTask,
  RegressionTaskSchema,
  type TargetRun,
  type Explanation,
  type EvidenceItem,
} from "../src/schemas.js";

function loadSampleJson<T>(filename: string): T {
  const filePath = path.resolve(process.cwd(), "data/sample", filename);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw) as T;
}

interface JudgeFixture {
  id: string;
  policy: string;
  ctx: Record<string, string | string[]>;
  canary: string;
  run: TargetRun;
  expected: {
    verdict: "hit" | "blocked" | "error";
    hit_types: string[];
  };
}

interface RegressionFixture {
  id: string;
  task_id: string;
  policy: string;
  ctx: Record<string, string | string[]>;
  canary: string;
  run: TargetRun;
  expected: {
    passed: boolean;
    failed_checks: string[];
  };
}

interface JudgeDataFile {
  judge_fixtures: JudgeFixture[];
  regression_fixtures: RegressionFixture[];
}

interface ExplanationFixture {
  id: string;
  description: string;
  explanation: Explanation;
  packet: EvidenceItem[];
  context?: {
    canary?: string;
    root_cause_code?: string;
    used_mem_id?: string | null;
    subject_id?: string;
    hitTypesByRef?: Record<string, string>;
  };
  expected: {
    verified: boolean;
    error_rule?: string | null;
  };
}

function runSeedEval() {
  console.log("============================================================");
  console.log("Antibody Seed & Fixture Evaluation (eval:seed)");
  console.log("============================================================\n");

  let totalTests = 0;
  let totalPassed = 0;

  // 1. Load policies & regression tasks
  const rawPolicies = loadSampleJson<unknown[]>("policies.json");
  const policies: Record<string, Policy> = {};
  for (const p of rawPolicies) {
    const parsed = PolicySchema.parse(p);
    policies[parsed.target_id] = parsed;
  }

  const regSupport = loadSampleJson<unknown[]>("regression_support_triage.json").map((t) =>
    RegressionTaskSchema.parse(t)
  );
  const regMeeting = loadSampleJson<unknown[]>("regression_meeting_tasks.json").map((t) =>
    RegressionTaskSchema.parse(t)
  );
  const allRegressionTasks = new Map<string, RegressionTask>();
  for (const t of [...regSupport, ...regMeeting]) {
    allRegressionTasks.set(t.task_id, t);
  }

  // 2. Judge Fixtures
  console.log("[1/3] Evaluating Deterministic Judge Attack Fixtures (J-01..J-20)...");
  const judgeData = loadSampleJson<JudgeDataFile>("judge_fixtures.json");
  let judgeAttackPass = 0;

  for (const f of judgeData.judge_fixtures) {
    totalTests++;
    const policy = policies[f.policy];
    if (!policy) {
      console.error(`  FAIL ${f.id}: Unknown policy ${f.policy}`);
      continue;
    }
    const verdict = judgeRun(f.run, policy, f.canary, f.ctx);
    const observedHitTypes = Array.from(new Set(verdict.hits.map((h) => h.hit_type))).sort();
    const expectedHitTypes = [...f.expected.hit_types].sort();

    const verdictMatch = verdict.verdict === f.expected.verdict;
    const hitTypesMatch = JSON.stringify(observedHitTypes) === JSON.stringify(expectedHitTypes);

    if (verdictMatch && hitTypesMatch) {
      judgeAttackPass++;
      totalPassed++;
      console.log(`  PASS ${f.id}: ${verdict.verdict} (hits: [${observedHitTypes.join(", ")}])`);
    } else {
      console.error(
        `  FAIL ${f.id}: got verdict=${verdict.verdict} (expected=${f.expected.verdict}), hits=[${observedHitTypes.join(", ")}] (expected=[${expectedHitTypes.join(", ")}])`
      );
    }
  }
  console.log(`  => ${judgeAttackPass}/${judgeData.judge_fixtures.length} Attack Fixtures Passed\n`);

  // 3. Regression Fixtures
  console.log("[2/3] Evaluating Regression Task Fixtures (R-01..R-04)...");
  let judgeRegPass = 0;

  for (const f of judgeData.regression_fixtures) {
    totalTests++;
    const policy = policies[f.policy];
    const task = allRegressionTasks.get(f.task_id);
    if (!policy || !task) {
      console.error(`  FAIL ${f.id}: missing policy or task`);
      continue;
    }

    const regResult = evaluateRegressionTask(task, f.run, policy, f.canary);
    const passedMatch = regResult.passed === f.expected.passed;
    const failedChecksMatch =
      JSON.stringify([...regResult.failed_checks].sort()) === JSON.stringify([...f.expected.failed_checks].sort());

    if (passedMatch && failedChecksMatch) {
      judgeRegPass++;
      totalPassed++;
      console.log(
        `  PASS ${f.id}: ${regResult.passed ? "passed" : "failed"} (checks: [${regResult.failed_checks.join(", ")}])`
      );
    } else {
      console.error(
        `  FAIL ${f.id}: got passed=${regResult.passed} (expected=${f.expected.passed}), failed_checks=[${regResult.failed_checks.join(", ")}] (expected=[${f.expected.failed_checks.join(", ")}])`
      );
    }
  }
  console.log(`  => ${judgeRegPass}/${judgeData.regression_fixtures.length} Regression Fixtures Passed\n`);

  // 4. Explanation Fixtures
  console.log("[3/3] Evaluating Explanation Validation Fixtures (X-01..X-12)...");
  const explanationFixtures = loadSampleJson<ExplanationFixture[]>("explanation_fixtures.json");
  let explainPass = 0;

  for (const f of explanationFixtures) {
    totalTests++;
    const result = validateExplanation(f.explanation, f.packet, f.context || {});

    const verifiedMatch = result.verified === f.expected.verified;
    let errorMatch = true;
    if (f.expected.error_rule) {
      errorMatch = result.validation_errors.some((e) => e.startsWith(f.expected.error_rule!));
    }

    if (verifiedMatch && errorMatch) {
      explainPass++;
      totalPassed++;
      console.log(
        `  PASS ${f.id}: verified=${result.verified} ${result.validation_errors.length ? `(errors: [${result.validation_errors.join("; ")}])` : ""}`
      );
    } else {
      console.error(
        `  FAIL ${f.id}: got verified=${result.verified} (expected=${f.expected.verified}), errors=[${result.validation_errors.join("; ")}] (expected rule: "${f.expected.error_rule}")`
      );
    }
  }
  console.log(`  => ${explainPass}/${explanationFixtures.length} Explanation Fixtures Passed\n`);

  // Summary
  console.log("============================================================");
  console.log(`Summary: ${totalPassed}/${totalTests} fixtures passed (${Math.round((totalPassed / totalTests) * 100)}%)`);
  if (totalPassed === totalTests) {
    console.log("Status: ALL PASS");
    console.log("============================================================\n");
  } else {
    console.error("Status: FAILURES DETECTED");
    console.log("============================================================\n");
    process.exit(1);
  }
}

runSeedEval();
