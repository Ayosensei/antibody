# Decisions

### 2026-10-23 — Initial repository setup and baseline push
Decision: Pushed baseline docs, cursor rules, and styles to `origin/main` before branching.
Why: Ensure clean root commit on GitHub for collaborator visibility and reproducible diffs.
Reversible? Easy.

### 2026-10-23 — Fast-track execution of Task T-A1
Decision: Full build of T-A1 scaffolding, contracts, config, tracing, and shell executed via "Just run" escape hatch.
Why (user's words): "Just run the T-A1".
Reversible? Easy (version-controlled on feature branch).

### 2026-10-23 — LLM Provider 401 vs Fallback Behavior
Decision: HTTP 401 Unauthorized from Meterless Nightshift surfaces immediately with a plain error message and does not mask as a fallback. Network failures, 5xx errors, and timeouts trigger fallback to NVIDIA direct with a `fallback_provider` trace line.
Why (user's words): "Yeah, it does" — matches TASKS_ayo.md acceptance criteria ("wrong token gives a clear error (401 surfaced, not swallowed)").
Reversible? Easy.

### 2026-10-23 — Sandbox Guardrail Verification Priority
Decision: Prioritize test verification of `block_pattern` input filtering (preventing dangerous text from reaching the LLM) before testing loop/cap enforcement.
Why (user's words): "block_pattern"
Reversible? Easy.

### 2026-10-23 — Deterministic Judge Architecture (Hard Rule 3)
Decision: Implemented `src/judge/` as pure code modules (`canary.ts`, `caps.ts`, `tool-policy.ts`, `judge.ts`, `regression.ts`, `index.ts`) completely decoupled from LLM adapters.
Why: LLMs must never judge success (AGENTS.md Hard Rule 3 and EVAL.md §2). Validated with 100% pass on J-01..J-20 and R-01..R-04 fixtures.
Reversible? Easy.
