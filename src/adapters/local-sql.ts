import Database from "better-sqlite3";
import fs from "node:fs";
import path from "node:path";
import { type Carrier, type TargetId } from "../schemas";

export interface SqlResult {
  columns: string[];
  rows: unknown[][];
  source: "zetaris" | "local";
}

export class InvalidSqlError extends Error {
  code = "invalid_request";
  constructor(message: string) {
    super(message);
    this.name = "InvalidSqlError";
  }
}

/**
 * Validates that an SQL query conforms to the portable SQL subset (SPONSOR_ZETARIS.md §6 Rule 4):
 * - Must be a single SELECT statement
 * - No JOINs, subqueries, CTEs (WITH), set operations (UNION/INTERSECT/EXCEPT), window functions (OVER), DDL/DML
 * - Rejects multiple statements (semicolon outside string literals)
 * - Allows SELECT 1 and SELECT 1 AS one
 */
export function validatePortableSql(rawSql: string): void {
  if (!rawSql || typeof rawSql !== "string") {
    throw new InvalidSqlError("SQL query must be a non-empty string");
  }

  // 1. Strip comments
  const withoutComments = rawSql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  if (withoutComments.length === 0) {
    throw new InvalidSqlError("SQL query is empty");
  }

  // 2. Must start with SELECT (explicitly reject WITH CTEs with a clear message)
  if (/^WITH\b/i.test(withoutComments)) {
    throw new InvalidSqlError("CTEs ('WITH') are not allowed in portable SQL");
  }

  if (!/^SELECT\b/i.test(withoutComments)) {
    throw new InvalidSqlError("Only SELECT queries are supported in portable SQL");
  }

  // 3. Strip single-quoted string literals to inspect SQL structure safely
  // Matches '...', handling escaped '' inside
  const withoutStrings = withoutComments.replace(/'(?:''|[^'])*'/g, "''");

  // 4. Check for multiple statements (semicolons outside string literals)
  // Allow an optional single trailing semicolon
  const strippedTrailingSemi = withoutStrings.replace(/;\s*$/, "");
  if (strippedTrailingSemi.includes(";")) {
    throw new InvalidSqlError("Multiple statements are not allowed in portable SQL");
  }

  // 5. Check for set operations (UNION / INTERSECT / EXCEPT)
  const setOpMatch = strippedTrailingSemi.match(/\b(UNION|INTERSECT|EXCEPT)\b/i);
  if (setOpMatch) {
    throw new InvalidSqlError(`Set operations ('${setOpMatch[0].toUpperCase()}') are not allowed in portable SQL`);
  }

  // 6. Check for subqueries (more than one SELECT keyword)
  const selectMatches = strippedTrailingSemi.match(/\bSELECT\b/gi);
  if (selectMatches && selectMatches.length > 1) {
    throw new InvalidSqlError("Subqueries are not allowed in portable SQL");
  }

  // 6. Check for disallowed DDL, DML, JOINs, CTEs, set operations, window functions
  const joinMatch = strippedTrailingSemi.match(/\b(JOIN|INNER|LEFT|RIGHT|CROSS|NATURAL|FULL|OUTER)\b/i);
  if (joinMatch) {
    throw new InvalidSqlError(`JOIN operations ('${joinMatch[0].toUpperCase()}') are not allowed in portable SQL`);
  }

  const cteMatch = strippedTrailingSemi.match(/\b(WITH)\b/i);
  if (cteMatch) {
    throw new InvalidSqlError("CTEs ('WITH') are not allowed in portable SQL");
  }

  const windowMatch = strippedTrailingSemi.match(/\b(OVER)\b/i);
  if (windowMatch) {
    throw new InvalidSqlError("Window functions ('OVER') are not allowed in portable SQL");
  }

  const ddlMatch = strippedTrailingSemi.match(
    /\b(INSERT|UPDATE|DELETE|DROP|CREATE|ALTER|PRAGMA|ATTACH|DETACH|TRUNCATE|REPLACE|EXEC|EXECUTE)\b/i
  );
  if (ddlMatch) {
    throw new InvalidSqlError(`Statement '${ddlMatch[0].toUpperCase()}' is not allowed in portable SQL`);
  }

  // 7. Check for comma joins in FROM clause (e.g. FROM table1, table2)
  const fromMatch = strippedTrailingSemi.match(/\bFROM\s+([a-zA-Z0-9_]+(?:\s+[a-zA-Z0-9_]+)?(?:\s*,\s*[a-zA-Z0-9_]+)+)/i);
  if (fromMatch) {
    throw new InvalidSqlError("Comma-separated table joins are not allowed in portable SQL");
  }
}

/**
 * Extracts selected column names from a portable SELECT statement.
 */
export function parseSelectedColumnsFromSql(rawSql: string): string[] {
  const withoutComments = rawSql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim();

  const match = withoutComments.match(/^SELECT\s+([\s\S]+?)(?:\s+FROM\b|\s*;?\s*$)/i);
  if (!match) return [];
  const colPart = match[1].trim();
  if (colPart === "*") return ["*"];

  // Split by comma at depth 0 (outside parentheses like COUNT(*))
  const parts: string[] = [];
  let current = "";
  let depth = 0;
  for (let i = 0; i < colPart.length; i++) {
    const ch = colPart[i];
    if (ch === "(") depth++;
    else if (ch === ")") depth--;
    else if (ch === "," && depth === 0) {
      parts.push(current.trim());
      current = "";
      continue;
    }
    current += ch;
  }
  if (current.trim()) parts.push(current.trim());

  return parts.map((part) => {
    const asMatch = part.match(/\s+AS\s+([a-zA-Z0-9_]+)$/i);
    if (asMatch) return asMatch[1];
    const dotParts = part.split(".");
    const last = dotParts[dotParts.length - 1].trim();
    return last.replace(/^["'`]|["'`]$/g, "");
  });
}

/**
 * Zips res.columns with each 2D row array in res.rows to create typed objects.
 */
export function rowsToObjects<T = Record<string, unknown>>(res: SqlResult): T[] {
  return res.rows.map((row) => {
    const obj: Record<string, unknown> = {};
    for (let i = 0; i < res.columns.length; i++) {
      obj[res.columns[i]] = row[i];
    }
    return obj as T;
  });
}

// ============================================================================
// Local SQLite Database Manager
// ============================================================================

let singletonDb: Database.Database | null = null;

export function initLocalSchema(db: Database.Database): void {
  db.exec(`
    CREATE TABLE IF NOT EXISTS attacks (
      attack_id TEXT PRIMARY KEY,
      class TEXT NOT NULL,
      target_scope TEXT NOT NULL,
      carrier TEXT NOT NULL,
      benign_text TEXT NOT NULL,
      injection_text TEXT NOT NULL,
      placement TEXT NOT NULL,
      source TEXT NOT NULL,
      priority INTEGER NOT NULL
    );

    CREATE TABLE IF NOT EXISTS policies (
      target_id TEXT NOT NULL,
      tool TEXT NOT NULL,
      allowed INTEGER NOT NULL,
      rule_json TEXT NOT NULL,
      PRIMARY KEY (target_id, tool)
    );

    CREATE TABLE IF NOT EXISTS traces (
      trace_id TEXT NOT NULL,
      ts TEXT NOT NULL,
      agent_name TEXT NOT NULL,
      action TEXT NOT NULL,
      status TEXT NOT NULL,
      retry_count INTEGER NOT NULL,
      target_id TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS fixes (
      mem_id TEXT PRIMARY KEY,
      source_target TEXT NOT NULL,
      root_cause_code TEXT NOT NULL,
      attack_class TEXT NOT NULL,
      tool_kind TEXT NOT NULL,
      fix_types TEXT NOT NULL,
      outcome TEXT NOT NULL,
      trust REAL NOT NULL
    );
  `);
}

export function seedLocalDatabase(db: Database.Database, sampleDir?: string): void {
  const baseDir = sampleDir ?? path.resolve(process.cwd(), "data/sample");
  initLocalSchema(db);

  // 1. Seed attacks table
  const attacksPath = path.join(baseDir, "attacks.json");
  if (fs.existsSync(attacksPath)) {
    const rawAttacks = JSON.parse(fs.readFileSync(attacksPath, "utf-8"));
    const insertAttack = db.prepare(`
      INSERT OR REPLACE INTO attacks 
      (attack_id, class, target_scope, carrier, benign_text, injection_text, placement, source, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    const insertMany = db.transaction((attacksList: any[]) => {
      for (const a of attacksList) {
        insertAttack.run(
          a.attack_id,
          a.class,
          Array.isArray(a.target_scope) ? a.target_scope.join(",") : a.target_scope,
          a.carrier,
          a.benign_text ?? "",
          a.injection_text,
          a.placement,
          a.source,
          a.priority
        );
      }
    });
    insertMany(rawAttacks);
  }

  // 2. Seed policies table
  const policiesPath = path.join(baseDir, "policies.json");
  if (fs.existsSync(policiesPath)) {
    const rawPolicies = JSON.parse(fs.readFileSync(policiesPath, "utf-8"));
    const insertPolicy = db.prepare(`
      INSERT OR REPLACE INTO policies
      (target_id, tool, allowed, rule_json)
      VALUES (?, ?, ?, ?)
    `);

    const insertMany = db.transaction((policiesList: any[]) => {
      for (const p of policiesList) {
        for (const [toolName, toolPolicy] of Object.entries(p.tools as Record<string, any>)) {
          insertPolicy.run(
            p.target_id,
            toolName,
            toolPolicy.allowed ? 1 : 0,
            JSON.stringify(toolPolicy.arg_rules ?? [])
          );
        }
      }
    });
    insertMany(rawPolicies);
  }
}

export function refreshTracesFromLogs(db: Database.Database, logDir?: string): void {
  const baseLogDir = logDir ?? path.resolve(process.cwd(), "logs");
  if (!fs.existsSync(baseLogDir)) return;

  const files = fs.readdirSync(baseLogDir).filter((f) => f.endsWith(".jsonl"));
  const insertTrace = db.prepare(`
    INSERT INTO traces (trace_id, ts, agent_name, action, status, retry_count, target_id)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("DELETE FROM traces");

  const insertAll = db.transaction(() => {
    for (const file of files) {
      const content = fs.readFileSync(path.join(baseLogDir, file), "utf-8");
      const lines = content.split("\n");
      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed) continue;
        try {
          const parsed = JSON.parse(trimmed);
          insertTrace.run(
            parsed.trace_id ?? "",
            parsed.ts ?? parsed.timestamp ?? "",
            parsed.agent_name ?? "System",
            parsed.action ?? "",
            parsed.status ?? "success",
            parsed.retry_count ?? 0,
            parsed.target_id ?? parsed.target_agent ?? "support_triage"
          );
        } catch {
          // ignore malformed line
        }
      }
    }
  });
  insertAll();
}

export function refreshFixesFromMemory(db: Database.Database, memoryDir?: string): void {
  const baseMemoryDir = memoryDir ?? path.resolve(process.cwd(), "data/memory");
  if (!fs.existsSync(baseMemoryDir)) return;

  const files = fs.readdirSync(baseMemoryDir).filter((f) => f.endsWith(".json"));
  const insertFix = db.prepare(`
    INSERT OR REPLACE INTO fixes
    (mem_id, source_target, root_cause_code, attack_class, tool_kind, fix_types, outcome, trust)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAll = db.transaction(() => {
    for (const file of files) {
      try {
        const parsed = JSON.parse(fs.readFileSync(path.join(baseMemoryDir, file), "utf-8"));
        insertFix.run(
          parsed.mem_id,
          parsed.source_target,
          parsed.root_cause_code,
          parsed.attack_class,
          parsed.implicated_tool_kind ?? parsed.tool_kind ?? "",
          Array.isArray(parsed.fix_types) ? parsed.fix_types.join(",") : parsed.fix_types ?? "",
          parsed.outcome,
          parsed.trust ?? 1.0
        );
      } catch {
        // ignore malformed file
      }
    }
  });
  insertAll();
}

/**
 * Returns the default local database instance, seeded on first initialization.
 */
export function getLocalDatabase(dbPath?: string, sampleDir?: string): Database.Database {
  if (singletonDb && !dbPath) {
    return singletonDb;
  }
  const db = new Database(dbPath ?? ":memory:");
  seedLocalDatabase(db, sampleDir);
  if (!dbPath) {
    singletonDb = db;
  }
  return db;
}

export function resetLocalDatabaseForTesting(dbPath = ":memory:", sampleDir?: string): Database.Database {
  if (singletonDb) {
    singletonDb.close();
    singletonDb = null;
  }
  const db = new Database(dbPath);
  seedLocalDatabase(db, sampleDir);
  singletonDb = db;
  return db;
}

export interface RunLocalSqlOptions {
  limit?: number;
  db?: Database.Database;
  logDir?: string;
  memoryDir?: string;
  autoRefresh?: boolean;
}

/**
 * Executes a portable SQL query against the local SQLite store.
 * Returns positional rows: unknown[][] matching Zetaris's {"data": [[...]]} contract.
 */
export function runLocalSql(sql: string, opts?: RunLocalSqlOptions): SqlResult {
  validatePortableSql(sql);

  const db = opts?.db ?? getLocalDatabase();

  if (opts?.autoRefresh) {
    if (/\bFROM\s+traces\b/i.test(sql)) {
      refreshTracesFromLogs(db, opts.logDir);
    }
    if (/\bFROM\s+fixes\b/i.test(sql)) {
      refreshFixesFromMemory(db, opts.memoryDir);
    }
  }

  let cleanSql = sql.trim().replace(/;\s*$/, "");
  if (opts?.limit !== undefined && !/\bLIMIT\s+\d+\b/i.test(cleanSql)) {
    cleanSql += ` LIMIT ${opts.limit}`;
  }

  const stmt = db.prepare(cleanSql);
  let columns = stmt.columns().map((c) => c.name);

  if (columns.length === 0) {
    columns = parseSelectedColumnsFromSql(cleanSql);
    if (columns.length === 0) {
      columns = ["result"];
    }
  }

  const rawRows = stmt.raw(true).all() as unknown[][];

  // SQLite Boolean coercion: convert 1/0 in 'allowed' column to boolean true/false
  const allowedColIndex = columns.indexOf("allowed");
  const rows = rawRows.map((row) => {
    if (allowedColIndex !== -1 && row[allowedColIndex] !== undefined) {
      const copy = [...row];
      copy[allowedColIndex] = copy[allowedColIndex] === 1 || copy[allowedColIndex] === true;
      return copy;
    }
    return row;
  });

  return {
    columns,
    rows,
    source: "local",
  };
}
