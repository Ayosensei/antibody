# Submission Evidence & Artifacts

This directory contains verified execution artifacts, calibration logs, and conformance test outputs for the **Antibody** Open Agent Hackathon submission (Track 2: "The Agent That Can Explain Why").

All metrics and evidence artifacts in this package are generated directly by reproducible test commands and verified against strict schemas.

---

## 1. File Manifest (Committed Evidence Artifacts)

The following files are committed directly in this directory and validated by automated tests (`npm test`):

| File | Type | Description | Command to Reproduce |
|---|---|---|---|
| `conformance_hmem.txt` | Test Output | Official H-MEM conformance test suite results (13 of 13 tests passed: record validation, feedback deltas, ranking order, sleep guardrails, conflict gate, ledger audit, dream boundary). | `npm run conformance:hmem` |
| `memory_feature_test.txt` | Test Output | H-MEM integration test suite results (14 of 14 tests passed: cross-target storage, retrieval, trust updates, conflict resolution, cold vs. warm mode). | `npm run test:memory` |
| `calibration.json` | JSON Metric | Empirical hit-rate calibration run over 14 attack seeds across 3 baseline trials. Verified $\ge 50\%$ hit rate for both `support_triage` and `meeting_tasks`. | `npm run eval:calibrate` |
| `comparison_20261025T180424Z.json` | JSON Metric | Cold vs. warm memory multi-run comparison output conforming to `ColdWarmComparisonSchema`. Documents baseline cold vs. warm fix proposal attempts, acceptance rates, and memory retrieval impacts. | `npm run demo:cold-warm` |

---

## 2. Visual Proof & Demo Checklist (Presented in Video Demo)

The following UI checkpoints and operational verifications are recorded live during development and demonstrated in the 3m 45s submission video:

| Evidence Point | Target System | Description | Demonstration Context |
|---|---|---|---|
| **Zetaris Verification** | Zetaris Cloud / Linux Docker | Execution of `./verify.sh` showing 9 of 9 passed containers on Linux Docker, plus table query execution in Zetaris SQL Editor. | Linux staging environment |
| **Nightshift Lanes** | Meterless Nightshift | Meterless Nightshift UI on Windows showing active Nemotron lanes (`fast` and `reasoning`). | Local Nightshift desktop runtime |
| **Nightshift Run Details** | Meterless Nightshift | Meterless Nightshift execution metrics and token usage during an Antibody evaluation run. | Local Nightshift desktop runtime |
| **Cursor Rules & Prompts** | Cursor Agent | Cursor Agent session showing the official Meterless prompt in `docs/prompts_used/` and `.cursor/rules/` in use. | IDE workspace |
| **Verifier Fix Rejection** | Antibody UI / Trace Viewer | Execution trace view showing the Verifier rejecting an over-broad candidate fix with `attack_still_hits` or `regression_break`. | UI trace viewer & Why panel |

---

## 3. Integrity and Privacy Statement

- **Dual-Mode Architecture & Reproducibility Guarantee:** In live production mode (`sample_mode: false`), all LLM calls target live OpenAI-compatible inference endpoints (Meterless Nightshift / NVIDIA Nemotron) and live Zetaris REST endpoints (`POST /sql-editor/sqls/run`). In offline sample mode (`sample_mode: true`), all agent behaviors execute via reproducible sample fixtures to guarantee zero-flake CI/CD and deterministic test verification without requiring cloud credentials.
- **Credential Sanitization:** All reports and logs have been inspected per `DEMO_AND_SUBMISSION.md` §6 to verify that no API keys, bearer tokens, passwords, or internal endpoints are exposed.
- **Trace Grounding:** Every citation ref (`zetaris:`, `local:`, `run:`, `verify:`, `config:`, `memory:`) corresponds to an actual row, memory record, or step in the accompanying execution traces in `logs/` and `output_examples/`.
- **Pure-Code Deterministic Judge:** All verdicts and regression evaluations are computed by deterministic TypeScript code in `src/judge/`, never by probabilistic LLM self-evaluation.
