"use client";

import React, { useState } from "react";
import type { Readiness, Explanation, EvidenceItem } from "../../src/schemas";
import { READINESS_LABELS } from "../lib/labels";
import { Medal } from "./Medal";
import { ExplanationPanel } from "./ExplanationPanel";
import { ChevronIcon, DownloadIcon, ArrowRightIcon } from "./Icons";

export interface ReadinessPlateProps {
  readiness: Readiness;
  summarySentence: string;
  explanation?: Explanation;
  evidenceMap?: Record<string, EvidenceItem | string>;
  traceId: string;
  onDownload?: () => void;
  otherTarget?: string;
}

export function ReadinessPlate({
  readiness,
  summarySentence,
  explanation,
  evidenceMap,
  traceId,
  onDownload,
  otherTarget = "meeting_tasks",
}: ReadinessPlateProps) {
  const [showExplanation, setShowExplanation] = useState(false);
  const info = READINESS_LABELS[readiness] || { label: readiness, medal: "bronze" };

  return (
    <section className={`ab-plate ab-readiness-plate ab-readiness-plate--${info.medal}`}>
      <div className="ab-readiness-plate__header">
        <div className="ab-readiness-plate__title-group">
          <Medal type={info.medal} />
          <div>
            <h2 className="ab-readiness-plate__title">{info.label}</h2>
            <p className="ab-readiness-plate__summary">{summarySentence}</p>
          </div>
        </div>

        <div className="ab-readiness-plate__actions">
          {onDownload && (
            <button type="button" className="ab-btn ab-btn--secondary" onClick={onDownload}>
              <DownloadIcon size={14} />
              Download report (JSON)
            </button>
          )}

          <a
            href={`/?target=${otherTarget}&memory=warm`}
            className="ab-btn ab-btn--secondary"
            title="Run another automation with warm memory"
          >
            Run another automation
            <ArrowRightIcon size={14} />
          </a>
        </div>
      </div>

      <div>
        <button
          type="button"
          className="ab-btn ab-btn--ghost"
          aria-expanded={showExplanation}
          onClick={() => setShowExplanation(!showExplanation)}
          style={{ paddingLeft: 0, marginTop: "8px" }}
        >
          <ChevronIcon size={14} expanded={showExplanation} />
          Why this verdict?
        </button>

        {showExplanation && (
          <div style={{ marginTop: "12px" }}>
            <ExplanationPanel
              title="Why this verdict"
              explanation={explanation}
              evidenceMap={evidenceMap}
            />
          </div>
        )}
      </div>
    </section>
  );
}
