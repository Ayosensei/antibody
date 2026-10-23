import React from "react";
import type { StageInfo } from "../lib/stage";
import { CheckIcon, CrossIcon } from "./Icons";

export interface StageTrackerProps {
  stages?: StageInfo[];
  currentStage?: number;
  isFailed?: boolean;
}

export function StageTracker({ stages, currentStage = 1, isFailed = false }: StageTrackerProps) {
  const stageList: StageInfo[] = stages || [
    { number: 1, name: "Set up", status: currentStage > 1 ? "done" : currentStage === 1 ? "current" : "upcoming", revisited: false },
    { number: 2, name: "Attack", status: currentStage > 2 ? "done" : currentStage === 2 ? "current" : "upcoming", revisited: false },
    { number: 3, name: "Diagnose", status: currentStage > 3 ? "done" : currentStage === 3 ? "current" : "upcoming", revisited: false },
    { number: 4, name: "Fix", status: currentStage > 4 ? "done" : currentStage === 4 ? "current" : "upcoming", revisited: false },
    { number: 5, name: "Verify", status: currentStage > 5 ? "done" : currentStage === 5 ? "current" : "upcoming", revisited: false },
    { number: 6, name: "Report", status: currentStage > 6 ? "done" : currentStage === 6 ? "current" : "upcoming", revisited: false },
  ];

  return (
    <div className="ab-stage-tracker" role="region" aria-label="Run progress sequence">
      {stageList.map((stage) => {
        const isDone = stage.status === "done";
        const isCurrent = stage.status === "current";
        const isFail = stage.status === "failed";

        let stateClass = "";
        if (isDone) stateClass = "ab-stage-step--done";
        if (isCurrent) stateClass = "ab-stage-step--current";
        if (isFail) stateClass = "ab-stage-step--failed";

        return (
          <div
            key={stage.number}
            className={`ab-stage-step ${stateClass}`}
            aria-current={isCurrent ? "step" : undefined}
          >
            <div className="ab-stage-disc">
              {isDone ? (
                <CheckIcon size={12} color="#07080b" />
              ) : isFail ? (
                <CrossIcon size={12} color="#07080b" />
              ) : (
                stage.number
              )}
            </div>
            <span>{stage.name}</span>
            {stage.revisited && (
              <span className="ab-tag ab-tag--neutral" style={{ fontSize: "10px", padding: "1px 4px" }}>
                revisited
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}
