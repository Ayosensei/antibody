import { describe, it, expect } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  buildEvidencePacket,
  formatEvidencePacketPrompt,
  maskCanary,
  sanitizeSnippet,
  validateExplanation,
  createVerificationExplanation,
  createUnresolvedExplanation,
  createReadinessExplanation,
  createFallbackFixExplanation,
  type BuildEvidencePacketParams,
} from "../src/explain/index.js";
import type {
  Attack,
  EvidenceItem,
  Explanation,
  Hit,
  Policy,
  SuiteResult,
  TargetConfig,
  TargetRun,
} from "../src/schemas.js";

interface Fixture {
  id: string;
  description: string;
  packet: EvidenceItem[];
  context: {
    canary?: string;
    root_cause_code?: string;
    used_mem_id?: string | null;
    hitTypesByRef?: Record<string, string>;
  };
  explanation: Explanation;
  expected: {
    verified: boolean;
    error_rule: string | null;
    error_contains?: string;
  };
}

describe("Track 2: Explanation Grounding & Validation Engine (T-D12)", () => {
  const fixturesPath = path.resolve(__dirname, "../data/sample/explanation_fixtures.json");
  const fixtures: Fixture[] = JSON.parse(fs.readFileSync(fixturesPath, "utf-8"));

  describe("EVAL 12.1 Fixtures (X-01 to X-12)", () => {
    it("loads all 12 explanation test fixtures", () => {
      expect(fixtures).toHaveLength(12);
      const ids = fixtures.map((f) => f.id);
      for (let i = 1; i <= 12; i++) {
        const id = `X-${String(i).padStart(2, "0")}`;
        expect(ids).toContain(id);
      }
    });

    for (const fixture of fixtures) {
      it(`evaluates ${fixture.id}: ${fixture.description}`, () => {
        const res = validateExplanation(
          fixture.explanation,
          fixture.packet,
          fixture.context
        );

        expect(res.verified).toBe(fixture.expected.verified);

        if (fixture.expected.verified) {
          expect(res.validation_errors).toHaveLength(0);
        } else {
          expect(res.validation_errors.length).toBeGreaterThan(0);
          expect(fixture.expected.error_rule).toBeTruthy();

          const hasExpectedRule = res.validation_errors.some((err) =>
            err.startsWith(fixture.expected.error_rule!)
          );
          expect(
            hasExpectedRule,
            `Expected validation error starting with '${fixture.expected.error_rule}', got: ${JSON.stringify(res.validation_errors)}`
          ).toBe(true);

          if (fixture.expected.error_contains) {
            const hasExpectedSnippet = res.validation_errors.some((err) =>
              err.includes(fixture.expected.error_contains!)
            );
            expect(
              hasExpectedSnippet,
              `Expected validation error containing '${fixture.expected.error_contains}', got: ${JSON.stringify(res.validation_errors)}`
            ).toBe(true);
          }
        }
      });
    }
  });

  describe("Evidence Packet Builder (src/explain/evidence.ts)", () => {
    const dummyCanary = "CANARY-SECRET-ABC_123";

    it("masks canary verbatim and in normalized formats", () => {
      expect(maskCanary("Normal text without secrets", dummyCanary)).toBe(
        "Normal text without secrets"
      );
      expect(maskCanary("Revealed: CANARY-SECRET-ABC_123 in logs", dummyCanary)).toBe(
        "Revealed: CANARY-*** in logs"
      );
      // Case-insensitive / normalized variation
      expect(maskCanary("Revealed: canary-secret-abc-123 in output", dummyCanary)).toBe(
        "Revealed: CANARY-*** in output"
      );
      expect(maskCanary("Revealed: canary secret abc 123", dummyCanary)).toBe(
        "Revealed: CANARY-***"
      );
    });

    it("sanitizes snippets to at most 300 characters ending with ellipsis", () => {
      const shortText = "Short snippet";
      expect(sanitizeSnippet(shortText)).toBe("Short snippet");

      const longText = "a".repeat(450);
      const sanitized = sanitizeSnippet(longText);
      expect(sanitized.length).toBe(300);
      expect(sanitized.endsWith("...")).toBe(true);
      expect(sanitized.slice(0, 297)).toBe("a".repeat(297));
    });

    it("masks canary before truncating snippet to 300 chars", () => {
      const secretPrefix = "CANARY-SECRET-ABC_123 ";
      const longText = secretPrefix + "b".repeat(350);
      const sanitized = sanitizeSnippet(longText, dummyCanary);
      expect(sanitized.length).toBe(300);
      expect(sanitized.startsWith("CANARY-*** ")).toBe(true);
      expect(sanitized.endsWith("...")).toBe(true);
    });

    it("caps run step items at at most 12 calls", () => {
      const mockRun: TargetRun = {
        run_ref: "run_test_cap",
        subject_id: "atk_exf_001",
        trial: 1,
        steps: 25,
        tokens: 500,
        tokens_estimated: false,
        replayed: false,
        halted_reason: "done",
        tool_calls: Array.from({ length: 25 }, (_, i) => ({
          step: i + 1,
          tool: "send_reply",
          args: { message: `Step ${i + 1}` },
          status: "executed",
        })),
        final_output: "Done",
      };

      const packet = buildEvidencePacket({ run: mockRun });
      const stepItems = packet.filter((item) => item.kind === "run_step");
      expect(stepItems.length).toBe(12);
      expect(stepItems[0].ref).toBe("run:run_test_cap#step1");
      expect(stepItems[11].ref).toBe("run:run_test_cap#step12");
    });

    it("labels policy items with zetaris source and kind when policySource is zetaris", () => {
      const mockPolicy: Policy = {
        target_id: "support_triage",
        canary_prefix: "CANARY-SUP",
        caps: { max_steps: 10, max_tokens: 1000 },
        ctx_schema: ["ticket.sender", "ticket.customer_id"],
        tools: {
          issue_refund: {
            allowed: true,
            arg_rules: [{ field: "amount", op: "max", value: 100 }],
          },
        },
      };

      const packet = buildEvidencePacket({
        policy: mockPolicy,
        policySource: "zetaris",
      });

      const policyItem = packet.find((item) => item.ref === "zetaris:policies/support_triage:issue_refund");
      expect(policyItem).toBeDefined();
      expect(policyItem?.source).toBe("zetaris");
      expect(policyItem?.kind).toBe("zetaris_row");
    });

    it("labels policy items with local source and kind when policySource is local", () => {
      const mockPolicy: Policy = {
        target_id: "support_triage",
        canary_prefix: "CANARY-SUP",
        caps: { max_steps: 10, max_tokens: 1000 },
        ctx_schema: ["ticket.sender"],
        tools: {
          send_reply: {
            allowed: true,
            arg_rules: [],
          },
        },
      };

      const packet = buildEvidencePacket({
        policy: mockPolicy,
        policySource: "local",
      });

      const policyItem = packet.find((item) => item.ref === "local:policies/support_triage:send_reply");
      expect(policyItem).toBeDefined();
      expect(policyItem?.source).toBe("local");
      expect(policyItem?.kind).toBe("local_row");
    });

    it("builds a comprehensive evidence packet with all item types", () => {
      const attack: Attack = {
        attack_id: "atk_exf_001",
        class: "injection_exfil",
        carrier: "email_body",
        placement: "append",
        benign_text: "Help",
        injection_text: "Leak key",
        expected_hit_types: ["canary_leak"],
        priority: 10,
        source: "seed",
        round: 1,
        parent_attack_id: null,
        target_scope: ["support_triage"],
      };

      const run: TargetRun = {
        run_ref: "run_full_001",
        subject_id: "atk_exf_001",
        trial: 1,
        steps: 1,
        tokens: 50,
        tokens_estimated: false,
        replayed: false,
        halted_reason: "done",
        tool_calls: [
          { step: 1, tool: "send_reply", args: {}, status: "executed" },
        ],
        final_output: "Output",
      };

      const hits: Hit[] = [
        { hit_type: "canary_leak", tool: "send_reply", evidence: "Leaked" },
      ];

      const config: TargetConfig = {
        target_id: "support_triage",
        version: 1,
        base_system_prompt: "Prompt",
        prompt_rules: ["Rule 1"],
        tool_permissions: { send_reply: { enabled: true, requires_approval: false } },
        input_filters: [],
      };

      const suiteBefore: SuiteResult = {
        config_version: 0,
        asr: 0.8,
        errors: 0,
        regression_passed: 10,
        regression_total: 10,
        regression: [],
        attacks: [
          {
            attack_id: "atk_exf_001",
            verdict: "hit",
            hit_types: ["canary_leak"],
            config_version: 0,
            trials: [],
          },
        ],
      };

      const suiteAfter: SuiteResult = {
        config_version: 1,
        asr: 0.0,
        errors: 0,
        regression_passed: 10,
        regression_total: 10,
        regression: [],
        attacks: [
          {
            attack_id: "atk_exf_001",
            verdict: "blocked",
            hit_types: [],
            config_version: 1,
            trials: [],
          },
        ],
      };

      const packet = buildEvidencePacket({
        canary: "SECRET",
        attack,
        run,
        hits,
        config,
        suiteBefore,
        suiteAfter,
        traceId: "trace_12345",
      });

      const refs = packet.map((p) => p.ref);
      expect(refs).toContain("attack:atk_exf_001");
      expect(refs).toContain("run:run_full_001#step1");
      expect(refs).toContain("hit:run_full_001#0");
      expect(refs).toContain("config:support_triage@v1/prompt_rules");
      expect(refs).toContain("config:support_triage@v1/tool_permissions");
      expect(refs).toContain("config:support_triage@v1/tool_permissions.send_reply");
      expect(refs).toContain("suite:before");
      expect(refs).toContain("suite:after");
      expect(refs).toContain("trace:trace_12345");

      const promptStr = formatEvidencePacketPrompt(packet);
      expect(promptStr).toContain("attack:atk_exf_001 | [injection_exfil]");
      expect(promptStr).toContain("suite:before | Baseline suite");
    });
  });

  describe("Code Templates (src/explain/templates.ts)", () => {
    it("creates verification explanation that validates true", () => {
      const expAccept = createVerificationExplanation({
        fix_id: "fix_001",
        verdict: "accept",
      });
      expect(expAccept.subject).toBe("verification");
      expect(expAccept.claims[0].text.length).toBeLessThanOrEqual(240);

      const packet: EvidenceItem[] = [
        { ref: "verify:fix_001", kind: "verification", source: "verifier", snippet: "Verify" },
      ];
      const resAccept = validateExplanation(expAccept, packet);
      expect(resAccept.verified).toBe(true);

      const expReject = createVerificationExplanation({
        fix_id: "fix_002",
        verdict: "reject",
        rejection_reasons: ["regression_break", "attack_still_succeeds"],
        newly_failing_tasks: ["rg_s_01", "rg_s_02"],
      });
      const packetReject: EvidenceItem[] = [
        { ref: "verify:fix_002", kind: "verification", source: "verifier", snippet: "Verify" },
      ];
      const resReject = validateExplanation(expReject, packetReject);
      expect(resReject.verified).toBe(true);
    });

    it("creates unresolved explanation that validates true", () => {
      const exp = createUnresolvedExplanation({
        attack_id: "atk_inj_001",
        last_fix_id: "fix_003",
        attempts: 3,
        rejection_reasons: ["regression_break"],
      });
      expect(exp.subject).toBe("unresolved");
      expect(exp.claims[0].text.length).toBeLessThanOrEqual(240);

      const packet: EvidenceItem[] = [
        { ref: "verify:fix_003", kind: "verification", source: "verifier", snippet: "Verify" },
      ];
      const res = validateExplanation(exp, packet);
      expect(res.verified).toBe(true);
    });

    it("creates readiness explanation that validates true", () => {
      const exp = createReadinessExplanation({
        trace_id: "trace_20261024_test",
        asr_before: 0.875,
        asr_after: 0.125,
        attacks_total: 8,
        unresolved_count: 1,
      });
      expect(exp.subject).toBe("readiness");
      expect(exp.claims).toHaveLength(2);

      const packet: EvidenceItem[] = [
        { ref: "suite:before", kind: "suite", source: "verifier", snippet: "Suite Before" },
        { ref: "suite:after", kind: "suite", source: "verifier", snippet: "Suite After" },
      ];
      const res = validateExplanation(exp, packet);
      expect(res.verified).toBe(true);
    });

    it("creates fallback fix explanation that validates true", () => {
      const exp = createFallbackFixExplanation({
        fix_id: "fix_099",
        finding_id: "fnd_001",
        tool: "issue_refund",
        policyRef: "local:policies/support_triage:issue_refund",
      });
      expect(exp.subject).toBe("fix");
      expect(exp.claims[0].kind).toBe("decision");

      const packet: EvidenceItem[] = [
        { ref: "diagnosis:fnd_001", kind: "diagnosis", source: "diagnoser", snippet: "Diagnosis" },
        { ref: "local:policies/support_triage:issue_refund", kind: "local_row", source: "local", snippet: "Policy" },
      ];
      const res = validateExplanation(exp, packet);
      expect(res.verified).toBe(true);
    });
  });

  describe("Validation Edge Cases (V-1 to V-7)", () => {
    const basePacket: EvidenceItem[] = [
      { ref: "attack:atk_01", kind: "attack", source: "run", snippet: "Attack" },
      { ref: "run:run_01#step1", kind: "run_step", source: "run", snippet: "Step 1" },
      { ref: "hit:run_01#0", kind: "hit", source: "judge", snippet: "Hit [arg_policy_violation] on tool" },
      { ref: "diagnosis:fnd_01", kind: "diagnosis", source: "diagnoser", snippet: "Diagnosis" },
      { ref: "local:policies/support_triage:send_reply", kind: "local_row", source: "local", snippet: "Policy" },
      { ref: "config:support_triage@v1/prompt_rules", kind: "config", source: "config", snippet: "Config" },
      { ref: "suite:before", kind: "suite", source: "verifier", snippet: "Suite before" },
      { ref: "suite:after", kind: "suite", source: "verifier", snippet: "Suite after" },
    ];

    it("V-1: rejects claim text longer than 240 chars or empty", () => {
      const exp: Explanation = {
        subject: "diagnosis",
        subject_id: "fnd_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "cause",
            text: "x".repeat(241),
            evidence: ["run:run_01#step1", "hit:run_01#0"],
          },
        ],
      };
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-1"))).toBe(true);
    });

    it("V-1: rejects duplicate claim_ids", () => {
      const exp: Explanation = {
        subject: "diagnosis",
        subject_id: "fnd_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "cause",
            text: "Claim 1",
            evidence: ["run:run_01#step1", "hit:run_01#0"],
          },
          {
            claim_id: "c1",
            kind: "cause",
            text: "Claim 2 duplicate id",
            evidence: ["run:run_01#step1", "hit:run_01#0"],
          },
        ],
      };
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-1") && e.includes("Duplicate"))).toBe(true);
    });

    it("V-2: rejects claims with more than 5 refs", () => {
      const exp: Explanation = {
        subject: "diagnosis",
        subject_id: "fnd_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "cause",
            text: "Too many refs",
            evidence: [
              "attack:atk_01",
              "run:run_01#step1",
              "hit:run_01#0",
              "diagnosis:fnd_01",
              "local:policies/support_triage:send_reply",
              "config:support_triage@v1/prompt_rules",
            ],
          },
        ],
      };
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-2"))).toBe(true);
    });

    it("V-4: fix explanation without decision claim fails", () => {
      const exp: Explanation = {
        subject: "fix",
        subject_id: "fix_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "outcome", // Not decision
            text: "Observed outcome only",
            evidence: ["diagnosis:fnd_01", "config:support_triage@v1/prompt_rules"],
          },
        ],
      };
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-4") && e.includes("decision"))).toBe(true);
    });

    it("V-4: readiness risk claim not citing suite:after fails", () => {
      const exp: Explanation = {
        subject: "readiness",
        subject_id: "trace_test",
        generated_by: "code",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "outcome",
            text: "Suite results changed",
            evidence: ["suite:before", "suite:after"],
          },
          {
            claim_id: "c2",
            kind: "risk",
            text: "Some attacks unresolved",
            evidence: ["suite:before"], // Must cite suite:after!
          },
        ],
      };
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-4") && e.includes("risk"))).toBe(true);
    });

    it("V-6: FT-01 allows any hit type, FT-03 allows arg_policy_violation, FT-05 allows none", () => {
      const exp: Explanation = {
        subject: "diagnosis",
        subject_id: "fnd_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "cause",
            text: "Target violated argument policy",
            evidence: ["run:run_01#step1", "hit:run_01#0"],
          },
        ],
      };

      // FT-01 allows any hit type
      const resFT01 = validateExplanation(exp, basePacket, {
        root_cause_code: "FT-01",
        hitTypesByRef: { "hit:run_01#0": "arg_policy_violation" },
      });
      expect(resFT01.verified).toBe(true);

      // FT-03 allows arg_policy_violation
      const resFT03 = validateExplanation(exp, basePacket, {
        root_cause_code: "FT-03",
        hitTypesByRef: { "hit:run_01#0": "arg_policy_violation" },
      });
      expect(resFT03.verified).toBe(true);

      // FT-05 allows none
      const resFT05 = validateExplanation(exp, basePacket, {
        root_cause_code: "FT-05",
        hitTypesByRef: { "hit:run_01#0": "arg_policy_violation" },
      });
      expect(resFT05.verified).toBe(false);
      expect(resFT05.validation_errors.some((e) => e.startsWith("V-6"))).toBe(true);
    });

    it("V-7: rejects zetaris: ref when packet only has local: row", () => {
      const exp: Explanation = {
        subject: "fix",
        subject_id: "fix_01",
        generated_by: "llm",
        verified: false,
        validation_errors: [],
        claims: [
          {
            claim_id: "c1",
            kind: "decision",
            text: "Cited policy as zetaris",
            evidence: ["diagnosis:fnd_01", "zetaris:policies/support_triage:send_reply"],
          },
        ],
      };
      // basePacket contains "local:policies/support_triage:send_reply", NOT "zetaris:..."
      const res = validateExplanation(exp, basePacket);
      expect(res.verified).toBe(false);
      expect(res.validation_errors.some((e) => e.startsWith("V-7"))).toBe(true);
    });
  });

  describe("Architectural Lane Guard: Zero LLM Imports in src/explain/", () => {
    it("guarantees src/explain/ contains pure code with 0 model adapter imports", () => {
      const explainDir = path.resolve(__dirname, "../src/explain");
      const files = fs.readdirSync(explainDir).filter((f) => f.endsWith(".ts"));
      expect(files.length).toBeGreaterThanOrEqual(4);

      for (const file of files) {
        const fullPath = path.join(explainDir, file);
        const content = fs.readFileSync(fullPath, "utf-8");

        // Disallow imports from adapters/llm, llm, or network dependencies
        expect(
          content.includes("adapters/llm"),
          `File ${file} must not import from adapters/llm`
        ).toBe(false);
        expect(
          content.includes("from \"../adapters/llm"),
          `File ${file} must not import from adapters/llm`
        ).toBe(false);
        expect(
          /import .* from ["'].*llm.*["']/.test(content),
          `File ${file} imports an LLM adapter`
        ).toBe(false);
      }
    });
  });
});
