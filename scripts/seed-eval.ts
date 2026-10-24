#!/usr/bin/env tsx
/**
 * Seed Evaluation Runner.
 * Per README.md §8.4, docs/EVAL.md §5 & §7, and docs/TASKS_durot.md §T-D8.
 * Evaluates seed attacks and runs judge and regression fixtures, printing pass counts.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import {
  AttackSchema,
  PolicySchema,
  RegressionTaskSchema,
  type Attack,
  type Policy,
  type RegressionTask,
  type TargetRun,
} from "../src/schemas.js";
import { judgeRun, evaluateRegressionTask } from "../src/judge/index.js";

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

function loadJson<T>(relPath: string): T {
  const fullPath = path.resolve(process.cwd(), relPath);
  return JSON.parse(fs.readFileSync(fullPath, "utf-8")) as T;
}

async function main() {
  console.log("=== Antibody Seed & Fixture Evaluation ===");
  console.log();

  // 1. Evaluate Seed Attacks
  console.log("[1/3] Validating Seed Attack Library (data/sample/attacks.json)...");
  const rawAttacks = loadJson<unknown[]>("data/sample/attacks.json");
  const validatedAttacks: Attack[] = [];
  let supportCount = 0;
  let meetingCount = 0;

  for (const raw of rawAttacks) {
    const atk = AttackSchema.parse(raw);
    validatedAttacks.push(atk);
    if (atk.target_scope.includes("support_triage")) supportCount++;
    if (atk.target_scope.includes("meeting_tasks")) meetingCount++;
  }

  console.log(
    `  PASS: ${validatedAttacks.length} seed attacks validated (support_triage: ${supportCount}, meeting_tasks: ${meetingCount})`
  );
  console.log();

  // 2. Load Policies & Regression Tasks
  const rawPolicies = loadJson<unknown[]>("data/sample/policies.json");
  const policies = new Map<string, Policy>();
  for (const p of rawPolicies) {
    const policy = PolicySchema.parse(p);
    policies.set(policy.target_id, policy);
  }

  const regSupport = loadJson<unknown[]>("data/sample/regression_support_triage.json").map((t) =>
    RegressionTaskSchema.parse(t)
  );
  const regMeeting = loadJson<unknown[]>("data/sample/regression_meeting_tasks.json").map((t) =>
    RegressionTaskSchema.parse(t)
  );
  const regressionTasks = new Map<string, RegressionTask>();
  for (const t of [...regSupport, ...regMeeting]) {
    regressionTasks.set(t.task_id, t);
  }

  // 3. Evaluate Judge Fixtures (J-01 to J-20)
  console.log("[2/3] Evaluating Judge Fixtures (J-01 to J-20)...");
  const judgeData = loadJson<JudgeDataFile>("data/sample/judge_fixtures.json");
  let judgePassed = 0;
  const judgeFailed: string[] = [];

  for (const fixture of judgeData.judge_fixtures) {
    const policy = policies.get(fixture.policy);
    if (!policy) {
      judgeFailed.push(`${fixture.id}: Policy ${fixture.policy} not found`);
      continue;
    }

    const verdict = judgeRun(fixture.run, policy, fixture.canary, fixture.ctx);
    const hitTypes = verdict.hits.map((h) => h.hit_type).sort();
    const expectedHitTypes = [...fixture.expected.hit_types].sort();

    const verdictMatches = verdict.verdict === fixture.expected.verdict;
    const hitTypesMatch =
      hitTypes.length === expectedHitTypes.length &&
      hitTypes.every((ht, idx) => ht === expectedHitTypes[idx]);

    if (verdictMatches && hitTypesMatch) {
      judgePassed++;
    } else {
      judgeFailed.push(
        `${fixture.id}: expected verdict=${fixture.expected.verdict} hits=[${expectedHitTypes.join(", ")}], got verdict=${verdict.verdict} hits=[${hitTypes.join(", ")}]`
      );
    }
  }

  if (judgeFailed.length === 0) {
    console.log(`  PASS: ${judgePassed}/${judgeData.judge_fixtures.length} judge fixtures passed`);
  } else {
    console.error(`  FAIL: ${judgeFailed.length} judge fixtures failed:`);
    for (const f of judgeFailed) console.error(`   - ${f}`);
  }
  console.log();

  // 4. Evaluate Regression Fixtures (R-01 to R-04)
  console.log("[3/3] Evaluating Regression Fixtures (R-01 to R-04)...");
  let regPassed = 0;
  const regFailed: string[] = [];

  for (const fixture of judgeData.regression_fixtures) {
    const policy = policies.get(fixture.policy);
    const task = regressionTasks.get(fixture.task_id);

    if (!policy || !task) {
      regFailed.push(`${fixture.id}: missing policy or task`);
      continue;
    }

    const res = evaluateRegressionTask(task, fixture.run, policy, fixture.canary);

    const passMatches = res.passed === fixture.expected.passed;
    const checksMatch =
      res.failed_checks.length === fixture.expected.failed_checks.length &&
      res.failed_checks.every((r, i) => r === fixture.expected.failed_checks[i]);

    if (passMatches && checksMatch) {
      regPassed++;
    } else {
      regFailed.push(
        `${fixture.id}: expected passed=${fixture.expected.passed} checks=[${fixture.expected.failed_checks.join(", ")}], got passed=${res.passed} reasons=[${res.reasons.join(", ")}]`
      );
    }
  }

  if (regFailed.length === 0) {
    console.log(`  PASS: ${regPassed}/${judgeData.regression_fixtures.length} regression fixtures passed`);
  } else {
    console.error(`  FAIL: ${regFailed.length} regression fixtures failed:`);
    for (const f of regFailed) console.error(`   - ${f}`);
  }
  console.log();

  // Summary
  const totalFixtures = judgeData.judge_fixtures.length + judgeData.regression_fixtures.length;
  const totalPassed = judgePassed + regPassed;

  console.log("--------------------------------------------------");
  console.log(`Summary: ${totalPassed}/${totalFixtures} fixtures passed with exact expected verdicts.`);
  console.log(`Seed attacks verified: ${validatedAttacks.length}`);
  console.log("--------------------------------------------------");

  if (judgeFailed.length > 0 || regFailed.length > 0) {
    process.exit(1);
  }
  process.exit(0);
}

main().catch((err) => {
  console.error("Fatal error during seed evaluation:", err);
  process.exit(1);
});
