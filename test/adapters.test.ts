import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import {
  runLocalSql,
  validatePortableSql,
  parseSelectedColumnsFromSql,
  rowsToObjects,
  resetLocalDatabaseForTesting,
  refreshTracesFromLogs,
  refreshFixesFromMemory,
  InvalidSqlError,
} from "../src/adapters/local-sql";
import { runSql, type ZetarisOptions } from "../src/adapters/zetaris";
import { maskCanary } from "../src/tracing";

const TEST_LOG_DIR = path.resolve(__dirname, "test_logs_adapters");
const TEST_MEMORY_DIR = path.resolve(__dirname, "test_memory_adapters");

describe("Task T-D4: Local SQLite & Zetaris Adapter", () => {
  beforeEach(() => {
    resetLocalDatabaseForTesting(":memory:");
    if (!fs.existsSync(TEST_LOG_DIR)) {
      fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_MEMORY_DIR)) {
      fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // 1. Portable SQL Validator (SPONSOR_ZETARIS.md §6 Rule 4 & Acceptance Z-4)
  // ==========================================================================
  describe("Portable SQL Validator (validatePortableSql)", () => {
    it("accepts valid portable SELECT queries and trailing comments", () => {
      expect(() => validatePortableSql("SELECT 1")).not.toThrow();
      expect(() => validatePortableSql("SELECT 1 AS one;")).not.toThrow();
      expect(() => validatePortableSql("SELECT 1 AS one; -- trailing comment")).not.toThrow();
      expect(() =>
        validatePortableSql(
          "SELECT attack_id, class, priority FROM attacks WHERE target_scope LIKE '%support_triage%' ORDER BY priority ASC LIMIT 5"
        )
      ).not.toThrow();
      expect(() =>
        validatePortableSql(
          "SELECT target_id, tool, allowed, rule_json FROM policies WHERE target_id = 'support_triage'"
        )
      ).not.toThrow();
      expect(() =>
        validatePortableSql(
          "-- comment\nSELECT * FROM attacks WHERE injection_text = 'hello; world' -- another comment"
        )
      ).not.toThrow();
    });

    it("rejects non-SELECT or empty queries", () => {
      expect(() => validatePortableSql("")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("   ")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("INSERT INTO attacks VALUES ('1')")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("UPDATE policies SET allowed = 1")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("DELETE FROM traces")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("DROP TABLE attacks")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("CREATE TABLE test (id INT)")).toThrow(InvalidSqlError);
      expect(() => validatePortableSql("PRAGMA table_info(attacks)")).toThrow(InvalidSqlError);
    });

    it("rejects multiple statements (semicolons outside string literals)", () => {
      expect(() =>
        validatePortableSql("SELECT * FROM attacks; DROP TABLE attacks;")
      ).toThrow("Multiple statements are not allowed");

      expect(() =>
        validatePortableSql("SELECT * FROM attacks; SELECT 1;")
      ).toThrow("Multiple statements are not allowed");

      // Semicolon inside a string literal should be allowed
      expect(() =>
        validatePortableSql("SELECT * FROM attacks WHERE injection_text = 'hello; world'")
      ).not.toThrow();
    });

    it("rejects subqueries", () => {
      expect(() =>
        validatePortableSql("SELECT * FROM attacks WHERE carrier IN (SELECT carrier FROM policies)")
      ).toThrow("Subqueries are not allowed");

      expect(() =>
        validatePortableSql("SELECT (SELECT COUNT(*) FROM traces) AS count FROM attacks")
      ).toThrow("Subqueries are not allowed");
    });

    it("rejects JOINs, CTEs, set operations, and window functions", () => {
      expect(() =>
        validatePortableSql("SELECT * FROM attacks JOIN policies ON attacks.carrier = policies.tool")
      ).toThrow("JOIN");

      expect(() =>
        validatePortableSql("SELECT * FROM attacks LEFT JOIN policies ON attacks.carrier = policies.tool")
      ).toThrow("JOIN");

      expect(() =>
        validatePortableSql("WITH cte AS (SELECT * FROM attacks) SELECT * FROM cte")
      ).toThrow("WITH");

      expect(() =>
        validatePortableSql("SELECT 1 UNION SELECT 2")
      ).toThrow("UNION");

      expect(() =>
        validatePortableSql("SELECT attack_id, ROW_NUMBER() OVER () FROM attacks")
      ).toThrow("OVER");

      expect(() =>
        validatePortableSql("SELECT * FROM attacks, policies")
      ).toThrow("Comma-separated table joins are not allowed");

      expect(() =>
        validatePortableSql("SELECT * FROM attacks AS a, policies AS p")
      ).toThrow("Comma-separated table joins are not allowed");
    });
  });

  // ==========================================================================
  // 2. parseSelectedColumnsFromSql
  // ==========================================================================
  describe("parseSelectedColumnsFromSql", () => {
    it("parses single column with alias", () => {
      expect(parseSelectedColumnsFromSql("SELECT 1 AS one;")).toEqual(["one"]);
    });

    it("parses multiple columns with table qualifiers and aliases", () => {
      const sql = "SELECT a.attack_id, class AS attack_class, priority FROM attacks a";
      expect(parseSelectedColumnsFromSql(sql)).toEqual(["attack_id", "attack_class", "priority"]);
    });

    it("parses wildcard and function calls", () => {
      expect(parseSelectedColumnsFromSql("SELECT * FROM attacks")).toEqual([
        "attack_id",
        "class",
        "target_scope",
        "carrier",
        "benign_text",
        "injection_text",
        "placement",
        "source",
        "priority",
      ]);
      expect(parseSelectedColumnsFromSql("SELECT * FROM unknown_table")).toEqual(["*"]);
      expect(parseSelectedColumnsFromSql("SELECT COUNT(*) AS total FROM attacks")).toEqual(["total"]);
    });
  });

  // ==========================================================================
  // 3. Local SQLite Store (local-sql.ts) & Seeding
  // ==========================================================================
  describe("Local SQLite Store (runLocalSql & seeding)", () => {
    it("seeds attacks table from sample files (14 attacks, priority 10..140)", () => {
      const res = runLocalSql("SELECT attack_id, class, priority FROM attacks ORDER BY priority ASC");
      expect(res.source).toBe("local");
      expect(res.columns).toEqual(["attack_id", "class", "priority"]);
      expect(res.rows.length).toBe(14);
      expect(res.rows[0][0]).toBe("atk_exf_001");
      expect(res.rows[0][2]).toBe(10);
      expect(res.rows[13][2]).toBe(140);

      // Verify rowsToObjects
      const objects = rowsToObjects<{ attack_id: string; class: string; priority: number }>(res);
      expect(objects.length).toBe(14);
      expect(objects[0]).toEqual({ attack_id: "atk_exf_001", class: "injection_exfil", priority: 10 });
    });

    it("supports COUNT(*) and GROUP BY queries on attacks", () => {
      const res = runLocalSql(
        "SELECT carrier, COUNT(*) AS count FROM attacks GROUP BY carrier ORDER BY count DESC"
      );
      expect(res.columns).toEqual(["carrier", "count"]);
      expect(res.rows.length).toBeGreaterThan(0);
      const objects = rowsToObjects<{ carrier: string; count: number }>(res);
      expect(objects.every((o) => typeof o.carrier === "string" && typeof o.count === "number")).toBe(true);
    });

    it("seeds policies table (7 rows, converts allowed to boolean true/false)", () => {
      const res = runLocalSql("SELECT target_id, tool, allowed, rule_json FROM policies ORDER BY target_id, tool");
      expect(res.rows.length).toBe(7); // 4 tools for support_triage + 3 for meeting_tasks
      const objects = rowsToObjects<{ target_id: string; tool: string; allowed: boolean; rule_json: string }>(res);

      const supportRefund = objects.find((p) => p.target_id === "support_triage" && p.tool === "issue_refund");
      expect(supportRefund).toBeDefined();
      expect(typeof supportRefund!.allowed).toBe("boolean");
      expect(supportRefund!.allowed).toBe(true);

      const supportExport = objects.find((p) => p.target_id === "support_triage" && p.tool === "export_customer_list");
      expect(supportExport).toBeDefined();
      expect(typeof supportExport!.allowed).toBe("boolean");
      expect(supportExport!.allowed).toBe(false);
    });

    it("refreshes traces table from log files", () => {
      const testTraceLine = {
        trace_id: "run_20261024T101531Z_a1b2",
        timestamp: "2026-10-24T10:15:32.000Z",
        agent_name: "Attacker",
        action: "generate_attacks",
        input_summary: "Generating attacks",
        output_summary: "Generated 8 attacks",
        target_agent: "Judge",
        confidence: 1.0,
        retry_count: 0,
        status: "success",
      };

      const logPath = path.join(TEST_LOG_DIR, "run_20261024T101531Z_a1b2.jsonl");
      fs.writeFileSync(logPath, JSON.stringify(testTraceLine) + "\n");

      const db = resetLocalDatabaseForTesting(":memory:");
      refreshTracesFromLogs(db, TEST_LOG_DIR);

      const res = runLocalSql("SELECT trace_id, ts, agent_name, action, status FROM traces", { db });
      expect(res.rows.length).toBe(1);
      expect(res.rows[0][0]).toBe("run_20261024T101531Z_a1b2");
      expect(res.rows[0][1]).toBe("2026-10-24T10:15:32.000Z");
      expect(res.rows[0][2]).toBe("Attacker");
    });

    it("refreshes and resets fixes table from memory files", () => {
      const mockFix = {
        mem_id: "mem_a1b2c3d4",
        source_target: "support_triage",
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        tool_kind: "money",
        fix_types: ["prompt_rule"],
        outcome: "verified",
        trust: 0.95,
      };

      const fixFilePath = path.join(TEST_MEMORY_DIR, "mem_a1b2c3d4.json");
      fs.writeFileSync(fixFilePath, JSON.stringify(mockFix));

      const db = resetLocalDatabaseForTesting(":memory:");
      refreshFixesFromMemory(db, TEST_MEMORY_DIR);

      const query =
        "SELECT mem_id, source_target, root_cause_code, trust FROM fixes WHERE root_cause_code = 'FT-01' AND trust >= 0.3 ORDER BY trust DESC LIMIT 3";
      const res = runLocalSql(query, { db });
      expect(res.rows.length).toBe(1);
      expect(res.rows[0][0]).toBe("mem_a1b2c3d4");
      expect(res.rows[0][3]).toBe(0.95);

      // Simulate memory reset: delete file, refresh fixes, verify table cleared
      fs.unlinkSync(fixFilePath);
      refreshFixesFromMemory(db, TEST_MEMORY_DIR);

      const resAfterReset = runLocalSql(query, { db });
      expect(resAfterReset.rows.length).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Zetaris REST Adapter (zetaris.ts & Acceptance Checks Z-1..Z-6)
  // ==========================================================================
  describe("Zetaris Adapter (runSql & Acceptance Checks)", () => {
    it("Check Z-2: executes 'SELECT 1 AS one;' and returns one row with 1", async () => {
      const res = await runSql("SELECT 1 AS one;", { sampleMode: true, logDir: TEST_LOG_DIR });
      expect(res.columns).toEqual(["one"]);
      expect(res.rows.length).toBe(1);
      expect(res.rows[0][0]).toBe(1);
      expect(res.source).toBe("local");
    });

    it("Check Z-4: Attacker seed query returns at least 5 rows for support_triage", async () => {
      const sql =
        "SELECT attack_id, class, priority FROM attacks WHERE target_scope LIKE '%support_triage%' ORDER BY priority ASC";
      const res = await runSql(sql, { sampleMode: true, logDir: TEST_LOG_DIR });
      expect(res.rows.length).toBeGreaterThanOrEqual(5);
      expect(res.columns).toEqual(["attack_id", "class", "priority"]);
    });

    it("executes live Zetaris query when sampleMode is false and endpoint succeeds", async () => {
      const mockFetch: typeof fetch = async (url, init) => {
        return new Response(
          JSON.stringify({
            data: [
              ["atk_exf_001", "injection_exfil", 10],
              ["atk_inj_001", "injection_override", 20],
            ],
            columns: ["attack_id", "class", "priority"],
          }),
          { status: 200, headers: { "Content-Type": "application/json" } }
        );
      };

      const res = await runSql("SELECT attack_id, class, priority FROM attacks", {
        sampleMode: false,
        apiKey: "test_secret_key",
        logDir: TEST_LOG_DIR,
        fetchFn: mockFetch,
      });

      expect(res.source).toBe("zetaris");
      expect(res.columns).toEqual(["attack_id", "class", "priority"]);
      expect(res.rows.length).toBe(2);
      expect(res.rows[0][0]).toBe("atk_exf_001");
    });

    it("Check Z-5: retries once with fresh queryId, falls back to local store, and output_summary starts with 'local store'", async () => {
      const receivedQueryIds: string[] = [];
      const mockFailingFetch: typeof fetch = async (url, init) => {
        if (init?.body) {
          const body = JSON.parse(init.body as string);
          receivedQueryIds.push(body.queryId);
        }
        return new Response("Internal Server Error", { status: 500 });
      };

      let degradedCode: string | null = null;
      const res = await runSql(
        "SELECT attack_id, class, priority FROM attacks WHERE target_scope LIKE '%support_triage%'",
        {
          sampleMode: false,
          apiKey: "test_key",
          logDir: TEST_LOG_DIR,
          fetchFn: mockFailingFetch,
          onDegraded: (code) => {
            degradedCode = code;
          },
        }
      );

      // Verify it retried once (2 calls total)
      expect(receivedQueryIds.length).toBe(2);
      // Verify queryId on retry is fresh (UUIDs not equal)
      expect(receivedQueryIds[0]).not.toEqual(receivedQueryIds[1]);

      // Verify fallback was executed on local store
      expect(res.source).toBe("local");
      expect(res.rows.length).toBeGreaterThanOrEqual(5);
      // Verify degraded code was recorded
      expect(degradedCode).toBe("zetaris_fallback");

      // Verify trace line output_summary starts with 'local store' (DESIGN.md §9.1)
      const logFiles = fs.readdirSync(TEST_LOG_DIR).filter((f) => f.endsWith(".jsonl"));
      expect(logFiles.length).toBeGreaterThan(0);
      const traceContent = fs.readFileSync(path.join(TEST_LOG_DIR, logFiles[0]), "utf-8");
      const traceObj = JSON.parse(traceContent.trim());
      expect(traceObj.output_summary.startsWith("local store")).toBe(true);
      expect(traceObj.status).toBe("fallback");
    });

    it("Check Z-6: wrong API key (HTTP 401) throws structured error, NEVER retries, NEVER falls back", async () => {
      let callCount = 0;
      const mockAuthFailFetch: typeof fetch = async () => {
        callCount++;
        return new Response(JSON.stringify({ detail: "Invalid API Key" }), { status: 401 });
      };

      let degradedCalled = false;
      await expect(
        runSql("SELECT 1", {
          sampleMode: false,
          apiKey: "wrong_key",
          logDir: TEST_LOG_DIR,
          fetchFn: mockAuthFailFetch,
          onDegraded: () => {
            degradedCalled = true;
          },
        })
      ).rejects.toThrow(/HTTP 401/);

      // Must NOT retry
      expect(callCount).toBe(1);
      // Must NOT record degraded or fall back
      expect(degradedCalled).toBe(false);
    });

    it("never logs ZETARIS_API_KEY in errors or trace outputs", async () => {
      const SECRET_KEY = "SUPER_SECRET_TOKEN_DO_NOT_LEAK";
      const mockFetch: typeof fetch = async () => {
        return new Response("Bad request", { status: 400 });
      };

      try {
        await runSql("SELECT 1", {
          sampleMode: false,
          apiKey: SECRET_KEY,
          logDir: TEST_LOG_DIR,
          fetchFn: mockFetch,
        });
        expect.unreachable("Should have thrown HTTP 400");
      } catch (err: any) {
        expect(err.message).not.toContain(SECRET_KEY);
      }
    });
  });

  // ==========================================================================
  // 5. maskCanary Normalized Leak Tests (DATA_CONTRACTS.md §14 & J-07)
  // ==========================================================================
  describe("Canary Masking (maskCanary)", () => {
    const canary = "CANARY-SUP-ab12cd";

    it("masks exact canary key", () => {
      expect(maskCanary("Secret is CANARY-SUP-ab12cd", canary)).toBe("Secret is CANARY-***");
    });

    it("masks normalized canary key with spaces (J-07)", () => {
      expect(maskCanary("Found canary sup ab12cd in output", canary)).toBe("Found CANARY-*** in output");
    });

    it("masks normalized canary key with underscores or dashes", () => {
      expect(maskCanary("Token: canary_sup_ab12cd", canary)).toBe("Token: CANARY-***");
      expect(maskCanary("Token: canary-sup-ab12cd", canary)).toBe("Token: CANARY-***");
    });

    it("masks general CANARY-<PREFIX>-<HEX> patterns even without canaryKey", () => {
      expect(maskCanary("Leaked CANARY-MTG-f1e2d3 here")).toBe("Leaked CANARY-*** here");
      expect(maskCanary("Leaked canary mtg f1e2d3 here")).toBe("Leaked CANARY-*** here");
    });
  });
});
