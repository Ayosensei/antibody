import crypto from "node:crypto";
import { loadConfig } from "../config";
import { writeTraceLine } from "../tracing";
import {
  type SqlResult,
  runLocalSql,
  rowsToObjects,
  validatePortableSql,
  parseSelectedColumnsFromSql,
  InvalidSqlError,
} from "./local-sql";

export {
  type SqlResult,
  rowsToObjects,
  validatePortableSql,
  parseSelectedColumnsFromSql,
  InvalidSqlError,
};

export interface ZetarisOptions {
  limit?: number;
  timeoutSeconds?: number;
  restUrl?: string;
  orgId?: number | string;
  apiKey?: string;
  schema?: string;
  sampleMode?: boolean;
  traceId?: string;
  targetAgent?: string;
  logDir?: string;
  canaryKey?: string;
  memoryDir?: string;
  fetchFn?: typeof fetch;
  onDegraded?: (code: "zetaris_fallback") => void;
}

function defaultTraceId(): string {
  const now = new Date();
  const d = now.toISOString().replace(/[-:]/g, "").slice(0, 15) + "Z";
  const hex = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `run_${d}_${hex}`;
}

/**
 * Strips comments and trailing semicolon from SQL query string before sending to Zetaris REST API.
 * Optionally prefixes unqualified known tables (attacks, policies, traces, fixes) with schema
 * to handle Zetaris's stateless REST session execution.
 */
export function cleanSqlForZetaris(sql: string, schema?: string): string {
  let cleaned = sql
    .replace(/--.*$/gm, "")
    .replace(/\/\*[\s\S]*?\*\//g, "")
    .trim()
    .replace(/;\s*$/, "");

  if (schema) {
    cleaned = cleaned.replace(
      /\b(FROM|JOIN)\s+(attacks|policies|traces|fixes)\b/gi,
      `$1 ${schema}.$2`
    );
  }
  return cleaned;
}

/**
 * Normalizes columns from Zetaris response or SQL query.
 */
function extractZetarisColumns(json: any, sql: string): string[] {
  if (Array.isArray(json?.columns) && json.columns.length > 0) {
    return json.columns.map((c: any) => (typeof c === "string" ? c : c?.name ?? String(c)));
  }
  if (Array.isArray(json?.schema?.columns) && json.schema.columns.length > 0) {
    return json.schema.columns.map((c: any) => (typeof c === "string" ? c : c?.name ?? String(c)));
  }
  const parsed = parseSelectedColumnsFromSql(sql);
  return parsed.length > 0 ? parsed : ["result"];
}

/**
 * Runs a portable SQL query against Zetaris REST API or local SQLite fallback store.
 * 
 * Rules (SPONSOR_ZETARIS.md §6 & DESIGN.md §9.1):
 * 1. If sampleMode is true: goes straight to local store with source "local",
 *    and output_summary beginning with "local store".
 * 2. If sampleMode is false: calls POST {ZETARIS_REST_URL}/sql-editor/sqls/run.
 * 3. On HTTP 400 or 401: no fallback! Throws structured error with HTTP status.
 * 4. On timeout / network error / HTTP 5xx: retries once with a fresh queryId UUID.
 *    If retry fails, falls back to local store, records "zetaris_fallback" in degraded,
 *    and emits trace with status "fallback" and output_summary starting with "local store".
 * 5. Every call writes a System/zetaris_query trace line.
 * 6. Never logs the API key.
 */
export class ZetarisConfigError extends Error {
  constructor(public status: number, message: string) {
    super(message);
    this.name = "ZetarisConfigError";
  }
}

let cachedZetarisConfig: ReturnType<typeof loadConfig> | null = null;
function getCachedConfig(): ReturnType<typeof loadConfig> | null {
  if (!cachedZetarisConfig) {
    try {
      cachedZetarisConfig = loadConfig();
    } catch {
      // defaults if config loading fails in custom test harness
    }
  }
  return cachedZetarisConfig;
}

export async function runSql(sql: string, opts?: ZetarisOptions): Promise<SqlResult> {
  // 1. Validate against the portable SQL subset first
  validatePortableSql(sql);

  // 2. Resolve configuration parameters (lazily using cached config if needed)
  const sampleMode =
    opts?.sampleMode ?? (process.env.SAMPLE_MODE !== undefined ? process.env.SAMPLE_MODE === "true" : getCachedConfig()?.sample_mode ?? false);
  const restUrl = (
    opts?.restUrl ?? process.env.ZETARIS_REST_URL ?? getCachedConfig()?.zetaris_rest_url ?? "http://localhost:8888/api/v1.0"
  ).replace(/\/+$/, "");
  const orgId = opts?.orgId ?? process.env.ZETARIS_ORG_ID ?? getCachedConfig()?.zetaris_org_id ?? "1";
  const apiKey = opts?.apiKey ?? process.env.ZETARIS_API_KEY ?? getCachedConfig()?.zetaris_api_key;
  const timeoutSeconds =
    opts?.timeoutSeconds ?? (process.env.ZETARIS_TIMEOUT_SECONDS ? Number(process.env.ZETARIS_TIMEOUT_SECONDS) : getCachedConfig()?.zetaris_timeout_seconds ?? 20);
  const traceId = opts?.traceId ?? defaultTraceId();
  const targetAgent = opts?.targetAgent ?? "Zetaris";
  const fetchImpl = opts?.fetchFn ?? fetch;

  const inputSummary = sql.length > 120 ? sql.slice(0, 117) + "..." : sql;

  // 3. SAMPLE MODE: Go straight to local SQLite store
  if (sampleMode) {
    const localRes = runLocalSql(sql, {
      limit: opts?.limit,
      autoRefresh: true,
      logDir: opts?.logDir,
      memoryDir: opts?.memoryDir,
    });

    try {
      writeTraceLine(
        {
          timestamp: new Date().toISOString(),
          trace_id: traceId,
          agent_name: "System",
          action: "zetaris_query",
          input_summary: inputSummary,
          output_summary: `local store (sample mode): ${localRes.rows.length} rows`,
          target_agent: targetAgent,
          confidence: 1.0,
          retry_count: 0,
          status: "success",
        },
        { logDir: opts?.logDir, canaryKey: opts?.canaryKey }
      );
    } catch {
      // Non-blocking
    }

    return {
      columns: localRes.columns,
      rows: localRes.rows,
      source: "local",
    };
  }

  // 4. LIVE ZETARIS MODE: Call REST API
  const schema = opts?.schema ?? process.env.ZETARIS_SCHEMA;
  const cleanSql = cleanSqlForZetaris(sql, schema);
  const endpoint = `${restUrl}/sql-editor/sqls/run`;

  // Each request (including retries) generates fresh queryId and X-Request-ID
  const sendRequest = async (): Promise<Response> => {
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      "X-Org-ID": String(orgId),
      "X-Request-ID": crypto.randomUUID(),
    };
    if (apiKey) {
      headers.Authorization = `Bearer ${apiKey}`;
    }

    const requestBody = JSON.stringify({
      queryId: crypto.randomUUID(),
      sql: cleanSql,
      source: "SqlEditor",
      limit: opts?.limit ?? 100,
    });

    return await fetchImpl(endpoint, {
      method: "POST",
      headers,
      body: requestBody,
      signal: AbortSignal.timeout(timeoutSeconds * 1000),
    });
  };

  // Helper to format success result
  const handleSuccess = async (response: Response, retryCount: number): Promise<SqlResult> => {
    const json = await response.json();
    const rows = Array.isArray(json?.data) ? (json.data as unknown[][]) : [];
    const columns = extractZetarisColumns(json, cleanSql);

    try {
      writeTraceLine(
        {
          timestamp: new Date().toISOString(),
          trace_id: traceId,
          agent_name: "System",
          action: "zetaris_query",
          input_summary: inputSummary,
          output_summary: `zetaris returned ${rows.length} rows`,
          target_agent: targetAgent,
          confidence: 1.0,
          retry_count: retryCount,
          status: "success",
        },
        { logDir: opts?.logDir, canaryKey: opts?.canaryKey }
      );
    } catch {
      // Non-blocking
    }

    return {
      columns,
      rows,
      source: "zetaris",
    };
  };

  // Helper to fallback to local store (DESIGN.md §9.1: starts with "local store")
  const handleFallback = (errorSummary: string, retryCount: number): SqlResult => {
    const localRes = runLocalSql(sql, {
      limit: opts?.limit,
      autoRefresh: true,
      logDir: opts?.logDir,
      memoryDir: opts?.memoryDir,
    });
    if (opts?.onDegraded) {
      opts.onDegraded("zetaris_fallback");
    }

    try {
      writeTraceLine(
        {
          timestamp: new Date().toISOString(),
          trace_id: traceId,
          agent_name: "System",
          action: "zetaris_query",
          input_summary: inputSummary,
          output_summary: `local store (zetaris fallback: ${errorSummary}): ${localRes.rows.length} rows`,
          target_agent: targetAgent,
          confidence: 1.0,
          retry_count: retryCount,
          status: "fallback",
        },
        { logDir: opts?.logDir, canaryKey: opts?.canaryKey }
      );
    } catch {
      // Non-blocking
    }

    return {
      columns: localRes.columns,
      rows: localRes.rows,
      source: "local",
    };
  };

  // Execution with 1 retry for transient errors and strict 400/401 surfacing
  try {
    const res = await sendRequest();
    if (res.status === 400 || res.status === 401) {
      try {
        writeTraceLine(
          {
            timestamp: new Date().toISOString(),
            trace_id: traceId,
            agent_name: "System",
            action: "zetaris_query",
            input_summary: inputSummary,
            output_summary: `Zetaris HTTP ${res.status} configuration error`,
            target_agent: targetAgent,
            confidence: 0.0,
            retry_count: 0,
            status: "failed",
          },
          { logDir: opts?.logDir, canaryKey: opts?.canaryKey }
        );
      } catch {
        // Non-blocking
      }
      throw new ZetarisConfigError(res.status, `Zetaris request failed with HTTP ${res.status}: configuration or authentication error`);
    }

    if (!res.ok) {
      throw new Error(`Zetaris returned HTTP ${res.status}`);
    }

    return await handleSuccess(res, 0);
  } catch (err: any) {
    // If it's a 400/401, rethrow immediately without retrying or fallback (Rule 3 & Check Z-6)
    if (err instanceof ZetarisConfigError || err.message?.includes("HTTP 400") || err.message?.includes("HTTP 401")) {
      throw err;
    }

    // Attempt Retry Once for network/5xx/timeout errors (Rule 4)
    try {
      const retryRes = await sendRequest();
      if (retryRes.status === 400 || retryRes.status === 401) {
        try {
          writeTraceLine(
            {
              timestamp: new Date().toISOString(),
              trace_id: traceId,
              agent_name: "System",
              action: "zetaris_query",
              input_summary: inputSummary,
              output_summary: `Zetaris HTTP ${retryRes.status} configuration error`,
              target_agent: targetAgent,
              confidence: 0.0,
              retry_count: 1,
              status: "failed",
            },
            { logDir: opts?.logDir, canaryKey: opts?.canaryKey }
          );
        } catch {
          // Non-blocking
        }
        throw new ZetarisConfigError(retryRes.status, `Zetaris request failed with HTTP ${retryRes.status}: configuration or authentication error`);
      }

      if (!retryRes.ok) {
        throw new Error(`Zetaris returned HTTP ${retryRes.status}`);
      }

      return await handleSuccess(retryRes, 1);
    } catch (retryErr: any) {
      if (retryErr instanceof ZetarisConfigError || retryErr.message?.includes("HTTP 400") || retryErr.message?.includes("HTTP 401")) {
        throw retryErr;
      }

      // Both attempts failed: Fallback to local store (Check Z-5)
      const errorMsg = retryErr instanceof Error ? retryErr.message : String(retryErr);
      return handleFallback(errorMsg, 1);
    }
  }
}
