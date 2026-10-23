# SPONSOR_METERLESS.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Facts marked **(guide)** are from the organizers' Participant Setup Guide; **(repo)** from the Meterless GitHub page and `meterless.ai/engines.html` prompts we read. **We have not read the engine source files themselves.** Anything about H-MEM's internal API is `UNVERIFIED` until Task T-D6 (spike) reads `engines/hmem`.

Meterless has **two separate required roles**: Engines (Build rule) and Nightshift (Power rule). Doing one does not satisfy the other. **(guide)**

---

## Part A: Meterless Engines (Build rule)

### A1. Requirement (guide)

Build in Cursor and implement **at least one** Meterless Engine in a **working feature**. Evidence required: the engine appears in working code, the feature can be demonstrated, and the engine's **conformance suite, evaluation or a reproducible feature test passes** and can be shown. Mentioning an engine, copying a prompt or adding an unused dependency does not count.

### A2. What we use (`DECIDED` unless noted)

| Engine | Role in Antibody | Status |
|---|---|---|
| **H-MEM** | Cross-target **fix library**: store every verified fix with cause, attack class, outcome and trust; retrieve on later targets; use trust and conflict resolution so bad advice fades | `DECIDED` (core) |
| **World Model** | Shared map of each target's tools, permissions, data and relations, queried by the Diagnoser | `ASSUMED`, stretch S-1 |
| **Markovian** | Chunked processing of very long transcripts or large suites | stretch S-4 |
| **Scout Intent** | Spec only (repo). Possible fix primitive (injection guard, execution contracts) | `UNVERIFIED`, not planned |

### A3. Why the system loses something without H-MEM

Without it, every target starts from zero and the cold-vs-warm demonstration disappears: no fix reuse, no trust scores, no resolution when two fixes disagree. With a plain JSON store we could store and fetch records, but we would lose tiering, conflict resolution and the trust ledger that H-MEM provides (as described in the engine docs), and we would have nothing to run the conformance suite against. State this plainly in the submission; do not claim H-MEM does things we did not wire.

### A4. What the repo contains (repo)

`github.com/Meterless/Meterless`: each engine has a spec, a runnable TypeScript reference, and a conformance suite. Pull commands from the repo README:

```bash
npx degit meterless/meterless/engines/hmem my-hmem
cd my-hmem/reference && npm install && npm test
```

Conformance (from the Meterless prompts and README):

```bash
HMEM_IMPL=/abs/path/to/your/impl/index.ts npx tsx conformance/runner.ts
```

Equivalent variables for other engines: `WORLD_MODEL_IMPL=...`, `MARKOVIAN_IMPL=...`. The runner expects a **TypeScript implementation module**, which is why Stack B (all TypeScript) matters. Example folders named by the prompts: `engines/hmem/examples/01-add-memory`, `02-mine-from-chat`, `03-mine-from-document`, `06-sleep-preview`, `07-conflict-resolution`, `08-trust-ledger` (names `UNVERIFIED` until we see the repo tree).

The starter template: `npx degit meterless/meterless/templates/agentathon-starter` (README of the repo). Whether we use it is `ASSUMED` no: we scaffold our own Next.js app, to keep the repo structure in the README.

### A5. Integration plan (H-MEM)

1. **Spike (T-D6, 2 hours):** degit the H-MEM engine into a scratch folder, run `npm test`, run example 01, read the engine's `AGENTS.md` and spec. Write the real method names and data model into section A6 of this file.
2. **Vendor:** copy the reference into `src/adapters/engines/hmem-ref/` with its `LICENSE` and a `NOTICE.md` that states origin (`github.com/Meterless/Meterless`, Apache 2.0 per its README) and that it is third-party code. Declare it in the README under third-party components (see TEAM_WORKFLOW definition of done).
3. **Adapter (`src/adapters/engines/hmem.ts`):** implement our interface (`AGENT_SPEC.md` 6.4): `retrieve`, `store`, `updateTrust`, mapping `MemoryRecord` to H-MEM's item and trust-ledger calls. Write records **structured, not mined from text** (we are not parsing chat). Use H-MEM's ranking and trust for retrieval.
4. **Conflict case (we must exercise it):** when a new record has the same `(root_cause_code, attack_class, tool_kind)` as an existing one but different `fix_ops`, hand both to H-MEM's conflict resolution and keep its decision; log `store_memory` with the outcome. Mapping: `UNVERIFIED`.
5. **Conformance:** `npm run conformance:hmem` runs the Meterless runner against `src/adapters/engines/hmem-ref/` (or the exact module the runner requires). Save output to `logs/conformance_hmem.txt`. **This file is submission evidence.** If our adapter wraps the reference, the conformance run targets the reference build we ship; the feature test below proves our wiring.
6. **Feature test (ours, reproducible):** `npm run test:memory` runs: store a verified fix from target A; retrieve it for a target-B query; assert it is returned with trust above the minimum; update trust after a simulated success and a failure; assert ordering changes. Save output to `logs/memory_feature_test.txt`.
7. **Persistence:** the store lives in `data/memory/` (git-ignored except a `.gitkeep`). `memory_mode: "cold"` uses a fresh temp directory.

### A6. H-MEM engine facts and FixMemory mapping (Verified in T-D6 & T-D7)

| Item | Value |
|---|---|
| Package or module path used | `src/adapters/engines/hmem-ref/index.ts` (vendored from `meterless/meterless/engines/hmem/reference/src/index.ts`, Apache 2.0) |
| Write call name and payload | `hmem.add({ content: string, confidence: number, source: string, tags: string[], layer: "long_term", type: "factual" })` returning `MemoryRecord` |
| Retrieval call name and query shape | `hmem.query(queryText: string, { topN?: number, threshold?: number })` returning `QueryResult` (`memories: RetrievedMemory[]`, `trace`) |
| Trust ledger API | `hmem.ledger.log(id, action, actor, { previousState, newState, details })` and `hmem.feedback(id, "helpful" \| "wrong" \| "not_helpful")` |
| Conflict resolution API | `hmem.conflicts.scan()`, `hmem.conflicts.autoResolve(conflict)` (sets `loser.supersededBy = winner.id`), and `ledger.log(..., "conflict_resolved", ...)` |
| Any required generator (model) injection | Optional `minerFn?: (prompt: string) => Promise<string>`; Antibody uses the deterministic model-free FNV-1a embedder (`embed`, `cosine`, `jaccard`), zero external runtime dependencies |

#### How Antibody's `FixMemory` interface maps onto H-MEM

1. **Storage Mapping (`store`):**
   - Antibody's `MemoryRecord` (`DATA_CONTRACTS.md` §9) carries structured security fix data (`mem_id`, `root_cause_code`, `attack_class`, `implicated_tool_kind`, `fix_ops`, `trust`, `reuse_log`).
   - `HMemFixMemory` maps each fix into H-MEM by generating structured content `"[<root_cause>] [<attack_class>] [<tool_kind>] <rationale>"`, tagged with the root cause, attack class, and target id.
   - It invokes `hmem.add({ content, confidence: record.trust, source: record.source_target, tags, layer: "long_term", type: "factual" })`.
   - Antibody's full record payload is stored in `records.json` in `data/memory/` and bi-directionally mapped to H-MEM's record id (`memIdToHmemId` and `hmemIdToMemId`).

2. **Retrieval & Ranking (`retrieve`):**
   - In `retrieve(query: MemoryQuery)`, candidates are filtered by `record.trust >= query.min_trust`.
   - Ranking adheres to `AGENT_SPEC.md` §6.4: exact `root_cause_code` matches score highest (+1000), followed by `tool_kind` (+100) and `attack_class` (+50), boosted by H-MEM's hybrid ranking score (`scoreOne`, combining semantic FNV-1a cosine similarity and token Jaccard).
   - In accordance with H-MEM specification, records marked `supersededBy` receive a -500 penalty but are never deleted.
   - For every returned memory, `hmem.store.touch(id)` and `hmem.ledger.log(id, "read", ...)` record audit access.

3. **Trust & Feedback (`updateTrust`):**
   - Success on target verification (+0.2 on Antibody trust, clamped to 1.0) invokes `hmem.feedback(hmemId, "helpful")` (+0.05 H-MEM confidence, increments accessCount).
   - Failure on target verification (-0.3 on Antibody trust, floored at 0.0) invokes `hmem.feedback(hmemId, "wrong")` (-0.20 H-MEM confidence, appends "review" tag).
   - Each event appends an entry to `record.reuse_log: { run: runId, target, result }` and records in the append-only ledger.

4. **Conflict Resolution:**
   - If a new fix shares `(root_cause_code, attack_class, implicated_tool_kind)` with an existing record but specifies different `fix_ops`, conflict detection triggers.
   - The higher-trust fix wins; the losing record is penalized and marked `supersededBy` the winner, and `hmem.ledger.log(..., "conflict_resolved", ...)` records the audit trail.

5. **Operational Modes & Resilience:**
   - `"warm"`: Reads and persists state to `data/memory/` (`records.json`, `state.json`, `ledger.jsonl`).
   - `"cold"`: Runs completely in-memory without persistent disk side-effects.
   - `"off"`: No-op writes, empty reads.
   - Fault tolerance: Any unexpected IO or engine error logs a fallback trace line, notifies `onDegraded("memory_unavailable")`, and returns `[]` without throwing or halting the agent loop.

### A7. Fallback

If the H-MEM reference cannot be integrated by end of day 2: implement the **same interface** on a local JSON store, mark `degraded: ["memory_unavailable"]` only for failures, and **say honestly in the submission that H-MEM was not integrated**. This loses most of the 10 Sponsor Tech points and the Build-rule eligibility, so day-2 spike and day-3 adapter are on the critical path (TASKS_durot).

## Part B: Meterless Nightshift (Power rule)

### B1. Requirement (guide)

The app **must support Meterless Nightshift as a primary AI provider**. All model calls go to Nightshift's OpenAI-compatible Runtime; Nightshift serves them with the local or cloud models configured in it. For the NVIDIA Nemotron award: test powering with at least one Nemotron model **through Nightshift** in a working feature, and show what Nemotron actually does in the product.

### B2. Why the system loses something without it

Without a model provider none of the three LLM agents or the targets run. Nightshift is the provider the rules require and the one our evidence for the Nemotron award depends on. The NVIDIA direct route is a fallback only.

### B3. Install and configure (guide)

Owner: whoever has a Windows or Mac machine (README O-2). The guide lists Windows, Mac and DGX editions and no Linux edition.

1. `meterless.ai`, scroll to the install cards, choose the edition (Mac M1+ for Big Sur and M1 to M4; Mac M5+ for Tahoe, M5 to M6). Enter email at the access gate, verify via email, download, install, launch, complete first-run prompts. Keep it running. Use the **installed** edition; the browser demo may not expose the local Runtime.
2. Get an NVIDIA API key at `build.nvidia.com/models` (see `SPONSOR_NVIDIA.md`). In Nightshift: Setup tab, Providers, NVIDIA, paste key, save. **The NVIDIA key goes in Providers only** (not in Console, not in our `.env` for the primary route).
3. Lanes: NIGHT tab, LANES. Suggested starting lanes **(guide, examples not guaranteed entitlements)**: Lane 1 fast `nvidia/nemotron-3.5-lightning-30b-a3b`; Lane 2 deep `nvidia/nemotron-3.5-super-vl-120b-a12b`. Select the exact names shown in your catalog. Ensure at least one **active** lane uses Nemotron and run a short test inside Nightshift.
4. Console (top right): copy the **Nightshift URL** and **API key (Runtime access token)**. These differ from the NVIDIA key.
5. Our `.env`:
   ```bash
   METERLESS_BASE_URL=<URL from Console, e.g. http://127.0.0.1:8088/v1>
   METERLESS_RUNTIME_TOKEN=<token from Console>
   METERLESS_MODEL=meterless/auto
   ```
   `meterless/auto` is a **routing mode, not a model id**; it may route to a non-NVIDIA model. For award evidence pin a Nemotron-backed lane or a `meterless/*` route found by model discovery. Add per-role variables `METERLESS_MODEL_REASONING` and `METERLESS_MODEL_FAST` (default `METERLESS_MODEL`) so the reasoning agents and the targets can use different routes.
6. If Nightshift runs on another machine than the app, `127.0.0.1` will not work; use the reachable, securely configured URL. How to expose it: `UNVERIFIED`.

### B4. Runtime contract (guide)

| Item | Value |
|---|---|
| Auth | `Authorization: Bearer <token>`; use the real Console value, never the NVIDIA key or a placeholder |
| Headers | `meterless-app: antibody` (our `METERLESS_APP_ID`), `meterless-scope: user` for chat |
| Discovery | `GET /v1/models` |
| Chat | `POST /v1/chat/completions` (OpenAI-compatible) |
| Health | `/healthz` working is **not** proof a real model is connected; test a real completion |

The organizers publish a **POWER: "Add Meterless as a provider"** prompt at `meterless.ai/engines.html`. Use it in Cursor as the implementation contract for `src/adapters/llm/meterless.ts` (connection, authorization, model discovery, text request, error states). Its exact error-state behavior is in the live page: paste it into the task when implementing.

Smoke test (replace placeholders; set the token as a **shell** variable, `.env` is not exported automatically):

```bash
curl -sS $METERLESS_BASE_URL/chat/completions \
  -H "Authorization: Bearer $METERLESS_RUNTIME_TOKEN" \
  -H "Content-Type: application/json" \
  -H "meterless-app: antibody" -H "meterless-scope: user" \
  -d '{"model":"meterless/auto","messages":[{"role":"user","content":"Reply with one sentence confirming this connection works."}]}'
```

### B5. Our adapter behavior (`DECIDED`)

- One `generator(role, messages)` entry point. Providers: `meterless` (primary), `nvidia` (fallback), `replay` (explicit only).
- Timeouts and retry follow README section 12. A provider switch writes `System` / `fallback_provider` with status `fallback`.
- Every call writes `llm_call` with `role`, `provider`, requested model id (never keys).
- On startup `npm run check:env` calls `GET /v1/models` and prints the model ids available (no secrets).
- Judge-facing evidence of Nemotron use: screenshot of Nightshift run details or logs for one real run, plus our `llm_call` lines. Keep both in the submission folder.

### B6. Acceptance checks

| Check | Pass |
|---|---|
| M-1 `npm run check:env` | prints provider `meterless`, lists models, exit 0 |
| M-2 smoke curl above | JSON completion returned |
| M-3 `npm run smoke` model line | PASS via Nightshift |
| M-4 Nightshift run details show a Nemotron model for at least one agent call in a full run | screenshot saved |
| M-5 Kill Nightshift, run `POST /run` | falls back to NVIDIA direct, `fallback_provider` trace, run completes |
| M-6 H-MEM conformance output saved | `logs/conformance_hmem.txt` |

## Open questions

README O-2 (which machine runs Nightshift), O-7 (conformance invocation inside our repo), H-MEM API (A6). Also `UNVERIFIED`: whether the Meterless credit (Option A in the guide) is needed in addition to the free NVIDIA key, and any Nightshift limits. Meterless's site shows older event dates; trust HackOS for dates.
