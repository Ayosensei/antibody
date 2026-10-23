# TASKS_ayo.md

Owner: **Ayo (Sensei)**. Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Hour estimates are `ASSUMED` and include Cursor-assisted coding, testing and review; beginners on agents, so buffers are in the cut list, not in the numbers. Capacity: D1 about 3 h, D2 to D6 about 5 h each = **28 h**; planned **28 h**.

How to use: paste the task block into Cursor Agent chat with: "Read AGENTS.md and the docs named in the task. Do not invent APIs; mark unknowns UNVERIFIED and ask."

---

## Task list (ordered)

### T-A1 Scaffold, config, schemas, tracing (3 h, D1)

- **Do:** create the repo per README section 10 (folders can be empty with `.gitkeep`). `package.json` scripts (names from README 8.4). `src/schemas.ts` with every type in `DATA_CONTRACTS.md` and runtime validators. `src/config.ts` reading `.env` per README 6.1 (fail with plain messages). `src/tracing.ts` JSONL writer and an in-process event emitter (for SSE later). `.gitignore`, `.env.example`, `.cursor/rules/*.mdc`, `AGENTS.md` (from this delivery). `docs/DECISIONS.md`. `npm run check:env`.
- **Depends on:** nothing. **Blocks:** everything.
- **Acceptance:** (1) `npm run test` validates every JSON example in `DATA_CONTRACTS.md` (copy them to `test/contract_examples/`) and rejects at least one invalid example per type; (2) `npm run check:env` prints the active mode and exits non-zero when a required variable is missing, never printing secret values; (3) a trace line written through `tracing.ts` validates as `TraceLine`; (4) pushed to `main` and DuroT confirms he can `npm install` and run tests.
- **Docs:** README 6, 10, 11; DATA_CONTRACTS all.

### T-A2 LLM adapters and generator (2 h, D2)

- **Do:** `src/adapters/llm/` with `meterless.ts`, `nvidia.ts`, `index.ts` exporting `generator(role, messages)` with provider order and retry per README 12 and SPONSOR_METERLESS B5. Use the organizers' "Add Meterless as a provider" prompt from `meterless.ai/engines.html` as the contract (save it in `docs/prompts_used/`). Trace `llm_call` and `fallback_provider`. `replay.ts` as a stub that throws "not implemented" (stretch S-5).
- **Depends on:** T-A1; DuroT T-D2 (Nightshift token) for live tests. Until then test against a local fake HTTP server in `test/`.
- **Acceptance:** `npm run smoke` model line PASSes via Nightshift; killing Nightshift makes a run fall back to NVIDIA direct with a `fallback_provider` trace line; wrong token gives a clear error (401 surfaced, not swallowed); no key in logs (grep test).
- **Docs:** SPONSOR_METERLESS B, SPONSOR_NVIDIA, README 7 and 12.

### T-A3 Sandbox targets (3.5 h, D2 to D3)

- **Do:** `src/targets/support-triage/` and `meeting-tasks/` per AGENT_SPEC section 5: base prompts, fake tools that only record calls, config enforcement (`enabled`, `requires_approval`, `max_amount`, three filter kinds), step and token caps, JSON action protocol with one retry, `TargetRun` output. Canary generation and planting (DATA_CONTRACTS 14). `composeInput` for attacks.
- **Depends on:** T-A1, T-A2; DuroT T-D3 data files (use `data/sample/` fixtures from DuroT, or hand-write two tasks to start).
- **Acceptance:** run `rg_s_01` and `rg_m_01` live: the `TargetRun` has real tool calls from the model; disabling a tool via config yields `refused_disabled`; `block_pattern` yields `input_blocked`; unit tests cover each enforcement path with a fake model that returns scripted JSON (test-only).
- **Docs:** AGENT_SPEC 5, DATA_CONTRACTS 4 to 6.

### T-A4 Deterministic judge (2.5 h, D3)

- **Do:** `src/judge/` (`canary.ts`, `tool-policy.ts`, `caps.ts`, `regression.ts`, `index.ts`) per EVAL sections 2, 4, 7 and DATA_CONTRACTS 12.
- **Depends on:** T-A1, DuroT T-D3 (judge fixtures file). If fixtures are late, write J-01 to J-20 from EVAL section 7 yourself first.
- **Acceptance:** `npm run test` passes **all** fixtures J-01 to J-20 and R-01 to R-04 with exact expected verdicts; judge never imports a model adapter (lint rule or test that greps imports).
- **Docs:** EVAL 2 to 7.

### T-A5 Graph and agents (7 h, D3 to D4)

- **Do:** `src/orchestration/graph.ts` and `state.ts` (nodes and edges exactly as AGENT_SPEC section 4), `src/agents/attacker.ts`, `diagnoser.ts`, `fixer.ts`, `verifier.ts`, system nodes (`load_target`, `select_finding`, `commit_fix`, `escalate`, `build_report` hooks). Prompts exactly as in AGENT_SPEC (templates in `src/agents/prompts.ts`). Attack validator. Fix validation. Queue pruning. Budgets and guard edge. Memory calls through the `FixMemory` interface (use DuroT's adapter when ready; before that a test-only in-memory stub). LangGraph.js: confirm package and install on D3 morning (README O-6); if it blocks for more than 45 minutes, write the hand-rolled state machine with the same nodes.
- **Depends on:** T-A2, T-A3, T-A4; DuroT T-D4 (Zetaris adapter or local store) for seed queries; DuroT T-D12 (`src/explain/` evidence packet builder and validator) for explanations (use a pass-through stub in `test/` until it lands, never in `src/`).
- **Acceptance:** (1) on target A `POST /run` equivalent from a script completes the loop with real model calls; (2) trace contains at least one `select_finding`, `diagnose_finding`, `propose_fix`, `verify_fix`, `commit_fix` or `escalate`; (3) a deliberately over-broad fix (unit test with scripted Fixer output blocking all replies) is **rejected** with `regression_break`; (4) retries stop after 3 proposals; (5) `escalate` runs the fallback fix and ends `unresolved` when it fails; (6) round-2 attacks generated when round 1 has zero hits (unit test with scripted target); (7) every `Diagnosis` and `Fix` has an `explanation` built from an evidence packet and checked by `validateExplanation`; an explanation citing a ref outside the packet is re-asked once, then flagged `verified: false` and `unverified_explanation` is added to `degraded` (unit test with scripted model output); verification, unresolved and readiness explanations come from code templates.
- **Docs:** AGENT_SPEC all.

### T-A6 API server and report builder (2 h, D5)

- **Do:** `src/server.ts`: `POST /run` (sync and `wait:false`), `GET /runs/:id`, SSE `/runs/:id/events`, `GET /health`, `GET /memory`, `POST /memory/reset`, the four `/zetaris-sources/*` endpoints (DuroT supplies the row mapping), CORS for `http://localhost:3100`, request validation with the error format. SSE format, `GET /runs/{id}` statuses and the new `Report` fields exactly as in `DATA_CONTRACTS.md` section 11 (see DESIGN.md section 16). `src/report/` builds the `Report` (including `explanations`, the code-generated readiness explanation, the `evidence` map and explanation metrics) and an HTML file from it (plain HTML, same section order as DESIGN S2b).
- **Depends on:** T-A5.
- **Acceptance:** `curl -X POST localhost:8000/run -d @input_examples/example_1.json` returns a valid `Report`; invalid body gives HTTP 400 with `field`; `wait:false` plus SSE shows live lines; report JSON validates against `schemas.ts`.
- **Docs:** DATA_CONTRACTS 11, DESIGN S2b.

### T-A7 UI (4.5 h, D5 to D6)

- **Do:** build `app/` exactly per `docs/DESIGN.md` at **build level L1** (section 14.3): tokens, base, metal, layout and component CSS (`tokens.css` and `metal.css` are provided; copy them), copy deck in `app/copy.ts`, S1 launcher, S2 live run view (tracker, trace panel, progress panel), S2b report with the readiness plate and medal, metric cards, findings, **explanation panels with clickable evidence chips**, guardrail diff, S5. L2 (grain, sheen, scan-line polish, S3, S4) and L3 are cut-list items. No UI kit, no Tailwind, no invented data.
- **Depends on:** T-A6.
- **Acceptance:** a full run can be launched and watched from the browser; rejected fix visible in the trace with the stronger border; report shows readiness banner, before/after cards, findings with fix attempts and rejection reasons, guardrail diff, remaining risks, degraded warnings; every item of the DESIGN.md UI acceptance checklist (section 15) that applies at L1 passes, with the result pasted in the PR; evidence chips open snippets from `Report.evidence` with the right source label (Zetaris vs local); unverified explanations show the warning; keyboard operable; no console errors.
- **Docs:** DESIGN.

### T-A8 Integration and tuning (0.5 h, D5)

- **Do:** with DuroT run calibration, measure calls and seconds, set defaults in README 6.1 and AGENT_SPEC 7, confirm SM-6 (under 5 minutes). Choose the demo seeds (stable hits).
- **Depends on:** T-A5 to T-A7, DuroT T-D8.
- **Acceptance:** measured numbers recorded in `docs/DECISIONS.md` with the report file names they came from.

### T-A9 Demo, slides, README final, submission (3 h, D6)

- **Do:** record per DEMO_AND_SUBMISSION; finalize README 16 text from real results; slides.
- **Depends on:** everything.
- **Acceptance:** DEMO_AND_SUBMISSION checklist items for video, deck, README all checked.

## Day-by-day plan

| Day | Hours | Tasks |
|---|---:|---|
| D1 Thu 22 Oct | 3 | T-A1 (all); tell DuroT `main` is ready; send Help desk questions O-1, O-4, O-9 |
| D2 Fri 23 | 5 | T-A2 (2), T-A3 start (3) |
| D3 Sat 24 | 5 | T-A3 finish (0.5), T-A4 (2.5), T-A5 start: state, load_target, attacker (2) |
| D4 Sun 25 | 5 | T-A5 finish (5): diagnoser, fixer, verifier, commit/escalate, evidence packets and explanations wired, graph, `meta` on trace lines |
| D5 Mon 26 | 5 | T-A6 (2), T-A8 (0.5), T-A7 start (2.5): design tokens, copy deck, S1 |
| D6 Tue 27 | 5 | T-A7 finish (2): S2 and S2b, **before the 12:00 UTC freeze**; T-A9 (3): record demo, slides, README, submit by 22:00 UTC |

Total: 3 + 5 + 5 + 5 + 5 + 5 = 28 h (matches task estimates: 3 + 2 + 3.5 + 2.5 + 7 + 2 + 4.5 + 0.5 + 3 = 28).

**Risk:** the UI is a large share of the demo score (Product and UX 10, Demo 15). If T-A5 slips, start T-A7 L1 on D4 with the gallery fixtures anyway (DESIGN.md 14.4) and keep the cut list (L2, L3 first).

Hours per day are targets; shift work within the plan, but **T-A5 must have a working loop on target A by end of D4** (T1 fallback in TEAM_WORKFLOW).

## If you are short on time (cut order for your lane)

UI S2b polish -> SSE (poll `GET /runs/:id` instead) -> round-2 attacks -> attack validator extras -> queue pruning (keep), never the Verifier, judge fixtures or traces.

## Hand-offs to DuroT

| When | What |
|---|---|
| End D1 | `main` with schemas, config, tracing |
| D2 | `generator` interface stable (so his scripts can call it) |
| D3 | `FixMemory` interface stub + test-only in-memory implementation |
| D4 | API running locally for his eval scripts |
