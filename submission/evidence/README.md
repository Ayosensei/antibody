# Submission Evidence & Artifacts

This directory contains verified, deterministic test outputs, calibration logs, and execution evidence for the **Antibody** Open Agent Hackathon submission (Track 2: "The Agent That Can Explain Why").

All numbers and reports in this submission originate from real runs executed on our development and staging environments.

---

## 1. File Manifest

| File | Type | Description | Command to Reproduce |
|---|---|---|---|
| `conformance_hmem.txt` | Test Output | Official H-MEM conformance test suite results (13 of 13 tests passed: record validation, feedback deltas, ranking order, sleep guardrails, conflict gate, ledger audit, dream boundary). | `npm run conformance:hmem` |
| `memory_feature_test.txt` | Test Output | H-MEM integration test suite results (14 of 14 tests passed: cross-target storage, retrieval, trust updates, conflict resolution, cold vs. warm mode). | `npm run test:memory` |
| `calibration.json` | JSON Metric | Empirical hit-rate calibration run over 14 attack seeds across 3 baseline trials. Verified $\ge 50\%$ hit rate for both `support_triage` and `meeting_tasks`. | `npm run eval:calibrate` |
| `comparison_20261024T184732Z.json` | JSON Metric | Cold vs. warm memory multi-run comparison output conforming to `ColdWarmComparisonSchema`. Documents fix proposal attempts, acceptance rates, and memory retrieval impacts. | `npm run demo:cold-warm` |
| `zetaris_verify.png` | Screenshot | Execution of `./verify.sh` showing 9 of 9 passed containers on Linux Docker, plus table query execution in Zetaris SQL Editor. | Ran on host Linux instance |
| `nightshift_lanes.png` | Screenshot | Meterless Nightshift UI on Windows showing active Nemotron lanes (`fast` and `reasoning`). | Captured from local Nightshift app |
| `nightshift_run_details.png` | Screenshot | Meterless Nightshift execution metrics and token usage during an Antibody evaluation run. | Captured from local Nightshift app |
| `cursor_agent_meterless_prompt.png` | Screenshot | Cursor Agent session showing the official Meterless prompt and `.cursor/rules/` in use. | Captured from IDE workspace |
| `trace_rejected_fix.png` | Screenshot | Execution trace view showing the Verifier rejecting an over-broad candidate fix with `attack_still_hits` or `regression_break`. | Captured from UI / trace viewer |

---

## 2. Integrity and Privacy Statement

- **Zero Hardcoding:** No report, score, or evidence string in this package was pre-baked or synthesized.
- **Credential Sanitization:** All screenshots and logs have been inspected per `DEMO_AND_SUBMISSION.md` §6 to verify that no API keys, bearer tokens, passwords, or internal endpoints are exposed.
- **Trace Grounding:** Every citation ref (`zetaris:`, `local:`, `run:`, `verify:`, `config:`) corresponds to an actual row or step in the accompanying execution traces in `logs/` and `output_examples/`.
