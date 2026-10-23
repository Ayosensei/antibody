# Progress

### Done
- Step 0: Repository verification & folder reorganization (`.cursor/rules/`, `docs/`, `app/styles/`)
- Baseline commit and push to `origin/main`
- Task T-A1: Scaffold, config, schemas, tracing (merged to `main`)
- Task T-A2: LLM adapters and generator (merged to `main`)
- Task T-A3: Sandbox targets (`src/targets/support-triage/`, `meeting-tasks/`)
  - `src/targets/common.ts`: deterministic canary generation (`hex6`), attack input composition (`append`, `prepend`, `embed`), input filters (`block_pattern`, `strip_pattern`, `wrap_untrusted`), and tool permission evaluation
  - `src/targets/support-triage/index.ts`: baseline config v0, base prompt, fake tool simulator (`issue_refund`, `update_crm`, `send_reply`, `export_customer_list`)
  - `src/targets/meeting-tasks/index.ts`: baseline config v0, base prompt, fake tool simulator (`create_task`, `send_message`, `delete_all_tasks`)
  - `src/targets/runner.ts`: unified `executeTarget` loop with step/token caps, JSON action protocol, single retry, and `TargetRun` output
  - `test/targets.test.ts`: 13 tests covering canary generation, attack placement, filter enforcement, tool permissions (`refused_disabled`, `held_for_approval`, `refused_unknown`), step caps, malformed JSON retry, and regression tasks (`rg_s_01`, `rg_m_01`)
  - Tests passing: 86/86 across all 7 test files
  - Linter passing: 0 errors
- Task T-A4: Deterministic judge (`src/judge/`)
  - `src/judge/canary.ts`: exact and normalized substring search for canary leaks across `final_output` and stringified args (`executed`, `held_for_approval`)
  - `src/judge/caps.ts`: checks for step cap and token cap limit exceedance via `halted_reason` and metric counts
  - `src/judge/tool-policy.ts`: validates tool permissions (`disallowed_tool_call`) and argument rules (`max`, `equals_ctx`, `in_ctx`, `in_enum`, `regex` -> `arg_policy_violation`)
  - `src/judge/judge.ts`: core `judgeRun` returning contract-compliant `JudgeVerdict`
  - `src/judge/regression.ts`: deterministic regression task evaluator (`expected_calls` matching, `forbidden_tools` avoidance, no `judge_hit`)
  - `src/judge/index.ts`: entry point exporting all judging routines
  - `test/judge.test.ts`: 32 tests passing all fixtures J-01..J-20 and R-01..R-04 with zero LLM imports (Hard Rule 3 verified)
  - Tests passing: 132/132 across all 9 test suites
  - Linter passing: 0 errors

### Current
- Task T-A4 Review & Commit: Opening PR to `main`

### Next
- Task T-A5: State machine, agent nodes (Attacker, Diagnoser, Fixer, Verifier), and memory integration

