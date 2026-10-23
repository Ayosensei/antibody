import { loadConfig, AppConfig } from "../../config";
import { ChatMessage, GeneratorOptions, GeneratorResult, LLMRole } from "./types";

export class MeterlessAuthError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "MeterlessAuthError";
  }
}

function resolveEndpoint(baseUrl: string, path: string): string {
  const cleanBase = baseUrl.replace(/\/+$/, "");
  const cleanPath = path.replace(/^\/+/, "");
  if (cleanBase.endsWith("/v1")) {
    return `${cleanBase}/${cleanPath}`;
  }
  return `${cleanBase}/v1/${cleanPath}`;
}

export function resolveMeterlessModel(role: LLMRole, cfg: AppConfig): string {
  if (role === "reasoning") {
    return cfg.meterless_model_reasoning || cfg.meterless_model || "meterless/auto";
  }
  return cfg.meterless_model_fast || cfg.meterless_model || "meterless/auto";
}

export async function callMeterlessChat(
  role: LLMRole,
  messages: ChatMessage[],
  options?: GeneratorOptions,
  configOverride?: AppConfig
): Promise<GeneratorResult> {
  const cfg = configOverride || loadConfig();
  const baseUrl = cfg.meterless_base_url || "http://127.0.0.1:8088/v1";
  const url = resolveEndpoint(baseUrl, "chat/completions");
  const model = resolveMeterlessModel(role, cfg);

  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "meterless-app": cfg.meterless_app_id || "antibody",
    "meterless-scope": "user",
  };

  if (cfg.meterless_runtime_token) {
    headers["Authorization"] = `Bearer ${cfg.meterless_runtime_token}`;
  }

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

    if (response.status === 401) {
      const errText = await response.text().catch(() => "");
      throw new MeterlessAuthError(
        `Meterless Nightshift returned 401 Unauthorized: invalid or missing runtime token${
          errText ? ` (${errText.slice(0, 100)})` : ""
        }`
      );
    }

    if (!response.ok) {
      const errText = await response.text().catch(() => "");
      throw new Error(
        `Meterless Nightshift request failed with HTTP ${response.status} ${response.statusText}${
          errText ? `: ${errText.slice(0, 200)}` : ""
        }`
      );
    }

    const data = await response.json();
    const choice = data.choices?.[0];
    const text = choice?.message?.content;

    if (typeof text !== "string") {
      throw new Error("Meterless Nightshift returned malformed completion response: missing choices[0].message.content");
    }

    return {
      text,
      provider: "meterless",
      model: data.model || model,
      usage: data.usage,
    };
  } catch (err: unknown) {
    if (err instanceof MeterlessAuthError) {
      throw err;
    }
    if ((err as { name?: string }).name === "AbortError") {
      throw new Error(`Meterless Nightshift request timed out after ${timeoutMs}ms`);
    }
    throw err;
  } finally {
    clearTimeout(timeoutId);
  }
}

export async function getMeterlessModels(configOverride?: AppConfig): Promise<string[]> {
  const cfg = configOverride || loadConfig();
  const baseUrl = cfg.meterless_base_url || "http://127.0.0.1:8088/v1";
  const url = resolveEndpoint(baseUrl, "models");

  const headers: Record<string, string> = {
    "meterless-app": cfg.meterless_app_id || "antibody",
  };
  if (cfg.meterless_runtime_token) {
    headers["Authorization"] = `Bearer ${cfg.meterless_runtime_token}`;
  }

  const response = await fetch(url, { headers });
  if (!response.ok) {
    throw new Error(`Meterless model discovery failed: HTTP ${response.status}`);
  }
  const data = await response.json();
  if (Array.isArray(data.data)) {
    return data.data.map((m: { id: string }) => m.id);
  }
  return [];
}
