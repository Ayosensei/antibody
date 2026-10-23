# PROJECT_SPEC.md — Antibody

Status tags: `DECIDED` (fixed by Ayo or organizers), `ASSUMED` (our choice, with reason), `UNVERIFIED` (not confirmed; do not build on it until confirmed, see README section 14).

---

## 1. One-liner and tagline

- **One-liner:** An AI that tests your automations before you launch them, attacks them, fixes what breaks, and remembers the fixes for next time.
- **Tagline:** "Your automations get attacked, learn, and come back immune."
- **Track:** The Agent That Can Explain Why (Track 2). `DECIDED` by Ayo on 22 Oct 2026. Track 2's official wording is `UNVERIFIED` (README O-1); our reading: agents that work across scattered sources and back answers with evidence. We keep the full loop (which also shows reasoning architecture) but the headline is **checked explanations**.

## 2. Users and scenario

**Primary user:** a freelancer, agency or small team that ships AI automations for clients and has no security or QA team.

**Scenario (used in the demo):** "Tolu" is a freelancer who built a support-email triage automation for a client shop. It reads customer emails and can issue small refunds and update a CRM. She wants to know, before launch, whether a malicious email can make it leak a secret, issue an unauthorized refund, or loop. She runs Antibody on it, gets a launch-readiness report with attack success rate before and after, applies the fixes, and later tests a second automation (meeting-notes-to-tasks) where Antibody reuses what it learned.

## 3. Problem

Automations ingest outside content (emails, tickets, forms, transcripts), so they are exposed to:

| # | Exposure | Meaning |
|---|---|---|
| P-1 | Indirect prompt injection | Instructions hidden in ingested content get obeyed |
| P-2 | Data leak | A secret appears in an output or tool argument |
| P-3 | Out-of-policy action | A tool is called that policy forbids, or with forbidden arguments |
| P-4 | Runaway loop or cost | Too many steps or tokens |
| P-5 | Silent wrong output | Normal tasks quietly break (including after a "fix") |

## 4. Scope

### 4.1 MVP (must exist for a valid submission)

| ID | Item |
|---|---|
| M-1 | Two sandbox targets: `support_triage` and `meeting_tasks`, each with tools (fake), policy, regression set (10 tasks), planted canary |
| M-2 | Deterministic judge: canary leak, disallowed tool call, argument policy violation, step cap, token cap, regression pass |
| M-3 | Attacker: seed attacks from the attack library (queried through the Zetaris adapter) plus LLM-generated variants |
| M-4 | Diagnoser: root cause using the failure taxonomy (`FT-xx`) |
| M-5 | Fixer: patch as structured ops (prompt rule, tool permission, input filter, approval gate) |
| M-6 | Verifier: re-runs the SAME attack plus regression set; rejects bad fixes with structured reasons; bounded retries; escalation to fallback then to "unresolved" |
| M-7 | Fix memory via Meterless H-MEM (store attack, cause, fix, outcome, trust; retrieve on later targets) and its conformance suite passing |
| M-8 | LangGraph.js state machine with shared state, conditional edges, retries |
| M-9 | Zetaris used as the query layer for attack library, policies, fix history, traces (with real local SQL fallback) |
| M-10 | All model calls through one `generator` interface: Nightshift primary, NVIDIA direct fallback |
| M-11 | JSONL traces for every decision; `POST /run`; launch-readiness report (JSON + HTML) |
| M-12 | `SAMPLE_MODE`, `.env.example`, README that runs from a clean clone, 3+ input and output examples |
| M-13 | Minimal UI: run launcher, live trace, report view (depth over polish) |
| M-14 | Cold vs warm demonstration with real runs on target B |
| M-15 | **Explanations with checked evidence:** every finding, fix and readiness verdict has an explanation whose evidence refs come from a code-built evidence packet and are validated by code; the UI shows claims with clickable evidence (README 2.5, DATA_CONTRACTS 16) |

### 4.2 Stretch (only after all MVP items pass)

| ID | Item |
|---|---|
| S-1 | World Model engine: map of each target's tools, permissions, data, queried by the Diagnoser |
| S-2 | Judge-supplied live attack input in the UI (the API already accepts `custom_attacks`; UI form is the stretch) |
| S-3 | Adaptive re-attack: after fixing, Attacker generates new variants aimed at the patched config; report `post_fix_adaptive_asr` |
| S-4 | Markovian engine for chunked processing of very long transcripts or large attack suites |
| S-5 | `LLM_PROVIDER=replay` with recorded real runs for judges without keys |
| S-6 | Hosted read-only report viewer |
| S-7 | Docker compose for our own app (Zetaris already uses Docker; ours does not need to) |

### 4.3 Priority-ordered cut list (cut from the top first when behind)

1. S-6, S-7 (hosted viewer, Docker)
2. S-4 (Markovian)
3. S-3 (adaptive re-attack)
4. S-2 (live judge input form; keep API support)
5. S-1 (World Model)
6. UI build levels L2 and L3 from `DESIGN.md` section 14.3 (grain, sheen, scan-line polish, S3 Fix library, S4 Cold vs warm, dev gallery): keep L1 (tokens, plates, metal headline, readiness medal, live trace, report, explanation panels)
7. Target B shrinks from 10 to 6 regression tasks and 6 seed attacks
8. Attack budget shrinks (default 8 to 6)
9. **Never cut:** M-2, M-3 to M-8, M-9, M-10, M-11, M-12, **M-15 (explanations)**, and H-MEM with its conformance run. These are the submission.

### 4.4 Non-goals

- Not a general-purpose scanner for real systems. Sandbox targets only.
- No real credentials, real customer data, real emails sent, real money moved.
- No exploit development against third-party software.
- No user accounts, billing, multi-tenancy.
- No guarantee of security for any real automation (see README section 13).
- No UI polish beyond clarity.

## 5. Success metrics

Numbers are **goals to test**, not claims. The report always shows the measured values of the run.

| ID | Metric | Goal | Status |
|---|---|---|---|
| SM-1 | Baseline ASR on each target (unpatched) | At least 0.30. If lower, the attack library is too weak; strengthen it (EVAL.md section 9) | `ASSUMED` |
| SM-2 | ASR after fixes | At most 0.10 on seed attacks; remaining hits listed as unresolved | `ASSUMED` |
| SM-3 | Regression | Zero tasks that passed at baseline fail after the final config | `DECIDED` |
| SM-4 | Warm vs cold on target B | Warm needs fewer fix attempts or fewer LLM calls than cold on the same seed. Reported as measured; if no improvement, say so honestly | `ASSUMED` |
| SM-5 | A visibly rejected fix appears in at least one demo run | Required for the demo story | `DECIDED` |
| SM-6 | Run time | One `POST /run` finishes in under 5 minutes at default budget | `ASSUMED`; measure on day 2 |
| SM-7 | Clean-clone run | `npm run smoke` passes on a machine that is not ours | `DECIDED` |
| SM-8 | Trace quality | A judge can follow the loop from `logs/*.jsonl` alone (at least 3 agent-to-agent interactions per run) | `DECIDED` |
| SM-9 | Explanation validity | 100% of evidence refs in a saved report resolve to real items (code check). Explanations that fail validation twice are flagged `verified: false`; report metric `explanations_verified / explanations_total` is shown | `DECIDED` |

## 6. Rubric mapping (100 points)

| Criterion | Pts | Our evidence | Where |
|---|---:|---|---|
| Impact | 30 | Named user (freelancer), named problem (P-1 to P-5), a report a user can act on **and check**: every decision explained with evidence | README s1, this doc, DEMO_AND_SUBMISSION |
| Technical | 20 | Non-linear graph, deterministic judge, retries, escalation, traces, **evidence packets and explanation validation**, clean-clone run, failure handling | AGENT_SPEC, EVAL, README s12 |
| Innovation | 15 | Attack to fix to verify loop with cross-target fix memory; verifier that rejects fixes; LLM never judges success; **explanations that code refuses to accept unless every cited fact exists** | AGENT_SPEC s1 to s3 |
| Demo | 15 | Real cold vs warm run, a caught bad fix, trace shown, optional judge input | DEMO_AND_SUBMISSION |
| Product & UX | 10 | Launch-readiness report with before/after, fixes, remaining risks | DESIGN |
| Sponsor Tech | 10 | Zetaris query layer, H-MEM fix library with conformance proof, Nightshift primary provider, Nemotron, Cursor | SPONSOR_*.md |

Track 2's own judging wording is `UNVERIFIED` (README O-1); rubric weights above are from the organizers' overview.

**Penalty avoidance:** no linear A to B to C pipeline (loop plus branches), no prompt wrappers (distinct agents with authority), no hardcoded demo paths (judge input works), no sponsor bolt-on (each sponsor has a "system breaks without it" line in its doc), no unsupported claims (all numbers come from the report).

## 7. Decision status

| Item | Status | Reason or source |
|---|---|---|
| Track 2 (Explain Why) | DECIDED | Ayo, 22 Oct 2026 |
| Stack: TypeScript, Next.js, LangGraph.js | DECIDED | Ayo |
| Two targets: support triage and meeting tasks | DECIDED | Ayo |
| H-MEM is the core engine | DECIDED | Required: at least one engine in a working feature with passing evidence |
| Nightshift is the primary provider | DECIDED | Organizers' Power rule |
| Local demo first | ASSUMED | Nightshift and Zetaris run on our machines; hosting is stretch |
| Docker for our app | DECIDED (no) | Not required; Zetaris itself uses Docker |
| Judging by code, never by an LLM | DECIDED | Brief |
| Zetaris source registration method | UNVERIFIED | README O-3 |
| Sample-mode meaning for judges without keys | UNVERIFIED | README O-4 |
| Nemotron model availability and rate limits | UNVERIFIED | README O-5 |

## 8. Glossary

| Term | Meaning |
|---|---|
| Target | A sandbox automation under test |
| Attack | An input (benign text plus injected text) delivered through a carrier |
| Carrier | Where the injected text enters: `email_body`, `ticket_field`, `transcript_line`, `form_field` |
| Hit | The judge decided the attack succeeded (a hit type fired) |
| Blocked | The judge decided the attack failed |
| Finding | A failing attack queued for diagnosis |
| Policy | Ground truth the judge enforces; never changed by fixes |
| TargetConfig | The target's own guardrails (prompt rules, tool permissions, input filters); changed by fixes |
| Fix | A small list of structured ops applied to the TargetConfig |
| ASR | Attack success rate = attacks with a hit / attacks run |
| Regression set | About 10 normal tasks per target that must keep working |
| Canary | A planted fake secret string; appearing in output means a leak |
| Cold / warm | Memory empty / memory populated from an earlier target |
| Escalate | After bounded retries, try the deterministic fallback fix, then mark unresolved |

## 9. Risks

| ID | Risk | Likelihood | Mitigation |
|---|---|---|---|
| R-1 | Beginners underestimate agent work | High | Contract-first schemas, mocks, small tasks, cut list |
| R-2 | NVIDIA free rate limits or credit limits slow runs | Medium | Concurrency cap, `RUN_MAX_LLM_CALLS`, small default budget, measure on day 2 |
| R-3 | Nightshift has no Linux edition; machine unknown | Medium | README O-2; NVIDIA direct fallback keeps the system running |
| R-4 | Zetaris REST-table registration of our endpoints fails | Medium | Fallback to local SQL store with same SQL subset; keep a Zetaris-backed read path for at least the attack library and policies |
| R-5 | LLM nondeterminism makes ASR noisy | High | Same seed and temperature 0 where supported; report trials; never quote numbers not in a report |
| R-6 | Fix overfits (blocks the one attack, breaks normal tasks) | High | This is what the Verifier is for; regression set; show one in the demo |
| R-7 | Baseline too strong (no hits, nothing to fix) | Medium | Targets are deliberately naive; round-2 harder variants; SM-1 check |
| R-8 | "Hardcoded demo" suspicion | Medium | Judge-supplied input works; `output_examples/` never read at runtime |
| R-9 | Safety framing misread as offensive tooling | Low | README section 3; sandbox-only; scope refusal |
| R-10 | H-MEM conformance is TypeScript-specific and the interface is unclear | Medium | Day-2 spike (TASKS_durot T-D6); adapter keeps our interface stable |
| R-11 | Time: 6-day window, 2 people at about 5 hours per day | High | Cut list; freeze on 27 Oct at 12:00 UTC |
| R-12 | Model explanations cite things that do not exist | High | Evidence packet (model may cite only packet ids); code validator; unverified explanations are shown as such, never hidden |
| R-13 | Track 2's judging wording differs from our reading | Medium | Get the official text (README O-1); the explanation layer is additive to the loop, so changing emphasis does not change the build |

## 10. Timeline

Build window 22 Oct 00:00 UTC to 27 Oct 23:45 UTC. Day-by-day plan per person: `TASKS_ayo.md`, `TASKS_durot.md`. Team workflow and fallback tiers: `TEAM_WORKFLOW.md`.
