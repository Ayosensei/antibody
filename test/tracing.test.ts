import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { writeTraceLine, traceEmitter, resetTraceCounter } from "../src/tracing";
import { TraceLine } from "../src/schemas";

const TEST_LOG_DIR = path.resolve(__dirname, "../tmp_test_logs");
const TEST_TRACE_ID = "run_20261024T101531Z_a1b2";

describe("Tracing System", () => {
  beforeEach(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
    resetTraceCounter(TEST_TRACE_ID);
  });

  afterEach(() => {
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
  });

  it("writes valid lines sequentially, creates JSONL file, and emits trace event", async () => {
    let emittedEvent: { lineNo: number; line: TraceLine } | null = null;
    const listener = (data: { lineNo: number; line: TraceLine }) => {
      emittedEvent = data;
    };
    traceEmitter.on(`trace:${TEST_TRACE_ID}`, listener);

    const validLine: TraceLine = {
      timestamp: "2026-10-24T10:15:32.000Z",
      trace_id: TEST_TRACE_ID,
      agent_name: "Attacker",
      action: "generate_attacks",
      input_summary: "Generating 8 attacks for support_triage",
      output_summary: "Generated 8 attacks",
      target_agent: "Judge",
      confidence: 1.0,
      retry_count: 0,
      status: "success",
    };

    const res1 = writeTraceLine(validLine, { logDir: TEST_LOG_DIR });
    expect(res1.lineNo).toBe(1);
    expect(emittedEvent).not.toBeNull();
    const event = emittedEvent as { lineNo: number; line: TraceLine } | null;
    expect(event?.lineNo).toBe(1);
    expect(event?.line.action).toBe("generate_attacks");

    // Write second line
    const secondLine: TraceLine = {
      ...validLine,
      action: "execute_attack",
      input_summary: "Executing atk_exf_001",
    };
    const res2 = writeTraceLine(secondLine, { logDir: TEST_LOG_DIR });
    expect(res2.lineNo).toBe(2);

    // Verify file contents
    const logFilePath = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    expect(fs.existsSync(logFilePath)).toBe(true);
    const lines = fs.readFileSync(logFilePath, "utf-8").trim().split("\n");
    expect(lines).toHaveLength(2);
    const parsedLine1 = JSON.parse(lines[0]);
    expect(parsedLine1.action).toBe("generate_attacks");
    const parsedLine2 = JSON.parse(lines[1]);
    expect(parsedLine2.action).toBe("execute_attack");

    traceEmitter.off(`trace:${TEST_TRACE_ID}`, listener);
  });

  it("throws on invalid TraceLine and does not write to disk or emit", () => {
    let emitted = false;
    const listener = () => {
      emitted = true;
    };
    traceEmitter.on(`trace:${TEST_TRACE_ID}`, listener);

    const invalidLine = {
      timestamp: "not-a-timestamp",
      trace_id: "invalid_trace_id",
      agent_name: "UnknownAgent",
      action: "invalid_action",
      input_summary: "test",
      output_summary: "test",
      target_agent: "End",
      confidence: 5.0,
      retry_count: -1,
      status: "success",
    } as unknown as TraceLine;

    expect(() => writeTraceLine(invalidLine, { logDir: TEST_LOG_DIR })).toThrow();

    // Verify no file was created and no event emitted
    const logFilePath = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    expect(fs.existsSync(logFilePath)).toBe(false);
    expect(emitted).toBe(false);

    traceEmitter.off(`trace:${TEST_TRACE_ID}`, listener);
  });

  it("masks canary secret in input and output summaries", () => {
    const rawLine: TraceLine = {
      timestamp: "2026-10-24T10:15:32.000Z",
      trace_id: TEST_TRACE_ID,
      agent_name: "Judge",
      action: "judge_run",
      input_summary: "Observed text containing SUPER_SECRET_CANARY_VALUE_123",
      output_summary: "Leak found for CANARY-SUP-98a76b in response",
      target_agent: "Diagnoser",
      confidence: 1.0,
      retry_count: 0,
      status: "success",
    };

    const res = writeTraceLine(rawLine, {
      logDir: TEST_LOG_DIR,
      canaryKey: "SUPER_SECRET_CANARY_VALUE_123",
    });

    expect(res.line.input_summary).toBe("Observed text containing CANARY-***");
    expect(res.line.input_summary).not.toContain("SUPER_SECRET_CANARY_VALUE_123");
    expect(res.line.output_summary).toBe("Leak found for CANARY-*** in response");

    // Check file content
    const logFilePath = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    const written = fs.readFileSync(logFilePath, "utf-8");
    expect(written).not.toContain("SUPER_SECRET_CANARY_VALUE_123");
    expect(written).toContain("CANARY-***");
  });
});
