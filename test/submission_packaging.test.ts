import { describe, expect, it } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { ReportSchema, RunRequestSchema, ColdWarmComparisonSchema } from "../src/schemas.js";

describe("Task T-D11: Evidence and Submission Packaging", () => {
  it("submission/evidence directory contains all required text outputs and metrics", () => {
    const evidenceDir = path.resolve(process.cwd(), "submission/evidence");
    expect(fs.existsSync(evidenceDir)).toBe(true);

    // 1. Conformance H-MEM output
    const confPath = path.join(evidenceDir, "conformance_hmem.txt");
    expect(fs.existsSync(confPath)).toBe(true);
    const confContent = fs.readFileSync(confPath, "utf-8");
    expect(confContent).toContain("13/13 checks passed");

    // 2. Memory feature test output
    const memPath = path.join(evidenceDir, "memory_feature_test.txt");
    expect(fs.existsSync(memPath)).toBe(true);
    const memContent = fs.readFileSync(memPath, "utf-8");
    expect(memContent).toContain("14 passed");

    // 3. Calibration metrics
    const calPath = path.join(evidenceDir, "calibration.json");
    expect(fs.existsSync(calPath)).toBe(true);
    const calData = JSON.parse(fs.readFileSync(calPath, "utf-8"));
    expect(calData).toHaveProperty("summaries");
    expect(calData.summaries.support_triage.percent_hitting_at_least_once).toBeGreaterThanOrEqual(50);
    expect(calData.summaries.meeting_tasks.percent_hitting_at_least_once).toBeGreaterThanOrEqual(50);

    // 4. Cold-Warm comparison
    const compPath = path.join(evidenceDir, "comparison_20261024T184732Z.json");
    expect(fs.existsSync(compPath)).toBe(true);
    const compData = JSON.parse(fs.readFileSync(compPath, "utf-8"));
    const compValidation = ColdWarmComparisonSchema.safeParse(compData);
    expect(compValidation.success).toBe(true);

    // 5. Evidence README
    const readmePath = path.join(evidenceDir, "README.md");
    expect(fs.existsSync(readmePath)).toBe(true);
  });

  it("submission/metadata.json conforms to hackathon requirements and declares sponsor tech", () => {
    const metaPath = path.resolve(process.cwd(), "submission/metadata.json");
    expect(fs.existsSync(metaPath)).toBe(true);
    const meta = JSON.parse(fs.readFileSync(metaPath, "utf-8"));

    expect(meta.project_name).toBe("Antibody");
    expect(meta.track).toContain("Track 2");
    expect(meta.team.members.length).toBe(2);
    expect(meta.repository.url).toContain("Ayosensei/antibody");

    // Check all sponsor technologies declared
    const sponsors = meta.sponsor_technologies;
    expect(sponsors).toHaveProperty("zetaris");
    expect(sponsors.zetaris.registered_sources).toEqual(
      expect.arrayContaining(["attacks", "policies", "traces", "fixes"])
    );
    expect(sponsors).toHaveProperty("meterless_engines");
    expect(sponsors.meterless_engines.engine).toBe("H-MEM");
    expect(sponsors).toHaveProperty("meterless_nightshift");
    expect(sponsors).toHaveProperty("nvidia_nemotron");
    expect(sponsors).toHaveProperty("cursor");
  });

  it("input_examples and output_examples contain at least 3 valid matching pairs across both targets", () => {
    const inDir = path.resolve(process.cwd(), "input_examples");
    const outDir = path.resolve(process.cwd(), "output_examples");

    const inFiles = fs.readdirSync(inDir).filter((f) => f.endsWith(".json"));
    const outFiles = fs.readdirSync(outDir).filter((f) => f.endsWith(".json"));

    expect(inFiles.length).toBeGreaterThanOrEqual(3);
    expect(outFiles.length).toBeGreaterThanOrEqual(3);

    const targetsRepresented = new Set<string>();

    for (const inFile of inFiles) {
      expect(outFiles).toContain(inFile);

      const inJson = JSON.parse(fs.readFileSync(path.join(inDir, inFile), "utf-8"));
      const outJson = JSON.parse(fs.readFileSync(path.join(outDir, inFile), "utf-8"));

      // Validate against Zod schemas
      const inCheck = RunRequestSchema.safeParse(inJson);
      expect(inCheck.success).toBe(true);

      const outCheck = ReportSchema.safeParse(outJson);
      expect(outCheck.success).toBe(true);

      // Verify matching target
      expect(inJson.target).toBe(outJson.target_id);
      targetsRepresented.add(inJson.target);
    }

    // Both targets must be represented
    expect(targetsRepresented.has("support_triage")).toBe(true);
    expect(targetsRepresented.has("meeting_tasks")).toBe(true);
  });

  it("AGENTS.md Hard Rule 4: production code in src/ NEVER imports output_examples or input_examples", () => {
    const srcDir = path.resolve(process.cwd(), "src");
    const checkDir = (dir: string) => {
      const entries = fs.readdirSync(dir, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(dir, entry.name);
        if (entry.isDirectory()) {
          checkDir(fullPath);
        } else if (entry.isFile() && (entry.name.endsWith(".ts") || entry.name.endsWith(".tsx"))) {
          const content = fs.readFileSync(fullPath, "utf-8");
          expect(content).not.toMatch(/from\s+['"].*output_examples/);
          expect(content).not.toMatch(/from\s+['"].*input_examples/);
          expect(content).not.toMatch(/require\(['"].*output_examples/);
          expect(content).not.toMatch(/require\(['"].*input_examples/);
        }
      }
    };
    checkDir(srcDir);
  });
});
