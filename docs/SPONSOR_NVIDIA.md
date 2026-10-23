# SPONSOR_NVIDIA.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. **(guide)** = organizers' Participant Setup Guide; **(site)** = `build.nvidia.com` pages we read on 22 Oct 2026. Hackathon credit details were still "to be confirmed" in the sponsor folder.

---

## 1. What we use it for (`DECIDED`)

NVIDIA Nemotron models are the models behind the **three reasoning agents** (Attacker, Diagnoser, Fixer) and the **sandbox targets**. They are reached **through Meterless Nightshift** (the Power rule), with direct NVIDIA API as a fallback.

| Role | Used by | Model intent |
|---|---|---|
| `reasoning` | Attacker (mutation), Diagnoser, Fixer | Larger Nemotron model (for example the "deep worker" lane) |
| `fast` | Sandbox targets (many short calls) | Smaller Nemotron model (for example the "fast worker" lane) |

Example model ids from the guide, **not guaranteed entitlements**: fast `nvidia/nemotron-3.5-lightning-30b-a3b`; deep `nvidia/nemotron-3.5-super-vl-120b-a12b`. The `build.nvidia.com` home page also listed `nvidia/nemotron-3-ultra-550b-a55b` and a non-NVIDIA model with free endpoints (site). Availability for **our key** and rate limits: `UNVERIFIED` (README O-5).

## 2. Why the system loses something without it

The agents have no reasoning engine. The NVIDIA award requires Nemotron to materially power a working feature through Nightshift; our attack generation, diagnosis and fix proposals are exactly that. If a different model silently handled the calls, we could not claim the award; hence pinned lanes and saved evidence.

## 3. Get the key (guide)

1. Open `build.nvidia.com/models`, sign in.
2. Select a Nemotron model that offers an API endpoint (some are marked **Free Endpoint**, for development and prototyping, subject to NVIDIA's access limits and terms).
3. Generate or copy the API key.
4. **Primary route:** paste it into Nightshift, Setup tab, Providers, NVIDIA. It is **not** put in our `.env`.
5. **Fallback route only:** put it in our `.env` as `NVIDIA_API_KEY` with `NVIDIA_BASE_URL`. Take base URL, key and model id **from the same route**; mixing routes (for example a Meterless key with NVIDIA's address) is the commonest cause of 401, 403 and 404 errors **(guide)**.

`NVIDIA_BASE_URL` is `UNVERIFIED` in this repo: copy the value shown on the model's API tab on `build.nvidia.com` (README O-5). Models are called with the OpenAI chat-completions format.

## 4. Configuration

```bash
# Fallback only (the primary route is configured inside Nightshift)
NVIDIA_BASE_URL=              # copy from the model's API page; UNVERIFIED
NVIDIA_API_KEY=               # never commit
MODEL_REASONING=nvidia/nemotron-3.5-super-vl-120b-a12b   # example, confirm in catalog
MODEL_FAST=nvidia/nemotron-3.5-lightning-30b-a3b         # example, confirm in catalog
```

Role to model resolution (`src/adapters/llm/`):

| Provider | `reasoning` | `fast` |
|---|---|---|
| `meterless` | `METERLESS_MODEL_REASONING` (default `METERLESS_MODEL`) | `METERLESS_MODEL_FAST` (default `METERLESS_MODEL`) |
| `nvidia` | `MODEL_REASONING` | `MODEL_FAST` |

## 5. Rate limits and cost control (`ASSUMED`; measure)

- Free endpoints have access limits **(guide)**; numbers `UNVERIFIED`.
- Controls: `CONCURRENCY=4`, `RUN_MAX_LLM_CALLS=400`, `ATTACK_TRIALS=1`, `attack_budget=8`. On HTTP 429: backoff 2 s, 4 s, then switch provider per README section 12; log `fallback_provider`.
- Day-2 task: run one full `POST /run`, record total model calls and seconds in `docs/` notes, and adjust the defaults. Do not quote run times in the submission without a saved report.
- Mixed credit: the guide says Cursor credit pays for **building**; our Nemotron route is used **only when the product runs**. Do not put NVIDIA or Meterless keys into Cursor's model settings.

## 6. Evidence for the award (guide: "show what Nemotron actually does")

1. Nightshift lanes screenshot with a Nemotron lane active.
2. Nightshift run details or logs for one full run showing the Nemotron model on Attacker, Diagnoser or Fixer calls.
3. Our trace excerpt: `llm_call` lines with role and provider.
4. One sentence per agent in the submission: what Nemotron does there (for example "Diagnoser reads the run trace and picks a root cause from the taxonomy").

## 7. Acceptance checks

| Check | Pass |
|---|---|
| N-1 key created, saved in Nightshift Providers | Nemotron models appear in Nightshift's catalog |
| N-2 one lane test inside Nightshift | response plus provider and model shown |
| N-3 our smoke test model line | PASS |
| N-4 fallback: stop Nightshift, set `NVIDIA_API_KEY`, run | run completes, `fallback_provider` in trace |
| N-5 evidence items 1 to 3 saved | files in `submission/evidence/` |

## 8. Open questions

README O-5 (base URL, entitled models, rate limits). Also `UNVERIFIED`: whether hackathon "credits" apply to the free endpoint or to a separate quota, and how to claim them (sponsor page still said to be added).
