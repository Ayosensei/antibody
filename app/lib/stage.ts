/**
 * Stage tracker state and mapping per docs/DESIGN.md §9.2.
 */

import type { TraceLine } from "../../src/schemas";

export type StageNumber = 1 | 2 | 3 | 4 | 5 | 6;
export type StageStatus = "upcoming" | "current" | "done" | "failed";

export interface StageInfo {
  number: StageNumber;
  name: string;
  status: StageStatus;
  revisited: boolean;
}

export const STAGE_NAMES: Record<StageNumber, string> = {
  1: "Set up",
  2: "Attack",
  3: "Diagnose",
  4: "Fix",
  5: "Verify",
  6: "Report",
};

const ACTION_STAGE_MAP: Record<string, StageNumber> = {
  load_target: 1,
  generate_attacks: 2,
  mutate_attack: 2,
  execute_attack: 2,
  diagnose_finding: 3,
  retrieve_memory: 4,
  propose_fix: 4,
  revise_fix: 4,
  apply_fallback_fix: 4,
  verify_fix: 5,
  final_verify: 5,
  commit_fix: 5,
  store_memory: 5,
  update_trust: 5,
  queue_pruned: 5,
  escalate: 5,
  build_report: 6,
};

export function computeStages(
  traceLines: TraceLine[],
  runStatus: "connecting" | "running" | "finished" | "failed" | "lost" | "not_found"
): StageInfo[] {
  let highestReached: StageNumber = 1;
  let currentStage: StageNumber = 1;
  const revisitedMap: Record<StageNumber, boolean> = {
    1: false,
    2: false,
    3: false,
    4: false,
    5: false,
    6: false,
  };

  for (const line of traceLines) {
    const stage = ACTION_STAGE_MAP[line.action];
    if (stage) {
      if (stage < highestReached) {
        // Stage set again after a later stage was reached
        revisitedMap[stage] = true;
      }
      if (stage > highestReached) {
        highestReached = stage;
      }
      currentStage = stage;
    }
  }

  const stages: StageInfo[] = ([1, 2, 3, 4, 5, 6] as StageNumber[]).map((num) => {
    let status: StageStatus = "upcoming";

    if (runStatus === "finished") {
      status = "done";
    } else if (runStatus === "failed") {
      if (num === currentStage) {
        status = "failed";
      } else if (num < currentStage) {
        status = "done";
      } else {
        status = "upcoming";
      }
    } else {
      if (num === currentStage) {
        status = "current";
      } else if (num < currentStage) {
        status = "done";
      } else {
        status = "upcoming";
      }
    }

    return {
      number: num,
      name: STAGE_NAMES[num],
      status,
      revisited: Boolean(revisitedMap[num]),
    };
  });

  return stages;
}
