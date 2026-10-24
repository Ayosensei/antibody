# DECISIONS.md — Antibody Architecture & Decisions Log

One line per decision: date (UTC), who, decision, reason.

- 2026-10-22 | Ayo | Track 2 (Explain Why) selected for Open Agent Hackathon | Track aligns with verifiable evidence packet requirement and reproducible evaluation.
- 2026-10-22 | Ayo | Stack B (all TypeScript) chosen for frontend and backend | Avoids cross-language drift between schemas, contracts, and frontend components.
- 2026-10-22 | Ayo | Sandbox targets A (support_triage) and B (meeting_tasks) chosen | Provides distinct operational characteristics (money-moving short inputs vs long transcript task creation).
- 2026-10-22 | Ayo | Local demo first as primary demo strategy | Mitigates external network dependencies; local demo meets all track requirements.
- 2026-10-22 | Ayo | Docker not used for our application codebase | Keeps startup fast and dependencies native; Zetaris runs separately in Docker.
- 2026-10-22 | Ayo | AWS Zetaris instance accepted as option | README O-8 closed: Zetaris repo and organizers confirm AWS or local Docker acceptable.
- 2026-10-23 | Ayo & Agent | Node.js minimum requirement set to `>=20.9.0` in package.json engines | Confirmed via `npm view next engines`; Next.js 15/16 requires Node >=20.9.0.
- 2026-10-23 | Ayo & Agent | Vitest selected as test runner | Fast native TypeScript/ESM execution; matches tech lead default in T-A1 specification.
- 2026-10-23 | Ayo & Agent | ESLint 9 Flat Config selected for project linting | Standard Next.js and TypeScript linting setup.
- 2026-10-23 | Ayo & Agent | Zod 3.24.2 selected for runtime contract validation | Strict schema parsing matching DATA_CONTRACTS.md specifications.
- 2026-10-23 | Ayo & Agent | Ports allocated to API (8000) and UI (3100) | Avoids collisions with Zetaris ports (3000, 8888, 10000) and Nightshift (8088).
- 2026-10-23 | Ayo & Agent | Generator interface standardized on generator(role, messages, options) with Nightshift primary and NVIDIA fallback | Complies with Power rule and fallback requirements in README 12.
- 2026-10-23 | Ayo & Agent | Meterless Nightshift 401 Unauthorized surfaced immediately without fallback | Prevents masking bad/expired credentials as network outages.
- 2026-10-23 | Ayo & Agent | Sandbox targets support_triage and meeting_tasks implemented with deterministic guardrail enforcement and TargetRun protocol | Satisfies AGENT_SPEC 5 and DATA_CONTRACTS 4-6 requirements.
- 2026-10-23 | Ayo & Agent | Deterministic judge implemented in pure code (no LLM) evaluating canary leaks, tool allowances, argument rules, and caps | Enforces AGENTS.md Hard Rule 3 and passes all J-01..J-20 and R-01..R-04 fixtures.
- 2026-10-23 | Ayo & Agent | LangGraph-style 6-stage orchestration state machine implemented with deterministic diagnosis, rule/filter/policy fix synthesis, and evidence validation | Implements T-A5 per AGENT_SPEC.md and EVAL.md.
- 2026-10-23 | Ayo & Agent | API server implemented on port 8000 with Server-Sent Events (SSE), Last-Event-ID replay, and standalone HTML report generator | Implements T-A6 per DATA_CONTRACTS.md §11 and DESIGN.md S2b.
- 2026-10-23 | Ayo & Agent | Frontend implemented with pure semantic CSS (BEM .ab-*), dark theme #07080B, metal accents on medals/rims/discs, copy deck per DESIGN.md §11, and live SSE client | Implements T-A7 UI Level L1 without Tailwind or external UI libraries.
- 2026-10-24 | Ayo, DuroT & Agent | Integration & evaluation scripts implemented (smoke, seed-eval, calibrate, cold-warm); calibration measured baseline support_triage 62.5% ASR (5/8 seeds stable) and meeting_tasks 83.3% ASR (5/6 seeds stable) in data/sample/calibration.json; cold vs warm memory comparison saved to data/comparison/ | Completes Tasks T-A8 and T-D8 per EVAL.md and README 8.4.
