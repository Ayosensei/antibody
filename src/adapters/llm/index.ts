import { loadConfig, AppConfig } from "../../config";
import { writeTraceLine } from "../../tracing";
import { callMeterlessChat, MeterlessAuthError } from "./meterless";
import { callNvidiaChat } from "./nvidia";
import { callReplayChat } from "./replay";
import { ChatMessage, GeneratorOptions, GeneratorResult, LLMRole } from "./types";

export * from "./types";
export * from "./meterless";
export * from "./nvidia";
export * from "./replay";

function createFallbackTraceId(): string {
  const now = new Date();
  const iso = now.toISOString();
  // Format: run_YYYYMMDDTHHMMSSZ_a1b2
  const yyyymmdd = iso.slice(0, 10).replace(/-/g, "");
  const hhmmss = iso.slice(11, 19).replace(/:/g, "");
  return `run_${yyyymmdd}T${hhmmss}Z_0000`;
}

async function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function generator(
  role: LLMRole,
  messages: ChatMessage[],
  options?: GeneratorOptions,
  configOverride?: AppConfig
): Promise<GeneratorResult> {
  const cfg = configOverride || loadConfig();
  const provider = options?.providerOverride || cfg.llm_provider || "meterless";
  const traceId = options?.traceContext?.traceId || options?.traceId || createFallbackTraceId();
  const traceLogDir = options?.traceContext?.logDir || options?.logDir || cfg.log_dir;
  const traceCanaryKey = options?.traceContext?.canaryKey || options?.canaryKey || cfg.canary_key;
  const maxRetries = cfg.max_retries ?? 2;

  if (provider === "replay") {
    return callReplayChat(role, messages, options);
  }

  // 1. Direct NVIDIA invocation if provider is configured as nvidia
  if (provider === "nvidia") {
    let lastErr: Error | null = null;
    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        const res = await callNvidiaChat(role, messages, options, cfg);
        writeTraceLine(
          {
            timestamp: new Date().toISOString(),
            trace_id: traceId,
            agent_name: "System",
            action: "llm_call",
            input_summary: `role=${role}, provider=nvidia, model=${res.model}, messages=${messages.length}`,
            output_summary: `completed chars=${res.text.length}`,
            target_agent: "System",
            confidence: 1.0,
            retry_count: attempt,
            status: "success",
          },
          { logDir: traceLogDir, canaryKey: traceCanaryKey }
        );
        return res;
      } catch (err: unknown) {
        lastErr = err instanceof Error ? err : new Error(String(err));
        if (attempt < maxRetries) {
          await sleep(Math.pow(2, attempt) * 500);
        }
      }
    }
    throw new Error(`NVIDIA provider failed after ${maxRetries} retries: ${lastErr?.message}`);
  }

  // 2. Primary Meterless Nightshift invocation
  let meterlessErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await callMeterlessChat(role, messages, options, cfg);
      writeTraceLine(
        {
          timestamp: new Date().toISOString(),
          trace_id: traceId,
          agent_name: "System",
          action: "llm_call",
          input_summary: `role=${role}, provider=meterless, model=${res.model}, messages=${messages.length}`,
          output_summary: `completed chars=${res.text.length}`,
          target_agent: "System",
          confidence: 1.0,
          retry_count: attempt,
          status: "success",
        },
        { logDir: traceLogDir, canaryKey: traceCanaryKey }
      );
      return res;
    } catch (err: unknown) {
      if (err instanceof MeterlessAuthError) {
        // 401 Unauthorized must be surfaced immediately without swallowing or falling back
        throw err;
      }
      meterlessErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  // 3. Fallback to NVIDIA direct if Meterless failed (not due to auth error)
  const failureReason = meterlessErr ? meterlessErr.message.slice(0, 200) : "Nightshift connection failed";
  writeTraceLine(
    {
      timestamp: new Date().toISOString(),
      trace_id: traceId,
      agent_name: "System",
      action: "fallback_provider",
      input_summary: `meterless failed (${failureReason})`,
      output_summary: "switched to provider=nvidia",
      target_agent: "System",
      confidence: 1.0,
      retry_count: 0,
      status: "fallback",
    },
    { logDir: traceLogDir, canaryKey: traceCanaryKey }
  );

  // Attempt NVIDIA fallback
  let nvidiaErr: Error | null = null;
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      const res = await callNvidiaChat(role, messages, options, cfg);
      writeTraceLine(
        {
          timestamp: new Date().toISOString(),
          trace_id: traceId,
          agent_name: "System",
          action: "llm_call",
          input_summary: `role=${role}, provider=nvidia (fallback), model=${res.model}, messages=${messages.length}`,
          output_summary: `completed chars=${res.text.length}`,
          target_agent: "System",
          confidence: 1.0,
          retry_count: attempt,
          status: "success",
        },
        { logDir: traceLogDir, canaryKey: traceCanaryKey }
      );
      return res;
    } catch (err: unknown) {
      nvidiaErr = err instanceof Error ? err : new Error(String(err));
      if (attempt < maxRetries) {
        await sleep(Math.pow(2, attempt) * 500);
      }
    }
  }

  throw new Error(
    `All LLM providers failed. Meterless: ${meterlessErr?.message}. NVIDIA fallback: ${nvidiaErr?.message}`
  );
}
