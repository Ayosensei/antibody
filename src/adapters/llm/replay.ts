import { ChatMessage, GeneratorOptions, GeneratorResult, LLMRole } from "./types";

export async function callReplayChat(
  _role: LLMRole,
  _messages: ChatMessage[],
  _options?: GeneratorOptions
): Promise<GeneratorResult> {
  throw new Error("Replay provider not implemented yet (stretch S-5)");
}
