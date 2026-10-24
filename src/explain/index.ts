/**
 * Evidence grounding and explanation validation entry point.
 */

export {
  buildEvidencePacket,
  formatEvidencePacketPrompt,
  maskCanary,
  sanitizeSnippet,
  type BuildEvidencePacketParams,
} from "./evidence.js";

export {
  validateExplanation,
  type ValidateExplanationContext,
  type ValidationResult,
} from "./validate.js";

export {
  createVerificationExplanation,
  createUnresolvedExplanation,
  createReadinessExplanation,
  createFallbackFixExplanation,
  type VerificationTemplateParams,
  type UnresolvedTemplateParams,
  type ReadinessTemplateParams,
  type FallbackFixTemplateParams,
} from "./templates.js";
