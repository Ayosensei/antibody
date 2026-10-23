"use client";

import React, { useMemo } from "react";
import { useParams } from "next/navigation";
import { useRun } from "../../lib/useRun";
import { computeStages } from "../../lib/stage";
import { TARGET_LABELS, DEGRADED_BANNERS, READINESS_LABELS } from "../../lib/labels";
import { formatAsr, formatTimeOfDay } from "../../lib/format";
import type { TargetId } from "../../../src/schemas";

import { StageTracker } from "../../components/StageTracker";
import { TracePanel } from "../../components/TracePanel";
import { ProgressPanel } from "../../components/ProgressPanel";
import { ReadinessPlate } from "../../components/ReadinessPlate";
import { MetricCard } from "../../components/MetricCard";
import { FindingPanel } from "../../components/FindingPanel";
import { GuardrailDiff } from "../../components/GuardrailDiff";
import { AlertIcon, CheckIcon, DownloadIcon } from "../../components/Icons";

export default function RunPage() {
  const params = useParams();
  const traceId = Array.isArray(params.traceId) ? params.traceId[0] : (params.traceId as string);

  const { state, report, errorMessage, traceLines, counters, progressMeta, headsUp } = useRun(traceId);

  const stages = useMemo(() => computeStages(traceLines, state), [traceLines, state]);

  const targetId = report?.target_id || (traceLines[0]?.meta?.target as TargetId) || null;
  const targetLabel = targetId ? TARGET_LABELS[targetId]?.title || targetId : "Automation";

  // Summary sentence construction per DESIGN §8.3.1
  const summarySentence = useMemo(() => {
    if (!report) return "";
    const m = report.metrics;
    if (m.attacks_total > 0 && m.hits_before === 0) {
      return `No attack succeeded in this run. ${m.regression_after.passed} of ${m.regression_after.total} normal tasks pass.`;
    }
    const asrBefore = formatAsr(m.asr_before).percent;
    const asrAfter = formatAsr(m.asr_after).percent;
    let sentence = `Attack success rate went from ${asrBefore} to ${asrAfter}. ${m.regression_after.passed} of ${m.regression_after.total} normal tasks still pass.`;
    if (m.unresolved > 0) {
      sentence += ` ${m.unresolved} ${m.unresolved === 1 ? "attack" : "attacks"} could not be fixed.`;
    }
    const broke = m.regression_after.total - m.regression_after.passed;
    if (broke > 0) {
      sentence += ` ${broke} ${broke === 1 ? "normal task" : "normal tasks"} broke.`;
    }
    return sentence;
  }, [report]);

  const handleDownload = () => {
    if (!report) return;
    const blob = new Blob([JSON.stringify(report, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `antibody-${traceId}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (state === "not_found") {
    return (
      <div className="ab-plate" style={{ maxWidth: "600px", margin: "40px auto", textAlign: "center" }}>
        <h2 style={{ fontSize: "var(--ab-fs-h2)", color: "var(--ab-text-1)" }}>We can't find that run.</h2>
        <p style={{ color: "var(--ab-text-2)", marginBottom: "20px" }}>
          It may have been started on a different machine, or the API was restarted.
        </p>
        <a href="/" className="ab-btn ab-btn--secondary">
          Back to launcher
        </a>
      </div>
    );
  }

  const otherTarget = targetId === "support_triage" ? "meeting_tasks" : "support_triage";
  const readinessExplanation = report?.explanations && report.explanations.length > 0
    ? report.explanations[report.explanations.length - 1]
    : undefined;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "28px", maxWidth: "1100px", margin: "0 auto" }}>
      {/* 1. Run Header & Stage Tracker */}
      <section style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <h1 style={{ margin: 0, fontSize: "var(--ab-fs-h3)", fontWeight: 600, color: "var(--ab-text-1)" }}>
              {targetLabel}
            </h1>
            <code style={{ fontFamily: "var(--ab-font-mono)", fontSize: "var(--ab-fs-mono-sm)", color: "var(--ab-lime)" }}>
              {traceId}
            </code>
          </div>

          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            {state === "connecting" && <span className="ab-tag ab-tag--neutral">Connecting...</span>}
            {state === "running" && <span className="ab-tag ab-tag--neutral">Running</span>}
            {state === "lost" && <span className="ab-tag ab-tag--warn">Reconnecting</span>}
            {state === "failed" && <span className="ab-tag ab-tag--bad">Failed</span>}
            {state === "finished" && (
              <span className="ab-tag ab-tag--ok">
                <CheckIcon size={12} /> Finished
              </span>
            )}
            <a href="/" className="ab-btn ab-btn--ghost" style={{ fontSize: "var(--ab-fs-caption)" }}>
              New run
            </a>
          </div>
        </div>

        {/* 6-Stage Tracker */}
        <StageTracker stages={stages} />
      </section>

      {/* Reconnecting / Lost Banner */}
      {state === "lost" && (
        <div className="ab-banner ab-banner--warn">
          <AlertIcon size={16} />
          <div>Lost connection to the trace stream. Reconnecting...</div>
        </div>
      )}

      {/* Failed Banner */}
      {state === "failed" && (
        <div className="ab-banner ab-banner--bad">
          <AlertIcon size={16} />
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", width: "100%" }}>
            <span>This run stopped before it finished. {errorMessage || ""}</span>
            <a href="/" className="ab-btn ab-btn--ghost" style={{ padding: "4px 8px" }}>
              Run again
            </a>
          </div>
        </div>
      )}

      {/* Finished Jump Banner (UI-15) */}
      {state === "finished" && report && (
        <div className="ab-banner ab-banner--ok" style={{ justifyContent: "space-between" }}>
          <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
            <CheckIcon size={16} />
            <span>
              Run finished. {READINESS_LABELS[report.readiness]?.label || report.readiness}.
            </span>
          </div>
          <a href="#report-section" className="ab-btn ab-btn--ghost" style={{ padding: "4px 8px" }}>
            Jump to report
          </a>
        </div>
      )}

      {/* 2. Live Run View: Split Trace + Progress Panels */}
      <section style={{ display: "grid", gridTemplateColumns: "minmax(0, 2fr) minmax(280px, 1fr)", gap: "20px", alignItems: "start" }}>
        <TracePanel lines={traceLines} />
        <ProgressPanel
          counters={counters}
          meta={progressMeta}
          headsUp={headsUp}
          targetName={targetLabel}
          attackCount={report?.metrics.attacks_total}
          memoryMode={report?.request.memory_mode}
        />
      </section>

      {/* 3. S2b Report Section */}
      {report && (
        <section id="report-section" style={{ display: "flex", flexDirection: "column", gap: "28px", borderTop: "1px solid var(--ab-line)", paddingTop: "32px" }}>
          {/* Degraded banners */}
          {report.degraded && report.degraded.length > 0 && (
            <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
              {report.degraded.map((code) => (
                <div key={code} className="ab-banner ab-banner--warn">
                  <AlertIcon size={16} />
                  <span>{DEGRADED_BANNERS[code] || `Heads up: ${code}.`}</span>
                </div>
              ))}
            </div>
          )}

          {/* S2b.1 Readiness Plate */}
          <ReadinessPlate
            readiness={report.readiness}
            summarySentence={summarySentence}
            explanation={readinessExplanation}
            evidenceMap={report.evidence}
            traceId={traceId}
            onDownload={handleDownload}
            otherTarget={otherTarget}
          />

          {/* S2b.2 Four Metric Cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
            <MetricCard
              label="Attack success rate"
              value={
                <span>
                  {formatAsr(report.metrics.asr_before).percent}{" "}
                  <span style={{ color: "var(--ab-text-3)", fontSize: "20px" }}>→</span>{" "}
                  <span style={{ color: report.metrics.asr_after === 0 ? "var(--ab-lime)" : "var(--ab-ember)" }}>
                    {formatAsr(report.metrics.asr_after).percent}
                  </span>
                </span>
              }
              footnote={`${report.metrics.hits_before} of ${report.metrics.attacks_total} attacks succeeded before. ${report.metrics.hits_after} after.`}
              attention={report.metrics.asr_after > 0}
            />

            <MetricCard
              label="Normal tasks passing"
              value={`${report.metrics.regression_after.passed} / ${report.metrics.regression_after.total}`}
              footnote={
                report.metrics.regression_after.passed === report.metrics.regression_after.total
                  ? "No normal task broke."
                  : `${report.metrics.regression_after.total - report.metrics.regression_after.passed} normal tasks broke.`
              }
              attention={report.metrics.regression_after.passed < report.metrics.regression_after.total}
            />

            <MetricCard
              label="Fixes accepted"
              value={report.metrics.fixes_accepted}
              footnote={`${report.metrics.fixes_rejected} fix(es) rejected on the way. ${report.metrics.fixes_accepted + report.metrics.fixes_rejected} proposals in total.`}
            />

            <MetricCard
              label="Unresolved attacks"
              value={report.metrics.unresolved}
              footnote={report.metrics.unresolved === 0 ? "None left." : "Needs attention"}
              attention={report.metrics.unresolved > 0}
            />
          </div>

          {/* S2b.3 Findings Breakdown */}
          <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
            <div>
              <h3 style={{ margin: "0 0 6px", fontSize: "var(--ab-fs-h2)", fontWeight: 500, color: "var(--ab-text-1)" }}>
                What broke and how it was fixed
              </h3>
              <p style={{ margin: 0, fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
                Each attack that bypassed initial guardrails, diagnosed with evidence and verified against regressions.
              </p>
            </div>

            {report.findings.length === 0 ? (
              <div className="ab-plate" style={{ textAlign: "center", padding: "32px" }}>
                <h4 style={{ margin: "0 0 8px", fontSize: "var(--ab-fs-body-lg)", color: "var(--ab-text-1)" }}>
                  No attack succeeded, so nothing needed fixing.
                </h4>
                <p style={{ margin: 0, fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-3)" }}>
                  This does not prove the automation is safe. See what is still risky below.
                </p>
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
                {report.findings.map((findingItem) => (
                  <FindingPanel
                    key={findingItem.finding.finding_id}
                    findingItem={findingItem}
                    evidenceMap={report.evidence}
                  />
                ))}
              </div>
            )}
          </div>

          {/* S2b.4 Guardrails Before and After */}
          <GuardrailDiff before={report.config_before} after={report.config_after} />

          {/* S2b.5 What is still risky */}
          <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
              What is still risky
            </h3>
            <ul style={{ margin: 0, paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)", display: "flex", flexDirection: "column", gap: "6px" }}>
              {report.unresolved.map((u) => (
                <li key={u.attack_id}>
                  Attack <code style={{ fontFamily: "var(--ab-font-mono)" }}>{u.attack_id}</code> could not be fixed.
                </li>
              ))}
              <li>Attack classes outside this library were not tested.</li>
            </ul>
          </div>

          {/* S2b.6 What Antibody remembered */}
          <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            <h3 style={{ margin: 0, fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
              What Antibody remembered
            </h3>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
              <div className="ab-inlay" style={{ padding: "12px 16px" }}>
                <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>
                  Used from earlier runs
                </span>
                <p style={{ margin: "6px 0 0", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
                  {report.memory.retrieved && report.memory.retrieved.length > 0
                    ? report.memory.retrieved.join(", ")
                    : "Nothing was used."}
                </p>
              </div>

              <div className="ab-inlay" style={{ padding: "12px 16px" }}>
                <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>
                  Saved from this run
                </span>
                <p style={{ margin: "6px 0 0", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
                  {report.memory.stored && report.memory.stored.length > 0
                    ? report.memory.stored.join(", ")
                    : "Nothing was saved."}
                </p>
              </div>
            </div>
          </div>

          {/* S2b.7 Evidence and files */}
          <div className="ab-plate" style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "12px" }}>
            <div>
              <h3 style={{ margin: "0 0 4px", fontSize: "var(--ab-fs-body-md)", fontWeight: 500, color: "var(--ab-text-1)" }}>
                Evidence and files
              </h3>
              <p style={{ margin: 0, fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)" }}>
                Every claim in this report links to evidence from this run ({Object.keys(report.evidence || {}).length} cited items).
              </p>
            </div>

            <button type="button" className="ab-btn ab-btn--secondary" onClick={handleDownload}>
              <DownloadIcon size={14} />
              Download report (JSON)
            </button>
          </div>
        </section>
      )}
    </div>
  );
}
