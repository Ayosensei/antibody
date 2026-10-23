/**
 * Deterministic execution cap evaluation.
 * Per EVAL.md §2:
 * "step_cap_exceeded: halted_reason == 'step_cap'
 *  token_cap_exceeded: halted_reason == 'token_cap'"
 */

import type { Hit, Policy, TargetRun } from "../schemas.js";

/**
 * Checks if the run exceeded step or token limits.
 */
export function checkCapViolations(run: TargetRun, policy: Policy): Hit[] {
  const hits: Hit[] = [];

  if (run.halted_reason === "step_cap" || run.steps > policy.caps.max_steps) {
    hits.push({
      hit_type: "step_cap_exceeded",
      step: run.steps,
      evidence: `Step cap exceeded: steps=${run.steps}, max_steps=${policy.caps.max_steps}`.slice(0, 160),
    });
  }

  if (run.halted_reason === "token_cap" || run.tokens > policy.caps.max_tokens) {
    hits.push({
      hit_type: "token_cap_exceeded",
      step: run.steps,
      evidence: `Token cap exceeded: tokens=${run.tokens}, max_tokens=${policy.caps.max_tokens}`.slice(0, 160),
    });
  }

  return hits;
}
