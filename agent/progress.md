# Progress

### Done
- Step 0: Repository verification & folder reorganization (`.cursor/rules/`, `docs/`, `app/styles/`)
- Baseline commit and push to `origin/main`
- Task T-A1: Scaffold, config, schemas, tracing (merged to `main`)
- Task T-A2: LLM adapters and generator (merged to `main`)
- Task T-A3: Sandbox targets (`src/targets/support-triage/`, `meeting-tasks/`)
- Task T-A4: Deterministic judge (`src/judge/`)
- Task T-A5: Graph and agents state machine (`src/agents/`, `src/explain/`, `src/orchestration/`) (merged to `main`)
- Task T-A6: API Server & Report Builder (`src/server.ts`, `src/report/`) (merged to `main`)
- Task T-A7: UI Level L1 per DESIGN.md (`app/`) (merged to `main`)
- Task T-A8 / T-D8: Integration, Evaluation, and Benchmark Scripts
  - `scripts/smoke.ts` (`npm run smoke`): Three checks (Zetaris SQL query, model provider completion, end-to-end `POST /run`).
  - `scripts/seed-eval.ts` (`npm run eval:seed`): Validates 14 seed attacks, runs 20 judge fixtures (`J-01`..`J-20`), and 4 regression fixtures (`R-01`..`R-04`). All 24 fixtures pass.
  - `scripts/calibrate.ts` (`npm run eval:calibrate`): Measures empirical baseline ASR across 3 trials per seed, outputs `data/sample/calibration.json` with support_triage (62.5% ASR, 5 stable seeds) and meeting_tasks (83.3% ASR, 5 stable seeds).
  - `scripts/cold-warm.ts` (`npm run demo:cold-warm`): Executes cold vs warm benchmark and outputs verified `ColdWarmComparison` records to `data/comparison/`.
  - All contract commands verified passing: `dev`, `build`, `start`, `server`, `check:env`, `test`, `lint`, `smoke`, `eval:seed`, `eval:calibrate`, `conformance:hmem`, `test:memory`, `demo:cold-warm`.

### Current
- Tasks T-A8 & T-D8 Complete.

### Next
- Task T-A9 / T-D11: Demo recording, slides, README finalization, and submission packaging.

