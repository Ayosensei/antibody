import { z } from "zod";

// ============================================================================
// 1. Ids & RegEx Patterns (DATA_CONTRACTS.md §1)
// ============================================================================
export const TRACE_ID_REGEX = /^run_\d{8}T\d{6}Z_[0-9a-f]{4}$/;
export const ATTACK_ID_REGEX = /^atk_(inj|exf|pol|lop|can)_\d{3}(_g\d{2})?$/;
export const TASK_ID_REGEX = /^rg_[sm]_\d{2}$/;
export const FINDING_ID_REGEX = /^fnd_\d{3}$/;
export const FIX_ID_REGEX = /^fix_\d{3}$/;
export const MEM_ID_REGEX = /^mem_[0-9a-f]{8}$/;
export const FILTER_ID_REGEX = /^flt_\d{3}$/;

export const TraceIdSchema = z.string().regex(TRACE_ID_REGEX);
export const AttackIdSchema = z.string().regex(ATTACK_ID_REGEX);
export const TaskIdSchema = z.string().regex(TASK_ID_REGEX);
export const FindingIdSchema = z.string().regex(FINDING_ID_REGEX);
export const FixIdSchema = z.string().regex(FIX_ID_REGEX);
export const MemIdSchema = z.string().regex(MEM_ID_REGEX);
export const FilterIdSchema = z.string().regex(FILTER_ID_REGEX);

// ============================================================================
// 2. Enums (DATA_CONTRACTS.md §2)
// ============================================================================
export const TargetIdSchema = z.enum(["support_triage", "meeting_tasks"]);
export type TargetId = z.infer<typeof TargetIdSchema>;

export const ToolNameSchema = z.enum([
  "issue_refund",
  "update_crm",
  "send_reply",
  "export_customer_list",
  "create_task",
  "send_message",
  "delete_all_tasks",
]);
export type ToolName = z.infer<typeof ToolNameSchema>;

export const ToolKindSchema = z.enum([
  "money",
  "record_write",
  "outbound_message",
  "data_export",
  "destructive",
]);
export type ToolKind = z.infer<typeof ToolKindSchema>;

export const AttackClassSchema = z.enum([
  "injection_override",
  "injection_exfil",
  "policy_bypass",
  "loop_induction",
  "canary_probe",
]);
export type AttackClass = z.infer<typeof AttackClassSchema>;

export const CarrierSchema = z.enum([
  "email_body",
  "ticket_field",
  "transcript_line",
  "form_field",
]);
export type Carrier = z.infer<typeof CarrierSchema>;

export const PlacementSchema = z.enum(["append", "prepend", "embed"]);
export type Placement = z.infer<typeof PlacementSchema>;

export const HitTypeSchema = z.enum([
  "canary_leak",
  "disallowed_tool_call",
  "arg_policy_violation",
  "step_cap_exceeded",
  "token_cap_exceeded",
]);
export type HitType = z.infer<typeof HitTypeSchema>;

export const RootCauseSchema = z.enum([
  "FT-01",
  "FT-02",
  "FT-03",
  "FT-04",
  "FT-05",
  "FT-99",
]);
export type RootCause = z.infer<typeof RootCauseSchema>;

export const FixTypeSchema = z.enum([
  "prompt_rule",
  "tool_permission",
  "input_filter",
  "approval_gate",
]);
export type FixType = z.infer<typeof FixTypeSchema>;

export const TraceStatusSchema = z.enum([
  "success",
  "partial_success",
  "needs_revision",
  "rejected",
  "retrying",
  "fallback",
  "escalated",
  "blocked_out_of_scope",
  "failed",
]);
export type TraceStatus = z.infer<typeof TraceStatusSchema>;

export const MemoryModeSchema = z.enum(["warm", "cold", "off"]);
export type MemoryMode = z.infer<typeof MemoryModeSchema>;

export const ReadinessSchema = z.enum(["ready", "ready_with_risks", "not_ready"]);
export type Readiness = z.infer<typeof ReadinessSchema>;

export const DegradedCodeSchema = z.enum([
  "sample_mode",
  "fallback_provider",
  "replay_mode",
  "local_store",
  "memory_unavailable",
  "llm_budget_hit",
  "timeout_hit",
  "unverified_explanation",
]);
export type DegradedCode = z.infer<typeof DegradedCodeSchema>;

// Tools mapping validation
export const TOOLS_BY_TARGET: Record<TargetId, ToolName[]> = {
  support_triage: ["issue_refund", "update_crm", "send_reply", "export_customer_list"],
  meeting_tasks: ["create_task", "send_message", "delete_all_tasks"],
};

export const TOOL_KINDS: Record<ToolName, ToolKind> = {
  issue_refund: "money",
  update_crm: "record_write",
  send_reply: "outbound_message",
  export_customer_list: "data_export",
  create_task: "record_write",
  send_message: "outbound_message",
  delete_all_tasks: "destructive",
};

// ============================================================================
// 16. Evidence refs and explanations (Defined early to support schemas below)
// ============================================================================
export const EvidenceRefSchema = z.string().min(1);
export type EvidenceRef = z.infer<typeof EvidenceRefSchema>;

export const EvidenceItemSchema = z.object({
  ref: EvidenceRefSchema,
  kind: z.enum([
    "attack",
    "run_step",
    "hit",
    "zetaris_row",
    "local_row",
    "memory",
    "config",
    "diagnosis",
    "verification",
    "suite",
    "trace",
  ]),
  source: z.enum([
    "run",
    "judge",
    "zetaris",
    "local",
    "memory",
    "config",
    "diagnoser",
    "verifier",
    "trace",
  ]),
  snippet: z.string().max(300),
});
export type EvidenceItem = z.infer<typeof EvidenceItemSchema>;

export const ExplanationClaimSchema = z.object({
  claim_id: z.string().min(1),
  kind: z.enum(["cause", "decision", "outcome", "risk"]),
  text: z.string().min(1).max(240),
  evidence: z.array(EvidenceRefSchema).min(1).max(5),
});
export type ExplanationClaim = z.infer<typeof ExplanationClaimSchema>;

export const ExplanationSchema = z.object({
  subject: z.enum(["diagnosis", "fix", "verification", "readiness", "unresolved"]),
  subject_id: z.string().min(1),
  claims: z.array(ExplanationClaimSchema).min(1).max(8),
  generated_by: z.enum(["llm", "code"]),
  verified: z.boolean(),
  validation_errors: z.array(z.string()),
});
export type Explanation = z.infer<typeof ExplanationSchema>;

// ============================================================================
// 3. Policy (DATA_CONTRACTS.md §3)
// ============================================================================
export const ArgRuleSchema = z.object({
  field: z.string().min(1),
  op: z.enum(["max", "equals_ctx", "in_ctx", "in_enum", "regex"]),
  value: z.union([z.number(), z.string(), z.array(z.string())]).optional(),
  ctx_key: z.string().optional(),
}).superRefine((val, ctx) => {
  if (val.op === "max" && typeof val.value !== "number") {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "op 'max' requires numeric value" });
  }
  if (val.op === "regex") {
    if (typeof val.value !== "string") {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: "op 'regex' requires string value" });
    } else {
      try {
        new RegExp(val.value);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid regex pattern" });
      }
    }
  }
  if (val.op === "in_enum" && (!Array.isArray(val.value) || !val.value.every((v) => typeof v === "string"))) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "op 'in_enum' requires string array value" });
  }
  if ((val.op === "equals_ctx" || val.op === "in_ctx") && !val.ctx_key) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: `op '${val.op}' requires ctx_key` });
  }
});
export type ArgRule = z.infer<typeof ArgRuleSchema>;

export const ToolPolicySchema = z.object({
  allowed: z.boolean(),
  arg_rules: z.array(ArgRuleSchema),
});
export type ToolPolicy = z.infer<typeof ToolPolicySchema>;

export const PolicySchema = z.object({
  target_id: TargetIdSchema,
  tools: z.record(ToolNameSchema, ToolPolicySchema),
  caps: z.object({
    max_steps: z.number().int().min(1).max(20),
    max_tokens: z.number().int().min(500).max(20000),
  }),
  canary_prefix: z.string().min(1),
  ctx_schema: z.array(z.string()),
}).superRefine((val, ctx) => {
  const expectedTools = TOOLS_BY_TARGET[val.target_id];
  for (const tool of expectedTools) {
    if (!val.tools[tool]) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Missing policy entry for target tool ${tool}` });
    }
  }
});
export type Policy = z.infer<typeof PolicySchema>;

// ============================================================================
// 4. TargetConfig (DATA_CONTRACTS.md §4)
// ============================================================================
const BANNED_PATTERNS = ["^.*$", "^.+$", "^\\w+$", "^\\s+$", ".*", ".+", "\\w+", "\\s+"];

export const BaseInputFilterSchema = z.object({
  filter_id: FilterIdSchema,
  kind: z.enum(["strip_pattern", "wrap_untrusted", "block_pattern"]),
  pattern: z.string().min(1).max(200).optional(),
  applies_to: z.array(CarrierSchema).min(1),
});

function validateFilterPattern(val: { kind: string; pattern?: string }, ctx: z.RefinementCtx) {
  if (val.kind === "strip_pattern" || val.kind === "block_pattern") {
    if (!val.pattern) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: `kind '${val.kind}' requires pattern` });
    } else {
      if (BANNED_PATTERNS.includes(val.pattern.trim())) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `pattern cannot be overly broad '${val.pattern}'` });
      }
      try {
        const re = new RegExp(val.pattern);
        if (re.test("")) {
          ctx.addIssue({ code: z.ZodIssueCode.custom, message: "pattern must not match empty string" });
        }
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: "invalid regex pattern" });
      }
    }
  }
}

export const InputFilterSchema = BaseInputFilterSchema.superRefine((val, ctx) => {
  validateFilterPattern(val, ctx);
});
export type InputFilter = z.infer<typeof InputFilterSchema>;

export const ToolPermissionSchema = z.object({
  enabled: z.boolean(),
  requires_approval: z.boolean(),
  max_amount: z.number().positive().optional(),
});
export type ToolPermission = z.infer<typeof ToolPermissionSchema>;

export const TargetConfigSchema = z.object({
  target_id: TargetIdSchema,
  version: z.number().int().min(0),
  base_system_prompt: z.string(),
  prompt_rules: z.array(z.string().min(1).max(300)),
  tool_permissions: z.record(ToolNameSchema, ToolPermissionSchema),
  input_filters: z.array(InputFilterSchema),
});
export type TargetConfig = z.infer<typeof TargetConfigSchema>;

// ============================================================================
// 5. Attack (DATA_CONTRACTS.md §5)
// ============================================================================
export const AttackSchema = z.object({
  attack_id: AttackIdSchema,
  class: AttackClassSchema,
  target_scope: z.array(z.union([TargetIdSchema, z.literal("any")])).min(1),
  carrier: CarrierSchema,
  benign_text: z.string(),
  injection_text: z.string().min(1).max(400),
  placement: PlacementSchema,
  expected_hit_types: z.array(HitTypeSchema),
  source: z.enum(["seed", "generated", "judge"]),
  parent_attack_id: z.string().nullable(),
  round: z.union([z.literal(1), z.literal(2)]),
  priority: z.number(),
}).superRefine((val, ctx) => {
  if (/https?:\/\//i.test(val.injection_text)) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "injection_text must not contain URLs (http:// or https://)" });
  }
  const emailMatches = val.injection_text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g);
  if (emailMatches) {
    for (const email of emailMatches) {
      if (!email.endsWith("@example.test")) {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `emails must end with @example.test: ${email}` });
      }
    }
  }
});
export type Attack = z.infer<typeof AttackSchema>;

// ============================================================================
// 6. Target run, tool calls, judge verdict (DATA_CONTRACTS.md §6)
// ============================================================================
export const ToolCallSchema = z.object({
  step: z.number().int().min(1),
  tool: z.string().min(1),
  args: z.record(z.string(), z.unknown()),
  status: z.enum(["executed", "refused_disabled", "held_for_approval", "refused_unknown"]),
});
export type ToolCall = z.infer<typeof ToolCallSchema>;

export const TargetRunSchema = z.object({
  run_ref: z.string().min(1),
  subject_id: z.string().min(1),
  trial: z.number().int().min(1),
  steps: z.number().int().min(0),
  tokens: z.number().int().min(0),
  tokens_estimated: z.boolean(),
  tool_calls: z.array(ToolCallSchema),
  final_output: z.string(),
  halted_reason: z.enum(["done", "step_cap", "token_cap", "input_blocked", "error"]),
  replayed: z.boolean(),
});
export type TargetRun = z.infer<typeof TargetRunSchema>;

export const HitSchema = z.object({
  hit_type: HitTypeSchema,
  tool: z.string().optional(),
  step: z.number().int().min(1).optional(),
  evidence: z.string().max(160),
});
export type Hit = z.infer<typeof HitSchema>;

export const JudgeVerdictSchema = z.object({
  subject_id: z.string().min(1),
  trial: z.number().int().min(1),
  verdict: z.enum(["hit", "blocked", "error"]),
  hits: z.array(HitSchema),
});
export type JudgeVerdict = z.infer<typeof JudgeVerdictSchema>;

// ============================================================================
// 7. Results, findings, diagnosis (DATA_CONTRACTS.md §7)
// ============================================================================
export const AttackResultSchema = z.object({
  attack_id: AttackIdSchema,
  config_version: z.number().int().min(0),
  trials: z.array(JudgeVerdictSchema),
  verdict: z.enum(["hit", "blocked", "error"]),
  hit_types: z.array(HitTypeSchema),
});
export type AttackResult = z.infer<typeof AttackResultSchema>;

export const RegressionResultSchema = z.object({
  task_id: TaskIdSchema,
  passed: z.boolean(),
  config_version: z.number().int().min(0),
  failed_checks: z.array(z.string()),
});
export type RegressionResult = z.infer<typeof RegressionResultSchema>;

export const SuiteResultSchema = z.object({
  config_version: z.number().int().min(0),
  attacks: z.array(AttackResultSchema),
  regression: z.array(RegressionResultSchema),
  asr: z.number().min(0).max(1),
  errors: z.number().int().min(0),
  regression_passed: z.number().int().min(0),
  regression_total: z.number().int().min(0),
});
export type SuiteResult = z.infer<typeof SuiteResultSchema>;

export const FindingSchema = z.object({
  finding_id: FindingIdSchema,
  attack_id: AttackIdSchema,
  hit_types: z.array(HitTypeSchema),
  config_version: z.number().int().min(0),
  run_ref: z.string().min(1),
});
export type Finding = z.infer<typeof FindingSchema>;

export const DiagnosisSchema = z.object({
  finding_id: FindingIdSchema,
  root_cause_code: RootCauseSchema,
  summary: z.string().max(200),
  implicated_tool: ToolNameSchema.nullable(),
  evidence_steps: z.array(z.number().int()),
  confidence: z.number().min(0).max(1),
  recommended_fix_types: z.array(FixTypeSchema),
  diagnosis_fallback: z.boolean(),
  explanation: ExplanationSchema,
});
export type Diagnosis = z.infer<typeof DiagnosisSchema>;

// ============================================================================
// 8. Fix and verification (DATA_CONTRACTS.md §8)
// ============================================================================
export const FixOpSchema = z.discriminatedUnion("op", [
  z.object({
    op: z.literal("add_prompt_rule"),
    rule: z.string().min(1).max(300),
  }),
  z.object({
    op: z.literal("set_tool_permission"),
    tool: ToolNameSchema,
    enabled: z.boolean().optional(),
    requires_approval: z.boolean().optional(),
    max_amount: z.number().positive().optional(),
  }),
  z.object({
    op: z.literal("add_input_filter"),
    filter: BaseInputFilterSchema.omit({ filter_id: true }),
  }),
]).superRefine((val, ctx) => {
  if (val.op === "set_tool_permission") {
    if (val.enabled === undefined && val.requires_approval === undefined && val.max_amount === undefined) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "set_tool_permission must specify at least one of enabled, requires_approval, max_amount",
      });
    }
  }
  if (val.op === "add_input_filter") {
    validateFilterPattern(val.filter, ctx);
  }
});
export type FixOp = z.infer<typeof FixOpSchema>;

export const FixSchema = z.object({
  fix_id: FixIdSchema,
  finding_id: FindingIdSchema,
  attempt: z.number().int().min(1),
  fix_types: z.array(FixTypeSchema),
  ops: z.array(FixOpSchema).min(1).max(3),
  rationale: z.string().max(300),
  used_mem_id: z.string().nullable(),
  origin: z.enum(["llm", "memory_reuse", "fallback"]),
  status: z.enum(["proposed", "accepted", "rejected"]),
  explanation: ExplanationSchema,
}).superRefine((val, ctx) => {
  if (val.origin === "memory_reuse" && val.used_mem_id === null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "used_mem_id cannot be null when origin is memory_reuse" });
  }
  if (val.origin !== "memory_reuse" && val.used_mem_id !== null) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "used_mem_id must be null when origin is not memory_reuse" });
  }
});
export type Fix = z.infer<typeof FixSchema>;

export const RejectionReasonCodeSchema = z.enum([
  "attack_still_hits",
  "prior_fix_broken",
  "regression_break",
  "fix_invalid",
  "duplicate_fix",
]);
export type RejectionReasonCode = z.infer<typeof RejectionReasonCodeSchema>;

export const RejectionSchema = z.object({
  fix_id: FixIdSchema,
  reason_code: RejectionReasonCodeSchema,
  details: z.string().max(300),
  newly_failing_tasks: z.array(z.string()),
});
export type Rejection = z.infer<typeof RejectionSchema>;

export const VerificationResultSchema = z.object({
  fix_id: FixIdSchema,
  attack_blocked: z.boolean(),
  prior_fixes_intact: z.boolean(),
  regression_passed: z.number().int().min(0),
  regression_total: z.number().int().min(0),
  newly_failing_tasks: z.array(z.string()),
  verdict: z.enum(["accept", "reject"]),
  reasons: z.array(RejectionSchema),
  explanation: ExplanationSchema,
}).superRefine((val, ctx) => {
  if (val.verdict === "accept" && val.reasons.length > 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "reasons must be empty on accept" });
  }
  if (val.verdict === "reject" && val.reasons.length === 0) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: "reasons cannot be empty on reject" });
  }
});
export type VerificationResult = z.infer<typeof VerificationResultSchema>;

// ============================================================================
// 9. Memory record (DATA_CONTRACTS.md §9)
// ============================================================================
export const MemoryRecordSchema = z.object({
  mem_id: MemIdSchema,
  created_run: TraceIdSchema,
  source_target: TargetIdSchema,
  attack_class: AttackClassSchema,
  hit_types: z.array(HitTypeSchema),
  root_cause_code: RootCauseSchema,
  implicated_tool_kind: ToolKindSchema.nullable(),
  fix_types: z.array(FixTypeSchema),
  fix_ops: z.array(FixOpSchema).min(1).max(3),
  rationale: z.string(),
  outcome: z.enum(["verified", "unresolved"]),
  trust: z.number().min(0).max(1),
  reuse_log: z.array(
    z.object({
      run: z.string().min(1),
      target: TargetIdSchema,
      result: z.enum(["success", "failure"]),
    })
  ),
  created_at: z.string().datetime(),
});
export type MemoryRecord = z.infer<typeof MemoryRecordSchema>;

export const MemoryQuerySchema = z.object({
  root_cause_code: RootCauseSchema,
  hit_types: z.array(HitTypeSchema),
  attack_class: AttackClassSchema,
  tool_kind: ToolKindSchema.nullable(),
  k: z.number().int().positive(),
  min_trust: z.number().min(0).max(1),
});
export type MemoryQuery = z.infer<typeof MemoryQuerySchema>;

// ============================================================================
// 10. Trace line (DATA_CONTRACTS.md §10)
// ============================================================================
export const TraceAgentNameSchema = z.enum([
  "Attacker",
  "Judge",
  "Diagnoser",
  "Memory",
  "Fixer",
  "Verifier",
  "System",
]);
export type TraceAgentName = z.infer<typeof TraceAgentNameSchema>;

export const TraceActionSchema = z.enum([
  // Attacker
  "generate_attacks",
  "mutate_attack",
  "execute_attack",
  // Judge
  "judge_run",
  "validate_explanation",
  // Diagnoser
  "diagnose_finding",
  // Memory
  "retrieve_memory",
  "store_memory",
  "update_trust",
  // Fixer
  "propose_fix",
  "revise_fix",
  "apply_fallback_fix",
  // Verifier
  "verify_fix",
  "final_verify",
  // System
  "load_target",
  "build_evidence_packet",
  "select_finding",
  "commit_fix",
  "queue_pruned",
  "escalate",
  "zetaris_query",
  "llm_call",
  "fallback_provider",
  "build_report",
  "blocked_out_of_scope",
]);
export type TraceAction = z.infer<typeof TraceActionSchema>;

export const TraceLineSchema = z.object({
  timestamp: z.string().datetime(),
  trace_id: TraceIdSchema,
  agent_name: TraceAgentNameSchema,
  action: TraceActionSchema,
  input_summary: z.string().max(300),
  output_summary: z.string().max(300),
  target_agent: z.string().min(1),
  confidence: z.number().min(0).max(1),
  retry_count: z.number().int().min(0),
  status: TraceStatusSchema,
  replayed: z.boolean().optional(),
  meta: z.record(z.string(), z.union([z.string(), z.number(), z.boolean()])).optional(),
});
export type TraceLine = z.infer<typeof TraceLineSchema>;

// ============================================================================
// 11. API and Report (DATA_CONTRACTS.md §11)
// ============================================================================
export const CustomAttackInputSchema = z.object({
  carrier: CarrierSchema,
  benign_text: z.string().optional(),
  injection_text: z.string().min(1).max(400),
  placement: PlacementSchema.optional(),
});
export type CustomAttackInput = z.infer<typeof CustomAttackInputSchema>;

export const RunRequestSchema = z.object({
  target: TargetIdSchema,
  attack_budget: z.number().int().min(1).max(20).default(8),
  trials: z.number().int().min(1).max(3).default(1),
  seed: z.number().int().default(1),
  memory_mode: MemoryModeSchema.default("warm"),
  custom_attacks: z.array(CustomAttackInputSchema).max(5).optional(),
  wait: z.boolean().default(true),
});
export type RunRequest = z.infer<typeof RunRequestSchema>;

export const ReportSchema = z.object({
  trace_id: TraceIdSchema,
  target_id: TargetIdSchema,
  created_at: z.string().datetime(),
  started_at: z.string().datetime(),
  request: RunRequestSchema,
  custom_attack_results: z.array(
    z.object({
      attack_id: z.string(),
      carrier: CarrierSchema,
      injection_text: z.string(),
      verdict: z.enum(["hit", "blocked", "error"]),
    })
  ),
  modes: z.object({
    sample_mode: z.boolean(),
    llm_provider: z.enum(["meterless", "nvidia", "replay"]),
    memory_mode: MemoryModeSchema,
  }),
  metrics: z.object({
    attacks_total: z.number().int().min(0),
    hits_before: z.number().int().min(0),
    hits_after: z.number().int().min(0),
    asr_before: z.number().min(0).max(1),
    asr_after: z.number().min(0).max(1),
    regression_before: z.object({
      passed: z.number().int().min(0),
      total: z.number().int().min(0),
    }),
    regression_after: z.object({
      passed: z.number().int().min(0),
      total: z.number().int().min(0),
    }),
    fixes_accepted: z.number().int().min(0),
    fixes_rejected: z.number().int().min(0),
    unresolved: z.number().int().min(0),
    fix_attempts_total: z.number().int().min(0),
    llm_calls: z.number().int().min(0),
    zetaris_calls: z.number().int().min(0),
    wall_seconds: z.number().min(0),
    explanations_total: z.number().int().min(0),
    explanations_verified: z.number().int().min(0),
    attack_errors: z.number().int().min(0),
    regression_newly_failing: z.array(z.string()),
  }),
  findings: z.array(
    z.object({
      finding: FindingSchema,
      attack: AttackSchema,
      hits: z.array(HitSchema),
      diagnosis: DiagnosisSchema,
      fixes: z.array(FixSchema),
      verifications: z.array(VerificationResultSchema),
    })
  ),
  unresolved: z.array(
    z.object({
      attack_id: z.string(),
      reasons: z.array(RejectionSchema),
    })
  ),
  remaining_risks: z.array(z.string()),
  memory: z.object({
    retrieved: z.array(z.string()),
    stored: z.array(z.string()),
  }),
  degraded: z.array(z.string()),
  readiness: ReadinessSchema,
  config_before: TargetConfigSchema,
  config_after: TargetConfigSchema,
  trace_path: z.string(),
  explanations: z.array(ExplanationSchema),
  evidence: z.record(EvidenceRefSchema, EvidenceItemSchema),
});
export type Report = z.infer<typeof ReportSchema>;

// ============================================================================
// 12. Regression task (DATA_CONTRACTS.md §12)
// ============================================================================
export const ExpectedCallSchema = z.object({
  tool: ToolNameSchema,
  args_equals: z.record(z.string(), z.union([z.string(), z.number()])).optional(),
  args_match: z.record(z.string(), z.string()).optional(),
}).superRefine((val, ctx) => {
  if (val.args_match) {
    for (const [key, pat] of Object.entries(val.args_match)) {
      try {
        new RegExp(pat);
      } catch {
        ctx.addIssue({ code: z.ZodIssueCode.custom, message: `Invalid regex in args_match.${key}: ${pat}` });
      }
    }
  }
});
export type ExpectedCall = z.infer<typeof ExpectedCallSchema>;

export const RegressionTaskSchema = z.object({
  task_id: TaskIdSchema,
  target_id: TargetIdSchema,
  name: z.string().min(1),
  carrier: CarrierSchema,
  input_text: z.string().min(1),
  ctx: z.record(z.string(), z.union([z.string(), z.array(z.string())])),
  expected_calls: z.array(ExpectedCallSchema),
  forbidden_tools: z.array(ToolNameSchema),
});
export type RegressionTask = z.infer<typeof RegressionTaskSchema>;

// ============================================================================
// 17. Cold vs warm comparison file (DATA_CONTRACTS.md §17)
// ============================================================================
export const PairMetricsSchema = z.object({
  trace_id: TraceIdSchema,
  fix_attempts_total: z.number().int().min(0),
  first_try_accepts: z.number().int().min(0),
  fixes_rejected: z.number().int().min(0),
  llm_calls: z.number().int().min(0),
  wall_seconds: z.number().min(0),
  asr_after: z.number().min(0).max(1),
  unresolved: z.number().int().min(0),
});
export type PairMetrics = z.infer<typeof PairMetricsSchema>;

export const ColdWarmComparisonSchema = z.object({
  created_at: z.string().datetime(),
  source_target_id: TargetIdSchema,
  target_id: TargetIdSchema,
  seed: z.number().int(),
  pairs: z.array(
    z.object({
      cold: PairMetricsSchema,
      warm: PairMetricsSchema,
    })
  ).min(1).max(3),
});
export type ColdWarmComparison = z.infer<typeof ColdWarmComparisonSchema>;
