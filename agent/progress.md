# Progress

### Done
- Step 0: Repository verification & folder reorganization (`.cursor/rules/`, `docs/`, `app/styles/`)
- Baseline commit and push to `origin/main`
- Task T-A1: Scaffold, config, schemas, tracing (merged to `main`)
- Task T-A2: LLM adapters and generator (merged to `main`)
- Task T-A3: Sandbox targets (`src/targets/support-triage/`, `meeting-tasks/`)
- Task T-A4: Deterministic judge (`src/judge/`)
- Task T-A5: Graph and agents state machine (`src/agents/`, `src/explain/`, `src/orchestration/`) (merged to `main`)
- Task T-A6: API Server & Report Builder (`src/server.ts`, `src/report/`)
  - `src/server.ts`: HTTP server on port 8000 per AGENTS.md and DATA_CONTRACTS.md §11 & §13
    - `POST /run`: sync (wait: true) returning 200 `Report` and async (wait: false) returning 202 `{ trace_id }`
    - `GET /runs/:id`: 200 `Report` when finished, 202 `{ status: "running", started_at, request, last_trace_line }` while running, 500 failed, 404 `unknown_run`
    - `GET /runs/:id/events`: Server-Sent Events stream with `Last-Event-ID` replay, keepalive (`: keepalive`), and final `event: end`
    - `GET /health`: `{ ok: true, sample_mode, llm_provider, zetaris }`
    - `GET /memory`: list stored MemoryRecords
    - `POST /memory/reset`: reset memory requiring `X-Confirm: reset` header
    - `/zetaris-sources/*`: flat column tables (`attacks`, `policies`, `traces`, `fixes`)
    - CORS headers for `http://localhost:3100` and `http://127.0.0.1:3100`
  - `src/report/html.ts`: standalone HTML report generator with DESIGN S2b section order (readiness plate, medal, metrics, findings, guardrail diff, remaining risks, memory, evidence map)
  - `test/server.test.ts`: 21 tests covering all endpoints, error codes, SSE streaming, and validation
  - Tests passing: 175/175 across all 11 test suites
  - Linter passing: 0 errors

### Current
- Task T-A6 Complete. Merging to `main` and starting Task T-A7 (UI Level L1).

### Next
- Task T-A7: UI Level L1 per DESIGN.md

