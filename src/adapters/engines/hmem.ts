import fs from "node:fs";
import path from "node:path";
import {
  MemoryRecord,
  MemoryRecordSchema,
  MemoryQuery,
  MemoryQuerySchema,
  TargetId,
  TraceLine,
} from "../../schemas";
import { writeTraceLine } from "../../tracing";
import { HMEM } from "./hmem-ref/index";
import type { MemoryRecord as HMemRecord } from "./hmem-ref/types";

export interface FixMemory {
  retrieve(query: MemoryQuery): Promise<MemoryRecord[]>;
  store(record: MemoryRecord): Promise<void>;
  updateTrust(
    memId: string,
    result: "success" | "failure",
    target?: TargetId,
    runId?: string
  ): Promise<number>;
}

export type MemoryMode = "warm" | "cold" | "off";

export interface HMemOptions {
  mode?: MemoryMode;
  persistDir?: string;
  logDir?: string;
  traceId?: string;
  clock?: () => number;
  onDegraded?: (reason: string) => void;
}

const DEFAULT_TRACE_ID = "run_20261024T000000Z_0000";

interface PersistedRecordsData {
  version: number;
  records: MemoryRecord[];
  idMap: Record<string, string>; // mem_id -> hmem_id
}

export class HMemFixMemory implements FixMemory {
  readonly hmem: HMEM;
  readonly mode: MemoryMode;
  private readonly persistDir?: string;
  private readonly recordsFile?: string;
  private readonly logDir?: string;
  private readonly traceId: string;
  private readonly clock: () => number;
  private readonly onDegraded?: (reason: string) => void;

  private records = new Map<string, MemoryRecord>();
  private memIdToHmemId = new Map<string, string>();
  private hmemIdToMemId = new Map<string, string>();

  constructor(opts: HMemOptions = {}) {
    this.mode = opts.mode ?? "warm";
    this.clock = opts.clock ?? Date.now;
    this.traceId = opts.traceId ?? DEFAULT_TRACE_ID;
    this.logDir = opts.logDir ?? process.env.TEST_LOG_DIR ?? process.env.LOG_DIR ?? "./logs";
    this.onDegraded = opts.onDegraded;

    if (this.mode === "warm") {
      this.persistDir =
        opts.persistDir ??
        process.env.TEST_MEMORY_DIR ??
        process.env.ANTIBODY_MEMORY_DIR ??
        path.resolve(process.cwd(), "data", "memory");

      if (!fs.existsSync(this.persistDir)) {
        fs.mkdirSync(this.persistDir, { recursive: true });
      }
      this.recordsFile = path.join(this.persistDir, "records.json");
      this.hmem = new HMEM({
        clock: this.clock,
        persistDir: this.persistDir,
        actor: "antibody:fix_memory",
      });

      this.loadPersistedRecords();
    } else {
      // In "cold" or "off" mode, initialize H-MEM purely in-memory (no disk writes)
      this.hmem = new HMEM({
        clock: this.clock,
        actor: "antibody:fix_memory",
      });
    }
  }

  private loadPersistedRecords(): void {
    if (!this.recordsFile || !fs.existsSync(this.recordsFile)) return;
    try {
      const content = fs.readFileSync(this.recordsFile, "utf-8");
      const parsed = JSON.parse(content) as PersistedRecordsData;
      if (Array.isArray(parsed.records)) {
        for (const rec of parsed.records) {
          const valid = MemoryRecordSchema.safeParse(rec);
          if (valid.success) {
            this.records.set(valid.data.mem_id, valid.data);
          }
        }
      }
      if (parsed.idMap) {
        for (const [memId, hmemId] of Object.entries(parsed.idMap)) {
          this.memIdToHmemId.set(memId, hmemId);
          this.hmemIdToMemId.set(hmemId, memId);
        }
      }
    } catch {
      // Corrupt records file fallback: start with empty map and mark degraded
      this.onDegraded?.("memory_corrupt");
    }
  }

  private persistRecords(): void {
    if (!this.recordsFile || this.mode !== "warm") return;
    try {
      const payload: PersistedRecordsData = {
        version: 1,
        records: Array.from(this.records.values()),
        idMap: Object.fromEntries(this.memIdToHmemId.entries()),
      };
      fs.writeFileSync(this.recordsFile, JSON.stringify(payload, null, 2) + "\n", "utf-8");
    } catch (err) {
      this.handleError("persistRecords", err as Error);
    }
  }

  private emitTrace(
    action: "retrieve_memory" | "store_memory" | "update_trust",
    inputSummary: string,
    outputSummary: string,
    status: "success" | "fallback" = "success"
  ): void {
    try {
      const line: TraceLine = {
        timestamp: new Date(this.clock()).toISOString(),
        trace_id: this.traceId,
        agent_name: "Memory",
        action,
        input_summary: inputSummary.slice(0, 300),
        output_summary: outputSummary.slice(0, 300),
        target_agent: "Fixer",
        confidence: 1.0,
        retry_count: 0,
        status,
      };
      writeTraceLine(line, { logDir: this.logDir });
    } catch {
      // Trace writing failure must never crash memory engine
    }
  }

  private handleError(operation: string, err: Error): void {
    this.onDegraded?.("memory_unavailable");
    this.emitTrace(
      operation as "retrieve_memory" | "store_memory" | "update_trust",
      `Operation: ${operation}`,
      `Memory adapter error: ${err.message}. Status degraded: memory_unavailable.`,
      "fallback"
    );
  }

  async store(record: MemoryRecord): Promise<void> {
    if (this.mode === "off") {
      return;
    }

    try {
      const valid = MemoryRecordSchema.parse(record);

      // Check conflict case (SPONSOR_METERLESS.md §A5 item 4):
      // When a new record has the same (root_cause_code, attack_class, implicated_tool_kind)
      // as an existing one but different fix_ops.
      const conflictingRecords = Array.from(this.records.values()).filter(
        (r) =>
          r.root_cause_code === valid.root_cause_code &&
          r.attack_class === valid.attack_class &&
          r.implicated_tool_kind === valid.implicated_tool_kind &&
          r.mem_id !== valid.mem_id &&
          JSON.stringify(r.fix_ops) !== JSON.stringify(valid.fix_ops)
      );

      let supersededMemId: string | undefined;
      let conflictResolvedReason = "";

      for (const existingConflict of conflictingRecords) {
        const existingHmemId = this.memIdToHmemId.get(existingConflict.mem_id);
        const existingHmemRecord = existingHmemId ? this.hmem.store.get(existingHmemId) : undefined;

        // Auto-resolve decision: prefer higher trust, then verified outcome, then newer timestamp
        const preferNew =
          valid.trust > existingConflict.trust ||
          (valid.trust === existingConflict.trust &&
            valid.outcome === "verified" &&
            existingConflict.outcome !== "verified");

        if (preferNew && existingHmemRecord && existingHmemId) {
          supersededMemId = existingConflict.mem_id;
          conflictResolvedReason = `Newer fix ${valid.mem_id} has higher trust (${valid.trust} vs ${existingConflict.trust})`;
          // In H-MEM: losing record is marked supersededBy, never deleted
          existingConflict.trust = Math.max(0.0, Number((existingConflict.trust - 0.2).toFixed(4)));
          this.hmem.ledger.log(existingHmemId, "conflict_resolved", "antibody:fix_memory", {
            details: {
              winner: valid.mem_id,
              reason: conflictResolvedReason,
            },
          });
        } else if (!preferNew) {
          conflictResolvedReason = `Existing fix ${existingConflict.mem_id} retained higher trust (${existingConflict.trust} vs ${valid.trust})`;
        }
      }

      // Add to H-MEM store
      const hmemContent = `[${valid.root_cause_code}] [${valid.attack_class}] [${valid.implicated_tool_kind ?? "any"}] ${valid.rationale}`;
      const hmemRec: HMemRecord = this.hmem.add({
        content: hmemContent,
        confidence: valid.trust,
        source: valid.source_target,
        tags: [valid.root_cause_code, valid.attack_class, valid.source_target],
        layer: "long_term",
        type: "factual",
      });

      if (supersededMemId) {
        const existingHmemId = this.memIdToHmemId.get(supersededMemId);
        const existingHmemRec = existingHmemId ? this.hmem.store.get(existingHmemId) : undefined;
        if (existingHmemRec) {
          existingHmemRec.supersededBy = hmemRec.id;
        }
      }

      this.records.set(valid.mem_id, valid);
      this.memIdToHmemId.set(valid.mem_id, hmemRec.id);
      this.hmemIdToMemId.set(hmemRec.id, valid.mem_id);

      this.persistRecords();

      const conflictDetail =
        conflictingRecords.length > 0 ? ` (Conflict: ${conflictResolvedReason})` : "";
      this.emitTrace(
        "store_memory",
        `Storing fix ${valid.mem_id}: ${valid.root_cause_code}/${valid.attack_class} on ${valid.source_target}`,
        `Stored fix ${valid.mem_id} (trust: ${valid.trust}, H-MEM id: ${hmemRec.id})${conflictDetail}`
      );
    } catch (err) {
      this.handleError("store_memory", err as Error);
    }
  }

  async retrieve(query: MemoryQuery): Promise<MemoryRecord[]> {
    if (this.mode === "off") {
      this.emitTrace(
        "retrieve_memory",
        `Query root_cause: ${query.root_cause_code}, class: ${query.attack_class} (Mode: off)`,
        "Retrieved 0 fix memories (Mode: off)"
      );
      return [];
    }

    try {
      const validQuery = MemoryQuerySchema.parse(query);

      // Score and rank candidates per AGENT_SPEC.md §6.4:
      // Exact root_cause_code match first, then tool_kind match, then trust descending.
      // Filter out records below min_trust.
      const queryText = `${validQuery.root_cause_code} ${validQuery.attack_class} ${validQuery.tool_kind ?? ""}`;
      const candidates: { record: MemoryRecord; rankScore: number }[] = [];

      for (const record of this.records.values()) {
        if (record.trust < validQuery.min_trust) {
          continue;
        }

        let score = 0;
        // Exact root_cause_code match
        if (record.root_cause_code === validQuery.root_cause_code) {
          score += 1000;
        }
        // tool_kind match
        if (
          validQuery.tool_kind !== null &&
          record.implicated_tool_kind === validQuery.tool_kind
        ) {
          score += 100;
        }
        // attack_class match
        if (record.attack_class === validQuery.attack_class) {
          score += 50;
        }
        // hit_types match count
        const commonHits = record.hit_types.filter((h) => validQuery.hit_types.includes(h));
        score += commonHits.length * 10;

        // Base trust weight
        score += record.trust * 20;

        // In H-MEM: check if superseded
        const hmemId = this.memIdToHmemId.get(record.mem_id);
        const hmemRec = hmemId ? this.hmem.store.get(hmemId) : undefined;
        if (hmemRec?.supersededBy) {
          score -= 500; // Penalized in ranking
        }

        // Add subtle H-MEM hybrid score contribution
        if (hmemRec) {
          const hmemSim = this.hmem.retrieval.scoreOne(hmemRec, queryText);
          score += hmemSim * 5;
        }

        candidates.push({ record, rankScore: score });
      }

      // Sort descending by rankScore, then by trust, then by mem_id
      candidates.sort(
        (a, b) =>
          b.rankScore - a.rankScore ||
          b.record.trust - a.record.trust ||
          a.record.mem_id.localeCompare(b.record.mem_id)
      );

      const top = candidates.slice(0, validQuery.k).map((c) => c.record);

      // Record access in H-MEM
      for (const rec of top) {
        const hmemId = this.memIdToHmemId.get(rec.mem_id);
        if (hmemId) {
          this.hmem.store.touch(hmemId);
          this.hmem.ledger.log(hmemId, "read", "antibody:fix_memory", {
            details: { query: queryText },
          });
        }
      }

      this.emitTrace(
        "retrieve_memory",
        `Query root_cause: ${validQuery.root_cause_code}, class: ${validQuery.attack_class}, tool_kind: ${validQuery.tool_kind ?? "any"}, min_trust: ${validQuery.min_trust}`,
        `Retrieved ${top.length} fix memories (k=${validQuery.k}): [${top.map((t) => t.mem_id).join(", ")}]`
      );

      return top;
    } catch (err) {
      this.handleError("retrieve_memory", err as Error);
      return [];
    }
  }

  async updateTrust(
    memId: string,
    result: "success" | "failure",
    target?: TargetId,
    runId?: string
  ): Promise<number> {
    try {
      const record = this.records.get(memId);
      if (!record) {
        throw new Error(`Memory record not found: ${memId}`);
      }

      if (this.mode === "off") {
        return record.trust;
      }

      const prevTrust = record.trust;
      // Trust rules (AGENT_SPEC.md §6.4):
      // Adapted fix accepted: trust +0.2 (cap 1.0)
      // Adapted fix rejected: trust -0.3 (floor 0.0)
      if (result === "success") {
        record.trust = Math.min(1.0, Number((record.trust + 0.2).toFixed(4)));
      } else {
        record.trust = Math.max(0.0, Number((record.trust - 0.3).toFixed(4)));
      }

      // Append to reuse_log
      record.reuse_log.push({
        run: runId ?? this.traceId,
        target: target ?? record.source_target,
        result,
      });

      // Update H-MEM feedback
      const hmemId = this.memIdToHmemId.get(memId);
      if (hmemId) {
        const kind = result === "success" ? "helpful" : "wrong";
        this.hmem.feedback(hmemId, kind);
      }

      this.persistRecords();

      this.emitTrace(
        "update_trust",
        `mem_id: ${memId}, result: ${result}, target: ${target ?? record.source_target}`,
        `Updated trust from ${prevTrust} to ${record.trust} (${result === "success" ? "+0.2" : "-0.3"})`
      );

      return record.trust;
    } catch (err) {
      this.handleError("update_trust", err as Error);
      return this.records.get(memId)?.trust ?? 0;
    }
  }

  /**
   * Helper for tests & diagnostics: get record count.
   */
  get size(): number {
    return this.records.size;
  }

  /**
   * Helper to retrieve raw record by mem_id.
   */
  getRecord(memId: string): MemoryRecord | undefined {
    return this.records.get(memId);
  }
}
