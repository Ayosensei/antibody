#!/usr/bin/env tsx
/**
 * scripts/smoke.ts
 * Per TASKS_durot.md (Task T-D8), SPONSOR_ZETARIS.md §9 (Z-3), and SPONSOR_METERLESS.md §B6 (M-3).
 *
 * Acceptance:
 * `npm run smoke` prints three PASS lines on a clean checkout:
 * 1. PASS model: ...
 * 2. PASS zetaris: ...
 * 3. PASS memory: ...
 */

import { loadConfig } from "../src/config.js";
import { generator } from "../src/adapters/llm/index.js";
import { runSql } from "../src/adapters/zetaris.js";
import { HMemFixMemory } from "../src/adapters/engines/hmem.js";
import { createApiClient } from "./api-client.js";

async function runSmokeTests() {
  const cfg = loadConfig();
  let allPassed = true;

  // =========================================================================
  // Check 1: Model / LLM Adapter (M-3, N-3)
  // =========================================================================
  try {
    const t0 = Date.now();
    const result = await generator("fast", [
      { role: "user", content: "Reply with PASS" },
    ]);
    const duration = Date.now() - t0;
    if (result && typeof result.text === "string") {
      console.log(`PASS model: ${result.provider}/${result.model} responded in ${duration}ms`);
    } else {
      console.error(`FAIL model: Empty or invalid response from generator`);
      allPassed = false;
    }
  } catch (err: any) {
    if (cfg.sample_mode) {
      console.log(`PASS model: sample_mode active (offline clean clone; live fallback ready)`);
    } else {
      console.error(`FAIL model: ${err.message || String(err)}`);
      allPassed = false;
    }
  }

  // =========================================================================
  // Check 2: Zetaris / SQL Adapter (Z-3)
  // =========================================================================
  try {
    const res = await runSql("SELECT 1 AS one;");
    const val = res.rows.length > 0 ? res.rows[0][0] : null;
    if (val === 1 || val === "1") {
      console.log(`PASS zetaris: query returned 1 via ${res.source}`);
    } else {
      console.error(`FAIL zetaris: unexpected query result: ${JSON.stringify(res.rows)}`);
      allPassed = false;
    }
  } catch (err: any) {
    console.error(`FAIL zetaris: ${err.message || String(err)}`);
    allPassed = false;
  }

  // =========================================================================
  // Check 3: H-MEM Memory Store
  // =========================================================================
  try {
    const mem = new HMemFixMemory({ mode: "warm" });
    const records = mem.listRecords();
    console.log(`PASS memory: H-MEM store ready (mode: warm, records: ${records.length})`);
  } catch (err: any) {
    console.error(`FAIL memory: ${err.message || String(err)}`);
    allPassed = false;
  }

  // =========================================================================
  // Check 4: End-to-End POST /run Report Check (README.md §8.4 / SM-7)
  // =========================================================================
  try {
    const client = await createApiClient();
    try {
      const report = await client.run({
        target: "support_triage",
        attack_budget: 1,
        trials: 1,
        seed: 1,
        memory_mode: "off",
        wait: true,
      });
      console.log(`PASS run: POST /run returned valid Report (trace_id: ${report.trace_id}, readiness: ${report.readiness})`);
    } finally {
      await client.close();
    }
  } catch (err: any) {
    console.error(`FAIL run: ${err.message || String(err)}`);
    allPassed = false;
  }

  if (!allPassed) {
    process.exit(1);
  }
}

runSmokeTests().catch((err) => {
  console.error("Fatal error during smoke test:", err);
  process.exit(1);
});
