import type { TraceContext } from "../../schemas";

export type LLMRole = "reasoning" | "fast";

export interface ChatMessage {
  role: "system" | "user" | "assistant";
  content: string;
}

export interface GeneratorOptions {
  traceId?: string;
  traceContext?: TraceContext;
  logDir?: string;
  canaryKey?: string;
  temperature?: number;
  maxTokens?: number;
  timeoutMs?: number;
  providerOverride?: "meterless" | "nvidia" | "replay";
}

export interface GeneratorResult {
  text: string;
  provider: "meterless" | "nvidia" | "replay";
  model: string;
  usage?: {
    prompt_tokens?: number;
    completion_tokens?: number;
    total_tokens?: number;
  };
}
