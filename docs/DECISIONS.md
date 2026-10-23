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
