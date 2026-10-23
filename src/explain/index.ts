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
  type VerificationTemplateParams,
  type UnresolvedTemplateParams,
  type ReadinessTemplateParams,
} from "./templates.js";
