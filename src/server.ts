/**
 * Antibody API Server.
 * Per AGENTS.md, TASKS_ayo.md (Task T-A6), and DATA_CONTRACTS.md §11 & §13.
 * Port: 8000 (configurable via API_PORT).
 * Endpoints:
 * - POST /run (wait: true [default] -> 200 Report; wait: false -> 202 { trace_id })
 * - GET /runs/:id (200 Report, 202 running, 500 failed, 404 unknown_run)
 * - GET /runs/:id/events (SSE stream with replay, keepalive, and event: end)
 * - GET /health ({ ok: true, sample_mode, llm_provider, zetaris })
 * - GET /memory (stored MemoryRecords)
 * - POST /memory/reset (requires header X-Confirm: reset)
 * - GET /zetaris-sources/* (attacks, policies, traces, fixes)
 * - GET /reports/:id/html (HTML formatted report)
 */

import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { URL } from "node:url";
import { loadConfig, type AppConfig } from "./config.js";
import { HMemFixMemory } from "./adapters/engines/hmem.js";
import { executeRunGraph, type RunGraphOptions } from "./orchestration/graph.js";
import { buildHtmlReport } from "./report/html.js";
import { generateTraceId, traceEmitter } from "./tracing.js";
import {
  type MemoryRecord,
  type Report,
  ReportSchema,
  type RunRequest,
  RunRequestSchema,
  type TraceLine,
} from "./schemas.js";
import type { generator as defaultGenerator } from "./adapters/llm/index.js";

export interface ServerOptions {
  config?: AppConfig;
  memory?: HMemFixMemory;
  generatorFn?: typeof defaultGenerator;
  sampleDir?: string;
  logDir?: string;
  persistDir?: string;
  reportsDir?: string;
}

interface RunHolder {
  traceId: string;
  targetId: string;
  status: "running" | "finished" | "failed";
  startedAt: string;
  request: RunRequest;
  report?: Report;
  error?: { code: "provider_unavailable" | "internal"; message: string };
  lastTraceLine?: TraceLine;
}

function setCorsHeaders(res: http.ServerResponse, req: http.IncomingMessage) {
  const origin = req.headers.origin;
  const allowedOrigins = ["http://localhost:3100", "http://127.0.0.1:3100"];
  const allowOrigin = origin && allowedOrigins.includes(origin) ? origin : "http://localhost:3100";
  res.setHeader("Access-Control-Allow-Origin", allowOrigin);
  res.setHeader("Access-Control-Allow-Methods", "GET, POST, OPTIONS");
  res.setHeader("Access-Control-Allow-Headers", "Content-Type, X-Confirm, Last-Event-ID");
  res.setHeader("Access-Control-Expose-Headers", "Last-Event-ID");
}

function sendJson(res: http.ServerResponse, statusCode: number, data: unknown) {
  res.writeHead(statusCode, { "Content-Type": "application/json" });
  res.end(JSON.stringify(data));
}

function sendError(
  res: http.ServerResponse,
  statusCode: number,
  code: string,
  message: string,
  field?: string
) {
  const errorObj: Record<string, unknown> = { code, message };
  if (field) {
    errorObj.field = field;
  }
  sendJson(res, statusCode, { error: errorObj });
}

async function parseJsonBody(req: http.IncomingMessage): Promise<{ body?: unknown; rawError?: Error }> {
  return new Promise((resolve) => {
    let raw = "";
    req.on("data", (chunk) => {
      raw += chunk;
      if (raw.length > 2 * 1024 * 1024) {
        // 2MB payload cap
        req.destroy();
      }
    });
    req.on("end", () => {
      if (!raw.trim()) {
        resolve({ body: {} });
        return;
      }
      try {
        const parsed = JSON.parse(raw);
        resolve({ body: parsed });
      } catch (err: any) {
        resolve({ rawError: err });
      }
    });
    req.on("error", (err) => {
      resolve({ rawError: err });
    });
  });
}

export function createApiServer(options: ServerOptions = {}): http.Server {
  const cfg = options.config || loadConfig();
  const sampleDir = options.sampleDir || path.resolve(process.cwd(), "data/sample");
  const logDir = options.logDir || path.resolve(process.cwd(), cfg.log_dir || "logs");
  const reportsDir = options.reportsDir || path.resolve(process.cwd(), "reports");
  const persistDir = options.persistDir || path.resolve(process.cwd(), "data/memory");

  const memory = options.memory || new HMemFixMemory({ mode: "warm", persistDir, logDir });
  const runs = new Map<string, RunHolder>();

  // Ensure directories exist
  for (const d of [logDir, reportsDir, persistDir]) {
    if (!fs.existsSync(d)) {
      try {
        fs.mkdirSync(d, { recursive: true });
      } catch {
        // ignore
      }
    }
  }

  const server = http.createServer(async (req, res) => {
    setCorsHeaders(res, req);

    if (req.method === "OPTIONS") {
      res.writeHead(204);
      res.end();
      return;
    }

    const reqUrl = new URL(req.url || "/", `http://${req.headers.host || "localhost:8000"}`);
    const pathname = reqUrl.pathname;

    // =========================================================================
    // 1. GET /health
    // =========================================================================
    if (req.method === "GET" && pathname === "/health") {
      let zetarisStatus: "up" | "fallback" = "fallback";
      if (!cfg.sample_mode && cfg.zetaris_api_key) {
        zetarisStatus = "up";
      }
      sendJson(res, 200, {
        ok: true,
        sample_mode: cfg.sample_mode,
        llm_provider: cfg.llm_provider,
        zetaris: zetarisStatus,
      });
      return;
    }

    // =========================================================================
    // 2. GET /memory
    // =========================================================================
    if (req.method === "GET" && pathname === "/memory") {
      const records = memory.listRecords();
      sendJson(res, 200, records);
      return;
    }

    // =========================================================================
    // 3. POST /memory/reset
    // =========================================================================
    if (req.method === "POST" && pathname === "/memory/reset") {
      const confirmHeader = req.headers["x-confirm"];
      if (confirmHeader !== "reset") {
        sendError(res, 400, "invalid_request", "Header X-Confirm: reset required", "headers.x-confirm");
        return;
      }
      memory.reset();
      sendJson(res, 200, { ok: true, message: "Memory store reset" });
      return;
    }

    // =========================================================================
    // 4. GET /zetaris-sources/*
    // =========================================================================
    if (req.method === "GET" && pathname === "/zetaris-sources/attacks") {
      const attacksPath = path.join(sampleDir, "attacks.json");
      if (!fs.existsSync(attacksPath)) {
        sendJson(res, 200, []);
        return;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(attacksPath, "utf-8")) as any[];
        const flat = raw.map((a) => ({
          attack_id: String(a.attack_id || ""),
          class: String(a.class || ""),
          target_scope: Array.isArray(a.target_scope) ? a.target_scope.join(",") : String(a.target_scope || ""),
          carrier: String(a.carrier || ""),
          benign_text: String(a.benign_text || ""),
          injection_text: String(a.injection_text || ""),
          placement: String(a.placement || "append"),
          source: String(a.source || "seed"),
          priority: Number(a.priority || 0),
        }));
        sendJson(res, 200, flat);
      } catch (err: any) {
        sendError(res, 500, "internal", `Failed to read attacks source: ${err.message}`);
      }
      return;
    }

    if (req.method === "GET" && pathname === "/zetaris-sources/policies") {
      const policiesPath = path.join(sampleDir, "policies.json");
      if (!fs.existsSync(policiesPath)) {
        sendJson(res, 200, []);
        return;
      }
      try {
        const raw = JSON.parse(fs.readFileSync(policiesPath, "utf-8")) as any[];
        const rows: any[] = [];
        for (const p of raw) {
          const targetId = String(p.target_id || "");
          for (const [tool, toolDef] of Object.entries((p.tools || {}) as Record<string, any>)) {
            rows.push({
              target_id: targetId,
              tool,
              allowed: Boolean(toolDef.allowed),
              rule_json: JSON.stringify(toolDef.arg_rules || []),
            });
          }
        }
        sendJson(res, 200, rows);
      } catch (err: any) {
        sendError(res, 500, "internal", `Failed to read policies source: ${err.message}`);
      }
      return;
    }

    if (req.method === "GET" && pathname === "/zetaris-sources/traces") {
      try {
        const rows: any[] = [];
        if (fs.existsSync(logDir)) {
          const files = fs.readdirSync(logDir).filter((f) => f.endsWith(".jsonl"));
          for (const file of files) {
            const lines = fs
              .readFileSync(path.join(logDir, file), "utf-8")
              .trim()
              .split("\n");
            for (const l of lines) {
              if (!l.trim()) continue;
              try {
                const parsed = JSON.parse(l);
                rows.push({
                  trace_id: String(parsed.trace_id || ""),
                  ts: String(parsed.timestamp || ""),
                  agent_name: String(parsed.agent_name || ""),
                  action: String(parsed.action || ""),
                  status: String(parsed.status || ""),
                  retry_count: Number(parsed.retry_count || 0),
                  target_id: String(parsed.target_id || parsed.meta?.target_id || ""),
                });
              } catch {
                // skip malformed line
              }
            }
          }
        }
        sendJson(res, 200, rows);
      } catch (err: any) {
        sendError(res, 500, "internal", `Failed to read traces source: ${err.message}`);
      }
      return;
    }

    if (req.method === "GET" && pathname === "/zetaris-sources/fixes") {
      try {
        const records = memory.listRecords();
        const rows = records.map((rec) => ({
          mem_id: String(rec.mem_id || ""),
          source_target: String(rec.source_target || ""),
          root_cause_code: String(rec.root_cause_code || ""),
          attack_class: String(rec.attack_class || ""),
          tool_kind: String(rec.implicated_tool_kind || ""),
          fix_types: Array.isArray(rec.fix_types) ? rec.fix_types.join(",") : String(rec.fix_types || ""),
          outcome: String(rec.outcome || ""),
          trust: Number(rec.trust || 0),
        }));
        sendJson(res, 200, rows);
      } catch (err: any) {
        sendError(res, 500, "internal", `Failed to read fixes source: ${err.message}`);
      }
      return;
    }

    // =========================================================================
    // 5. POST /run
    // =========================================================================
    if (req.method === "POST" && pathname === "/run") {
      const { body, rawError } = await parseJsonBody(req);
      if (rawError) {
        sendError(res, 400, "invalid_request", "Invalid JSON body", "body");
        return;
      }

      // Check target_id alias
      const normalizedBody = typeof body === "object" && body !== null ? { ...body } : {};
      if (!(normalizedBody as any).target && (normalizedBody as any).target_id) {
        (normalizedBody as any).target = (normalizedBody as any).target_id;
      }

      const parsedResult = RunRequestSchema.safeParse(normalizedBody);
      if (!parsedResult.success) {
        const issue = parsedResult.error.issues[0];
        const issuePath = issue.path.join(".");
        const issueMsg = issue.message;

        if (issue.path.includes("target")) {
          sendError(res, 400, "unknown_target", "Target must be 'support_triage' or 'meeting_tasks'", "target");
          return;
        }

        if (issuePath.includes("custom_attacks") && /url|email/i.test(issueMsg)) {
          sendError(res, 422, "out_of_scope", issueMsg, issuePath || "custom_attacks");
          return;
        }

        sendError(res, 400, "invalid_request", issueMsg, issuePath || "body");
        return;
      }

      const runRequest = parsedResult.data;
      const traceId = generateTraceId();
      const startedAt = new Date().toISOString();

      const holder: RunHolder = {
        traceId,
        targetId: runRequest.target,
        status: "running",
        startedAt,
        request: runRequest,
      };
      runs.set(traceId, holder);

      const runMemory =
        runRequest.memory_mode === "cold"
          ? new HMemFixMemory({ mode: "cold", logDir })
          : runRequest.memory_mode === "off"
          ? new HMemFixMemory({ mode: "off", logDir })
          : memory;

      const runOptions: RunGraphOptions = {
        memory: runMemory,
        traceContext: {
          traceId,
          logDir,
          canaryKey: cfg.canary_key || "dev_canary_key",
        },
        sampleDir,
        persistDir,
        generatorFn: options.generatorFn,
      };

      const executeRun = async () => {
        try {
          const report = await executeRunGraph(runRequest, runOptions);
          holder.status = "finished";
          holder.report = report;
          // Persist report JSON
          const repPath = path.join(reportsDir, `${traceId}.json`);
          try {
            fs.writeFileSync(repPath, JSON.stringify(report, null, 2), "utf-8");
          } catch {
            // ignore
          }
          traceEmitter.emit(`end:${traceId}`, "finished");
          return report;
        } catch (err: any) {
          holder.status = "failed";
          const isProvider = /all llm providers failed|meterless|nightshift|nvidia|401/i.test(err.message || "");
          holder.error = {
            code: isProvider ? "provider_unavailable" : "internal",
            message: err.message || "Run failed",
          };
          traceEmitter.emit(`end:${traceId}`, "failed");
          throw err;
        }
      };

      // wait: false -> return 202 immediately
      if (runRequest.wait === false) {
        // Kick off in background
        executeRun().catch(() => {});
        sendJson(res, 202, { trace_id: traceId });
        return;
      }

      // wait: true (default) -> wait for completion
      try {
        const report = await executeRun();
        sendJson(res, 200, report);
      } catch (err: any) {
        if (holder.error?.code === "provider_unavailable") {
          sendError(res, 502, "provider_unavailable", err.message || "Provider unavailable");
        } else {
          sendError(res, 500, "internal", err.message || "Internal error during run execution");
        }
      }
      return;
    }

    // =========================================================================
    // 6. GET /runs/:id/events (Server-Sent Events)
    // =========================================================================
    const sseMatch = pathname.match(/^\/runs\/([^/]+)\/events$/);
    if (req.method === "GET" && sseMatch) {
      const traceId = sseMatch[1];
      const holder = runs.get(traceId);
      const logFile = path.join(logDir, `${traceId}.jsonl`);
      const reportFile = path.join(reportsDir, `${traceId}.json`);

      const exists = holder !== undefined || fs.existsSync(logFile) || fs.existsSync(reportFile);
      if (!exists) {
        sendError(res, 404, "unknown_run", `Run '${traceId}' not found`);
        return;
      }

      res.writeHead(200, {
        "Content-Type": "text/event-stream",
        "Cache-Control": "no-cache",
        Connection: "keep-alive",
      });

      // Parse Last-Event-ID header (1-based index)
      const lastIdHeader = req.headers["last-event-id"];
      let lastEventId = 0;
      if (typeof lastIdHeader === "string") {
        const parsed = parseInt(lastIdHeader, 10);
        if (!isNaN(parsed) && parsed > 0) {
          lastEventId = parsed;
        }
      }

      // Replay existing lines from disk
      let currentLineCount = 0;
      if (fs.existsSync(logFile)) {
        try {
          const content = fs.readFileSync(logFile, "utf-8");
          const lines = content.trim().split("\n");
          for (let i = 0; i < lines.length; i++) {
            const lineText = lines[i].trim();
            if (!lineText) continue;
            currentLineCount = i + 1;
            if (currentLineCount > lastEventId) {
              res.write(`event: trace\nid: ${currentLineCount}\ndata: ${lineText}\n\n`);
            }
          }
        } catch {
          // ignore
        }
      }

      // Check if run is already finished or failed
      const isFinished = holder?.status === "finished" || fs.existsSync(reportFile);
      const isFailed = holder?.status === "failed";

      if (isFinished) {
        res.write(`event: end\ndata: {"status":"finished"}\n\n`);
        res.end();
        return;
      }

      if (isFailed) {
        res.write(`event: end\ndata: {"status":"failed"}\n\n`);
        res.end();
        return;
      }

      // Live stream handling
      let lastSentId = Math.max(lastEventId, currentLineCount);

      // Keepalive timer every 15s
      const keepaliveTimer = setInterval(() => {
        try {
          res.write(": keepalive\n\n");
        } catch {
          // ignore
        }
      }, 15000);

      const onTraceLine = ({ lineNo, line }: { lineNo: number; line: TraceLine }) => {
        if (lineNo > lastSentId) {
          lastSentId = lineNo;
          res.write(`event: trace\nid: ${lineNo}\ndata: ${JSON.stringify(line)}\n\n`);
        }
      };

      const onEnd = (finalStatus: string) => {
        clearInterval(keepaliveTimer);
        traceEmitter.off(`trace:${traceId}`, onTraceLine);
        res.write(`event: end\ndata: ${JSON.stringify({ status: finalStatus })}\n\n`);
        res.end();
      };

      traceEmitter.on(`trace:${traceId}`, onTraceLine);
      traceEmitter.once(`end:${traceId}`, onEnd);

      req.on("close", () => {
        clearInterval(keepaliveTimer);
        traceEmitter.off(`trace:${traceId}`, onTraceLine);
        traceEmitter.off(`end:${traceId}`, onEnd);
      });
      return;
    }

    // =========================================================================
    // 7. GET /runs/:id
    // =========================================================================
    const runMatch = pathname.match(/^\/runs\/([^/]+)$/);
    if (req.method === "GET" && runMatch) {
      const traceId = runMatch[1];
      const holder = runs.get(traceId);
      const reportFile = path.join(reportsDir, `${traceId}.json`);

      // 1. If finished report is on disk or in memory
      if (holder?.report) {
        sendJson(res, 200, holder.report);
        return;
      }
      if (fs.existsSync(reportFile)) {
        try {
          const rep = JSON.parse(fs.readFileSync(reportFile, "utf-8"));
          sendJson(res, 200, rep);
          return;
        } catch {
          // fall through
        }
      }

      // 2. If running
      if (holder && holder.status === "running") {
        // Find last trace line from log file
        let lastLine: TraceLine | null = null;
        const logFile = path.join(logDir, `${traceId}.jsonl`);
        if (fs.existsSync(logFile)) {
          try {
            const raw = fs.readFileSync(logFile, "utf-8").trim().split("\n");
            if (raw.length > 0 && raw[raw.length - 1].trim()) {
              lastLine = JSON.parse(raw[raw.length - 1].trim());
            }
          } catch {
            // ignore
          }
        }
        sendJson(res, 202, {
          status: "running",
          started_at: holder.startedAt,
          request: holder.request,
          last_trace_line: lastLine,
        });
        return;
      }

      // 3. If failed
      if (holder && holder.status === "failed") {
        sendJson(res, 500, {
          status: "failed",
          error: holder.error || { code: "internal", message: "Run failed" },
        });
        return;
      }

      // 4. Unknown
      sendError(res, 404, "unknown_run", `Run '${traceId}' not found`);
      return;
    }

    // =========================================================================
    // 8. GET /reports/:id/html
    // =========================================================================
    const htmlMatch = pathname.match(/^\/reports\/([^/]+)\/html$/);
    if (req.method === "GET" && htmlMatch) {
      const traceId = htmlMatch[1];
      let report: Report | null = null;
      const holder = runs.get(traceId);
      if (holder?.report) {
        report = holder.report;
      } else {
        const reportFile = path.join(reportsDir, `${traceId}.json`);
        if (fs.existsSync(reportFile)) {
          try {
            report = ReportSchema.parse(JSON.parse(fs.readFileSync(reportFile, "utf-8")));
          } catch {
            // ignore
          }
        }
      }

      if (!report) {
        sendError(res, 404, "unknown_run", `Report for run '${traceId}' not found`);
        return;
      }

      const html = buildHtmlReport(report);
      res.writeHead(200, { "Content-Type": "text/html; charset=utf-8" });
      res.end(html);
      return;
    }

    // Default 404
    sendError(res, 404, "not_found", `Route '${req.method} ${pathname}' not found`);
  });

  return server;
}

export function startServer(port?: number, options: ServerOptions = {}): http.Server {
  const cfg = options.config || loadConfig();
  const serverPort = port || cfg.api_port || 8000;
  const server = createApiServer(options);

  server.listen(serverPort, () => {
    // eslint-disable-next-line no-console
    console.log(`[Antibody API Server] listening on http://localhost:${serverPort}`);
  });

  return server;
}

// Self-run entry point via `tsx src/server.ts`
if (import.meta.url.endsWith(process.argv[1]) || process.argv[1]?.includes("src/server.ts")) {
  startServer();
}
