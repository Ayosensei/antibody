/**
 * Verifier agent in Antibody.
 * Per AGENT_SPEC.md §6.6 & DATA_CONTRACTS.md §8:
 * - Pure deterministic critic (NO LLM).
 * - Re-runs target attack, prior-fix attacks (cap 6), and full regression set.
 * - Accept iff: targeted attack blocked AND prior-fix attacks blocked AND no newly failing regression tasks.
 * - Rejects with reasons: attack_still_hits, prior_fix_broken, regression_break.
 * - Runs final verification suite.
 */

import {
  type Attack,
  type AttackResult,
  AttackResultSchema,
  type Fix,
  type Finding,
  type Policy,
  type RegressionResult,
  RegressionResultSchema,
  type RegressionTask,
  type Rejection,
  type RejectionReasonCode,
  type SuiteResult,
  SuiteResultSchema,
  type TargetConfig,
  type TargetId,
  type TargetRun,
  type TraceContext,
  type VerificationResult,
  VerificationResultSchema,
} from "../schemas.js";
import { generator as defaultGenerator } from "../adapters/llm/index.js";
import { executeTarget } from "../targets/runner.js";
import { generateCanary } from "../targets/common.js";
import { judgeRun } from "../judge/judge.js";
import { evaluateRegressionTask } from "../judge/regression.js";
import { applyFixOps } from "./fixer.js";
import { createVerificationExplanation } from "../explain/templates.js";
import { recordTrace } from "../tracing.js";

export interface VerifyFixParams {
  fix: Fix;
  finding: Finding;
  attack: Attack;
  configCurrent: TargetConfig;
  policy: Policy;
  acceptedFixes: { fix: Fix; finding: Finding; attack: Attack }[];
  regressionTasks: RegressionTask[];
  baselineRegressionResults: RegressionResult[];
  trials?: number;
  seed?: number;
  traceCtx: TraceContext;
  onDegraded?: (reason: string) => void;
  generatorFn?: typeof defaultGenerator;
}

export interface FinalVerifyParams {
  targetId: TargetId;
  configCurrent: TargetConfig;
  policy: Policy;
  attackSuite: Attack[];
  regressionTasks: RegressionTask[];
  baselineRegressionResults: RegressionResult[];
  trials?: number;
  seed?: number;
  traceCtx: TraceContext;
  onDegraded?: (reason: string) => void;
  generatorFn?: typeof defaultGenerator;
}

export async function executeAttackTrial(params: {
  attack: Attack;
  config: TargetConfig;
  policy: Policy;
  trial: number;
  seed: number;
  traceCtx: TraceContext;
  onDegraded?: (reason: string) => void;
  generatorFn?: typeof defaultGenerator;
}): Promise<{ run: TargetRun; verdict: ReturnType<typeof judgeRun> }> {
  const canary = generateCanary(params.policy.canary_prefix, params.seed, `${params.attack.attack_id}_t${params.trial}`);
  const run = await executeTarget({
    targetId: params.policy.target_id,
    attack: params.attack,
    config: params.config,
    policy: params.policy,
    trial: params.trial,
    seed: params.seed,
    canary,
    traceContext: params.traceCtx,
    generatorFn: params.generatorFn,
  });

  const attackCtx = (params.attack as any)?.ctx || (params.policy.target_id === "support_triage" ? {
    "ticket.sender": "cust1@example.test",
    "ticket.customer_id": "C-1001",
    "ticket.order_id": "O-5001",
  } : {
    "meeting.attendees": ["alex@example.test", "sam@example.test", "pat@example.test", "jo@example.test"],
  });

  const verdict = judgeRun(run, params.policy, canary, attackCtx);
  return { run, verdict };
}

export async function verifyFix(params: VerifyFixParams): Promise<VerificationResult> {
  const trials = params.trials ?? 1;
  const seed = params.seed ?? 42;
  const fix = params.fix;
  const finding = params.finding;
  const attack = params.attack;

  recordTrace(
    {
      traceId: params.traceCtx.traceId,
      agentName: "Verifier",
      action: "verify_fix",
      status: "success",
      inputSummary: `Verifying fix ${fix.fix_id} for finding ${finding.finding_id}`,
      outputSummary: "Verification started",
    },
    { logDir: params.traceCtx.logDir, canaryKey: params.traceCtx.canaryKey }
  );

  // 1. Apply candidate ops to copy of config
  const candidateConfig = applyFixOps(params.configCurrent, fix.ops);

  // 2. Re-run target attack on candidate config
  let attackBlocked = true;
  for (let trial = 1; trial <= trials; trial++) {
    const { verdict } = await executeAttackTrial({
      attack,
      config: candidateConfig,
      policy: params.policy,
      trial,
      seed,
      traceCtx: params.traceCtx,
      onDegraded: params.onDegraded,
      generatorFn: params.generatorFn,
    });
    if (verdict.verdict === "hit") {
      attackBlocked = false;
      break;
    }
  }

  // 3. Prior-fix integrity: re-run attacks tied to prior accepted fixes (cap 6, most recent first)
  let priorFixesIntact = true;
  const priorPairs = params.acceptedFixes.slice(-6).reverse();
  for (const pair of priorPairs) {
    for (let trial = 1; trial <= trials; trial++) {
      const { verdict } = await executeAttackTrial({
        attack: pair.attack,
        config: candidateConfig,
        policy: params.policy,
        trial,
        seed,
        traceCtx: params.traceCtx,
        onDegraded: params.onDegraded,
        generatorFn: params.generatorFn,
      });
      if (verdict.verdict === "hit") {
        priorFixesIntact = false;
        break;
      }
    }
    if (!priorFixesIntact) break;
  }

  // 4. Regression set on candidate config
  const newlyFailingTasks: string[] = [];
  const baselinePassedSet = new Set(
    params.baselineRegressionResults.filter((r) => r.passed).map((r) => r.task_id)
  );

  let regressionPassedCount = 0;
  for (const task of params.regressionTasks) {
    const canary = generateCanary(params.policy.canary_prefix, seed, String(task.task_id));
    const run = await executeTarget({
      targetId: params.policy.target_id,
      regressionTask: task,
      config: candidateConfig,
      policy: params.policy,
      trial: 1,
      seed,
      canary,
      traceContext: params.traceCtx,
      generatorFn: params.generatorFn,
    });

    const evalRes = evaluateRegressionTask(task, run, params.policy, canary);
    if (evalRes.passed) {
      regressionPassedCount++;
    } else if (baselinePassedSet.has(task.task_id)) {
      newlyFailingTasks.push(task.task_id);
    }
  }

  // 5. Build rejections
  const reasons: Rejection[] = [];
  if (!attackBlocked) {
    reasons.push({
      fix_id: fix.fix_id,
      reason_code: "attack_still_hits",
      details: `Attack ${attack.attack_id} still succeeded against candidate configuration`,
      newly_failing_tasks: [],
    });
  }
  if (!priorFixesIntact) {
    reasons.push({
      fix_id: fix.fix_id,
      reason_code: "prior_fix_broken",
      details: "A previously accepted fix was broken by candidate configuration",
      newly_failing_tasks: [],
    });
  }
  if (newlyFailingTasks.length > 0) {
    reasons.push({
      fix_id: fix.fix_id,
      reason_code: "regression_break",
      details: `Candidate configuration broke normal tasks: ${newlyFailingTasks.join(", ")}`,
      newly_failing_tasks: newlyFailingTasks,
    });
  }

  const isAccepted = reasons.length === 0;
  const verdict: "accept" | "reject" = isAccepted ? "accept" : "reject";

  const explanation = createVerificationExplanation({
    fix_id: fix.fix_id,
    verdict,
    rejection_reasons: reasons.map((r) => r.reason_code),
    newly_failing_tasks: newlyFailingTasks,
  });

  const result = VerificationResultSchema.parse({
    fix_id: fix.fix_id,
    attack_blocked: attackBlocked,
    prior_fixes_intact: priorFixesIntact,
    regression_passed: regressionPassedCount,
    regression_total: params.regressionTasks.length,
    newly_failing_tasks: newlyFailingTasks,
    verdict,
    reasons,
    explanation,
  });

  recordTrace(
    {
      traceId: params.traceCtx.traceId,
      agentName: "Verifier",
      action: "verify_fix",
      status: isAccepted ? "success" : "rejected",
      inputSummary: `Fix: ${fix.fix_id}`,
      outputSummary: `Verdict: ${verdict} (reasons: ${reasons.map((r) => r.reason_code).join(", ") || "none"})`,
    },
    { logDir: params.traceCtx.logDir, canaryKey: params.traceCtx.canaryKey }
  );

  return result;
}

export async function runFinalVerification(params: FinalVerifyParams): Promise<SuiteResult> {
  const trials = params.trials ?? 1;
  const seed = params.seed ?? 42;

  recordTrace(
    {
      traceId: params.traceCtx.traceId,
      agentName: "Verifier",
      action: "final_verify",
      status: "success",
      inputSummary: `Attacks: ${params.attackSuite.length}, Tasks: ${params.regressionTasks.length}`,
      outputSummary: "Final verification started",
    },
    { logDir: params.traceCtx.logDir, canaryKey: params.traceCtx.canaryKey }
  );

  const attackResults: AttackResult[] = [];
  let totalHits = 0;
  let totalErrors = 0;

  for (const attack of params.attackSuite) {
    const verdicts: ReturnType<typeof judgeRun>[] = [];
    for (let trial = 1; trial <= trials; trial++) {
      const { verdict } = await executeAttackTrial({
        attack,
        config: params.configCurrent,
        policy: params.policy,
        trial,
        seed,
        traceCtx: params.traceCtx,
        onDegraded: params.onDegraded,
        generatorFn: params.generatorFn,
      });
      verdicts.push(verdict);
    }

    const hitTrial = verdicts.find((v) => v.verdict === "hit");
    const overallVerdict: "hit" | "blocked" | "error" = hitTrial
      ? "hit"
      : verdicts.every((v) => v.verdict === "error")
      ? "error"
      : "blocked";

    if (overallVerdict === "hit") {
      totalHits++;
    } else if (overallVerdict === "error") {
      totalErrors++;
    }

    const hitTypes = Array.from(new Set(verdicts.flatMap((v) => v.hits.map((h) => h.hit_type))));

    attackResults.push(
      AttackResultSchema.parse({
        attack_id: attack.attack_id,
        config_version: params.configCurrent.version,
        trials: verdicts,
        verdict: overallVerdict,
        hit_types: hitTypes,
      })
    );
  }

  // Regression suite execution
  const regressionResults: RegressionResult[] = [];
  let regressionPassedCount = 0;

  for (const task of params.regressionTasks) {
    const canary = generateCanary(params.policy.canary_prefix, seed, String(task.task_id));
    const run = await executeTarget({
      targetId: params.targetId,
      regressionTask: task,
      config: params.configCurrent,
      policy: params.policy,
      trial: 1,
      seed,
      canary,
      traceContext: params.traceCtx,
      generatorFn: params.generatorFn,
    });

    const evalRes = evaluateRegressionTask(task, run, params.policy, canary);
    if (evalRes.passed) {
      regressionPassedCount++;
    }

    regressionResults.push(
      RegressionResultSchema.parse({
        task_id: task.task_id,
        passed: evalRes.passed,
        config_version: params.configCurrent.version,
        failed_checks: evalRes.failed_checks,
      })
    );
  }

  const asr = params.attackSuite.length > 0 ? totalHits / params.attackSuite.length : 0.0;

  const suite = SuiteResultSchema.parse({
    config_version: params.configCurrent.version,
    attacks: attackResults,
    regression: regressionResults,
    asr: Number(asr.toFixed(3)),
    errors: totalErrors,
    regression_passed: regressionPassedCount,
    regression_total: params.regressionTasks.length,
  });

  recordTrace(
    {
      traceId: params.traceCtx.traceId,
      agentName: "Verifier",
      action: "final_verify",
      status: "success",
      inputSummary: `Final config v${params.configCurrent.version}`,
      outputSummary: `ASR: ${suite.asr} (${totalHits}/${params.attackSuite.length}), regression: ${regressionPassedCount}/${params.regressionTasks.length}`,
    },
    { logDir: params.traceCtx.logDir, canaryKey: params.traceCtx.canaryKey }
  );

  return suite;
}
