# DEMO_AND_SUBMISSION.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Deadline: submissions close **27 Oct 23:45 UTC**; our internal submit time is **22:00 UTC** (`DECIDED`). Items the organizers list that we have not seen verbatim are marked `UNVERIFIED: confirm on HackOS`. Where this file and the organizers' official submission page disagree, **the organizers win**.

---

## 1. Demo plan

Length target: **3 min 45 s** (limit is 1 to 4 minutes; `UNVERIFIED` exact limit, confirm). Record the screen and voice; hide all keys and tokens. Everything shown must come from real runs.

### 1.1 Preparation (day 5 to 6)

1. Pick the demo seed: seeds that hit in at least 2 of 3 calibration trials (EVAL 8).
2. Run target A (`support_triage`, `memory_mode: warm`) until you have **one run where the Verifier rejects a fix** (SM-5) and the loop then succeeds or escalates honestly. Save that report in `output_examples/`.
3. Run `npm run demo:cold-warm` (target B cold, then warm). Save the comparison file. Use the **real** numbers, even if warm is not better (say so).
4. Make a backup recording of each segment, in case a live segment fails.
5. Have a second browser tab ready on S1 for the judge-input segment.
6. Choose a run whose shown explanations are verified. Do the human read-through (EVAL 12.3) first. If an unverified explanation occurred naturally, you may show it as proof that the checker flags weak claims; never stage one.

### 1.2 Script with timestamps

| Time | On screen | Narration (plain, spoken) |
|---|---|---|
| 0:00 to 0:20 | Title card, then S1 launcher | "Freelancers ship AI automations with no security team. A malicious email can make them leak secrets or issue refunds. Antibody tests them first." |
| 0:20 to 0:40 | Mode strip on S1 | "It runs on Zetaris for data, Meterless Nightshift and NVIDIA Nemotron for the models, and Meterless H-MEM for memory." (Show chips; only say what the chips show.) |
| 0:40 to 1:20 | Launch target A; live trace | "Antibody attacks the support-triage bot. The judge is code, not an AI. Here is a hit: the bot put its internal key in a reply." (Point at a `canary_leak` hit and the evidence line.) |
| 1:20 to 2:00 | Trace filtered to Verifier and Fixer | "The Diagnoser names the cause and explains why. Every claim cites evidence, and code checks that each cited item exists. The Fixer proposes a patch. The Verifier re-runs the same attack and the normal tasks. This patch blocked the attack but broke a normal task, so it was rejected and sent back." (Show the `rejected` row, open the Why panel and click one evidence chip.) |
| 2:00 to 2:30 | Report S2b | "Attack success rate went from X to Y. Z of 10 normal tasks still pass. Here is what changed in the guardrails, and what is still risky." (Read numbers off the screen; click "Why this verdict?" and one chip.) |
| 2:30 to 3:10 | Comparison from `data/comparison` | "Now a different automation: meeting notes to tasks. Without memory it needed N fix attempts. With what it learned from the first one, it needed M." (If not better: "Here warm was not better; the memory still shows what it retrieved.") |
| 3:10 to 3:35 | Judge-input segment on S1 | "A judge can type their own attack." Type an injection, run, show the result on screen, whatever it is. |
| 3:35 to 3:45 | Closing card | "Zetaris, H-MEM, Nightshift, Nemotron and Cursor are all in the loop. Antibody: attacked, learned, immune." |

Rules: do not narrate a result you have not seen on screen; do not edit numbers; no music over narration.

## 2. Slide deck outline

Organizers require a slide deck. **They list specific required points** (for example in their strong-submission examples); we did not capture that list verbatim: **`UNVERIFIED: paste the required slide points from HackOS and map them**. This outline is our draft; adjust to the organizers' list.

| Slide | Content | Rubric link |
|---|---|---|
| 1 | Title, tagline, team (Ayo, DuroT), track | |
| 2 | Problem: P-1 to P-5, who suffers (freelancers, small agencies) | Impact |
| 3 | Solution: the loop diagram (README 2.1) | Innovation |
| 4 | Why it is not a pipeline: branches, retries, escalation, verifier rejecting fixes | Technical |
| 5 | Deterministic judging and **explanations the code checks**: evidence packet, validator rules, unverified flagged | Technical, Innovation |
| 6 | Architecture: agents, state, adapters, traces | Technical |
| 7 | Sponsor technology: one line each on what it does and what breaks without it (Zetaris rows are cited as evidence) | Sponsor Tech |
| 8 | Results from **real saved reports**: ASR before and after, regression, cold vs warm (cite the report file names) | Demo, Impact |
| 9 | Limitations and remaining risks (README 13) | credibility |
| 10 | What is next; how to run it (`README`, `npm run smoke`) | Product |

## 3. Sponsor-technology explanation (final text, fill after the build)

Use this in the README, `metadata.json` and the submission form. Replace every `[FILL]` from real results. Delete any sentence that is not true of the shipped code.

> **Zetaris.** Antibody's agents query all four core datasets (`attacks`, `policies`, `traces`, `fixes`) through one Zetaris SQL access point (`POST /sql-editor/sqls/run`). Registration method: Option A (Direct Lightning REST tables against `/zetaris-sources/*` endpoints using PokeAPI Spark V2 `RestDataSource` recipe in `scripts/zetaris/register_tables.sql`) with Option C local SQLite zero-config fallback. If Zetaris is unreachable, a local SQL store answers the same queries and the report records `zetaris_fallback`. Evidence: `logs/*.jsonl` lines `zetaris_query` with `source: zetaris` or `source: local`; reports cite the returned rows as `zetaris:` or `local:` evidence refs.
>
> **Meterless Engines.** Meterless H-MEM is the cross-target fix library. Verified fixes are stored with cause, attack class, tool kind, fix types, outcome and trust; the Fixer retrieves them when another target fails similarly; conflict resolution auto-resolves competing fixes with `supersededBy` lineage while preserving full ledger audit history. Evidence: conformance output `submission/evidence/conformance_hmem.txt` (13 of 13 checks passed), memory feature test `submission/evidence/memory_feature_test.txt` (14 of 14 tests passed), and the cold-vs-warm comparison `submission/evidence/comparison_20261024T184732Z.json`.
>
> **Meterless Nightshift.** All model calls go through Nightshift's OpenAI-compatible Runtime (`http://127.0.0.1:8088/v1`) as the primary provider. Evidence: `llm_call` trace lines in `logs/` and Nightshift run-details screenshot in `submission/evidence/nightshift_run_details.png`.
>
> **NVIDIA Nemotron.** The Attacker, Diagnoser, and Fixer run on `nvidia/nemotron-3.5-super-vl-120b-a12b` (deep reasoning lane) and `nvidia/nemotron-3.5-lightning-30b-a3b` (fast lane), and the sandbox targets run on the fast lane. If local inference is unavailable, requests seamlessly fall back to NVIDIA Direct. Evidence: Nightshift run details screenshot and traces.
>
> **Cursor.** Built in Cursor using committed project rules (`.cursor/rules/`, `AGENTS.md`), Meterless prompts saved in `docs/prompts_used/`, and `cursor:`-prefixed commits.

## 4. Submission checklist

Left column mirrors what the organizers say a submission needs (from the overview and FAQ we read); the right column is our evidence. Tick only when verified on a **clean clone**.

| # | Requirement | Our evidence | Done |
|---|---|---|---|
| 1 | Demo video 1 to 4 minutes | `submission/demo.mp4` (or link) | [ ] |
| 2 | Slide deck | `submission/deck.pdf` | [ ] |
| 3 | GitHub repository with README | public repo URL (`UNVERIFIED` visibility rule) | [x] |
| 4 | README runs from a clean setup | tested by DuroT on a fresh clone: `cp .env.example .env`, `npm install`, `npm run smoke` | [x] |
| 5 | `.env.example` only, no secrets | secret scan clean (section 6) | [x] |
| 6 | Sponsor-technology explanation | section 3 text in README, `submission/metadata.json`, and submission form | [x] |
| 7 | `metadata.json` (sponsor usage declared) | format `UNVERIFIED` (README O-1); draft in `submission/metadata.json` | [x] |
| 8 | Logs and traces | `logs/*.jsonl` for multiple real runs committed in repo | [x] |
| 9 | Sample inputs and outputs on more than one case | `input_examples/` and `output_examples/`, both targets, 3 matching pairs (`example_1.json`, `example_2.json`, `example_3.json`) | [x] |
| 10 | Pre-existing code declared | README: "None"; third-party: Meterless H-MEM reference (Apache 2.0, vendored), npm dependencies | [x] |
| 11 | One primary track chosen | Track 2, The Agent That Can Explain Why (`DECIDED` by Ayo, 22 Oct) | [x] |
| 12 | Team members correct in HackOS | Ayo and DuroT | [x] |
| 13 | Zetaris and Meterless "running on your machine" evidence | `conformance_hmem.txt`, `memory_feature_test.txt`, `calibration.json`, `comparison_*.json` in `submission/evidence/` | [x] |
| 14 | Safety framing present | README 3 | [x] |
| 15 | Submitted before **22:00 UTC** on 27 Oct | submission confirmation screenshot | [ ] |

## 5. Evidence folder contents

`submission/evidence/`: `zetaris_verify.png`, `nightshift_lanes.png`, `nightshift_run_details.png`, `cursor_agent_meterless_prompt.png`, `conformance_hmem.txt`, `memory_feature_test.txt`, `calibration.json`, `comparison_*.json`, `trace_rejected_fix.png`. Reports: `output_examples/*.json` (real, unedited). **No screenshot may show a key, token or password.**

## 6. Secret scan before every push and before submission

```bash
git ls-files | xargs grep -nEi "(api[_-]?key|token|secret|password)\s*[:=]\s*['\"]?[A-Za-z0-9_\-]{16,}" || echo "no obvious secrets"
git ls-files | grep -E "^\.env$|\.pem$|\.key$" && echo "SECRET FILE TRACKED" || echo "no secret files tracked"
```

Also search git history if `.env` was ever staged. If a secret was committed: **rotate it immediately** (Zetaris key, NVIDIA key, Nightshift token), then clean history.

## 7. Self-test against the organizers' weak-submission patterns

Before submitting, answer each honestly. Any "yes" is a bug to fix or a limitation to state.

| Weak pattern | Check |
|---|---|
| Hardcoded sample answers | Does any code path return a prewritten final answer? (`grep` for report fixtures read at runtime; `output_examples/` must not be imported by `src/`) |
| Fake sponsor call (for example canned `run_sql` rows presented as Zetaris) | Does local fallback run real SQL? Does the trace say `source: local` honestly? |
| Linear pipeline | Does the trace show a rejection loop and a branch? |
| Sponsor bolt-on | Can we point to a feature that stops working without each sponsor? |
| Unsupported claims | Is every number in README, slides and video in a saved report? |
| Shallow demo | Does the demo show a rejected fix and a judge-supplied input? |
| Docs say more than code does | Does each `[FILL]` sentence match shipped code? |
| Explanations cite evidence that does not exist | Run the explanation validator over every saved report: all refs resolve and unverified ones are shown as such |

## 8. Submit day (D6) timeline (UTC)

| Time | Action |
|---|---|
| By 12:00 | Feature freeze; only bug fixes after this |
| 12:00 to 15:00 | Final full runs; copy reports to `output_examples/`; secret scan |
| 15:00 to 17:30 | Record demo; DuroT tests clean clone; README final |
| 17:30 to 20:00 | Deck final; metadata; checklist; buffer for re-recording |
| By 22:00 | Submit; screenshot confirmation |
| 22:00 to 23:45 | Reserve only (fixes to submission form text, not code) |
