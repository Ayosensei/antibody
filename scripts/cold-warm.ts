#!/usr/bin/env tsx
/**
 * scripts/cold-warm.ts
 * Per TASKS_durot.md (Task T-D8), EVAL.md §10.1, and DATA_CONTRACTS.md §17.
 *
 * Runs Cold vs Warm memory comparison:
 * 1. Reset memory (POST /memory/reset with X-Confirm: reset)
 * 2. Run target A (support_triage, warm) to populate memory with verified fixes
 * 3. For 1 to 3 pairs:
 *    - Run target B (meeting_tasks, cold, seed S)
 *    - Run target B (meeting_tasks, warm, seed S)
 * 4. Extracts PairMetrics and validates against ColdWarmComparisonSchema
 * 5. Writes output to data/comparison/<timestamp>.json
 */

import fs from "node:fs";
import path from "node:path";
import { createApiClient } from "./api-client.js";
import {
  type ColdWarmComparison,
  ColdWarmComparisonSchema,
  type PairMetrics,
  type Report,
  type TargetId,
} from "../src/schemas.js";

function extractPairMetrics(report: Report): PairMetrics {
  // first_try_accepts: count of accepted fixes where attempt == 1 (EVAL.md §10)
  let firstTryAccepts = 0;
  for (const f of report.findings) {
    const acceptedVer = f.verifications.find((v) => v.verdict === "accept");
    if (acceptedVer) {
      const acceptedFix = f.fixes.find((fix) => fix.fix_id === acceptedVer.fix_id && fix.attempt === 1);
      if (acceptedFix) {
        firstTryAccepts++;
      }
    }
  }

  return {
    trace_id: report.trace_id,
    fix_attempts_total: report.metrics.fix_attempts_total,
    first_try_accepts: firstTryAccepts,
    fixes_rejected: report.metrics.fixes_rejected,
    llm_calls: report.metrics.llm_calls,
    wall_seconds: Number(report.metrics.wall_seconds.toFixed(2)),
    asr_after: Number(report.metrics.asr_after.toFixed(3)),
    unresolved: report.metrics.unresolved,
  };
}

async function runColdWarmComparison() {
  console.log("============================================================");
  console.log("Antibody Cold vs. Warm Memory Comparison (demo:cold-warm)");
  console.log("Per EVAL.md §10.1 & DATA_CONTRACTS.md §17");
  console.log("============================================================\n");

  const sourceTarget: TargetId = "support_triage";
  const target: TargetId = "meeting_tasks";
  const seed = 42;
  const numPairs = parseInt(process.env.PAIRS || "1", 10);
  const clampedPairs = Math.min(Math.max(numPairs, 1), 3);

  const client = await createApiClient();
  console.log(`Connected to Antibody API at: ${client.baseUrl} (isEphemeral: ${client.isEphemeral})\n`);

  try {
    // 1. Reset memory
    console.log("[Step 1] Resetting memory store via POST /memory/reset...");
    const resetRes = await client.resetMemory();
    console.log(`  => Memory reset: ${resetRes.message}\n`);

    // 2. Run target A (support_triage, warm) to seed memory
    console.log(`[Step 2] Training memory: Running source target ${sourceTarget} (memory_mode: warm, seed: ${seed})...`);
    const seedReport = await client.run({
      target: sourceTarget,
      memory_mode: "warm",
      seed,
      trials: 1,
      attack_budget: 6,
      wait: true,
    });
    console.log(`  => Source run completed: trace_id=${seedReport.trace_id}, fixes_accepted=${seedReport.metrics.fixes_accepted}`);
    console.log(`  => Fixes recorded to H-MEM store.\n`);

    // 3. Repeat pairs of (cold vs warm) on target B
    const pairs: Array<{ cold: PairMetrics; warm: PairMetrics }> = [];

    for (let i = 1; i <= clampedPairs; i++) {
      const pairSeed = seed + (i - 1);
      console.log(`[Step 3.${i}] Running Pair ${i}/${clampedPairs} on target ${target} (seed: ${pairSeed}):`);

      // Run B cold
      console.log(`  -> Running ${target} in COLD mode...`);
      const coldReport = await client.run({
        target,
        memory_mode: "cold",
        seed: pairSeed,
        trials: 1,
        attack_budget: 6,
        wait: true,
      });
      const coldMetrics = extractPairMetrics(coldReport);
      console.log(
        `     Cold done: trace=${coldMetrics.trace_id}, attempts=${coldMetrics.fix_attempts_total}, accepted_1st=${coldMetrics.first_try_accepts}, wall_sec=${coldMetrics.wall_seconds}`
      );

      // Run B warm
      console.log(`  -> Running ${target} in WARM mode...`);
      const warmReport = await client.run({
        target,
        memory_mode: "warm",
        seed: pairSeed,
        trials: 1,
        attack_budget: 6,
        wait: true,
      });
      const warmMetrics = extractPairMetrics(warmReport);
      console.log(
        `     Warm done: trace=${warmMetrics.trace_id}, attempts=${warmMetrics.fix_attempts_total}, accepted_1st=${warmMetrics.first_try_accepts}, wall_sec=${warmMetrics.wall_seconds}`
      );

      pairs.push({
        cold: coldMetrics,
        warm: warmMetrics,
      });
      console.log("");
    }

    // 4. Validate output schema
    const comparison: ColdWarmComparison = {
      created_at: new Date().toISOString(),
      source_target_id: sourceTarget,
      target_id: target,
      seed,
      pairs,
    };

    const validated = ColdWarmComparisonSchema.parse(comparison);

    // 5. Save to data/comparison/<YYYYMMDDTHHMMSSZ>.json per DATA_CONTRACTS.md §17
    const compDir = path.resolve(process.cwd(), "data/comparison");
    if (!fs.existsSync(compDir)) {
      fs.mkdirSync(compDir, { recursive: true });
    }

    const safeTimestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\.\d+Z$/, "Z");
    const outPath = path.join(compDir, `${safeTimestamp}.json`);
    fs.writeFileSync(outPath, JSON.stringify(validated, null, 2) + "\n", "utf-8");
    console.log(`Comparison file written and validated: ${outPath}\n`);

    // 6. Format console output comparison table
    console.log("=========================================================================================");
    console.log(`COLD vs WARM COMPARISON REPORT (Source: ${sourceTarget} -> Target: ${target})`);
    console.log("=========================================================================================");
    console.log(
      `| ${"Pair".padEnd(5)} | ${"Mode".padEnd(6)} | ${"Attempts".padEnd(8)} | ${"1st Accepts".padEnd(11)} | ${"Rejected".padEnd(8)} | ${"LLM Calls".padEnd(9)} | ${"Wall Sec".padEnd(8)} | ${"ASR After".padEnd(9)} |`
    );
    console.log("-----------------------------------------------------------------------------------------");

    for (let i = 0; i < validated.pairs.length; i++) {
      const p = validated.pairs[i];
      console.log(
        `| ${(i + 1).toString().padEnd(5)} | ${"COLD".padEnd(6)} | ${String(p.cold.fix_attempts_total).padEnd(8)} | ${String(p.cold.first_try_accepts).padEnd(11)} | ${String(p.cold.fixes_rejected).padEnd(8)} | ${String(p.cold.llm_calls).padEnd(9)} | ${String(p.cold.wall_seconds).padEnd(8)} | ${String(p.cold.asr_after).padEnd(9)} |`
      );
      console.log(
        `| ${(i + 1).toString().padEnd(5)} | ${"WARM".padEnd(6)} | ${String(p.warm.fix_attempts_total).padEnd(8)} | ${String(p.warm.first_try_accepts).padEnd(11)} | ${String(p.warm.fixes_rejected).padEnd(8)} | ${String(p.warm.llm_calls).padEnd(9)} | ${String(p.warm.wall_seconds).padEnd(8)} | ${String(p.warm.asr_after).padEnd(9)} |`
      );

      const dAttempts = p.warm.fix_attempts_total - p.cold.fix_attempts_total;
      const dFirstAccepts = p.warm.first_try_accepts - p.cold.first_try_accepts;
      const dLlmCalls = p.warm.llm_calls - p.cold.llm_calls;
      const dWallSec = Number((p.warm.wall_seconds - p.cold.wall_seconds).toFixed(2));

      console.log(
        `| ${"Delta".padEnd(5)} | ${"+/-".padEnd(6)} | ${String(dAttempts).padEnd(8)} | ${String(dFirstAccepts).padEnd(11)} | ${String(p.warm.fixes_rejected - p.cold.fixes_rejected).padEnd(8)} | ${String(dLlmCalls).padEnd(9)} | ${String(dWallSec).padEnd(8)} | ${String(Number((p.warm.asr_after - p.cold.asr_after).toFixed(3))).padEnd(9)} |`
      );
      console.log("-----------------------------------------------------------------------------------------");
    }

    console.log("\nStatus: SUCCESS - Cold vs Warm comparison complete.\n");
  } finally {
    await client.close();
  }
}

runColdWarmComparison().catch((err) => {
  console.error("Fatal error during cold-warm comparison:", err);
  process.exit(1);
});
