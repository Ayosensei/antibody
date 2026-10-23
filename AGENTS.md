# AGENTS.md — Instructions for coding agents (Cursor)

You are helping build **Antibody**, a hackathon project (Open Agent Hackathon 2026, Track 2: The Agent That Can Explain Why). Two humans (Ayo, DuroT) review your work. Read this file first, then the docs named in the task.

## What the project is
Antibody attacks sandbox AI automations, diagnoses failures, patches them, verifies the patch with the SAME attacks plus a regression set, and remembers fixes (Meterless H-MEM). Success is decided by **deterministic code**, never by an LLM. Overview: `README.md`. Details: `docs/PROJECT_SPEC.md`, `docs/AGENT_SPEC.md`, `docs/DATA_CONTRACTS.md`, `docs/EVAL.md`.

## Stack (decided)
TypeScript everywhere. Next.js (`app/`, port 3100). API server (`src/server.ts`, port 8000). LangGraph.js for the state machine (package name and version are UNVERIFIED: check before installing). No Docker for our app.

## Hard rules
1. **Never invent facts.** Do not guess APIs, package names, versions, flags, endpoints, model ids, Zetaris syntax, Meterless/H-MEM method names or NVIDIA URLs. If it is not in this repo's docs or in text the human pasted, write `UNVERIFIED: confirm on <source>`, add it to README section 14 if new, and ask the human.
2. **Contracts first.** All types live in `src/schemas.ts` and match `docs/DATA_CONTRACTS.md` exactly (field names, enums, validation). Do not rename fields. Do not add fields without the human approving a contract change.
3. **LLMs never judge success.** `src/judge/` is pure code and must not import any model adapter.
4. **No hardcoded results.** Never return canned answers, canned Zetaris rows, or output keyed to a known sample input. `output_examples/` is written from real runs and is never read by running code. Test doubles live only under `test/`.
5. **Fixes are data.** A fix is a list of ops (see contracts) applied to `TargetConfig`. Never execute model-written code.
6. **Trace everything.** Every agent decision, model call, Zetaris call and memory read or write writes one `TraceLine` (`src/tracing.ts`). No secrets in logs.
7. **Secrets.** Never create, print, log or commit keys, tokens or passwords. `.env` is git-ignored; `.env.example` has placeholders only. The Zetaris API key is created by a human in the Zetaris UI, not by you. Do not put Meterless or NVIDIA keys into Cursor settings.
8. **Safety scope.** Attacks run only against our own sandbox targets with fake data and `@example.test` addresses. No real URLs, no real people, no exploit code for real software. If asked to go beyond this, stop and say why.
9. **Failure handling.** Implement the failure table in `README.md` section 12 for any code you touch (timeouts, retries, fallback with honest `degraded` flags).
10. **Zetaris rules:** Lightning SQL only; send one statement per request; stay inside the portable SQL subset in `docs/DATA_CONTRACTS.md` section 13; explicit column lists; never print credentials; dry-run before creating objects and wait for the human's go-ahead.
11. **Explanations cite only evidence-packet ids.** Never let a model cite anything outside the packet built by `src/explain/evidence.ts`; every explanation passes `validateExplanation`; never relabel a local-store row as Zetaris; never hide an unverified explanation.
12. **Third-party code:** the Meterless H-MEM reference is vendored under `src/adapters/engines/hmem-ref/` with its license. Do not edit it except as the docs say; wrap it in `src/adapters/engines/hmem.ts`.

## Workflow
- Work on one task at a time from `docs/TASKS_<name>.md`; stay inside its acceptance criteria.
- Branch name `feat/<task-id>-<slug>`. Small commits. Prefix `cursor:` on commits that were mostly agent-written.
- Before finishing: `npm run test`, `npm run lint`, `npm run check:env`. Paste command output in your summary.
- If a doc and the code disagree, say which and propose the fix; do not silently pick one.
- Prefer small, boring, readable code. The humans are learning agents; add short comments where logic is non-obvious.

## Commands (contract; if one does not exist yet, creating it is part of the task)
`npm run dev` · `npm run check:env` · `npm run test` · `npm run smoke` · `npm run eval:seed` · `npm run eval:calibrate` · `npm run conformance:hmem` · `npm run test:memory` · `npm run demo:cold-warm`

## Ask the human when
A contract would change; an UNVERIFIED item blocks you; a task needs a secret; a sponsor behavior is unclear; you are about to cut scope.
