# SPONSOR_CURSOR.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. **(guide)** = organizers' setup guide; **(docs)** = `cursor.com/docs` pages we read on 22 Oct 2026. Team access instructions were still "to be added" in the sponsor folder.

---

## 1. Role (`DECIDED`)

Cursor is the **required development environment**. Meaningful use counts toward Sponsor Tech (10 points). "Meaningful" for us means: the project is built through Cursor's Agent using committed project rules, the Meterless prompt library, and the Zetaris `AGENTS.md` rules, and we can show that.

## 2. Why the project loses something without it

Two people, beginners on agents, about 5 hours a day each: coding agents are how the scope fits. The rules files are what keep two people and a coding agent consistent with the contracts. Without them the agent invents APIs and field names, which this project forbids.

## 3. Access and setup (guide)

1. Download Cursor from `cursor.com/download`, install, sign in. Team access method: `UNVERIFIED` (ask the Help desk if not received).
2. Agent chat, pick a model from the model menu. The guide recommends **Composer** for everyday coding and **Grok** for harder, longer work; both draw on the Cursor credit "where available on your plan". Names shown in your menu may differ: **UNVERIFIED** which models the hackathon credit covers.
3. Check: ask the Agent to create and run a Python or Node file that prints "hello" **without entering any API key**. Cursor needs no key of its own.
4. **Never** put the Meterless Runtime token or NVIDIA key into Cursor's model-provider settings. They belong in Nightshift (NVIDIA key) and our app's `.env` (Meterless token). **(guide)**
5. Cursor Learn lessons on tool calling and agents are recommended for beginners (guide).

## 4. Project rules (docs, `DECIDED`)

Cursor's current documentation describes **project rules as files in `.cursor/rules/`** (`.md` or `.mdc`; `.mdc` supports frontmatter such as `description`, `globs`, `alwaysApply`) and says **`AGENTS.md`** in the project root (or nested folders) is a supported plain-markdown alternative. A legacy `.cursorrules` file does not appear in the current docs, so **we do not use it** (`.cursorrules` was in the original brief; replaced). Plain `.md` files in the rules folder have no frontmatter control, so **we use `.mdc`**.

Files we ship (full text in this delivery):

| File | Type | When it applies |
|---|---|---|
| `AGENTS.md` (root) | plain markdown | always; the coding-agent brief |
| `.cursor/rules/00-project.mdc` | `alwaysApply: true` | every request |
| `.cursor/rules/10-contracts.mdc` | globs `src/**/*.ts` | when editing source |
| `.cursor/rules/20-no-hardcoding.mdc` | globs `src/**/*.ts`, `data/**` | when editing source or data |
| `.cursor/rules/30-secrets-and-safety.mdc` | `alwaysApply: true` | every request |
| `.cursor/rules/40-sponsors.mdc` | globs `src/adapters/**` | when editing adapters |

Rule limits: keep each rule under about 500 lines and focused **(docs guidance, approximate)**; ours are far shorter. Rules are checked in git so both teammates get them.

## 5. How we use Cursor day to day

1. Open the repo folder in Cursor. Start every task by pasting the task block from `TASKS_<name>.md` into Agent chat and adding: "Read AGENTS.md and the docs named in the task. Do not invent APIs. Mark anything unknown as UNVERIFIED and ask me."
2. **Meterless prompt library:** at `meterless.ai/engines.html` use **IMPLEMENT: Give my agent memory** (H-MEM) and **POWER: Add Meterless as a provider** by clicking Copy and pasting into Agent chat with the project open. Run the tests or conformance checks the prompt describes. Keep the prompt text you used in `docs/prompts_used/` (create the folder) so we can show it. **(guide)**
3. **Zetaris:** Zetaris's getting-started repo includes an `AGENTS.md` that teaches Cursor the Zetaris rules (Lightning SQL, one statement at a time, never print credentials). When working on `src/adapters/zetaris.ts`, copy its rules into context or open that repo folder in a second Cursor window. Use their starter prompt: "Read AGENTS.md and follow it. Run python3 scripts/preflight.py ... Dry-run before creating anything and wait for my go-ahead." **(guide)**
4. **Zetaris API key:** a human creates it; the agent must not.
5. Commit often with the prefix `cursor:` when a change was mostly agent-written (useful evidence, no other meaning).
6. After each agent change run `npm run test` and `npm run lint` (`ASSUMED` scripts) before committing.

## 6. Evidence for judges

| Evidence | Where |
|---|---|
| Rules and `AGENTS.md` committed with history | repo |
| Screenshot of Agent chat with a Meterless prompt applied and tests running | `submission/evidence/cursor_*.png` |
| Saved prompts used | `docs/prompts_used/` |
| Short paragraph in README and `metadata.json` saying how Cursor was used | README section 16 (`metadata.json` format `UNVERIFIED`, README O-1) |
| Commit log showing `cursor:` prefixed commits | git |

## 7. Acceptance checks

| Check | Pass |
|---|---|
| C-1 Cursor installed, credit active, Agent ran the hello file with Composer or Grok | yes |
| C-2 `.cursor/rules/*.mdc` visible in Cursor's rules UI | yes (Cursor shows project rules in settings; UI location `UNVERIFIED`) |
| C-3 Agent given a task that violates a rule (for example "hardcode the demo output") refuses or flags it | yes, tested once on day 1 |
| C-4 At least 3 saved Meterless prompts in `docs/prompts_used/` | yes |

## 8. Open questions

How the team obtains Cursor access (sponsor page: to be added); which models the credit covers; whether judges expect specific proof of Cursor use beyond the README line (README O-1 and Help desk).
