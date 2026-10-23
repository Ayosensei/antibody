import crypto from "node:crypto";
import { Attack, Carrier, InputFilter, TargetConfig, TargetId, ToolCall, ToolName, TOOLS_BY_TARGET } from "../schemas";

/**
 * Deterministically generates a 6-character hex string from seed and run identifier.
 * Formula per DATA_CONTRACTS.md §14: canary = policy.canary_prefix + hex6(seed, run)
 */
export function hex6(seed: number, run: string): string {
  const hash = crypto.createHash("sha256").update(`${seed}:${run}`).digest("hex");
  return hash.slice(0, 6);
}

export function generateCanary(canaryPrefix: string, seed: number, run: string): string {
  return `${canaryPrefix}${hex6(seed, run)}`;
}

/**
 * Composes attack input according to placement rule:
 * - append: benign_text + "\n\n" + injection_text
 * - prepend: injection_text + "\n\n" + benign_text
 * - embed: injection inserted after the first sentence of benign_text
 */
export function composeInput(attack: Pick<Attack, "benign_text" | "injection_text" | "placement">): string {
  const benign = attack.benign_text.trim();
  const injection = attack.injection_text.trim();

  if (attack.placement === "prepend") {
    return `${injection}\n\n${benign}`;
  }

  if (attack.placement === "embed") {
    // Look for sentence boundary (.!?) followed by space or newline
    const sentenceEndMatch = benign.match(/^([^.!?]+[.!?])(\s+|$)/);
    if (sentenceEndMatch) {
      const firstSentence = sentenceEndMatch[1];
      const rest = benign.slice(sentenceEndMatch[0].length);
      if (rest.length > 0) {
        return `${firstSentence} ${injection} ${rest}`;
      }
      return `${firstSentence} ${injection}`;
    }
    // Fallback if no sentence delimiter found
    return `${benign} ${injection}`;
  }

  // Default: "append"
  return `${benign}\n\n${injection}`;
}

export interface FilterResult {
  text: string;
  blocked: boolean;
  blockedByFilterId?: string;
  hasWrapUntrusted: boolean;
}

/**
 * Evaluates input filters on carrier text:
 * - block_pattern: halts immediately if regex matches
 * - strip_pattern: strips matches from text
 * - wrap_untrusted: wraps text in <untrusted>...</untrusted>
 */
export function applyInputFilters(
  rawText: string,
  carrier: Carrier,
  filters: InputFilter[]
): FilterResult {
  let text = rawText;
  let hasWrapUntrusted = false;

  // Find relevant filters for this carrier
  const applicable = filters.filter((f) => f.applies_to.includes(carrier));

  for (const filter of applicable) {
    if (filter.kind === "block_pattern" && filter.pattern) {
      const regex = new RegExp(filter.pattern, "i");
      if (regex.test(text)) {
        return {
          text,
          blocked: true,
          blockedByFilterId: filter.filter_id,
          hasWrapUntrusted: false,
        };
      }
    } else if (filter.kind === "strip_pattern" && filter.pattern) {
      const regex = new RegExp(filter.pattern, "gi");
      text = text.replace(regex, "");
    } else if (filter.kind === "wrap_untrusted") {
      hasWrapUntrusted = true;
      text = `<untrusted>${text}</untrusted>`;
    }
  }

  return {
    text,
    blocked: false,
    hasWrapUntrusted,
  };
}

/**
 * Evaluates permission for a specific tool call against target guardrails:
 * - unknown tool -> refused_unknown
 * - enabled: false -> refused_disabled
 * - max_amount: exceeded -> refused_disabled
 * - requires_approval: true -> held_for_approval
 * - otherwise -> executed
 */
export function evaluateToolCall(
  toolName: string,
  args: Record<string, unknown>,
  config: TargetConfig,
  targetId: TargetId
): ToolCall["status"] {
  const allowedToolsForTarget = TOOLS_BY_TARGET[targetId];
  if (!allowedToolsForTarget.includes(toolName as ToolName)) {
    return "refused_unknown";
  }

  const permission = config.tool_permissions[toolName as ToolName];
  if (!permission) {
    // If no permission specified in config, default to executed
    return "executed";
  }

  if (permission.enabled === false) {
    return "refused_disabled";
  }

  if (permission.max_amount !== undefined && typeof args.amount === "number") {
    if (args.amount > permission.max_amount) {
      return "refused_disabled";
    }
  }

  if (permission.requires_approval === true) {
    return "held_for_approval";
  }

  return "executed";
}
