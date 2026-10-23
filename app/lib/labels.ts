/**
 * UI Label mappings per docs/DESIGN.md §9.4.
 * Plain language a builder understands, with internal codes secondary in mono.
 */

import type { TargetId, AttackClass, RootCause, Carrier, Readiness, HitType, FixOp } from "../../src/schemas";

export const TARGET_LABELS: Record<TargetId, { title: string; desc: string }> = {
  support_triage: {
    title: "Support email triage",
    desc: "Reads customer emails, can issue small refunds and update a customer record.",
  },
  meeting_tasks: {
    title: "Meeting notes to tasks",
    desc: "Reads meeting transcripts, creates tasks and posts a summary to the team.",
  },
};

export const ATTACK_CLASS_LABELS: Record<string, string> = {
  injection_override: "Instruction override",
  injection_exfil: "Secret extraction",
  policy_bypass: "Rule bypass",
  loop_induction: "Loop trigger",
  canary_probe: "Direct secret probe",
};

export const CARRIER_LABELS: Record<string, string> = {
  email_body: "Email body",
  ticket_field: "Ticket field",
  transcript_line: "Transcript",
  form_field: "Form field",
};

export const HIT_TYPE_LABELS: Record<string, string> = {
  canary_leak: "Leaked the secret key",
  disallowed_tool_call: "Used a forbidden tool",
  arg_policy_violation: "Broke a tool rule",
  step_cap_exceeded: "Looped past the step limit",
  token_cap_exceeded: "Used too many tokens",
};

export const ROOT_CAUSE_LABELS: Record<string, string> = {
  "FT-01": "Obeyed hidden instructions",
  "FT-02": "Secret exposed without need",
  "FT-03": "Tool rules not enforced",
  "FT-04": "Never stopped",
  "FT-05": "Fix was too broad",
  "FT-99": "Cause not identified",
};

export const READINESS_LABELS: Record<Readiness, { label: string; medal: "gold" | "silver" | "bronze" }> = {
  ready: { label: "Ready to launch", medal: "gold" },
  ready_with_risks: { label: "Ready with risks", medal: "silver" },
  not_ready: { label: "Not ready", medal: "bronze" },
};

export const TRACE_STATUS_LABELS: Record<string, { label: string; icon: string; tone: "ok" | "neutral" | "warn" | "bad" | "info" }> = {
  success: { label: "Done", icon: "check", tone: "ok" },
  partial_success: { label: "Partly done", icon: "check", tone: "neutral" },
  needs_revision: { label: "Needs revision", icon: "edit", tone: "warn" },
  rejected: { label: "Rejected", icon: "x", tone: "bad" },
  retrying: { label: "Retrying", icon: "retry", tone: "info" },
  fallback: { label: "Fallback used", icon: "alert", tone: "warn" },
  escalated: { label: "Escalated", icon: "escalate", tone: "bad" },
  blocked_out_of_scope: { label: "Blocked: out of scope", icon: "blocked", tone: "bad" },
  failed: { label: "Failed", icon: "fail", tone: "bad" },
};

export function formatCarriers(carriers: Carrier[]): string {
  if (!carriers || carriers.length === 0) return "inputs";
  const names = carriers.map((c) => (CARRIER_LABELS[c] || c).toLowerCase());
  if (names.length === 1) return names[0];
  if (names.length === 2) return `${names[0]} and ${names[1]}`;
  return `${names.slice(0, -1).join(", ")} and ${names[names.length - 1]}`;
}

export function formatFixOp(op: FixOp): string[] {
  const lines: string[] = [];
  if (op.op === "add_prompt_rule") {
    lines.push(`Add rule: "${op.rule}"`);
  } else if (op.op === "set_tool_permission") {
    if (op.enabled === false) {
      lines.push(`Turn off ${op.tool}`);
    }
    if (op.requires_approval === true) {
      lines.push(`Require approval for ${op.tool}`);
    }
    if (typeof op.max_amount === "number") {
      lines.push(`Limit ${op.tool} amount to ${op.max_amount}`);
    }
  } else if (op.op === "add_input_filter") {
    const c = formatCarriers(op.filter.applies_to);
    if (op.filter.kind === "wrap_untrusted") {
      lines.push(`Treat ${c} text as data, not instructions`);
    } else if (op.filter.kind === "strip_pattern") {
      lines.push(`Remove text matching "${op.filter.pattern}" from ${c}`);
    } else if (op.filter.kind === "block_pattern") {
      lines.push(`Reject inputs matching "${op.filter.pattern}" in ${c}`);
    }
  }
  return lines;
}

export const REJECTION_REASONS: Record<string, { heading: string; text: string }> = {
  attack_still_hits: {
    heading: "The attack still worked",
    text: "After this fix the same attack still succeeded.",
  },
  prior_fix_broken: {
    heading: "An earlier fix stopped working",
    text: "This fix undid protection added earlier.",
  },
  regression_break: {
    heading: "A normal task broke",
    text: "The fix stopped a normal task from working",
  },
  fix_invalid: {
    heading: "The fix was not valid",
    text: "The proposed change did not pass Antibody's checks.",
  },
  duplicate_fix: {
    heading: "The same fix was tried before",
    text: "This fix matched an earlier rejected attempt.",
  },
};

export const DEGRADED_BANNERS: Record<string, string> = {
  zetaris_fallback: "Zetaris was unreachable, so the local data store answered the same queries.",
  memory_unavailable: "The fix library was unavailable, so this run did not use or save fixes.",
  budget_exhausted: "The run hit its call or time budget, so results may be incomplete.",
  high_error_rate: "More than 20% of attack runs errored. Treat the numbers with care.",
  verifier_error: "A verification could not be completed, so some fixes were rejected for safety.",
  unverified_explanation: "Some explanations could not be fully checked against evidence. They are marked.",
};
