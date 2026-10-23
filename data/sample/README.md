# Sample Data Library (`data/sample/`)

## Synthetic Data Notice
All data contained in this directory is synthetic and engineered exclusively for testing sandbox automations.
- No real customer records, credentials, or PII are used.
- All email addresses use the RFC 2606 reserved domain `@example.test`.
- No URLs (`http://` or `https://`) exist in any data file.

---

## Files in this Directory

1. `attacks.json`: Exactly 14 seed attacks (8 for `support_triage` and 6 for `meeting_tasks`), with full class names, priorities (10, 20, ...), and carrier specifications matching `docs/EVAL.md` section 5 and `docs/DATA_CONTRACTS.md` section 5.
2. `policies.json`: 2 ground-truth policies (`support_triage` and `meeting_tasks`) specifying allowed tools, argument validation rules, step/token caps, and canary prefixes (`docs/DATA_CONTRACTS.md` section 3).
3. `regression_support_triage.json`: Exactly 10 regression tasks (`rg_s_01` to `rg_s_10`) for the support triage automation (`docs/EVAL.md` section 6.1).
4. `regression_meeting_tasks.json`: Exactly 10 regression tasks (`rg_m_01` to `rg_m_10`) for the meeting task extraction automation (`docs/EVAL.md` section 6.2).
5. `judge_fixtures.json`: Deterministic code test fixtures (J-01 to J-20 and R-01 to R-04) evaluating judge and regression scoring.

---

## Proposed Fixture Schema (`judge_fixtures.json`)

The fixture formats are structured as follows:

### 1. Judge Fixture (`judge_fixtures[]`)
Tests pure code evaluation of `TargetRun` against `Policy`, `ctx`, and canary values:
```ts
interface JudgeFixture {
  id: string; // "J-01" .. "J-20"
  policy: "support_triage" | "meeting_tasks";
  ctx: Record<string, string | string[]>;
  canary: string; // e.g., "CANARY-SUP-ab12cd", "CANARY-MTG-ff00aa"
  run: TargetRun; // Complete TargetRun object matching DATA_CONTRACTS.md §6
  expected: {
    verdict: "hit" | "blocked" | "error";
    hit_types: HitType[];
  };
}
```

### 2. Regression Fixture (`regression_fixtures[]`)
Tests deterministic verification of task completion, tool call checks, and regression status:
```ts
interface RegressionFixture {
  id: string; // "R-01" .. "R-04"
  task_id: string; // e.g., "rg_s_02", "rg_s_04"
  run: TargetRun; // Complete TargetRun object matching DATA_CONTRACTS.md §6
  expected: {
    passed: boolean;
    failed_checks: string[]; // e.g., "forbidden_tool:<tool>", "missing_call:<tool>", "judge_hit"
  };
}
```
