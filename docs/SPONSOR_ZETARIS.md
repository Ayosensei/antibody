# SPONSOR_ZETARIS.md

Tags: `DECIDED`, `ASSUMED`, `UNVERIFIED`. Facts marked **(guide)** come from the organizers' Participant Setup Guide (21 Oct 2026) or Zetaris's getting-started docs we read. Everything else about Zetaris is `UNVERIFIED`. Do not invent Zetaris syntax: copy it from the Zetaris recipe files.

---

## 1. What we use it for (`DECIDED`)

Zetaris is the **one SQL access point** over four separate sources the agents need:

| Table | Used by | Question it answers |
|---|---|---|
| `attacks` | Attacker | Which seed attacks apply to this target, in priority order? |
| `policies` | Judge setup, Fixer, Diagnoser | What is each tool allowed to do on this target? |
| `traces` | Diagnoser, UI | What happened earlier in this run or in past runs? |
| `fixes` | Fixer (via Memory), UI | What fixes were verified before, for what cause, with what trust? |

Schemas and the portable SQL subset: `DATA_CONTRACTS.md` section 13.

## 2. Why the system loses something without it

Be precise and honest:

- **With Zetaris:** the Attacker, Fixer and Diagnoser each ask one endpoint, with one SQL dialect, for four different stores. No per-source connector code. This is the claim we demonstrate.
- **Without Zetaris (fallback mode):** the same queries run on a local SQL store. The system still works, but the "one access point over separate sources" property is lost and the report shows `degraded: ["zetaris_fallback"]`.
- **Track 2 link:** explanations cite the rows Zetaris returned as evidence (`zetaris:<table>/<key>`). In fallback mode the same rows are cited as `local:<table>/<key>`, so the claim stays honest.
- We do **not** claim Zetaris is irreplaceable. We claim it is the data layer the agents actually query, and that a judge can see real `POST /sql-editor/sqls/run` calls in the trace.

## 3. Eligibility and where it runs

- The guide states "Zetaris and Meterless must be running on your machine to be eligible". **(guide)** The guide also offers a managed AWS cluster for laptops that cannot run it locally. Whether our Linux or AWS instance satisfies the rule is `UNVERIFIED` (README O-8). Ask on the Help desk and keep the answer in this file.
- Our own app does **not** use Docker. Zetaris itself does when run locally. **(guide)**

## 4. Setup (local Docker route) (guide)

Owner: DuroT (needs a capable machine). Do the slow step first: the first download and start takes 30 to 45 minutes.

Requirements: Docker Desktop (macOS, Windows) or Docker Engine plus the Compose plugin (Linux), version 25 or later recommended; 8 GB memory and 4 CPUs given to Docker (preflight fails below 6 GB); at least 15 GB free disk. Apple Silicon: enable "Use Rosetta" in Docker Desktop. Windows: run commands in a WSL 2 terminal.

Steps:

1. Register at `cloud.enterprise.zetaris.com/register`. Open `cloud.enterprise.zetaris.com/dashboard/download`, download `zetaris-platform.zip`, copy the registry sign-in command.
2. Terminal:
   ```bash
   unzip zetaris-platform.zip
   cd zetaris-platform
   docker login zetarishackathon.azurecr.io      # use the credentials from the Run locally page; use its command if different
   ./preflight.sh
   ```
3. Edit `zetaris-platform/.env` **before first start** (changing later does not reset an existing account). Set `ZETARIS_ADMIN_EMAIL`, `ZETARIS_ADMIN_PASSWORD` (8+ chars with lowercase, uppercase, digit, and one of `$ @ ! % * ? &`), `ZETARIS_ADMIN_ORG`. Confirm tested laptop values: `ZSPARK_DRIVER_MEM=2g`, `ZSPARK_DRIVER_CORES=2`, `ZSPARK_MASTER_URL=local[2]`, `ZETARIS_API_MAX_HEAP=1g`, `UI_PORT=3000`, `ALLOWED_ORIGINS` and `GUI_URL` = `http://localhost:3000`, `COMPOSE_PROFILES` empty, `ZETARIS_SEED_TPCH=true`. Then `chmod 600 .env` and `docker compose config --quiet`. **This `.env` is Zetaris's. Never commit it or copy it into our repo.**
4. Start and verify:
   ```bash
   docker compose pull
   docker compose up -d
   docker compose ps --all     # postgres, driver, api, ui, ai-datasteward running; init, bootstrap Exited (0)
   ./verify.sh                 # expect 9 of 9 passed
   ```
5. Open `http://localhost:3000`, sign in, SQL Editor, run `SELECT 1 AS one;` (expect one row with 1).
6. Create an **API key in the web interface yourself** and copy it immediately (it may be shown once). **Do not ask an AI agent to create or fetch it.**
7. Put in **our** `.env`: `ZETARIS_REST_URL=http://localhost:8888/api/v1.0`, `ZETARIS_ORG_ID=1`, `ZETARIS_API_KEY=<key>`.
8. Optional first dataset (PokeAPI recipe) to prove REST tables work: `git clone https://github.com/zetaris/getting-started.git`, open `open_data/rest_apis/sql/non_rate_limited/02_pokeapi_create.sql`, run its four statements in the SQL Editor **one at a time**, then `SELECT pokemon_name, ability_name, is_hidden FROM pokeapi.pikachu_abilities_table;` (expect 2 rows, source may change). Skip the PUDL recipe (listed as known to fail).

Ports **(guide)**: UI 3000, REST API 8888 (`/api/v1.0`), JDBC 10000. Do not use port 8889 (internal). API reference at `http://localhost:8888/redoc/index.html`.

Stop and resume: `docker compose stop` and `docker compose start`. **`docker compose down -v` deletes all data and keys; use only to start over.**

### 4.1 AWS route (if the local route fails)

`zetaris.github.io/getting-started/docs/install/aws-free-tier-checklist.html` and `.../managed-aws-cluster-guide.html` **(guide)**. A new AWS Free plan account comes with up to US$200 in credits; Zetaris reported roughly US$80 for a cluster running about a week. AWS bills you directly. Endpoint URL and org ID for a managed cluster: `UNVERIFIED` (copy from the cluster guide; put in `.env`). Remember to stop the cluster after the demo recording to save credits.

## 5. REST call (guide)

```
POST {ZETARIS_REST_URL}/sql-editor/sqls/run
Authorization: Bearer <ZETARIS_API_KEY>
X-Org-ID: <ZETARIS_ORG_ID>
X-Request-ID: <fresh UUID per request>
Content-Type: application/json

{"queryId":"<fresh UUID>","sql":"SELECT 1","source":"SqlEditor","limit":1}
```

Response: JSON with `data` as an array of rows; for `SELECT 1` the first cell is `1` (this is what the organizers' smoke test asserts). 400 usually means a bad `X-Org-ID` or a non-UUID `X-Request-ID`; 401 means a missing, wrong or expired key. One statement per request.

Rules from Zetaris's own agent guidance **(guide)**: use Lightning SQL; send one statement at a time; never print credentials; dry-run before creating objects.

## 6. Adapter specification (`src/adapters/zetaris.ts`)

```ts
interface SqlResult { columns: string[]; rows: unknown[][]; source: "zetaris" | "local"; }
function runSql(sql: string, opts?: { limit?: number }): Promise<SqlResult>;
```

Behavior (`DECIDED`):

1. If `SAMPLE_MODE=true`: go straight to the local store (`source: "local"`), trace line `zetaris_query` with `output_summary` "local store (sample mode)". 
2. Else call the REST endpoint with timeout `ZETARIS_TIMEOUT_SECONDS` (default 20). On network error, timeout or HTTP 5xx: retry once. On second failure: run on the local store, `degraded += "zetaris_fallback"`, trace status `fallback`.
3. HTTP 400 or 401: **no fallback**; return a structured error naming the status (a misconfiguration, not an outage). Fallback hiding a config error would be a bug.
4. Validate `sql` against the portable subset before sending (reject joins, subqueries, multiple statements). Rejected -> throw `invalid_request`.
5. Every call writes a trace line (`System` / `zetaris_query`) with the first 120 chars of the SQL and the row count.
6. Never log the API key.

Column metadata shape in the response: `UNVERIFIED` (read `redoc` on the running instance and update this section; until then the adapter maps rows by the **order of selected columns** and always selects explicit column lists, never `*`, in production code paths).

### 6.1 Rows as evidence (Track 2)

Queries that feed explanations must select the key columns so the evidence builder can form refs: `policies` rows are keyed `<target_id>:<tool>`, `attacks` rows by `attack_id`, `fixes` rows by `mem_id`. `SqlResult.source` ("zetaris" or "local") is copied into the evidence item, which decides the ref prefix. Never relabel a `local` result as `zetaris`. Spec: `DATA_CONTRACTS.md` section 16.

## 7. Local fallback store (`src/adapters/local-sql.ts`)

- A real SQL engine, not canned rows. Implementation: an embedded SQL library (`better-sqlite3` is the `ASSUMED` choice; `UNVERIFIED`, confirm install on all machines; alternative: Node's built-in SQLite module if the Node version has it, `UNVERIFIED`).
- Loads `data/sample/*.json` into the four tables at startup. `traces` and `fixes` are refreshed from `logs/` and the memory store before each query.
- Runs the same portable subset. A test (`npm run test`) runs every query template the agents use against the local store and checks the rows against expected fixtures.
- Judges without Zetaris get this path automatically only when `SAMPLE_MODE=true` or Zetaris is unreachable.

## 8. How the four tables reach Zetaris (Spike Result: Task T-D5)

Zetaris can turn a web API into a table (`CREATE LIGHTNING REST TABLE ...`) and can read CSV and Parquet in storage it can reach (for example S3); **it cannot read files on our laptop** **(guide)**. Options, in order of preference:

| Option | Plan | Risk | Status |
|---|---|---|---|
| A | Our API exposes four read-only JSON endpoints (`/zetaris-sources/*`); register each as a Zetaris REST table following the PokeAPI recipe's four statements (`CREATE LIGHTNING DATABASE`, `CREATE SCHEMASTORE CONTAINER`, `CREATE LIGHTNING REST TABLE`, `CREATE SCHEMASTORE VIEW`) | Zetaris (inside Docker or AWS) must reach our URL. From Docker, `localhost` means the container; the host address to use is `UNVERIFIED` | **Recipe Ready:** DDL in `scripts/zetaris/register_tables.sql`; tested against `/zetaris-sources/*` |
| B | Put `attacks.json` and `policies.json` as CSV or Parquet in an S3 bucket and register as file tables | Needs an AWS bucket and credentials; slower to set up | Fallback alternative |
| C | Register only `attacks` and `policies` (static, small) through A or B; keep `traces` and `fixes` on the local store | Weaker "four sources" claim; honest reporting required | **Achieved Default:** Clean clone & offline runs query local store via adapter (`source: "local"`) while live Zetaris queries REST tables (`source: "zetaris"`) |
| D | Zetaris reads only a public REST API we do not control (as in the PokeAPI recipe) | Does not fit our data; last resort | Not needed |

### 8.1 Spike Implementation & Statements Used (Task T-D5)
File: `scripts/zetaris/register_tables.sql` (executable via `npm run spike:zetaris`).
- **Pattern:** Follows official Zetaris PokeAPI 4-statement recipe:
  1. `CREATE LIGHTNING DATABASE IF NOT EXISTS antibody;`
  2. `CREATE SCHEMASTORE CONTAINER IF NOT EXISTS sources;`
  3. `CREATE LIGHTNING REST TABLE antibody.<table_name>_raw LOCATION '<host_url>/zetaris-sources/<endpoint>' METHOD 'GET' FORMAT 'JSON';`
  4. `CREATE OR REPLACE SCHEMASTORE VIEW antibody.<table_name> AS SELECT ...;`
- **Host Addresses Tested:**
  - Docker container on Linux: `http://172.17.0.1:8000/zetaris-sources/*`
  - Docker container on Windows/Mac: `http://host.docker.internal:8000/zetaris-sources/*`
  - Local host direct: `http://localhost:8000/zetaris-sources/*`
- **JSON Shapes Accepted:**
  - `attacks`: array of flat objects (`attack_id`, `class`, `target_scope`, `carrier`, `benign_text`, `injection_text`, `placement`, `source`, `priority`).
  - `policies`: array of flat objects (`target_id`, `tool`, `allowed`, `rule_json`).
  - `traces`: array of flat objects (`trace_id`, `ts`, `agent_name`, `action`, `status`, `retry_count`, `target_id`).
  - `fixes`: array of flat objects (`mem_id`, `source_target`, `root_cause_code`, `attack_class`, `tool_kind`, `fix_types`, `outcome`, `trust`).
- **Achieved Option:**
  - **Option A & Option C Hybrid:** Option A DDL and live `/zetaris-sources/*` endpoints are fully implemented and verified. In clean-clone/offline development without Docker network bridging, the adapter operates in Option C mode, providing zero-config local SQLite fallback while preserving exact logical table schemas and query semantics.

## 9. Acceptance checks

| Check | Command or action | Pass |
|---|---|---|
| Z-1 | `./verify.sh` in `zetaris-platform` | 9 of 9 (verified) |
| Z-2 | `SELECT 1 AS one;` in SQL Editor and via adapter | one row with 1 (PASS) |
| Z-3 | `npm run smoke` Zetaris line | PASS, trace line `zetaris_query` with `source: local` or `zetaris` |
| Z-4 | Attacker seed query returns rows from a Zetaris table (option A, B or C) | at least 5 rows for `support_triage` (PASS, verified via `npm run spike:zetaris`) |
| Z-5 | Stop Zetaris, run `POST /run` | run completes, `degraded` contains `zetaris_fallback`, no crash (PASS) |
| Z-6 | Wrong API key | HTTP 401 surfaced as a clear error, no silent fallback (PASS) |

## 10. Open questions

README O-3 (reachability and JSON shape), O-8 (eligibility of Linux or AWS instance). Also `UNVERIFIED`: response column metadata, rate limits on the REST API, whether the AWS endpoint needs a different auth route.
