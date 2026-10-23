# TEAM_WORKFLOW.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Team: **Ayo (Sensei)** and **DuroT**. Capacity: about 5 hours per person per day (`ASSUMED`). All times UTC (Nigeria is UTC+1).

---

## 1. Roles

| Person | Owns | Why |
|---|---|---|
| **Ayo** | Tech lead. Contracts (`schemas.ts`), LLM adapters, sandbox targets, judge, graph and agents, API server, report builder, main UI, README, final demo | Stack is TypeScript and Next.js; contract owner avoids drift |
| **DuroT** | Zetaris (install, adapter, local fallback, table registration), Nightshift and NVIDIA setup, data files (attacks, policies, regression sets, judge fixtures), H-MEM spike and adapter and conformance, eval scripts, evidence packaging | Needs the capable machine; clear decoupled lane |

Shared: reviews each other's PRs, daily sync, demo rehearsal.

Single decision-maker on contracts and scope: **Ayo**. DuroT may propose; Ayo approves in writing (chat message is enough; copy it to `docs/DECISIONS.md`).

## 2. Contract-first decoupling (`DECIDED`)

The two lanes meet only at these seams. Each seam has a contract in `DATA_CONTRACTS.md` and a fixture so either person can work without the other:

| Seam | Contract | Fixture | Ayo side | DuroT side |
|---|---|---|---|---|
| Data files | `Attack`, `Policy`, `RegressionTask` | `data/sample/*.json` | loads them | writes them |
| SQL access | `runSql` + portable subset | local store tests | calls it | implements it |
| Memory | `FixMemory` interface (AGENT_SPEC 6.4), `MemoryRecord` | `data/sample/memory_fixtures.json` | calls it | implements it on H-MEM |
| Model calls | `generator(role, messages)` | replay stub returning fixed text **in unit tests only** | implements | consumes in scripts |
| Eval scripts | `RunRequest` and `Report` | `output_examples/` (real runs) | serves API | drives API |

Rules:
1. `src/schemas.ts` is merged to `main` **first** (day 1) and is the only place types are defined.
2. Until the real module exists, code against the interface and a **test-only** stub in `test/`. Stubs never ship in `src/` and never run when `SAMPLE_MODE` or any production path is used.
3. Changing a contract follows `DATA_CONTRACTS.md` section 15.

## 3. Git workflow

- Repo: GitHub, **public** at submission (`UNVERIFIED` visibility requirement; confirm on HackOS). Until then private is fine.
- Branches: `main` is always runnable. Work in `feat/<task-id>-<slug>` (example `feat/T-A3-targets`). One task, one branch, small PRs (under about 400 changed lines where possible).
- Commits: short imperative message; prefix `cursor:` when mostly agent-written; never commit `.env`, keys, tokens, `node_modules`, `logs/*.jsonl`, `data/memory/`.
- PR rules: description names the task id and links the acceptance criteria; the **other person** reviews (a 10-minute skim is enough); merge by squash; the author merges after approval. Docs-only PRs may self-merge.
- Before opening a PR: `npm run test` and `npm run lint` pass; `npm run check:env` runs; no secret in diff (run `git diff --staged | grep -iE "key|token|secret"` as a habit).
- Conflict hotspots (`schemas.ts`, `graph.ts`): announce before editing.

## 4. Daily rhythm

1. **Start sync (10 min, chat or call):** yesterday done, today's tasks, blockers.
2. **Work blocks** with Cursor. Pull `main` before starting; push at least every 2 hours.
3. **Blocker rule:** stuck for more than **60 minutes** on one thing -> post it with exact command, full error, last working step (remove secrets). Ask the Help desk if it is a sponsor issue.
4. **End sync (10 min):** merge what is ready, update the task file checkboxes, state tomorrow's first task.
5. **Evidence habit:** after every successful full run, copy the report JSON to `output_examples/` (real, unedited) and screenshot the trace view.

## 5. Definition of done (per task)

A task is done only when **all** are true:

1. Acceptance criteria in the task file pass (command output pasted in the PR).
2. Types come from `schemas.ts`; new inputs and outputs are validated at runtime.
3. Writes trace lines for every decision it owns.
4. No hardcoded outputs, no canned results, no secrets (`AGENTS.md` rules).
5. Failure paths from `README.md` section 12 are implemented for the part it touches.
6. Docs updated: any `UNVERIFIED` item it resolved is updated in the relevant doc and README section 14.
7. Merged to `main` and `npm run smoke` still passes.

**Project done (submission):** DEMO_AND_SUBMISSION checklist complete.

## 6. Daily targets (summary; detail in TASKS files)

| Day | Date | Target by end of day |
|---|---|---|
| D1 | Thu 22 Oct (partial, about 3 h each) | Repo scaffold with schemas and tracing on `main`; Zetaris installing or running; Nightshift and NVIDIA key set up; data files started |
| D2 | Fri 23 Oct | Targets run with real model calls; judge passes all fixtures; local SQL store and Zetaris adapter done; H-MEM spike written up; baseline attack run works on target A |
| D3 | Sat 24 Oct | Judge and targets done; explanation validator and evidence packet builder merged; H-MEM spike verdict known; loop skeleton running |
| D4 | Sun 25 Oct | Full loop (all agents, retries, escalation, explanations) works on target A end to end (even if ugly); H-MEM adapter first version |
| D5 | Mon 26 Oct | API server and report builder; UI started; calibration, budget tuning, cold-vs-warm script with real runs; Zetaris table option settled; H-MEM conformance saved |
| D6 | Tue 27 Oct | **Feature freeze 12:00 UTC.** Record demo, final README, submission checklist. **Submit by 22:00 UTC** (deadline 23:45 UTC, margin kept on purpose) |

## 7. Fallback plan if we fall behind

Check at the end of each day. Apply the first tier whose trigger is true.

| Tier | Trigger | Actions |
|---|---|---|
| T1 | End of D3: full loop on target A not working | Cut PROJECT_SPEC cut-list items 1 to 5; drop UI S3 and S4; both people work on getting the loop through; skip target B polish |
| T2 | End of D4: loop works on A only | Target B reduced to 6 seeds and 6 regression tasks (`ASSUMED` still valid for cold-warm); stop UI work beyond S1, S2, S2b |
| T3 | End of D5: loop not stable | Submit loop on target A with honest report; cold-warm demo uses whatever real comparison exists, possibly only one pair; say so |
| T4 | Any day: H-MEM adapter not working by end of D3 | Do the A7 fallback in SPONSOR_METERLESS (same interface, local store) **and state honestly** that H-MEM was not integrated; keep trying the conformance run in parallel |
| T5 | Any day: Nightshift cannot be installed | Use NVIDIA direct (`LLM_PROVIDER=nvidia`); tell Help desk; do not claim Power rule compliance in the submission |
| T6 | End of D4: evidence packets or validator not integrated | Ship code-generated explanations (verification, unresolved, readiness) and flag every LLM explanation `verified: false` rather than dropping explanations; keep trying to wire the validator on D5. Track 2 depends on this: never remove explanations from the report or UI |

Never fabricate results to cover a gap. An honest smaller system scores better than a fabricated bigger one (penalized: unsupported claims, hardcoded demo paths).

## 8. Decision log

`docs/DECISIONS.md` (create on day 1). One line per decision: date (UTC), who, decision, reason. Initial entries: Stack B (all TypeScript); targets A and B; local demo first; Docker not used for our app; Track 2 (Explain Why) chosen by Ayo on 22 Oct 2026; AWS Zetaris is listed as an option in Zetaris's repo (README O-8 closed).
