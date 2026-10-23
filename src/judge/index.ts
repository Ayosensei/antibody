/**
 * Pure deterministic judge entry point.
 * LLMs never judge success. Per AGENTS.md Hard Rule 3:
 * "src/judge/ is pure code and must not import any model adapter."
 */

export { checkCanaryLeak, normalizeCanary, containsCanary } from "./canary.js";
export { checkCapViolations } from "./caps.js";
export { checkToolPolicyViolations } from "./tool-policy.js";
export { judgeRun } from "./judge.js";
export {
  evaluateRegressionTask,
  type RegressionEvaluation,
} from "./regression.js";
