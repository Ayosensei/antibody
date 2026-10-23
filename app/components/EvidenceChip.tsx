"use client";

import React, { useState } from "react";
import type { EvidenceItem } from "../../src/schemas";
import { parseEvidenceRef } from "../lib/evidence";

export interface EvidenceChipProps {
  evidenceRef: string;
  evidenceMap?: Record<string, EvidenceItem | string>;
}

export function EvidenceChip({ evidenceRef, evidenceMap }: EvidenceChipProps) {
  const [expanded, setExpanded] = useState(false);
  const info = parseEvidenceRef(evidenceRef);
  const item = evidenceMap ? evidenceMap[evidenceRef] : null;
  const snippet = item ? (typeof item === "string" ? item : item.snippet) : null;

  return (
    <span className="ab-evidence-chip-wrapper" style={{ display: "inline-block", position: "relative" }}>
      <button
        type="button"
        className={`ab-evidence-chip ${expanded ? "ab-evidence-chip--active" : ""}`}
        title={info.fullLabel}
        aria-label={info.fullLabel}
        aria-expanded={expanded}
        onClick={() => setExpanded(!expanded)}
      >
        <span className="ab-evidence-chip__label">{info.label}</span>
      </button>

      {expanded && (
        <div
          className="ab-plate ab-inlay"
          style={{
            position: "absolute",
            top: "calc(100% + 6px)",
            left: 0,
            zIndex: 100,
            width: "max-content",
            maxWidth: "380px",
            padding: "12px 16px",
            boxShadow: "0 8px 24px rgba(0,0,0,0.6)",
          }}
          role="region"
          aria-label={info.fullLabel}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", gap: "8px" }}>
            <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", fontFamily: "var(--ab-font-mono)" }}>
              {info.sourceLabel}
            </span>
            <button
              type="button"
              className="ab-btn ab-btn--ghost"
              style={{ padding: "2px 6px", fontSize: "11px" }}
              onClick={() => setExpanded(false)}
            >
              Close
            </button>
          </div>
          <div style={{ fontSize: "var(--ab-fs-mono-sm)", fontFamily: "var(--ab-font-mono)", color: "var(--ab-text-2)", wordBreak: "break-all" }}>
            {evidenceRef}
          </div>
          {snippet ? (
            <div
              style={{
                marginTop: "8px",
                padding: "8px",
                background: "var(--ab-s0)",
                borderRadius: "var(--ab-r-tag)",
                fontSize: "var(--ab-fs-body-sm)",
                color: "var(--ab-text-1)",
                maxHeight: "180px",
                overflowY: "auto",
                whiteSpace: "pre-wrap",
              }}
            >
              {snippet}
            </div>
          ) : (
            <div style={{ marginTop: "6px", fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>
              Snippet verified in run evidence packet.
            </div>
          )}
        </div>
      )}
    </span>
  );
}
