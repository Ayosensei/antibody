import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  AttackSchema,
  PolicySchema,
  RegressionTaskSchema,
  TargetRunSchema,
} from "../src/schemas";

const sampleDir = path.resolve(__dirname, "../data/sample");

function readSampleJson(filename: string) {
  const filePath = path.join(sampleDir, filename);
  expect(fs.existsSync(filePath), `Expected file ${filename} to exist`).toBe(true);
  const raw = fs.readFileSync(filePath, "utf-8");
  return JSON.parse(raw);
}

function extractAllStrings(obj: unknown): string[] {
  const strings: string[] = [];
  function recurse(val: unknown) {
    if (typeof val === "string") {
      strings.push(val);
    } else if (Array.isArray(val)) {
      for (const item of val) recurse(item);
    } else if (val && typeof val === "object") {
      for (const v of Object.values(val)) recurse(v);
    }
  }
  recurse(obj);
  return strings;
}

describe("T-D3 Data Files Verification", () => {
  it("validates data/sample/attacks.json schema and rules", () => {
    const attacks = readSampleJson("attacks.json");
    expect(Array.isArray(attacks)).toBe(true);
    expect(attacks.length).toBe(14);

    const ids = new Set<string>();
    let supportCount = 0;
    let meetingCount = 0;

    for (let i = 0; i < attacks.length; i++) {
      const atk = attacks[i];
      expect(() => AttackSchema.parse(atk)).not.toThrow();
      expect(ids.has(atk.attack_id)).toBe(false);
      ids.add(atk.attack_id);

      expect(atk.priority).toBe((i + 1) * 10);
      expect(atk.source).toBe("seed");
      expect(atk.round).toBe(1);
      expect(atk.parent_attack_id).toBeNull();
      expect(atk.placement).toBe("append");

      if (atk.target_scope.includes("support_triage")) {
        supportCount++;
        expect(atk.carrier).toBe("email_body");
      }
      if (atk.target_scope.includes("meeting_tasks")) {
        meetingCount++;
        expect(atk.carrier).toBe("transcript_line");
      }
    }

    expect(supportCount).toBe(8);
    expect(meetingCount).toBe(6);
  });

  it("validates data/sample/policies.json schema and structure", () => {
    const policies = readSampleJson("policies.json");
    expect(Array.isArray(policies)).toBe(true);
    expect(policies.length).toBe(2);

    for (const policy of policies) {
      expect(() => PolicySchema.parse(policy)).not.toThrow();
    }

    const targetIds = policies.map((p: { target_id: string }) => p.target_id);
    expect(targetIds).toContain("support_triage");
    expect(targetIds).toContain("meeting_tasks");
  });

  it("validates data/sample/regression_support_triage.json (10 tasks)", () => {
    const tasks = readSampleJson("regression_support_triage.json");
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(10);

    const ids = new Set<string>();
    for (let i = 1; i <= 10; i++) {
      const expectedId = `rg_s_${String(i).padStart(2, "0")}`;
      const task = tasks.find((t: { task_id: string }) => t.task_id === expectedId);
      expect(task, `Task ${expectedId} must exist`).toBeDefined();
      expect(ids.has(task.task_id)).toBe(false);
      ids.add(task.task_id);

      expect(() => RegressionTaskSchema.parse(task)).not.toThrow();
      expect(task.target_id).toBe("support_triage");
      expect(task.carrier).toBe("email_body");
      expect(Array.isArray(task.forbidden_tools)).toBe(true);
      expect(Array.isArray(task.expected_calls)).toBe(true);
    }
    expect(ids.size).toBe(10);
  });

  it("validates data/sample/regression_meeting_tasks.json (10 tasks)", () => {
    const tasks = readSampleJson("regression_meeting_tasks.json");
    expect(Array.isArray(tasks)).toBe(true);
    expect(tasks.length).toBe(10);

    const ids = new Set<string>();
    for (let i = 1; i <= 10; i++) {
      const expectedId = `rg_m_${String(i).padStart(2, "0")}`;
      const task = tasks.find((t: { task_id: string }) => t.task_id === expectedId);
      expect(task, `Task ${expectedId} must exist`).toBeDefined();
      expect(ids.has(task.task_id)).toBe(false);
      ids.add(task.task_id);

      expect(() => RegressionTaskSchema.parse(task)).not.toThrow();
      expect(task.target_id).toBe("meeting_tasks");
      expect(task.carrier).toBe("transcript_line");
      expect(Array.isArray(task.forbidden_tools)).toBe(true);
      expect(Array.isArray(task.expected_calls)).toBe(true);
    }
    expect(ids.size).toBe(10);
  });

  it("validates data/sample/judge_fixtures.json (J-01..J-20 and R-01..R-04)", () => {
    const data = readSampleJson("judge_fixtures.json");
    expect(data).toHaveProperty("judge_fixtures");
    expect(data).toHaveProperty("regression_fixtures");

    const judgeFixtures = data.judge_fixtures;
    const regressionFixtures = data.regression_fixtures;

    expect(Array.isArray(judgeFixtures)).toBe(true);
    expect(judgeFixtures.length).toBe(20);
    expect(Array.isArray(regressionFixtures)).toBe(true);
    expect(regressionFixtures.length).toBe(4);

    const fixtureIds = new Set<string>();

    for (let i = 1; i <= 20; i++) {
      const expectedId = `J-${String(i).padStart(2, "0")}`;
      const fixture = judgeFixtures.find((f: { id: string }) => f.id === expectedId);
      expect(fixture, `Judge fixture ${expectedId} must exist`).toBeDefined();
      expect(fixtureIds.has(fixture.id)).toBe(false);
      fixtureIds.add(fixture.id);

      expect(() => TargetRunSchema.parse(fixture.run)).not.toThrow();
      expect(["hit", "blocked", "error"]).toContain(fixture.expected.verdict);
      expect(Array.isArray(fixture.expected.hit_types)).toBe(true);
    }

    for (let i = 1; i <= 4; i++) {
      const expectedId = `R-${String(i).padStart(2, "0")}`;
      const fixture = regressionFixtures.find((f: { id: string }) => f.id === expectedId);
      expect(fixture, `Regression fixture ${expectedId} must exist`).toBeDefined();
      expect(fixtureIds.has(fixture.id)).toBe(false);
      fixtureIds.add(fixture.id);

      expect(() => TargetRunSchema.parse(fixture.run)).not.toThrow();
      expect(typeof fixture.expected.passed).toBe("boolean");
      expect(Array.isArray(fixture.expected.failed_checks)).toBe(true);
    }

    expect(fixtureIds.size).toBe(24);
  });

  it("enforces safety rules: no URLs and emails strictly end with @example.test", () => {
    const filenames = [
      "attacks.json",
      "policies.json",
      "regression_support_triage.json",
      "regression_meeting_tasks.json",
      "judge_fixtures.json",
    ];

    const emailRegex = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g;
    const urlRegex = /https?:\/\//i;

    for (const filename of filenames) {
      const content = readSampleJson(filename);
      const strings = extractAllStrings(content);

      for (const str of strings) {
        expect(
          urlRegex.test(str),
          `Found banned URL in ${filename}: "${str}"`
        ).toBe(false);

        const emails = str.match(emailRegex);
        if (emails) {
          for (const email of emails) {
            expect(
              email.endsWith("@example.test"),
              `Found non-example.test email in ${filename}: "${email}"`
            ).toBe(true);
          }
        }
      }
    }
  });
});
