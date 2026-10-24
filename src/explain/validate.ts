/**
 * Explanation validator implementing rules V-1 to V-7.
 * Per DATA_CONTRACTS.md §16.3 & EVAL.md §12.
 */

import type { EvidenceItem, Explanation } from "../schemas.js";
import { containsCanary } from "../judge/canary.js";

export interface ValidateExplanationContext {
  canary?: string;
  root_cause_code?: string;
  used_mem_id?: string | null;
  subject_id?: string;
  hitTypesByRef?: Record<string, string>; // hit:<ref> -> HitType
}

export interface ValidationResult {
  verified: boolean;
  validation_errors: string[];
}

// Consistency table from EVAL.md §3
const ALLOWED_HIT_TYPES_BY_CODE: Record<string, string[] | "any" | "none"> = {
  "FT-01": "any",
  "FT-02": ["canary_leak"],
  "FT-03": ["disallowed_tool_call", "arg_policy_violation"],
  "FT-04": ["step_cap_exceeded", "token_cap_exceeded"],
  "FT-05": "none",
  "FT-99": "any",
};

/**
 * Validates an explanation against the evidence packet and context.
 */
export function validateExplanation(
  explanation: Explanation,
  packet: EvidenceItem[],
  ctx: ValidateExplanationContext = {}
): ValidationResult {
  const errors: string[] = [];

  const packetRefs = new Set(packet.map((item) => item.ref));
  const packetMap = new Map(packet.map((item) => [item.ref, item]));

  // V-1: 1 to 8 claims; each text 1 to 240 chars; claim_id unique within the explanation
  if (!explanation.claims || explanation.claims.length < 1 || explanation.claims.length > 8) {
    errors.push(`V-1: Explanation must have between 1 and 8 claims, found ${explanation.claims?.length ?? 0}`);
  }

  const seenClaimIds = new Set<string>();
  for (const claim of explanation.claims ?? []) {
    if (seenClaimIds.has(claim.claim_id)) {
      errors.push(`V-1: Duplicate claim_id '${claim.claim_id}'`);
    }
    seenClaimIds.add(claim.claim_id);

    if (!claim.text || claim.text.length < 1 || claim.text.length > 240) {
      errors.push(`V-1: Claim '${claim.claim_id}' text must be between 1 and 240 chars (got ${claim.text?.length ?? 0})`);
    }

    // V-2: Every claim has 1 to 5 refs
    if (!claim.evidence || claim.evidence.length < 1 || claim.evidence.length > 5) {
      errors.push(`V-2: Claim '${claim.claim_id}' must cite between 1 and 5 evidence refs`);
    }

    // V-3: Every ref is present in the evidence packet given to that step
    for (const ref of claim.evidence ?? []) {
      if (!packetRefs.has(ref)) {
        errors.push(`V-3: Claim '${claim.claim_id}' cites ref '${ref}' which is not in the evidence packet`);
      }
    }

    // V-5: No claim text contains the canary (exact or normalized form)
    if (ctx.canary && containsCanary(claim.text, ctx.canary)) {
      errors.push(`V-5: Claim '${claim.claim_id}' text leaks canary`);
    }
  }

  // V-4: Required evidence by subject
  const allRefs = (explanation.claims ?? []).flatMap((c) => c.evidence ?? []);
  switch (explanation.subject) {
    case "diagnosis": {
      const hasCauseWithHitAndRun = (explanation.claims ?? []).some(
        (c) =>
          c.kind === "cause" &&
          c.evidence.some((r) => r.startsWith("hit:")) &&
          c.evidence.some((r) => r.startsWith("run:"))
      );
      if (!hasCauseWithHitAndRun) {
        errors.push("V-4: Diagnosis explanation must contain at least one 'cause' claim citing a 'hit:' ref and a 'run:' ref");
      }
      break;
    }

    case "fix": {
      const hasDecision = (explanation.claims ?? []).some((c) => c.kind === "decision");
      if (!hasDecision) {
        errors.push("V-4: Fix explanation must contain at least one 'decision' claim");
      }
      const hasDiagnosisRef = allRefs.some((r) => r.startsWith("diagnosis:"));
      const hasPolicyOrConfigRef = allRefs.some(
        (r) => r.includes(":policies/") || r.startsWith("config:")
      );
      if (!hasDiagnosisRef) {
        errors.push("V-4: Fix explanation must cite a 'diagnosis:<finding_id>' ref across its claims");
      }
      if (!hasPolicyOrConfigRef) {
        errors.push("V-4: Fix explanation must cite either a policy row ref or 'config:' ref across its claims");
      }
      if (ctx.used_mem_id) {
        const hasMemRef = allRefs.some((r) => r === `memory:${ctx.used_mem_id}`);
        if (!hasMemRef) {
          errors.push(`V-4: Fix explanation specifies used_mem_id '${ctx.used_mem_id}' but does not cite 'memory:${ctx.used_mem_id}'`);
        }
      }
      break;
    }

    case "verification": {
      const hasOutcomeWithVerify = (explanation.claims ?? []).some(
        (c) => c.kind === "outcome" && c.evidence.some((r) => r.startsWith("verify:"))
      );
      if (!hasOutcomeWithVerify) {
        errors.push("V-4: Verification explanation must contain at least one 'outcome' claim citing a 'verify:' ref");
      }
      break;
    }

    case "unresolved": {
      const hasOutcomeWithVerify = (explanation.claims ?? []).some(
        (c) => c.kind === "outcome" && c.evidence.some((r) => r.startsWith("verify:"))
      );
      if (!hasOutcomeWithVerify) {
        errors.push("V-4: Unresolved explanation must contain at least one 'outcome' claim citing a 'verify:' ref");
      }
      break;
    }

    case "readiness": {
      const hasSuiteBefore = (explanation.claims ?? []).some(
        (c) => c.kind === "outcome" && c.evidence.includes("suite:before")
      );
      const hasSuiteAfter = (explanation.claims ?? []).some(
        (c) => c.kind === "outcome" && c.evidence.includes("suite:after")
      );
      if (!hasSuiteBefore || !hasSuiteAfter) {
        errors.push("V-4: Readiness explanation must contain outcome claims citing both 'suite:before' and 'suite:after'");
      }
      for (const claim of explanation.claims ?? []) {
        if (claim.kind === "risk" && !claim.evidence.includes("suite:after")) {
          errors.push(`V-4: Readiness risk claim '${claim.claim_id}' must cite 'suite:after'`);
        }
      }
      break;
    }
  }

  // V-6: A cause claim that cites hit: refs is consistent: each cited hit type is allowed by the Diagnosis root_cause_code
  if (ctx.root_cause_code) {
    const allowed = ALLOWED_HIT_TYPES_BY_CODE[ctx.root_cause_code];
    if (allowed !== "any") {
      for (const claim of explanation.claims ?? []) {
        if (claim.kind === "cause") {
          for (const ref of claim.evidence) {
            if (ref.startsWith("hit:")) {
              let hitType = ctx.hitTypesByRef?.[ref];
              if (!hitType) {
                const item = packetMap.get(ref);
                if (item && item.kind === "hit") {
                  const match = item.snippet.match(/Hit \[([a-zA-Z0-9_]+)\]/);
                  if (match) {
                    hitType = match[1];
                  }
                }
              }
              if (hitType) {
                if (allowed === "none" || !allowed.includes(hitType)) {
                  errors.push(
                    `V-6: Cause claim '${claim.claim_id}' cites hit '${ref}' of type '${hitType}', which is inconsistent with root cause code '${ctx.root_cause_code}'`
                  );
                }
              }
            }
          }
        }
      }
    }
  }

  // V-7: A zetaris: ref is accepted only if its packet item has source: "zetaris"; a local: row must not be labelled zetaris:
  for (const ref of allRefs) {
    if (ref.startsWith("zetaris:")) {
      const item = packetMap.get(ref);
      if (item && item.source !== "zetaris") {
        errors.push(`V-7: Ref '${ref}' is labelled 'zetaris:' but packet source is '${item.source}'`);
      } else if (!item && packetMap.has(ref.replace(/^zetaris:/, "local:"))) {
        errors.push(`V-7: Ref '${ref}' is labelled 'zetaris:' but only a local row exists in the packet`);
      }
    }
  }

  return {
    verified: errors.length === 0,
    validation_errors: errors,
  };
}
