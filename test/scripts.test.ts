import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ColdWarmComparisonSchema } from "../src/schemas.js";

describe("Task T-D8: Eval & Demo Scripts", () => {
  it("scripts/smoke.ts exists and runs executable logic", () => {
    const smokePath = path.resolve(process.cwd(), "scripts/smoke.ts");
    expect(fs.existsSync(smokePath)).toBe(true);
    const content = fs.readFileSync(smokePath, "utf-8");
    expect(content).toContain("PASS model:");
    expect(content).toContain("PASS zetaris:");
    expect(content).toContain("PASS memory:");
    expect(content).toContain("PASS run:");
  });

  it("scripts/seed-eval.ts exists and checks judge & explanation fixtures", () => {
    const seedEvalPath = path.resolve(process.cwd(), "scripts/seed-eval.ts");
    expect(fs.existsSync(seedEvalPath)).toBe(true);
    const content = fs.readFileSync(seedEvalPath, "utf-8");
    expect(content).toContain("judge_fixtures.json");
    expect(content).toContain("explanation_fixtures.json");
    expect(content).toContain("judgeRun");
    expect(content).toContain("validateExplanation");
  });

  it("scripts/calibrate.ts exists and writes valid data/sample/calibration.json", () => {
    const calibPath = path.resolve(process.cwd(), "data/sample/calibration.json");
    expect(fs.existsSync(calibPath)).toBe(true);
    const raw = JSON.parse(fs.readFileSync(calibPath, "utf-8"));

    expect(raw.generated_at).toBeDefined();
    expect(raw.trials_per_seed).toBe(3);
    expect(Array.isArray(raw.seeds)).toBe(true);
    expect(raw.seeds.length).toBe(14); // 8 support + 6 meeting
    expect(raw.overall.acceptance_passed).toBe(true);

    // Verify support_triage and meeting_tasks >= 50%
    expect(raw.summaries.support_triage.percent_hitting_at_least_once).toBeGreaterThanOrEqual(50);
    expect(raw.summaries.meeting_tasks.percent_hitting_at_least_once).toBeGreaterThanOrEqual(50);
  });

  it("scripts/cold-warm.ts exists and produces valid ColdWarmComparison files", () => {
    const compDir = path.resolve(process.cwd(), "data/comparison");
    expect(fs.existsSync(compDir)).toBe(true);

    const files = fs.readdirSync(compDir).filter((f) => f.endsWith(".json"));
    expect(files.length).toBeGreaterThanOrEqual(1);

    const latest = files.sort().pop()!;
    const content = JSON.parse(fs.readFileSync(path.join(compDir, latest), "utf-8"));
    const validated = ColdWarmComparisonSchema.parse(content);

    expect(validated.source_target_id).toBe("support_triage");
    expect(validated.target_id).toBe("meeting_tasks");
    expect(validated.pairs.length).toBeGreaterThanOrEqual(1);
    expect(validated.pairs.length).toBeLessThanOrEqual(3);

    const pair = validated.pairs[0];
    expect(pair.cold.trace_id).toBeDefined();
    expect(pair.warm.trace_id).toBeDefined();
    expect(typeof pair.cold.wall_seconds).toBe("number");
    expect(typeof pair.warm.wall_seconds).toBe("number");
  });
});
