"use client";

import React, { useState } from "react";
import type { Fix, VerificationResult, EvidenceItem } from "../../src/schemas";
import { formatFixOp, REJECTION_REASONS } from "../lib/labels";
import { ExplanationPanel } from "./ExplanationPanel";
import { CheckIcon, CrossIcon, ChevronIcon } from "./Icons";

export interface AttemptCardProps {
  attemptNumber: number;
  fix: Fix;
  verification?: VerificationResult;
  evidenceMap?: Record<string, EvidenceItem>;
}

export function AttemptCard({
  attemptNumber,
  fix,
  verification,
  evidenceMap,
}: AttemptCardProps) {
  const [showWhy, setShowWhy] = useState(false);
  const isAccepted = verification?.verdict === "accept";
  const isRejected = verification?.verdict === "reject";

  const originLabel =
    fix.origin === "memory_reuse"
      ? "Based on memory"
      : fix.origin === "fallback"
      ? "Fallback"
      : "Written by Antibody";

  const opsList = fix.ops.flatMap(formatFixOp);

  return (
    <div
      className="ab-inlay"
      style={{
        padding: "16px",
        borderRadius: "var(--ab-r-card)",
        border: `1px solid ${isAccepted ? "var(--ab-line-ok)" : isRejected ? "var(--ab-line-bad)" : "var(--ab-line)"}`,
        display: "flex",
        flexDirection: "column",
        gap: "12px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontWeight: 600, color: "var(--ab-text-1)" }}>Attempt {attemptNumber}</span>
          <span className="ab-tag ab-tag--neutral">{originLabel}</span>
        </div>

        <div>
          {isAccepted && (
            <span className="ab-chip ab-chip--ok">
              <CheckIcon size={12} />
              Accepted
            </span>
          )}
          {isRejected && (
            <span className="ab-chip ab-chip--bad">
              <CrossIcon size={12} />
              Rejected
            </span>
          )}
          {!isAccepted && !isRejected && (
            <span className="ab-chip ab-chip--neutral">Not verified</span>
          )}
        </div>
      </div>

      <div>
        <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", marginBottom: "4px" }}>
          What changed
        </div>
        <ul style={{ margin: "4px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)" }}>
          {opsList.map((line, i) => (
            <li key={i}>{line}</li>
          ))}
        </ul>
      </div>

      {fix.explanation && (
        <div>
          <button
            type="button"
            className="ab-btn ab-btn--ghost"
            style={{ padding: "4px 0", fontSize: "var(--ab-fs-caption)" }}
            onClick={() => setShowWhy(!showWhy)}
          >
            <ChevronIcon size={12} expanded={showWhy} />
            Why this fix
          </button>
          {showWhy && (
            <div style={{ marginTop: "8px" }}>
              <ExplanationPanel
                explanation={fix.explanation}
                evidenceMap={evidenceMap}
              />
            </div>
          )}
        </div>
      )}

      {/* Verification Result */}
      {verification && (
        <div style={{ borderTop: "1px solid var(--ab-line)", paddingTop: "8px" }}>
          <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>
            Result of verification
          </div>
          {isAccepted ? (
            <div style={{ fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-lime)", marginTop: "4px" }}>
              This fix blocked the attack and no normal task broke.
            </div>
          ) : (
            <div style={{ marginTop: "4px", display: "flex", flexDirection: "column", gap: "4px" }}>
              {verification.reasons.map((reason, idx) => (
                <div key={idx} style={{ fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-ember)" }}>
                  <strong>
                    {REJECTION_REASONS[reason.reason_code]?.heading || reason.reason_code}:{" "}
                  </strong>
                  {REJECTION_REASONS[reason.reason_code]?.text || reason.details}
                  {reason.reason_code === "regression_break" && reason.newly_failing_tasks.length > 0 && (
                    <span style={{ marginLeft: "4px" }}>
                      {reason.newly_failing_tasks.map((t) => (
                        <code key={t} style={{ fontFamily: "var(--ab-font-mono)", background: "var(--ab-s0)", padding: "2px 4px", borderRadius: "3px", marginRight: "4px" }}>
                          {t}
                        </code>
                      ))}
                    </span>
                  )}
                  {reason.details && reason.reason_code !== "regression_break" && (
                    <span style={{ marginLeft: "4px" }}>({reason.details})</span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
