/**
 * Evidence packet builder for explanation grounding.
 * Per DATA_CONTRACTS.md §16.1 & AGENT_SPEC.md §6.8:
 * - Snippets capped at 300 characters.
 * - Canary strings masked as CANARY-***.
 * - Pure functions: no model calls, no network.
 */

import type {
  Attack,
  Diagnosis,
  EvidenceItem,
  EvidenceRef,
  Fix,
  Hit,
  MemoryRecord,
  Policy,
  SuiteResult,
  TargetConfig,
  TargetRun,
  VerificationResult,
} from "../schemas.js";
import { normalizeCanary } from "../judge/canary.js";

export interface BuildEvidencePacketParams {
  canary?: string;
  attack?: Attack;
  run?: TargetRun;
  hits?: Hit[];
  policy?: Policy;
  policySource?: "zetaris" | "local";
  config?: TargetConfig;
  targetId?: string;
  diagnosis?: Diagnosis;
  memories?: MemoryRecord[];
  rejectedVerifications?: VerificationResult[];
  verifications?: VerificationResult[];
  priorFixes?: Fix[];
  suiteBefore?: SuiteResult;
  suiteAfter?: SuiteResult;
  traceId?: string;
}

const canaryRegexCache = new Map<string, { exactRe: RegExp; fuzzyRe: RegExp }>();

function getCanaryRegexes(canary: string): { exactRe: RegExp; fuzzyRe: RegExp } {
  let cached = canaryRegexCache.get(canary);
  if (!cached) {
    const escaped = canary.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const exactRe = new RegExp(escaped, "gi");
    const normCanary = normalizeCanary(canary);
    const chars = normCanary.split("").map((c) => c.replace(/[.*+?^${}()|[\]\\]/g, "\\$&"));
    const fuzzyPattern = chars.join("[\\s\\-_]*");
    const fuzzyRe = new RegExp(fuzzyPattern, "gi");
    cached = { exactRe, fuzzyRe };
    canaryRegexCache.set(canary, cached);
  }
  return cached;
}

/**
 * Masks any exact or normalized canary appearances in a string.
 */
export function maskCanary(text: string, canary?: string): string {
  if (!text || !canary || canary.trim() === "") {
    return text;
  }
  let result = text;
  if (result.includes(canary)) {
    result = result.replaceAll(canary, "CANARY-***");
  }
  const normCanary = normalizeCanary(canary);
  if (normCanary.length > 0 && normalizeCanary(result).includes(normCanary)) {
    const { exactRe, fuzzyRe } = getCanaryRegexes(canary);
    // 1. Try direct case-insensitive match
    result = result.replace(exactRe, "CANARY-***");

    // 2. If still present in normalized form, match fuzzy chars allowing optional whitespace/hyphen/underscore
    if (normalizeCanary(result).includes(normCanary)) {
      result = result.replace(fuzzyRe, "CANARY-***");
    }
  }
  return result;
}

/**
 * Truncates and sanitizes a snippet to max 300 characters.
 */
export function sanitizeSnippet(text: string, canary?: string): string {
  const masked = maskCanary(text, canary);
  if (masked.length <= 300) {
    return masked;
  }
  return masked.slice(0, 297) + "...";
}

/**
 * Builds an evidence packet consisting of EvidenceItem objects for a given pipeline step.
 */
export function buildEvidencePacket(params: BuildEvidencePacketParams): EvidenceItem[] {
  const items: EvidenceItem[] = [];
  const canary = params.canary;
  const targetId = params.targetId || params.policy?.target_id || params.config?.target_id || "target";

  // 1. Attack item
  if (params.attack) {
    items.push({
      ref: `attack:${params.attack.attack_id}`,
      kind: "attack",
      source: "run",
      snippet: sanitizeSnippet(
        `[${params.attack.class}] carrier: ${params.attack.carrier}, injection: "${params.attack.injection_text}"`,
        canary
      ),
    });
  }

  // 2. Run steps
  if (params.run) {
    const runRef = params.run.run_ref;
    // Up to 12 tool calls per AGENT_SPEC §6.8
    const callsToCheck = params.run.tool_calls.slice(0, 12);
    for (const call of callsToCheck) {
      items.push({
        ref: `run:${runRef}#step${call.step}`,
        kind: "run_step",
        source: "run",
        snippet: sanitizeSnippet(
          `Step ${call.step}: tool=${call.tool}, status=${call.status}, args=${JSON.stringify(call.args)}`,
          canary
        ),
      });
    }
  }

  // 3. Judge hits
  if (params.hits && params.run) {
    const runRef = params.run.run_ref;
    params.hits.forEach((hit, idx) => {
      items.push({
        ref: `hit:${runRef}#${idx}`,
        kind: "hit",
        source: "judge",
        snippet: sanitizeSnippet(
          `Hit [${hit.hit_type}] on ${hit.tool || "output"}: ${hit.evidence}`,
          canary
        ),
      });
    });
  }

  // 4. Policy rows (from zetaris or local store)
  if (params.policy) {
    const src = params.policySource ?? "local";
    for (const [toolName, toolPolicy] of Object.entries(params.policy.tools)) {
      if (toolPolicy) {
        items.push({
          ref: `${src}:policies/${params.policy.target_id}:${toolName}`,
          kind: src === "zetaris" ? "zetaris_row" : "local_row",
          source: src,
          snippet: sanitizeSnippet(
            `Policy for ${toolName}: allowed=${toolPolicy.allowed}, rules=${JSON.stringify(toolPolicy.arg_rules)}`,
            canary
          ),
        });
      }
    }
  }

  // 5. Config items
  if (params.config) {
    const v = params.config.version;
    items.push({
      ref: `config:${targetId}@v${v}/prompt_rules`,
      kind: "config",
      source: "config",
      snippet: sanitizeSnippet(
        `prompt_rules: ${JSON.stringify(params.config.prompt_rules)}`,
        canary
      ),
    });
    items.push({
      ref: `config:${targetId}@v${v}/tool_permissions`,
      kind: "config",
      source: "config",
      snippet: sanitizeSnippet(
        `tool_permissions: ${JSON.stringify(params.config.tool_permissions)}`,
        canary
      ),
    });
    for (const [toolName, perm] of Object.entries(params.config.tool_permissions)) {
      if (perm) {
        items.push({
          ref: `config:${targetId}@v${v}/tool_permissions.${toolName}`,
          kind: "config",
          source: "config",
          snippet: sanitizeSnippet(
            `tool_permissions.${toolName}: ${JSON.stringify(perm)}`,
            canary
          ),
        });
      }
    }
    items.push({
      ref: `config:${targetId}@v${v}/input_filters`,
      kind: "config",
      source: "config",
      snippet: sanitizeSnippet(
        `input_filters: ${JSON.stringify(params.config.input_filters)}`,
        canary
      ),
    });
  }

  // 6. Diagnosis
  if (params.diagnosis) {
    items.push({
      ref: `diagnosis:${params.diagnosis.finding_id}`,
      kind: "diagnosis",
      source: "diagnoser",
      snippet: sanitizeSnippet(
        `Diagnosis ${params.diagnosis.root_cause_code}: ${params.diagnosis.summary}`,
        canary
      ),
    });
  }

  // 7. Retrieved memories
  if (params.memories) {
    for (const mem of params.memories) {
      items.push({
        ref: `memory:${mem.mem_id}`,
        kind: "memory",
        source: "memory",
        snippet: sanitizeSnippet(
          `Memory ${mem.mem_id} (trust=${mem.trust}): ${mem.rationale || mem.root_cause_code}`,
          canary
        ),
      });
    }
  }

  // 8. Verification items
  const verifItems = params.verifications || params.rejectedVerifications;
  if (verifItems) {
    for (const v of verifItems) {
      const reasonsPart = v.reasons && v.reasons.length > 0 ? `, reasons=${v.reasons.map((r) => r.reason_code).join(", ")}` : "";
      items.push({
        ref: `verify:${v.fix_id}`,
        kind: "verification",
        source: "verifier",
        snippet: sanitizeSnippet(
          `Verification for ${v.fix_id}: verdict=${v.verdict}${reasonsPart}`,
          canary
        ),
      });
    }
  }

  // 9. Suites
  if (params.suiteBefore) {
    const hits = params.suiteBefore.attacks.filter((a) => a.verdict === "hit").length;
    items.push({
      ref: "suite:before",
      kind: "suite",
      source: "verifier",
      snippet: sanitizeSnippet(
        `Baseline suite: asr=${params.suiteBefore.asr}, hits=${hits}/${params.suiteBefore.attacks.length}`,
        canary
      ),
    });
  }
  if (params.suiteAfter) {
    const hits = params.suiteAfter.attacks.filter((a) => a.verdict === "hit").length;
    items.push({
      ref: "suite:after",
      kind: "suite",
      source: "verifier",
      snippet: sanitizeSnippet(
        `Final suite: asr=${params.suiteAfter.asr}, hits=${hits}/${params.suiteAfter.attacks.length}`,
        canary
      ),
    });
  }

  // 10. Trace item
  if (params.traceId) {
    items.push({
      ref: `trace:${params.traceId}`,
      kind: "trace",
      source: "trace",
      snippet: sanitizeSnippet(`Execution trace ${params.traceId}`, canary),
    });
  }

  return items;
}

/**
 * Formats an evidence packet as prompt text: `<ref> | <snippet>` per line.
 */
export function formatEvidencePacketPrompt(packet: EvidenceItem[]): string {
  return packet.map((item) => `${item.ref} | ${item.snippet}`).join("\n");
}
