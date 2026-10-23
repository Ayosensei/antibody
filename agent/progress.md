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

### Current
- Task T-A3 Review & Commit: Opening PR to `main`

### Next
- Task T-A4: Deterministic judge (`src/judge/`) per EVAL.md sections 2, 4, 7

