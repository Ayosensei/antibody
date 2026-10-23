"use client";

import React from "react";
import type { Explanation, EvidenceItem } from "../../src/schemas";
import { EvidenceChip } from "./EvidenceChip";
import { CheckIcon, AlertIcon } from "./Icons";

export interface ExplanationPanelProps {
  title?: string;
  explanation?: Explanation;
  evidenceMap?: Record<string, EvidenceItem | string>;
}

export function formatValidationError(err: string): string {
  if (err.startsWith("V-1")) return "The explanation had too many or too few claims.";
  if (err.startsWith("V-2")) return "A claim had no evidence.";
  if (err.startsWith("V-3")) return "A claim cited evidence that is not part of this run.";
  if (err.startsWith("V-4")) return "The explanation left out evidence it is required to cite.";
  if (err.startsWith("V-5")) return "A claim contained a secret value.";
  if (err.startsWith("V-6")) return "A claim did not match what the judge found.";
  if (err.startsWith("V-7")) return "A claim named the wrong data source.";
  return err;
}

export function ExplanationPanel({ title, explanation, evidenceMap }: ExplanationPanelProps) {
  if (!explanation) {
    return (
      <div className="ab-inlay" style={{ padding: "16px", borderRadius: "var(--ab-r-card)" }}>
        <p style={{ margin: 0, fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-3)" }}>
          No explanation was produced for this step.
        </p>
      </div>
    );
  }

  const isVerified = explanation.verified;

  return (
    <div
      className="ab-inlay"
      style={{
        padding: "16px 20px",
        borderRadius: "var(--ab-r-card)",
        border: "1px solid var(--ab-line)",
        display: "flex",
        flexDirection: "column",
        gap: "14px",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "8px" }}>
        {title && (
          <span style={{ fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
            {title}
          </span>
        )}

        <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
          {isVerified ? (
            <span className="ab-chip ab-chip--ok">
              <CheckIcon size={12} />
              Evidence checked
            </span>
          ) : (
            <span className="ab-chip ab-chip--warn">
              <AlertIcon size={12} />
              Unverified explanation
            </span>
          )}

          <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>
            {explanation.generated_by === "code" ? "Generated from run data" : "Written by Antibody's model"}
          </span>
        </div>
      </div>

      {!isVerified && (
        <div className="ab-banner ab-banner--warn" style={{ marginBottom: "4px" }}>
          <AlertIcon size={16} />
          <div>
            <div>This explanation could not be fully checked against the run's evidence. Treat it as a hint, not a fact.</div>
            {explanation.validation_errors && explanation.validation_errors.length > 0 && (
              <ul style={{ margin: "6px 0 0 16px", padding: 0, fontSize: "var(--ab-fs-caption)" }}>
                {explanation.validation_errors.map((err, i) => (
                  <li key={i}>{formatValidationError(err)}</li>
                ))}
              </ul>
            )}
          </div>
        </div>
      )}

      <div style={{ display: "flex", flexDirection: "column", gap: "10px" }}>
        {explanation.claims.map((claim, idx) => (
          <div key={idx} style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
            <div style={{ fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)", lineHeight: "var(--ab-lh-body-sm)" }}>
              {claim.text}
            </div>
            {claim.evidence && claim.evidence.length > 0 && (
              <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", alignItems: "center" }}>
                <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", marginRight: "4px" }}>
                  Evidence:
                </span>
                {claim.evidence.map((ref) => (
                  <EvidenceChip key={ref} evidenceRef={ref} evidenceMap={evidenceMap} />
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
