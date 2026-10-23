import React from "react";
import type { RunCounters, ProgressMeta } from "../lib/useRun";
import { formatDuration } from "../lib/format";
import { AlertIcon, CheckIcon } from "./Icons";

export interface ProgressPanelProps {
  counters: RunCounters;
  meta: ProgressMeta;
  headsUp: string[];
  targetName?: string;
  attackCount?: number;
  memoryMode?: string;
}

export function ProgressPanel({
  counters,
  meta,
  headsUp,
  targetName,
  attackCount,
  memoryMode,
}: ProgressPanelProps) {
  return (
    <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <div>
        <h3 style={{ margin: "0 0 12px", fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
          Progress
        </h3>

        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
          <div className="ab-inlay" style={{ padding: "12px" }}>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>Model calls</div>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--ab-text-1)", fontFamily: "var(--ab-font-mono)", marginTop: "4px" }}>
              {counters.modelCalls}
            </div>
          </div>

          <div className="ab-inlay" style={{ padding: "12px" }}>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>Zetaris queries</div>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--ab-text-1)", fontFamily: "var(--ab-font-mono)", marginTop: "4px" }}>
              {counters.zetarisQueries}
            </div>
          </div>

          <div className="ab-inlay" style={{ padding: "12px" }}>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>Fix attempts</div>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--ab-text-1)", fontFamily: "var(--ab-font-mono)", marginTop: "4px" }}>
              {counters.fixAttempts}
            </div>
          </div>

          <div className="ab-inlay" style={{ padding: "12px" }}>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>Elapsed</div>
            <div style={{ fontSize: "20px", fontWeight: 600, color: "var(--ab-text-1)", fontFamily: "var(--ab-font-mono)", marginTop: "4px" }}>
              {formatDuration(counters.elapsedMs)}
            </div>
          </div>
        </div>
      </div>

      {(meta.findingIndex !== undefined || meta.attempt !== undefined || meta.queueLeft !== undefined) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            Active Loop
          </div>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {meta.findingIndex !== undefined && (
              <span className="ab-chip ab-chip--active">
                Finding {meta.findingIndex + 1} of {meta.findingsTotal || "?"}
              </span>
            )}
            {meta.attempt !== undefined && (
              <span className="ab-chip ab-chip--active">
                Attempt {meta.attempt + 1} of {meta.attemptsMax || 3}
              </span>
            )}
            {meta.queueLeft !== undefined && (
              <span className="ab-tag ab-tag--neutral">
                {meta.queueLeft} findings left
              </span>
            )}
          </div>
        </div>
      )}

      <div>
        <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
          Heads up
        </div>
        {headsUp.length === 0 ? (
          <div style={{ fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-3)", display: "flex", alignItems: "center", gap: "6px" }}>
            <CheckIcon size={14} color="var(--ab-text-3)" />
            Nothing to flag.
          </div>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            {headsUp.map((item, idx) => (
              <div key={idx} className="ab-banner ab-banner--warn" style={{ padding: "8px 12px", fontSize: "var(--ab-fs-caption)" }}>
                <AlertIcon size={14} />
                <span>{item}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      {(targetName || attackCount || memoryMode) && (
        <div>
          <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", letterSpacing: "0.04em", marginBottom: "8px" }}>
            Run settings
          </div>
          <div className="ab-inlay" style={{ padding: "10px 14px", fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-2)", display: "flex", flexDirection: "column", gap: "4px" }}>
            {targetName && <div>Automation: <strong style={{ color: "var(--ab-text-1)" }}>{targetName}</strong></div>}
            {attackCount && <div>Attacks: <strong style={{ color: "var(--ab-text-1)" }}>{attackCount}</strong></div>}
            {memoryMode && <div>Memory: <strong style={{ color: "var(--ab-text-1)" }}>{memoryMode}</strong></div>}
          </div>
        </div>
      )}
    </div>
  );
}
