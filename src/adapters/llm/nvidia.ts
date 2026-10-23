import { loadConfig, AppConfig } from "../../config";
import { ChatMessage, GeneratorOptions, GeneratorResult, LLMRole } from "./types";

function resolveEndpoint(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  if (cleanBase.endsWith("/v1")) {
    return `${cleanBase}/${cleanPath}`;
  }
  return `${cleanBase}/v1/${cleanPath}`;
}

export function resolveNvidiaModel(role: LLMRole, cfg: AppConfig): string {
  if (role === "reasoning") {
    return cfg.model_reasoning || "nvidia/nemotron-3.5-super-vl-120b-a12b";
  }
  return cfg.model_fast || "nvidia/nemotron-3.5-lightning-30b-a3b";
}

export async function callNvidiaChat(
  role: LLMRole,
  messages: ChatMessage[],
  options?: GeneratorOptions,
  configOverride?: AppConfig
): Promise<GeneratorResult> {
  const cfg = configOverride || loadConfig();
  const baseUrl = cfg.nvidia_base_url || "https://integrate.api.nvidia.com/v1";
  const url = resolveEndpoint(baseUrl, "chat/completions");
  const model = resolveNvidiaModel(role, cfg);

  if (!cfg.nvidia_api_key || cfg.nvidia_api_key.trim() === "") {
    throw new Error("Cannot call NVIDIA direct provider: NVIDIA_API_KEY is not configured");
  }

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    Authorization: `Bearer ${cfg.nvidia_api_key}`,
  };

  const timeoutMs = options?.timeoutMs || 30000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const bodyPayload = {
      model,
      messages,
      temperature: options?.temperature ?? 0.2,
      ...(options?.maxTokens ? { max_tokens: options.maxTokens } : {}),
    };

    const response = await fetch(url, {
      method: "POST",
      headers,
      body: JSON.stringify(bodyPayload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `NVIDIA API request failed with HTTP ${response.status} ${response.statusText}${
          errText ? `: ${errText.slice(0, 200)}` : ""
        }`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content;

    if (typeof text !== "string") {
      throw new Error("NVIDIA API returned malformed response: missing choices[0].message.content");
    }

    return {
      text,
      provider: "nvidia",
      model: data.model || model,
      usage: data.usage,
    };
  } catch (err: unknown) {
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error(`NVIDIA API request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}
