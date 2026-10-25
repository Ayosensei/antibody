# H-MEM Fix Memory Integration Contract

Source: `meterless.ai/engines.html` — ENGINE: "H-MEM: Hierarchical Memory Engine"
Event: Open Agent Hackathon 2026
Track: Track 2 — The Agent That Can Explain Why

## Contract Requirements
1. **Engine Architecture**:
   - Wrap the vendored Meterless H-MEM reference engine (`HMEM`, `FNV-1a` embeddings, `scoreOne` retrieval).
   - Implement `retrieve(query, k)` and `store(record)`.
   - Maintain append-only audit ledger recording every read and write operation.

2. **Scoring & Ranking Invariants (AGENT_SPEC §6.4)**:
   - Priority 1: Exact `root_cause_code` match (+1000).
   - Priority 2: Non-superseded state (0 vs -500 penalty).
   - Priority 3: Exact `implicated_tool_kind` match (+100).
   - Priority 4: `trust` descending (`record.trust * 50`).
   - Priority 5: Secondary tie-breakers: `attack_class` (+0.4), hit types overlap (+0.1 each), H-MEM `scoreOne` (+0.05).

3. **Trust & Feedback Updates**:
   - Success on reuse: $+0.2$ trust (capped at $1.0$), log `feedback(hmemId, "helpful")`.
   - Failure on reuse: $-0.3$ trust (floored at $0.0$), log `feedback(hmemId, "wrong")`.

4. **Conflict Resolution**:
   - Detect matching `(root_cause_code, attack_class, implicated_tool_kind)` with distinct `fix_ops`.
   - Supersede older record via `loserRec.supersededBy = winnerHmemId` without destructive mutations.
