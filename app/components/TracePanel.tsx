"use client";

import React, { useState, useRef, useEffect, useMemo } from "react";
import type { TraceLine } from "../../src/schemas";
import { TRACE_STATUS_LABELS } from "../lib/labels";
import { formatTimeOfDay } from "../lib/format";
import { ChevronIcon } from "./Icons";

export interface TracePanelProps {
  lines: TraceLine[];
}

type FilterKind = "all" | "fix" | "memory" | "zetaris" | "explain";

export function TracePanel({ lines }: TracePanelProps) {
  const [filter, setFilter] = useState<FilterKind>("all");
  const [autoScroll, setAutoScroll] = useState(true);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const counts = useMemo(() => {
    let fix = 0;
    let memory = 0;
    let zetaris = 0;
    let explain = 0;

    lines.forEach((l) => {
      const a = l.action;
      if (["propose_fix", "revise_fix", "apply_fallback_fix", "verify_fix", "final_verify", "commit_fix", "escalate"].includes(a)) {
        fix++;
      }
      if (["retrieve_memory", "store_memory", "update_trust"].includes(a)) {
        memory++;
      }
      if (a === "zetaris_query") {
        zetaris++;
      }
      if (["build_evidence_packet", "validate_explanation"].includes(a)) {
        explain++;
      }
    });

    return { all: lines.length, fix, memory, zetaris, explain };
  }, [lines]);

  const filteredLines = useMemo(() => {
    if (filter === "all") return lines;
    if (filter === "fix") {
      return lines.filter((l) =>
        ["propose_fix", "revise_fix", "apply_fallback_fix", "verify_fix", "final_verify", "commit_fix", "escalate"].includes(l.action)
      );
    }
    if (filter === "memory") {
      return lines.filter((l) => ["retrieve_memory", "store_memory", "update_trust"].includes(l.action));
    }
    if (filter === "zetaris") {
      return lines.filter((l) => l.action === "zetaris_query");
    }
    if (filter === "explain") {
      return lines.filter((l) => ["build_evidence_packet", "validate_explanation"].includes(l.action));
    }
    return lines;
  }, [lines, filter]);

  useEffect(() => {
    if (autoScroll && listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
    }
  }, [filteredLines, autoScroll]);

  const handleScroll = () => {
    if (!listRef.current) return;
    const { scrollTop, scrollHeight, clientHeight } = listRef.current;
    const isAtBottom = scrollHeight - scrollTop - clientHeight < 40;
    if (!isAtBottom && autoScroll) {
      setAutoScroll(false);
    }
  };

  const jumpToLatest = () => {
    if (listRef.current) {
      listRef.current.scrollTop = listRef.current.scrollHeight;
      setAutoScroll(true);
    }
  };

  return (
    <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "12px", height: "100%" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <h3 style={{ margin: 0, fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
          Live trace
        </h3>

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          <button
            type="button"
            className="ab-btn ab-btn--ghost"
            style={{ fontSize: "var(--ab-fs-caption)", padding: "4px 8px" }}
            onClick={() => setAutoScroll(!autoScroll)}
          >
            {autoScroll ? "Pause scrolling" : "Resume scrolling"}
          </button>
          {!autoScroll && (
            <button
              type="button"
              className="ab-btn ab-btn--secondary"
              style={{ fontSize: "var(--ab-fs-caption)", padding: "4px 8px" }}
              onClick={jumpToLatest}
            >
              Jump to latest
            </button>
          )}
        </div>
      </div>

      <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }} role="tablist" aria-label="Trace filters">
        <button
          type="button"
          className={`ab-chip ${filter === "all" ? "ab-chip--active" : ""}`}
          onClick={() => setFilter("all")}
        >
          All ({counts.all})
        </button>
        <button
          type="button"
          className={`ab-chip ${filter === "fix" ? "ab-chip--active" : ""}`}
          onClick={() => setFilter("fix")}
        >
          Fix loop ({counts.fix})
        </button>
        <button
          type="button"
          className={`ab-chip ${filter === "memory" ? "ab-chip--active" : ""}`}
          onClick={() => setFilter("memory")}
        >
          Memory ({counts.memory})
        </button>
        <button
          type="button"
          className={`ab-chip ${filter === "zetaris" ? "ab-chip--active" : ""}`}
          onClick={() => setFilter("zetaris")}
        >
          Zetaris ({counts.zetaris})
        </button>
        <button
          type="button"
          className={`ab-chip ${filter === "explain" ? "ab-chip--active" : ""}`}
          onClick={() => setFilter("explain")}
        >
          Explanations ({counts.explain})
        </button>
      </div>

      <div
        ref={listRef}
        onScroll={handleScroll}
        className="ab-trace-list"
        style={{ flex: 1, minHeight: "360px", maxHeight: "500px" }}
      >
        {filteredLines.length === 0 ? (
          <div style={{ padding: "32px 16px", textAlign: "center", color: "var(--ab-text-3)", fontSize: "var(--ab-fs-body-sm)" }}>
            Waiting for the first event...
          </div>
        ) : (
          filteredLines.map((line, idx) => {
            const rowKey = `${line.trace_id}-${line.timestamp}-${idx}`;
            const isEmber = ["rejected", "failed", "escalated"].includes(line.status);
            const isAmber = ["fallback", "needs_revision"].includes(line.status);
            const statusInfo = TRACE_STATUS_LABELS[line.status] || { label: line.status, tone: "neutral" };
            const isExpanded = expandedId === rowKey;

            let rowClass = "ab-trace-row";
            if (isEmber) rowClass += " ab-trace-row--ember";
            else if (isAmber) rowClass += " ab-trace-row--amber";

            return (
              <div key={rowKey} style={{ display: "flex", flexDirection: "column", gap: "4px" }}>
                <div
                  className={rowClass}
                  onClick={() => setExpandedId(isExpanded ? null : rowKey)}
                  style={{ cursor: "pointer" }}
                  role="button"
                  tabIndex={0}
                  aria-expanded={isExpanded}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setExpandedId(isExpanded ? null : rowKey);
                    }
                  }}
                >
                  <span className={`ab-agent-dot ab-agent-dot--${line.agent_name}`} title={line.agent_name} />
                  <span style={{ fontFamily: "var(--ab-font-mono)", color: "var(--ab-text-3)", flexShrink: 0 }}>
                    {formatTimeOfDay(line.timestamp)}
                  </span>
                  <span style={{ color: "var(--ab-text-1)", fontWeight: 500, flexShrink: 0 }}>
                    {line.agent_name}
                  </span>
                  <span style={{ fontFamily: "var(--ab-font-mono)", color: "var(--ab-text-2)", flexShrink: 0 }}>
                    {line.action}
                  </span>
                  <span className={`ab-tag ab-tag--${statusInfo.tone}`} style={{ flexShrink: 0 }}>
                    {statusInfo.label}
                  </span>
                  <span style={{ color: "var(--ab-text-2)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 }}>
                    {line.output_summary || line.input_summary || ""}
                  </span>
                  <ChevronIcon size={12} color="var(--ab-text-3)" expanded={isExpanded} />
                </div>

                {isExpanded && (
                  <div
                    className="ab-inlay"
                    style={{
                      padding: "12px 16px",
                      borderRadius: "var(--ab-r-card)",
                      fontSize: "var(--ab-fs-mono-sm)",
                      fontFamily: "var(--ab-font-mono)",
                      color: "var(--ab-text-2)",
                      display: "flex",
                      flexDirection: "column",
                      gap: "8px",
                    }}
                  >
                    {line.input_summary && (
                      <div>
                        <strong style={{ color: "var(--ab-text-1)" }}>Received: </strong>
                        {line.input_summary}
                      </div>
                    )}
                    {line.output_summary && (
                      <div>
                        <strong style={{ color: "var(--ab-text-1)" }}>Produced: </strong>
                        {line.output_summary}
                      </div>
                    )}
                    <div>
                      <strong style={{ color: "var(--ab-text-1)" }}>Target agent: </strong>
                      {line.target_agent}
                    </div>
                    {line.meta && Object.keys(line.meta).length > 0 && (
                      <div>
                        <strong style={{ color: "var(--ab-text-1)" }}>Meta: </strong>
                        <pre style={{ margin: "4px 0 0", padding: "6px", background: "var(--ab-s0)", borderRadius: "var(--ab-r-tag)", overflowX: "auto" }}>
                          {JSON.stringify(line.meta, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })
        )}
      </div>
    </div>
  );
}
