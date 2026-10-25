# Zetaris Spark V2 REST Integration Contract

Source: `zetaris.com/docs` — REST SQL API & PokeAPI Recipe
Event: Open Agent Hackathon 2026
Track: Track 2 — The Agent That Can Explain Why

## Contract Requirements
1. **Endpoint & Authentication**:
   - `POST {ZETARIS_REST_URL}/sql-editor/sqls/run`
   - Headers: `Authorization: Bearer <ZETARIS_API_KEY>`, `X-Org-Id: <ZETARIS_ORG_ID>`, `Content-Type: application/json`.
   - Body format: `{"query": "<SQL>", "limit": 100}`.

2. **Portable SQL Subset (SPONSOR_ZETARIS §6)**:
   - Must be a single `SELECT` query.
   - Prohibit `JOIN`, subqueries, CTEs (`WITH`), `UNION`, and multi-statements.
   - Enforce via strict client-side AST / regex pre-validation (`validatePortableSql`).

3. **Fallback & Citation Invariants**:
   - On 401/400: surface error immediately; do NOT fallback to local store to avoid masking credential issues.
   - On 5xx/network timeout: retry once with fresh UUID; on second failure, fallback to SQLite store with explicit trace line `source: "local"`.
   - Zero-spoofing rule: never emit `zetaris:` citation prefix when query is answered by SQLite store.
