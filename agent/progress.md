# Progress

### Done
- Step 0: Repository verification & folder reorganization (`.cursor/rules/`, `docs/`, `app/styles/`)
- Baseline commit and push to `origin/main`
- Task T-A1: Scaffold, config, schemas, tracing (merged to `main`)
- Task T-A2: LLM adapters and generator (`src/adapters/llm/`)
  - `src/adapters/llm/meterless.ts`: Nightshift OpenAI-compatible client, headers (`meterless-app`, `meterless-scope`), 401 handling, model discovery
  - `src/adapters/llm/nvidia.ts`: NVIDIA direct fallback client (`reasoning` and `fast` models)
  - `src/adapters/llm/replay.ts`: Replay stub (stretch S-5)
  - `src/adapters/llm/index.ts`: Unified `generator(role, messages)` with provider fallback, retries, and `llm_call`/`fallback_provider` tracing
  - `docs/prompts_used/meterless_provider_prompt.md`: Organizers' provider prompt contract
  - `test/llm_adapters.test.ts`: 5 tests verifying Nightshift calls, 401 surfacing, fallback to NVIDIA with `fallback_provider` trace, replay error, and zero-key grep check
  - Tests passing: 73/73 across all 6 test suites
  - Linter passing: 0 errors
  - `npm run check:env` verified with model discovery

### Current
- Task T-A2 Review & Commit: Opening PR to `main`

### Next
- Task T-A3: Sandbox targets (`src/targets/support-triage/`, `meeting-tasks/`)

