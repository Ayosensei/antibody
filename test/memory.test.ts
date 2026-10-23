import { describe, it, expect, beforeEach, afterEach } from "vitest";
import fs from "node:fs";
import path from "node:path";
import { HMemFixMemory } from "../src/adapters/engines/hmem";
import { MemoryRecord, MemoryQuery } from "../src/schemas";
import { resetTraceCounter } from "../src/tracing";

const TEST_MEMORY_DIR = path.resolve(__dirname, "test_memory_dir");
const TEST_LOG_DIR = path.resolve(__dirname, "test_memory_logs");
const TEST_TRACE_ID = "run_20261024T101531Z_a1b2";

function makeSampleRecord(overrides: Partial<MemoryRecord> = {}): MemoryRecord {
  return {
    mem_id: "mem_a1b2c3d4",
    created_run: TEST_TRACE_ID,
    source_target: "support_triage",
    attack_class: "injection_override",
    hit_types: ["disallowed_tool_call"],
    root_cause_code: "FT-01",
    implicated_tool_kind: "outbound_message",
    fix_types: ["prompt_rule"],
    fix_ops: [
      {
        op: "add_prompt_rule",
        rule: "Never echo internal references in messages or outbound replies.",
      },
    ],
    rationale: "Prompt rule preventing leakage through outbound messaging tool.",
    outcome: "verified",
    trust: 0.5,
    reuse_log: [],
    created_at: new Date().toISOString(),
    ...overrides,
  };
}

describe("Task T-D6 & T-D7: H-MEM Memory Adapter & Fix Library", () => {
  beforeEach(() => {
    resetTraceCounter(TEST_TRACE_ID);
    if (!fs.existsSync(TEST_MEMORY_DIR)) {
      fs.mkdirSync(TEST_MEMORY_DIR, { recursive: true });
    }
    if (!fs.existsSync(TEST_LOG_DIR)) {
      fs.mkdirSync(TEST_LOG_DIR, { recursive: true });
    }
  });

  afterEach(() => {
    if (fs.existsSync(TEST_MEMORY_DIR)) {
      fs.rmSync(TEST_MEMORY_DIR, { recursive: true, force: true });
    }
    if (fs.existsSync(TEST_LOG_DIR)) {
      fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
    }
  });

  // ==========================================================================
  // 1. Cross-Target Retrieval (Target A -> Target B)
  // ==========================================================================
  describe("Cross-Target Storage and Retrieval", () => {
    it("stores a verified fix from support_triage and retrieves it for meeting_tasks", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const fixA = makeSampleRecord({
        mem_id: "mem_11111111",
        source_target: "support_triage",
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        implicated_tool_kind: "outbound_message",
        trust: 0.6,
      });

      await memory.store(fixA);
      expect(memory.size).toBe(1);

      // Query from meeting_tasks perspective
      const query: MemoryQuery = {
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 3,
        min_trust: 0.3,
      };

      const retrieved = await memory.retrieve(query);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].mem_id).toBe("mem_11111111");
      expect(retrieved[0].source_target).toBe("support_triage");
      expect(retrieved[0].fix_types).toContain("prompt_rule");
    });

    it("respects min_trust threshold during retrieval", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const lowTrustFix = makeSampleRecord({
        mem_id: "mem_22222222",
        trust: 0.2,
      });

      await memory.store(lowTrustFix);

      const query: MemoryQuery = {
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 3,
        min_trust: 0.3,
      };

      const retrieved = await memory.retrieve(query);
      expect(retrieved.length).toBe(0);
    });

    it("supports optional k parameter to override query.k", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      await memory.store(makeSampleRecord({ mem_id: "mem_aaaa0001", trust: 0.8 }));
      await memory.store(makeSampleRecord({ mem_id: "mem_aaaa0002", trust: 0.7 }));

      const query: MemoryQuery = {
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 10,
        min_trust: 0.1,
      };

      // Calling retrieve with optional 2nd argument k=1 overrides query.k=10
      const retrieved = await memory.retrieve(query, 1);
      expect(retrieved.length).toBe(1);
      expect(retrieved[0].mem_id).toBe("mem_aaaa0001");
    });

    it("guarantees trust strictly dominates secondary tie-breakers per AGENT_SPEC 6.4", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      // Rec 1: High trust (0.95), different attack_class ("canary_probe")
      const rec1 = makeSampleRecord({
        mem_id: "mem_95959595",
        root_cause_code: "FT-01",
        implicated_tool_kind: "outbound_message",
        attack_class: "canary_probe",
        trust: 0.95,
      });

      // Rec 2: Low trust (0.35), matching attack_class ("injection_override")
      const rec2 = makeSampleRecord({
        mem_id: "mem_35353535",
        root_cause_code: "FT-01",
        implicated_tool_kind: "outbound_message",
        attack_class: "injection_override",
        trust: 0.35,
      });

      await memory.store(rec1);
      await memory.store(rec2);

      const query: MemoryQuery = {
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 2,
        min_trust: 0.1,
      };

      const results = await memory.retrieve(query);
      // Even though rec2 matches attack_class, rec1 must strictly rank first due to high trust
      expect(results.length).toBe(2);
      expect(results[0].mem_id).toBe("mem_95959595");
      expect(results[1].mem_id).toBe("mem_35353535");
    });
  });

  // ==========================================================================
  // 2. Trust Updates & Result Reordering
  // ==========================================================================
  describe("Trust Ledger Updates and Dynamic Reordering", () => {
    it("updates trust on success (+0.2) and failure (-0.3) and reorders results", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const fix1 = makeSampleRecord({
        mem_id: "mem_10000001",
        trust: 0.5,
      });
      const fix2 = makeSampleRecord({
        mem_id: "mem_10000002",
        trust: 0.55,
      });

      await memory.store(fix1);
      await memory.store(fix2);

      const query: MemoryQuery = {
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 5,
        min_trust: 0.2,
      };

      // Initially, fix2 (trust 0.55) ranks ahead of fix1 (trust 0.5)
      let results = await memory.retrieve(query);
      expect(results[0].mem_id).toBe("mem_10000002");
      expect(results[1].mem_id).toBe("mem_10000001");

      // Simulate reuse: fix1 succeeds on meeting_tasks, fix2 fails
      const newTrust1 = await memory.updateTrust(
        "mem_10000001",
        "success",
        "meeting_tasks",
        TEST_TRACE_ID
      );
      const newTrust2 = await memory.updateTrust(
        "mem_10000002",
        "failure",
        "meeting_tasks",
        TEST_TRACE_ID
      );

      expect(newTrust1).toBe(0.7); // 0.5 + 0.2
      expect(newTrust2).toBe(0.25); // 0.55 - 0.3

      // Re-query: order must flip! fix1 (0.7) should be top
      results = await memory.retrieve(query);
      expect(results[0].mem_id).toBe("mem_10000001");
      expect(results[1].mem_id).toBe("mem_10000002");

      // Verify reuse_log was appended on both records
      const record1 = memory.getRecord("mem_10000001")!;
      expect(record1.reuse_log.length).toBe(1);
      expect(record1.reuse_log[0]).toEqual({
        run: TEST_TRACE_ID,
        target: "meeting_tasks",
        result: "success",
      });

      const record2 = memory.getRecord("mem_10000002")!;
      expect(record2.reuse_log.length).toBe(1);
      expect(record2.reuse_log[0]).toEqual({
        run: TEST_TRACE_ID,
        target: "meeting_tasks",
        result: "failure",
      });
    });

    it("clamps trust at 1.0 (success) and 0.0 (failure)", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const highFix = makeSampleRecord({ mem_id: "mem_90000001", trust: 0.95 });
      const lowFix = makeSampleRecord({ mem_id: "mem_90000002", trust: 0.15 });

      await memory.store(highFix);
      await memory.store(lowFix);

      const capped = await memory.updateTrust("mem_90000001", "success");
      const floored = await memory.updateTrust("mem_90000002", "failure");

      expect(capped).toBe(1.0);
      expect(floored).toBe(0.0);
    });
  });

  // ==========================================================================
  // 3. Memory Modes ("warm", "cold", "off")
  // ==========================================================================
  describe("Memory Modes (warm, cold, off)", () => {
    it("warm mode persists to disk and reloads on new instance", async () => {
      const mem1 = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      await mem1.store(makeSampleRecord({ mem_id: "mem_aaaaaaaa", trust: 0.8 }));
      expect(mem1.size).toBe(1);

      // Verify files were created
      expect(fs.existsSync(path.join(TEST_MEMORY_DIR, "records.json"))).toBe(true);
      expect(fs.existsSync(path.join(TEST_MEMORY_DIR, "state.json"))).toBe(true);
      expect(fs.existsSync(path.join(TEST_MEMORY_DIR, "ledger.jsonl"))).toBe(true);

      // New instance pointing to same directory loads state
      const mem2 = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      expect(mem2.size).toBe(1);
      const rec = mem2.getRecord("mem_aaaaaaaa");
      expect(rec?.trust).toBe(0.8);
    });

    it("cold mode starts empty and does not persist across instances", async () => {
      const cold1 = new HMemFixMemory({
        mode: "cold",
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      await cold1.store(makeSampleRecord({ mem_id: "mem_bbbbbbbb", trust: 0.7 }));
      expect(cold1.size).toBe(1);

      const cold2 = new HMemFixMemory({
        mode: "cold",
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      expect(cold2.size).toBe(0);
      const retrieved = await cold2.retrieve({
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 3,
        min_trust: 0.1,
      });
      expect(retrieved.length).toBe(0);
    });

    it("off mode does not store or retrieve memories", async () => {
      const offMem = new HMemFixMemory({
        mode: "off",
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      await offMem.store(makeSampleRecord({ mem_id: "mem_cccccccc", trust: 0.9 }));
      expect(offMem.size).toBe(0);

      const retrieved = await offMem.retrieve({
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 3,
        min_trust: 0.1,
      });
      expect(retrieved.length).toBe(0);
    });
  });

  // ==========================================================================
  // 4. Conflict Resolution (SPONSOR_METERLESS.md §A5 item 4)
  // ==========================================================================
  describe("Conflict Resolution", () => {
    it("handles conflicting fixes on same root cause and attack class by auto-resolving and marking loser superseded", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const fixOld = makeSampleRecord({
        mem_id: "mem_11112222",
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        implicated_tool_kind: "outbound_message",
        trust: 0.4,
        fix_ops: [{ op: "add_prompt_rule", rule: "Rule version 1" }],
      });

      await memory.store(fixOld);

      // New fix with higher trust and different fix_ops for the same cause/class/tool
      const fixNew = makeSampleRecord({
        mem_id: "mem_33334444",
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        implicated_tool_kind: "outbound_message",
        trust: 0.85,
        fix_ops: [{ op: "add_prompt_rule", rule: "Rule version 2 with tighter check" }],
      });

      await memory.store(fixNew);

      // Conflict should have triggered: fixNew wins with trust 0.85; fixOld was penalized
      const oldRec = memory.getRecord("mem_11112222");
      expect(oldRec).toBeDefined();
      expect(oldRec!.trust).toBeLessThanOrEqual(0.4);

      // Retrieval should strongly prioritize fixNew over fixOld
      const results = await memory.retrieve({
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 2,
        min_trust: 0.1,
      });

      expect(results[0].mem_id).toBe("mem_33334444");
    });
  });

  // ==========================================================================
  // 5. Tracing Integration (DATA_CONTRACTS.md §10)
  // ==========================================================================
  describe("Tracing Integration", () => {
    it("emits valid trace lines to logs/<trace_id>.jsonl for store, retrieve, and updateTrust", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      const rec = makeSampleRecord({ mem_id: "mem_77778888" });
      await memory.store(rec);

      await memory.retrieve({
        root_cause_code: "FT-01",
        attack_class: "injection_override",
        hit_types: ["disallowed_tool_call"],
        tool_kind: "outbound_message",
        k: 1,
        min_trust: 0.1,
      });

      await memory.updateTrust("mem_77778888", "success", "support_triage", TEST_TRACE_ID);

      const logFile = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
      expect(fs.existsSync(logFile)).toBe(true);

      const lines = fs
        .readFileSync(logFile, "utf-8")
        .split("\n")
        .filter(Boolean)
        .map((l) => JSON.parse(l));

      expect(lines.length).toBe(3);
      expect(lines[0].agent_name).toBe("Memory");
      expect(lines[0].action).toBe("store_memory");
      expect(lines[0].status).toBe("success");

      expect(lines[1].agent_name).toBe("Memory");
      expect(lines[1].action).toBe("retrieve_memory");
      expect(lines[1].status).toBe("success");

      expect(lines[2].agent_name).toBe("Memory");
      expect(lines[2].action).toBe("update_trust");
      expect(lines[2].status).toBe("success");
    });
  });

  // ==========================================================================
  // 6. Error Resilience & Graceful Degradation
  // ==========================================================================
  describe("Error Resilience & Graceful Degradation", () => {
    it("catches corrupt store files gracefully and notifies onDegraded without crashing", () => {
      let degradedReason = "";
      // Pre-seed corrupt records.json
      fs.writeFileSync(path.join(TEST_MEMORY_DIR, "records.json"), "{ NOT_VALID_JSON", "utf-8");

      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
        onDegraded: (reason) => {
          degradedReason = reason;
        },
      });

      expect(degradedReason).toBe("memory_unavailable");
      expect(memory.size).toBe(0);
    });

    it("returns empty array on retrieval error and logs fallback status without throwing", async () => {
      let degradedReason = "";
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
        onDegraded: (reason) => {
          degradedReason = reason;
        },
      });

      // Pass an invalid query that violates schema
      const invalidQuery = {
        root_cause_code: "INVALID_CODE",
        min_trust: -5,
      } as unknown as MemoryQuery;

      const results = await memory.retrieve(invalidQuery);
      expect(results).toEqual([]);
      expect(degradedReason).toBe("memory_unavailable");
    });

    it("listRecords returns sorted records and reset clears store and persistent file", async () => {
      const memory = new HMemFixMemory({
        mode: "warm",
        persistDir: TEST_MEMORY_DIR,
        logDir: TEST_LOG_DIR,
        traceId: TEST_TRACE_ID,
      });

      await memory.store(
        makeSampleRecord({
          mem_id: "mem_11111111",
          created_at: "2026-10-24T10:00:00.000Z",
        })
      );
      await memory.store(
        makeSampleRecord({
          mem_id: "mem_22222222",
          created_at: "2026-10-24T11:00:00.000Z",
        })
      );

      const list = memory.listRecords();
      expect(list.length).toBe(2);
      expect(list[0].mem_id).toBe("mem_22222222"); // newest first
      expect(list[1].mem_id).toBe("mem_11111111");

      memory.reset();
      expect(memory.size).toBe(0);
      expect(memory.listRecords()).toEqual([]);
      expect(fs.existsSync(path.join(TEST_MEMORY_DIR, "records.json"))).toBe(false);
    });
  });
});
