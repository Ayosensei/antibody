import { EventEmitter } from "node:events";
import fs from "node:fs";
import path from "node:path";
import { TraceLine, TraceLineSchema } from "./schemas";
import { loadConfig } from "./config";

// Global trace event emitter for in-process streaming (SSE support)
export const traceEmitter = new EventEmitter();

// Maintain in-memory line counter per trace_id to ensure 1-based strictly increasing sequence
const traceLineCounters = new Map<string, number>();

export interface TraceWriteOptions {
  logDir?: string;
  canaryKey?: string;
}

/**
 * Masks any occurrences of the canary string with 'CANARY-***'.
 * Also normalizes specific canary formats if present.
 */
export function maskCanary(text: string, canaryKey?: string): string {
  if (!text) return text;
  let masked = text;
  if (canaryKey && canaryKey.trim() !== "") {
    // Replace all instances of the canaryKey
    masked = masked.split(canaryKey).join("CANARY-***");
  }
  // Also mask raw patterns like CANARY-SUP-a1b2c3 or CANARY-MTG-012345
  masked = masked.replace(/CANARY-[A-Z]+-[0-9a-fA-F]{4,}/g, "CANARY-***");
  return masked;
}

/**
 * Recursively mask canary values in an object's string fields.
 */
function maskObjectStrings<T>(obj: T, canaryKey?: string): T {
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
export function resetTraceCounter(traceId: string): void {
  traceLineCounters.delete(traceId);
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

  // 2. Apply canary masking before validation & write
  const maskedLine = maskObjectStrings(rawLine, canary);

  // 3. Runtime validation against TraceLineSchema
  const validatedLine = TraceLineSchema.parse(maskedLine);

  // 4. Ensure target directory exists
  const resolvedLogDir = path.resolve(process.cwd(), logDir);
  if (!fs.existsSync(resolvedLogDir)) {
    fs.mkdirSync(resolvedLogDir, { recursive: true });
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
