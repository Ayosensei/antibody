"use client";

import React, { useState } from "react";
import type { Report, EvidenceItem } from "../../src/schemas";
import {
  ATTACK_CLASS_LABELS,
  CARRIER_LABELS,
  HIT_TYPE_LABELS,
  ROOT_CAUSE_LABELS,
} from "../lib/labels";
import { AttemptCard } from "./AttemptCard";
import { ExplanationPanel } from "./ExplanationPanel";
import { ChevronIcon } from "./Icons";

export type ReportFindingItem = Report["findings"][number];

export interface FindingPanelProps {
  findingItem: ReportFindingItem;
  evidenceMap?: Record<string, EvidenceItem>;
  isYours?: boolean;
}

export function FindingPanel({ findingItem, evidenceMap, isYours }: FindingPanelProps) {
  const [expanded, setExpanded] = useState(false);

  const { finding, attack, hits, diagnosis, fixes, verifications } = findingItem;

  const attackClassLabel = ATTACK_CLASS_LABELS[attack.class] || attack.class;
  const carrierLabel = CARRIER_LABELS[attack.carrier] || attack.carrier;
  const rootCauseLabel = ROOT_CAUSE_LABELS[diagnosis.root_cause_code] || diagnosis.root_cause_code;

  const hitTypes = hits.map((h) => h.hit_type);
  const hitsSummary = Array.from(new Set(hitTypes))
    .map((h) => HIT_TYPE_LABELS[h] || h)
    .join(", ");

  const lastVerification = verifications[verifications.length - 1];
  const isAccepted = lastVerification?.verdict === "accept";
  const acceptedFix = fixes.find((_, i) => verifications[i]?.verdict === "accept");
  const isFallback = acceptedFix?.origin === "fallback";

  const outcomeTag = isAccepted ? (
    isFallback ? (
      <span className="ab-tag ab-tag--warn">Fixed with fallback</span>
    ) : (
      <span className="ab-tag ab-tag--ok">Fixed</span>
    )
  ) : (
    <span className="ab-tag ab-tag--bad">Unresolved</span>
  );

  return (
    <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "12px",
          cursor: "pointer",
        }}
        onClick={() => setExpanded(!expanded)}
        role="button"
        tabIndex={0}
        aria-expanded={expanded}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setExpanded(!expanded);
          }
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: "12px", flexWrap: "wrap" }}>
          <ChevronIcon size={16} expanded={expanded} />
          <code style={{ fontFamily: "var(--ab-font-mono)", fontWeight: 600, color: "var(--ab-text-1)" }}>
            {attack.attack_id}
          </code>
          {isYours && <span className="ab-tag ab-tag--neutral">Your attack</span>}
          <span style={{ color: "var(--ab-text-2)", fontSize: "var(--ab-fs-body-sm)" }}>
            {attackClassLabel}
          </span>
          <span style={{ color: "var(--ab-text-3)", fontSize: "var(--ab-fs-body-sm)" }}>
            ({carrierLabel})
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
          <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>
            {fixes.length} {fixes.length === 1 ? "attempt" : "attempts"}
          </span>
          {outcomeTag}
        </div>
      </div>

      {expanded && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px", marginTop: "8px", borderTop: "1px solid var(--ab-line)", paddingTop: "16px" }}>
          {/* Section 1: The attack */}
          <div>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", marginBottom: "6px" }}>
              The attack
            </div>
            <div className="ab-inlay" style={{ padding: "12px 16px", fontSize: "var(--ab-fs-body-sm)" }}>
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                <div>
                  <span style={{ color: "var(--ab-text-3)" }}>Injection text: </span>
                  <code style={{ color: "var(--ab-lime)", wordBreak: "break-all" }}>{attack.injection_text}</code>
                </div>
                <div>
                  <span style={{ color: "var(--ab-text-3)" }}>Where it appears: </span>
                  <span>{carrierLabel}</span>
                </div>
                {attack.benign_text && (
                  <div>
                    <span style={{ color: "var(--ab-text-3)" }}>Normal context: </span>
                    <span>{attack.benign_text}</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Section 2: What happened */}
          <div>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", marginBottom: "6px" }}>
              What happened
            </div>
            <div className="ab-inlay" style={{ padding: "12px 16px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-ember)" }}>
              {hitsSummary || "Attack bypassed guardrails"}
            </div>
          </div>

          {/* Section 3: Why it worked (Diagnosis) */}
          <div>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", marginBottom: "6px" }}>
              Why it worked
            </div>
            <div style={{ marginBottom: "8px", display: "flex", alignItems: "center", gap: "8px" }}>
              <span style={{ fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)" }}>
                {rootCauseLabel}
              </span>
              <code className="ab-tag ab-tag--neutral" style={{ fontFamily: "var(--ab-font-mono)" }}>
                {diagnosis.root_cause_code}
              </code>
            </div>
            <ExplanationPanel
              explanation={diagnosis.explanation}
              evidenceMap={evidenceMap}
            />
          </div>

          {/* Section 4: Fix attempts */}
          <div>
            <div style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase", marginBottom: "8px" }}>
              Fix attempts ({fixes.length})
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
              {fixes.map((fix, idx) => {
                const verification = verifications[idx];
                return (
                  <AttemptCard
                    key={fix.fix_id}
                    attemptNumber={idx + 1}
                    fix={fix}
                    verification={verification}
                    evidenceMap={evidenceMap}
                  />
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
