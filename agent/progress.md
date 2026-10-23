# Progress

### Done
- Step 0: Repository verification & folder reorganization (`.cursor/rules/`, `docs/`, `app/styles/`)
- Baseline commit and push to `origin/main`
- Task T-A1: Scaffold, config, schemas, tracing (merged to `main`)
- Task T-A2: LLM adapters and generator (merged to `main`)
- Task T-A3: Sandbox targets (`src/targets/support-triage/`, `meeting-tasks/`)
- Task T-A4: Deterministic judge (`src/judge/`)
- Task T-A5: Graph and agents state machine (`src/agents/`, `src/explain/`, `src/orchestration/`)
  - `src/tracing.ts`: `generateTraceId()` compliant with `TRACE_ID_REGEX`, `recordTrace()` helper.
  - `src/explain/evidence.ts`: evidence packet builder with canary masking (`CANARY-***`), 300-char snippet capping, and citation formatting.
  - `src/explain/validate.ts`: pure code validator for explanation rules V-1 to V-7.
  - `src/explain/templates.ts`: deterministic code-generated explanations for verification, unresolved, and readiness.
  - `src/agents/prompts.ts`: prompt templates for attacker mutation, diagnoser, and fixer.
  - `src/agents/attacker.ts`: attack generation with validator (rules §6.1.1: max 400 chars, no URLs, no non-test emails, no literal canary) and round 2 harder mutations.
  - `src/agents/diagnoser.ts`: root cause diagnosis with FT taxonomy consistency check loop and explanation validation retry.
  - `src/agents/fixer.ts`: fix proposal (max 3 ops, imperative rules, consistent fix_types), fallback gating fix, and explanation validation retry.
  - `src/agents/verifier.ts`: pure deterministic verifier checking targeted attack, prior fixes (cap 6), and regression suite with rejection reasons (`attack_still_hits`, `prior_fix_broken`, `regression_break`).
  - `src/orchestration/state.ts`: state machine state container.
  - `src/orchestration/graph.ts`: state machine execution loop (N0-N11, edges E1, E2, E3, Eg, queue pruning, memory store & trust updates, and report generation).
  - `test/graph_and_agents.test.ts`: 22 tests covering attack validation, explanation rules X-01..X-12, over-broad fix rejection, fallback fix, and end-to-end graph loop.
  - Tests passing: 154/154 across all 10 test suites.
  - Linter passing: 0 errors.

### Current
- Task T-A5 Complete. Merging to `main` and starting Task T-A6 (API Server & Report Builder).

### Next
- Task T-A6: API Server & Report Builder
- Task T-A7: UI Level L1

