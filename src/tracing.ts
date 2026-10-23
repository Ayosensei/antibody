import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { TraceLine, TraceLineSchema } from "./schemas";
import { loadConfig } from "./config";

// Global trace event emitter for in-process streaming (SSE support)
export const traceEmitter = new EventEmitter();

// Maintain in-memory line counter per trace_id to ensure 1-based strictly increasing sequence
const traceLineCounters = new Map<string, number>();

// Performance cache for compiled canary regexes and verified directories
const GENERIC_CANARY_RE = /canary[\s\-_]+[a-z]+[\s\-_]+[0-9a-f]{4,}/gi;
const canaryRegexCache = new Map<string, RegExp>();
const ensuredLogDirs = new Set<string>();

export interface TraceWriteOptions {
  logDir?: string;
  canaryKey?: string;
}

function getNormalizedCanaryRegex(canaryKey: string): RegExp | null {
  let cached = canaryRegexCache.get(canaryKey);
  if (cached) return cached;

  const normChars = canaryKey
    .toLowerCase()
    .replace(/[\s\-_]+/g, "")
    .split("");
  if (normChars.length === 0) return null;

  const pattern = normChars
    .map((ch) => ch.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"))
    .join("[\\s\\-_]*");
  cached = new RegExp(pattern, "gi");
  canaryRegexCache.set(canaryKey, cached);
  return cached;
}

/**
 * Masks any occurrences of the canary string with 'CANARY-***'.
 * Also normalizes specific canary formats if present.
 */
export function maskCanary(text: string, canaryKey?: string): string {
  if (!text) return text;
  let masked = text;
  if (canaryKey && canaryKey.trim() !== "") {
    if (masked.includes(canaryKey)) {
      masked = masked.split(canaryKey).join("CANARY-***");
    }
    const normRe = getNormalizedCanaryRegex(canaryKey);
    if (normRe) {
      masked = masked.replace(normRe, "CANARY-***");
    }
  }
  return masked.replace(GENERIC_CANARY_RE, "CANARY-***");
}

/**
 * Recursively mask canary values in an object's string fields.
 */
export function maskObjectStrings<T>(obj: T, canaryKey?: string): T {
  if (typeof obj === "string") {
    return maskCanary(obj, canaryKey) as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map((item) => maskObjectStrings(item, canaryKey)) as unknown as T;
  }
  if (obj && typeof obj === "object") {
    const res: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(obj)) {
      res[k] = maskObjectStrings(v, canaryKey);
    }
    return res as unknown as T;
  }
  return obj;
}

/**
 * Gets the next 1-based line number for a trace_id.
 */
export function getNextLineNo(traceId: string): number {
  const current = traceLineCounters.get(traceId) || 0;
  const next = current + 1;
  traceLineCounters.set(traceId, next);
  return next;
}

/**
 * Resets the line counter for a trace_id (useful in testing).
 */
export function resetTraceCounter(traceId?: string): void {
  if (traceId) {
    traceLineCounters.delete(traceId);
  } else {
    traceLineCounters.clear();
  }
  ensuredLogDirs.clear();
}

/**
 * Validates, numbers, canary-masks, writes to logs/<trace_id>.jsonl,
 * and emits an event for in-process subscribers.
 */
export function writeTraceLine(
  rawLine: TraceLine,
  options?: TraceWriteOptions
): { lineNo: number; line: TraceLine } {
  // 1. Determine configuration defaults
  let canary = options?.canaryKey;
  let logDir = options?.logDir;

  if (!canary || !logDir) {
    try {
      const cfg = loadConfig();
      canary = canary ?? cfg.canary_key;
      logDir = logDir ?? cfg.log_dir;
    } catch {
      logDir = logDir ?? "./logs";
    }
  }

  // 2. Fast targeted masking (skips timestamp, trace_id, agent_name, action, status enums)
  const maskedLine: TraceLine = {
    ...rawLine,
    input_summary: maskCanary(rawLine.input_summary, canary),
    output_summary: maskCanary(rawLine.output_summary, canary),
    ...(rawLine.meta ? { meta: maskObjectStrings(rawLine.meta, canary) } : {}),
  };

  // 3. Runtime validation against TraceLineSchema
  const validatedLine = TraceLineSchema.parse(maskedLine);

  // 4. Ensure target directory exists (cached check)
  const resolvedLogDir = path.resolve(process.cwd(), logDir);
  if (!ensuredLogDirs.has(resolvedLogDir)) {
    if (!fs.existsSync(resolvedLogDir)) {
      fs.mkdirSync(resolvedLogDir, { recursive: true });
    }
    ensuredLogDirs.add(resolvedLogDir);
  }

  // 5. Track 1-based line number
  const lineNo = getNextLineNo(validatedLine.trace_id);

  // 6. Append to JSONL file
  const filePath = path.join(resolvedLogDir, `${validatedLine.trace_id}.jsonl`);
  const jsonlRecord = JSON.stringify(validatedLine) + "\n";
  fs.appendFileSync(filePath, jsonlRecord, "utf-8");

  // 7. Emit in-process events
  traceEmitter.emit("trace", { lineNo, line: validatedLine });
  traceEmitter.emit(`trace:${validatedLine.trace_id}`, { lineNo, line: validatedLine });

  return { lineNo, line: validatedLine };
}

export interface RecordTraceParams {
  traceId: string;
  agentName: TraceLine["agent_name"];
  action: TraceLine["action"];
  status: TraceLine["status"];
  inputSummary?: string;
  outputSummary?: string;
  targetAgent?: string;
  confidence?: number;
  retryCount?: number;
  replayed?: boolean;
  meta?: Record<string, string | number | boolean>;
}

export function generateTraceId(): string {
  const now = new Date();
  const ymd = now.toISOString().slice(0, 10).replace(/-/g, "");
  const hms = now.toISOString().slice(11, 19).replace(/:/g, "");
  const rand = Math.floor(Math.random() * 0x10000).toString(16).padStart(4, "0");
  return `run_${ymd}T${hms}Z_${rand}`;
}

export function recordTrace(
  params: RecordTraceParams,
  options?: TraceWriteOptions
): { lineNo: number; line: TraceLine } {
  return writeTraceLine(
    {
      timestamp: new Date().toISOString(),
      trace_id: params.traceId,
      agent_name: params.agentName,
      action: params.action,
      input_summary: (params.inputSummary || params.action).slice(0, 300),
      output_summary: (params.outputSummary || params.status).slice(0, 300),
      target_agent: params.targetAgent || "System",
      confidence: params.confidence ?? 1.0,
      retry_count: params.retryCount ?? 0,
      status: params.status,
      replayed: params.replayed,
      meta: params.meta,
    },
    options
  );
}
