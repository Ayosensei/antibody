/**
 * Code-generated explanation templates.
 * Per DATA_CONTRACTS.md §16.5 & AGENT_SPEC.md §6.8.
 * Pure code templates that always pass validation rules V-1 to V-7.
 */

import type { Explanation } from "../schemas.js";

export interface VerificationTemplateParams {
  fix_id: string;
  verdict: "accept" | "reject";
  rejection_reasons?: string[];
  newly_failing_tasks?: string[];
}

export function createVerificationExplanation(params: VerificationTemplateParams): Explanation {
  const text =
    params.verdict === "accept"
      ? `Fix ${params.fix_id} accepted: targeted attack was blocked and all regression tasks passed.`
      : `Fix ${params.fix_id} rejected due to: ${(params.rejection_reasons || []).join(", ")}.`;

  return {
    subject: "verification",
    subject_id: params.fix_id,
    generated_by: "code",
    verified: true,
    validation_errors: [],
    claims: [
      {
        claim_id: "c1",
        kind: "outcome",
        text: text.slice(0, 240),
        evidence: [`verify:${params.fix_id}`],
      },
    ],
  };
}

export interface UnresolvedTemplateParams {
  attack_id: string;
  last_fix_id: string;
  attempts: number;
  rejection_reasons: string[];
}

export function createUnresolvedExplanation(params: UnresolvedTemplateParams): Explanation {
  const reasonText = params.rejection_reasons.join(", ") || "verification failure";
  const text = `Attack ${params.attack_id} remains unresolved after ${params.attempts} proposal(s): ${reasonText}.`;

  return {
    subject: "unresolved",
    subject_id: params.attack_id,
    generated_by: "code",
    verified: true,
    validation_errors: [],
    claims: [
      {
        claim_id: "c1",
        kind: "outcome",
        text: text.slice(0, 240),
        evidence: [`verify:${params.last_fix_id}`],
      },
    ],
  };
}

export interface ReadinessTemplateParams {
  trace_id: string;
  asr_before: number;
  asr_after: number;
  attacks_total: number;
  unresolved_count: number;
}

export function createReadinessExplanation(params: ReadinessTemplateParams): Explanation {
  return {
    subject: "readiness",
    subject_id: params.trace_id,
    generated_by: "code",
    verified: true,
    validation_errors: [],
    claims: [
      {
        claim_id: "c1",
        kind: "outcome",
        text: `Attack success rate changed from ${params.asr_before.toFixed(2)} to ${params.asr_after.toFixed(2)} on ${params.attacks_total} attacks.`.slice(0, 240),
        evidence: ["suite:before", "suite:after"],
      },
      {
        claim_id: "c2",
        kind: "risk",
        text: `${params.unresolved_count} attack(s) remain unresolved after retries.`.slice(0, 240),
        evidence: ["suite:after"],
      },
    ],
  };
}

export interface FallbackFixTemplateParams {
  fix_id: string;
  finding_id: string;
  tool: string;
  policyRef: string;
}

export function createFallbackFixExplanation(params: FallbackFixTemplateParams): Explanation {
  return {
    subject: "fix",
    subject_id: params.fix_id,
    generated_by: "code",
    verified: true,
    validation_errors: [],
    claims: [
      {
        claim_id: "c1",
        kind: "decision",
        text: `Fallback fix: gated tool ${params.tool} with human approval requirement.`.slice(0, 240),
        evidence: [`diagnosis:${params.finding_id}`, params.policyRef],
      },
    ],
  };
}
