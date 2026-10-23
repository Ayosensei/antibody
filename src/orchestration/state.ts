/**
 * Shared state for the Antibody agent state machine.
 * Per AGENT_SPEC.md §3 and DATA_CONTRACTS.md.
 */

import type {
  Attack,
  Diagnosis,
  Fix,
  Finding,
  MemoryRecord,
  Policy,
  RegressionResult,
  RegressionTask,
  Rejection,
  Report,
  RunRequest,
  SuiteResult,
  TargetConfig,
  TargetId,
  Unresolved,
  VerificationResult,
} from "../schemas.js";

export interface CurrentFindingState {
  finding: Finding | null;
  diagnosis: Diagnosis | null;
  memories: MemoryRecord[];
  attempt: number;
  rejections: Rejection[];
  fix: Fix | null;
  verification: VerificationResult | null;
}

export interface StateCounters {
  llm_calls: number;
  zetaris_calls: number;
  fix_attempts: number;
  started_at: string;
}

export interface RunState {
  trace_id: string;
  request: RunRequest;
  target_id: TargetId;
  policy: Policy;
  config_before: TargetConfig;
  config_current: TargetConfig;
  attack_suite: Attack[];
  attack_round: 1 | 2;
  baseline: SuiteResult | null;
  baseline_regression: RegressionResult[];
  regression_tasks: RegressionTask[];
  queue: Finding[];
  current: CurrentFindingState;
  accepted_fixes: { fix: Fix; finding: Finding }[];
  unresolved: Unresolved[];
  final: SuiteResult | null;
  counters: StateCounters;
  degraded: string[];
  report: Report | null;
}

export function createInitialRunState(params: {
  traceId: string;
  request: RunRequest;
  targetId: TargetId;
  policy: Policy;
  configBaseline: TargetConfig;
  regressionTasks: RegressionTask[];
}): RunState {
  const startedAt = new Date().toISOString();
  return {
    trace_id: params.traceId,
    request: params.request,
    target_id: params.targetId,
    policy: params.policy,
    config_before: JSON.parse(JSON.stringify(params.configBaseline)),
    config_current: JSON.parse(JSON.stringify(params.configBaseline)),
    attack_suite: [],
    attack_round: 1,
    baseline: null,
    baseline_regression: [],
    regression_tasks: params.regressionTasks,
    queue: [],
    current: {
      finding: null,
      diagnosis: null,
      memories: [],
      attempt: 0,
      rejections: [],
      fix: null,
      verification: null,
    },
    accepted_fixes: [],
    unresolved: [],
    final: null,
    counters: {
      llm_calls: 0,
      zetaris_calls: 0,
      fix_attempts: 0,
      started_at: startedAt,
    },
    degraded: [],
    report: null,
  };
}
