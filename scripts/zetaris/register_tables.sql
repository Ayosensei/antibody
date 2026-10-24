-- ============================================================================
-- Zetaris Lightning SQL DDL: Table Registration Spike (Task T-D5)
-- Modeled after the official PokeAPI recipe pattern:
-- (CREATE LIGHTNING DATABASE -> CREATE SCHEMASTORE CONTAINER -> CREATE LIGHTNING REST TABLE -> CREATE SCHEMASTORE VIEW)
-- Per docs/SPONSOR_ZETARIS.md §8 and docs/DATA_CONTRACTS.md §13.
--
-- Notes on Host Address:
-- Inside Docker on Windows/Mac, use: 'http://host.docker.internal:8000/zetaris-sources/<name>'
-- Inside Docker on Linux, use:       'http://172.17.0.1:8000/zetaris-sources/<name>'
-- Outside Docker (local host), use:  'http://localhost:8000/zetaris-sources/<name>'
-- ============================================================================

-- 1. Initialize Lightning Database and Schema Container
CREATE LIGHTNING DATABASE IF NOT EXISTS antibody;
USE antibody;
CREATE SCHEMASTORE CONTAINER IF NOT EXISTS sources;

-- ============================================================================
-- 2. Table: attacks
-- Columns: attack_id text, class text, target_scope text, carrier text,
--          benign_text text, injection_text text, placement text, source text, priority int
-- ============================================================================
CREATE LIGHTNING REST TABLE IF NOT EXISTS antibody.attacks_raw
LOCATION 'http://host.docker.internal:8000/zetaris-sources/attacks'
METHOD 'GET'
FORMAT 'JSON';

CREATE OR REPLACE SCHEMASTORE VIEW antibody.attacks AS
SELECT
  CAST(attack_id AS VARCHAR(64)) AS attack_id,
  CAST(class AS VARCHAR(64)) AS class,
  CAST(target_scope AS VARCHAR(255)) AS target_scope,
  CAST(carrier AS VARCHAR(64)) AS carrier,
  CAST(benign_text AS VARCHAR(1000)) AS benign_text,
  CAST(injection_text AS VARCHAR(1000)) AS injection_text,
  CAST(placement AS VARCHAR(32)) AS placement,
  CAST(source AS VARCHAR(32)) AS source,
  CAST(priority AS INTEGER) AS priority
FROM antibody.attacks_raw;

-- ============================================================================
-- 3. Table: policies
-- Columns: target_id text, tool text, allowed boolean, rule_json text
-- ============================================================================
CREATE LIGHTNING REST TABLE IF NOT EXISTS antibody.policies_raw
LOCATION 'http://host.docker.internal:8000/zetaris-sources/policies'
METHOD 'GET'
FORMAT 'JSON';

CREATE OR REPLACE SCHEMASTORE VIEW antibody.policies AS
SELECT
  CAST(target_id AS VARCHAR(64)) AS target_id,
  CAST(tool AS VARCHAR(64)) AS tool,
  CAST(allowed AS BOOLEAN) AS allowed,
  CAST(rule_json AS VARCHAR(2000)) AS rule_json
FROM antibody.policies_raw;

-- ============================================================================
-- 4. Table: traces
-- Columns: trace_id text, ts text, agent_name text, action text,
--          status text, retry_count int, target_id text
-- ============================================================================
CREATE LIGHTNING REST TABLE IF NOT EXISTS antibody.traces_raw
LOCATION 'http://host.docker.internal:8000/zetaris-sources/traces'
METHOD 'GET'
FORMAT 'JSON';

CREATE OR REPLACE SCHEMASTORE VIEW antibody.traces AS
SELECT
  CAST(trace_id AS VARCHAR(64)) AS trace_id,
  CAST(ts AS VARCHAR(64)) AS ts,
  CAST(agent_name AS VARCHAR(64)) AS agent_name,
  CAST(action AS VARCHAR(64)) AS action,
  CAST(status AS VARCHAR(32)) AS status,
  CAST(retry_count AS INTEGER) AS retry_count,
  CAST(target_id AS VARCHAR(64)) AS target_id
FROM antibody.traces_raw;

-- ============================================================================
-- 5. Table: fixes
-- Columns: mem_id text, source_target text, root_cause_code text,
--          attack_class text, tool_kind text, fix_types text, outcome text, trust double
-- ============================================================================
CREATE LIGHTNING REST TABLE IF NOT EXISTS antibody.fixes_raw
LOCATION 'http://host.docker.internal:8000/zetaris-sources/fixes'
METHOD 'GET'
FORMAT 'JSON';

CREATE OR REPLACE SCHEMASTORE VIEW antibody.fixes AS
SELECT
  CAST(mem_id AS VARCHAR(64)) AS mem_id,
  CAST(source_target AS VARCHAR(64)) AS source_target,
  CAST(root_cause_code AS VARCHAR(32)) AS root_cause_code,
  CAST(attack_class AS VARCHAR(64)) AS attack_class,
  CAST(tool_kind AS VARCHAR(64)) AS tool_kind,
  CAST(fix_types AS VARCHAR(255)) AS fix_types,
  CAST(outcome AS VARCHAR(32)) AS outcome,
  CAST(trust AS DOUBLE) AS trust
FROM antibody.fixes_raw;
