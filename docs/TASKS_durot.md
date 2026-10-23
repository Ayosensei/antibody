# TASKS_durot.md

Owner: **DuroT**. Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Hour estimates are `ASSUMED`. Capacity: D1 about 3 h, D2 to D6 about 5 h each = **28 h**; planned **26 h** (2 h buffer). Your lane needs the capable machine (Zetaris needs 8 GB RAM and 4 CPUs given to Docker, 15 GB free disk).

How to use: paste the task block into Cursor Agent chat with: "Read AGENTS.md and the docs named in the task. Do not invent APIs; mark unknowns UNVERIFIED and ask." Ayo approves any contract change.

---

## Task list (ordered)

### T-D1 Zetaris running locally (2.5 h, D1; mostly waiting)

- **Do:** follow `SPONSOR_ZETARIS.md` section 4 exactly: register, download `zetaris-platform.zip`, Docker login, `./preflight.sh`, set `.env` **before first start**, `docker compose pull` and `up -d`, `./verify.sh`, sign in at `http://localhost:3000`, run `SELECT 1 AS one;`, create the **API key yourself in the web UI**, run the PokeAPI recipe (four statements, one at a time). Start the download **first** and do T-D2 while it runs.
- **Depends on:** nothing. If your machine cannot give Docker 8 GB and 4 CPUs, use the AWS route (SPONSOR_ZETARIS 4.1) and tell Ayo.
- **Acceptance:** Z-1 and Z-2 pass; Pikachu query returns 2 rows (the source may change; look at `pikachu_facts` if different); the API key is in your local `.env` (never committed); screenshot of `verify.sh` 9 of 9 saved to `submission/evidence/`.
- **Docs:** SPONSOR_ZETARIS 4 and 5.

### T-D2 NVIDIA key and Nightshift (1 h, D1 to D2)

- **Do:** `SPONSOR_NVIDIA.md` section 3 and `SPONSOR_METERLESS.md` B3: create the NVIDIA key; install Nightshift on a **Windows or Mac** machine (no Linux edition seen; if you and Ayo have none, tell Ayo today, this is README O-2); Providers tab; lanes (one fast, one deep Nemotron); Console URL and token; run the smoke curl.
- **Depends on:** nothing.
- **Acceptance:** M-2 passes; lanes screenshot with a Nemotron lane active saved; the Console URL and token given to Ayo **privately** (not in chat logs that are shared, not in git).
- **Docs:** SPONSOR_METERLESS B, SPONSOR_NVIDIA.

### T-D3 Data files (3.5 h, D2)

- **Do:** create in `data/sample/`: `attacks.json` (all 14 seeds exactly as EVAL section 5, in the `Attack` shape, priorities 10, 20, ... in the order listed), `policies.json` (both policies, DATA_CONTRACTS 3), `regression_support_triage.json` and `regression_meeting_tasks.json` (20 tasks from EVAL 6 as `RegressionTask`, including exact `input_text` and `ctx`), `judge_fixtures.json` (J-01 to J-20 and R-01 to R-04 from EVAL 7), `README.md` saying all data is synthetic. Validate every file with `src/schemas.ts` (Ayo's T-A1) in a test.
- **Depends on:** Ayo's T-A1 on `main` (types). You can start from the docs and validate later.
- **Acceptance:** `npm run test` validates all files; seed count is 8 + 6; every regression task has `expected_calls` and `forbidden_tools`; no URL and no email outside `@example.test`; Ayo has reviewed `attacks.json` for safety (EVAL 1.3).
- **Docs:** EVAL 5 to 7, DATA_CONTRACTS 3, 5, 12.

### T-D4 Local SQL store and Zetaris adapter (3 h, D2 to D4)

- **Do:** `src/adapters/local-sql.ts` (real embedded SQL; `better-sqlite3` is the `ASSUMED` choice, confirm it installs on your machine and Ayo's) and `src/adapters/zetaris.ts` exactly as SPONSOR_ZETARIS sections 6 and 7: `runSql`, validator for the portable subset, timeout, one retry, fallback to local, no fallback on HTTP 400 or 401, trace lines, explicit column lists. Tests that run every query template the Attacker, Fixer and Diagnoser use against the local store.
- **Depends on:** T-D1 for live calls; T-D3 for data; Ayo's T-A1.
- **Acceptance:** Z-2, Z-3, Z-5, Z-6 from SPONSOR_ZETARIS 9 pass; validator rejects a join, a subquery and two statements; a test proves local store and live Zetaris return the same rows for the seed query (compare after loading the same data, if option A, B or C is done; otherwise document that live compare is pending).
- **Docs:** SPONSOR_ZETARIS 5 to 7, DATA_CONTRACTS 13.

### T-D6 H-MEM spike (2 h, D3) (numbered D6 for continuity with SPONSOR docs)

- **Do:** `npx degit meterless/meterless/engines/hmem scratch/hmem`, `cd scratch/hmem/reference && npm install && npm test`, run the example `01-add-memory` (folder name `UNVERIFIED`; list the real names), read the engine's `AGENTS.md` and spec. **Fill in SPONSOR_METERLESS section A6 table with real names** and write a half-page "how our `FixMemory` interface maps onto H-MEM" at the bottom of that file. Check Apache 2.0 license file is present.
- **Depends on:** nothing (needs only Node).
- **Acceptance:** reference tests pass on your machine; A6 table has no TBD left; a clear yes or no on "can we call H-MEM from our adapter with structured records and use its trust and conflict features?" and, if no, what the limit is; Ayo informed the same day (this decides TEAM_WORKFLOW tier T4).
- **Docs:** SPONSOR_METERLESS A.

### T-D7 H-MEM adapter, conformance, feature test (5 h, D3 to D4)

- **Do:** SPONSOR_METERLESS A5: vendor the reference to `src/adapters/engines/hmem-ref/` with LICENSE and `NOTICE.md`; implement `src/adapters/engines/hmem.ts` (`retrieve`, `store`, `updateTrust`) per AGENT_SPEC 6.4; implement the conflict case; wire `npm run conformance:hmem` and save output to `logs/conformance_hmem.txt`; write `npm run test:memory` (store on target A shape, retrieve for target B shape, trust updates reorder results); `memory_mode` cold, warm, off; trace lines `retrieve_memory`, `store_memory`, `update_trust`.
- **Depends on:** T-D6, Ayo's T-A1.
- **Acceptance:** conformance suite passes and output is saved; memory feature test passes; a record stored in one process run is retrieved in the next (persistence); cold mode starts empty; adapter errors return `degraded: memory_unavailable` instead of crashing.
- **Docs:** SPONSOR_METERLESS A, AGENT_SPEC 6.4, DATA_CONTRACTS 9.

### T-D5 Zetaris table registration spike (2.5 h, D5)

- **Do:** SPONSOR_ZETARIS section 8: try option A (Ayo exposes the four `/zetaris-sources/*` endpoints in T-A6; until then serve a static JSON file locally for the spike), then B, then C. Record in that doc which option worked, the exact statements used (copy the PokeAPI recipe pattern), the host address Zetaris used to reach our URL, and the JSON shape Zetaris accepted. Update DATA_CONTRACTS 13 if the shape had to change (tell Ayo first).
- **Depends on:** T-D1, T-D4.
- **Acceptance:** at least `attacks` and `policies` are queried **from a Zetaris table** by the adapter (Z-4); the doc states the achieved option honestly (A, B, C or D).
- **Docs:** SPONSOR_ZETARIS 8.

### T-D8 Eval and demo scripts (2.5 h, D5 to D6)

- **Do:** `scripts/smoke.ts` (three checks), `scripts/calibrate.ts` (EVAL 8, writes `data/sample/calibration.json`), `scripts/seed-eval.ts` (runs fixtures and prints pass counts), `scripts/cold-warm.ts` (EVAL 10.1; writes `data/comparison/<timestamp>.json` validated as `ColdWarmComparison`, DATA_CONTRACTS 17; repeats up to 3 pairs). They call the API (Ayo's T-A6) and never fabricate.
- **Depends on:** Ayo's T-A6 on `main`; T-D7.
- **Acceptance:** `npm run smoke` prints three PASS lines on a clean checkout; calibration file exists with observed hits per seed; cold-warm file contains real values from saved reports and refers to their trace ids.
- **Docs:** EVAL 8 and 10.

### T-D10 Memory and compare pages: **removed from the plan** (cut list item 6). Do it only if all other tasks are done before the D6 freeze.

### T-D12 Evidence packet builder and explanation validator (2.5 h, D3)

- **Do:** pure functions, no model and no network: `src/explain/evidence.ts` (`buildEvidencePacket(inputs)` turns the run record, judge verdicts, policy rows **with their source label (zetaris or local)**, config, retrieved memories, diagnosis and verification into `EvidenceItem[]` with canary masking and a 300-character snippet cap), `src/explain/validate.ts` (`validateExplanation(explanation, packet, ctx)` implementing rules V-1 to V-7), `src/explain/templates.ts` (code-generated explanations for verification, unresolved and readiness), and `data/sample/explanation_fixtures.json` (X-01 to X-12 from EVAL 12.1) with tests.
- **Depends on:** Ayo's T-A1 (schemas) only.
- **Acceptance:** all X-01 to X-12 pass with the expected verified flag and the expected rule id in `validation_errors`; templates always produce explanations that validate; the builder masks the canary and caps snippets (tests); `src/explain/` imports no model adapter (test greps imports). Ayo wires it into the graph on D4.
- **Docs:** AGENT_SPEC 6.8, DATA_CONTRACTS 16, EVAL 12.

### T-D11 Evidence and submission packaging (1.5 h, D6)

- **Do:** `submission/evidence/` with: Zetaris `verify.sh` screenshot, Nightshift lanes and run-details screenshots, Cursor screenshots, conformance output, calibration and comparison files, 3 or more real report JSONs in `output_examples/` and matching inputs in `input_examples/`; fill the checklist in DEMO_AND_SUBMISSION; draft `metadata.json` once its format is known (README O-1).
- **Depends on:** T-D7, T-D8, Ayo's T-A8.
- **Acceptance:** every file listed in DEMO_AND_SUBMISSION section 5 exists and no secret is visible in any screenshot.

## Day-by-day plan

| Day | Hours | Tasks |
|---|---:|---|
| D1 Thu 22 Oct | 3 | T-D1 (2.5, start the download first), T-D2 (0.5: create NVIDIA key, find a Windows or Mac machine); tell Ayo the Nightshift machine answer |
| D2 Fri 23 | 5 | T-D2 finish (0.5), T-D3 (3.5), T-D4 start (1) |
| D3 Sat 24 | 5 | T-D6 (2), T-D12 (2.5), T-D4 (0.5) |
| D4 Sun 25 | 5 | T-D4 finish (1.5), T-D7 (3.5) |
| D5 Mon 26 | 5 | T-D7 finish (1.5), T-D5 (2.5), T-D8 start (1) |
| D6 Tue 27 | 5 | T-D8 finish (1.5) and T-D11 (1.5) **before the 12:00 UTC freeze**; remaining time: buffer, clean-clone test, optional S3 and S4 pages |

Total: 2.5 + 1 + 3.5 + 3 + 2 + 2.5 + 5 + 2.5 + 2.5 + 1.5 = 26 h. T-D6 (H-MEM spike) decides TEAM_WORKFLOW tier T4; if you finish early on D2, pull it forward.

## If you are short on time (cut order for your lane)

T-D10 -> option A or B of Zetaris registration (settle for C and say so) -> calibration repeat counts -> never the H-MEM conformance run, data files, or local SQL store.

## Hand-offs to Ayo

| When | What |
|---|---|
| End D1 | Nightshift machine answer; Console URL and token passed privately |
| D2 | `data/sample/*.json` on `main` (validated) |
| D3 | `runSql` working (local at least); H-MEM spike verdict; `src/explain/` (packet builder, validator, templates) with tests on `main` |
| D4 | `FixMemory` adapter first working version on `main` (conformance and polish follow on D5) |
| D5 | Zetaris option achieved (A, B, C or D); scripts on `main` |
