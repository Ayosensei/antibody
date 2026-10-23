# Meterless Provider Integration Contract

Source: `meterless.ai/engines.html` — POWER: "Add Meterless as a provider"
Event: Open Agent Hackathon 2026

## Contract Requirements
1. **Connection & Base URL**:
   - Default: `http://127.0.0.1:8088/v1` (or configured `METERLESS_BASE_URL`)
   - Standard OpenAI-compatible API paths: `/chat/completions` and `/models`

2. **Authorization & Headers**:
   - `Authorization: Bearer <METERLESS_RUNTIME_TOKEN>`
   - `Content-Type: application/json`
   - `meterless-app: antibody` (configured `METERLESS_APP_ID`)
   - `meterless-scope: user` for chat interactions

3. **Model Routing**:
   - Default route: `meterless/auto`
   - Role routing: `reasoning` (Attacker, Diagnoser, Fixer) vs `fast` (sandbox targets)

4. **Error Handling**:
   - 401 Unauthorized: surface immediately as an authentication failure (invalid/expired token) without masking.
   - Network errors / timeouts / 5xx / 429: retry with exponential backoff up to `MAX_RETRIES`, then switch to fallback provider (`nvidia`) if configured.
   - Zero-secret rule: never log tokens, keys, or passwords in trace lines or stdout.
