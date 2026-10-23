import dotenv from "dotenv";
import path from "node:path";
import fs from "node:fs";

// Load .env if present
const envPath = path.resolve(process.cwd(), ".env");
if (fs.existsSync(envPath)) {
  dotenv.config({ path: envPath });
} else {
  dotenv.config();
}

export interface AppConfig {
  sample_mode: boolean;
  llm_provider: "meterless" | "nvidia" | "replay";
  log_level: string;
  log_dir: string;
  canary_key?: string;

  // Meterless
  meterless_base_url?: string;
  meterless_runtime_token?: string;
  meterless_model: string;
  meterless_model_reasoning?: string;
  meterless_model_fast?: string;
  meterless_app_id: string;

  // NVIDIA
  nvidia_base_url?: string;
  nvidia_api_key?: string;
  model_reasoning: string;
  model_fast: string;

  // Zetaris
  zetaris_rest_url: string;
  zetaris_org_id: number;
  zetaris_api_key?: string;
  zetaris_timeout_seconds: number;

  // Limits
  max_retries: number;
  attack_trials: number;
  concurrency: number;
  run_max_llm_calls: number;
  run_max_seconds: number;
  target_max_steps: number;
  target_max_tokens: number;

  // Ports
  api_port: number;
  ui_port: number;
}

export interface EnvCheckResult {
  valid: boolean;
  modeDescription: string;
  errors: string[];
}

export function maskSecret(secret?: string): string {
  if (!secret) return "(unset)";
  if (secret.length <= 6) return "***";
  return `${secret.slice(0, 3)}...***...${secret.slice(-3)}`;
}

export function validateEnv(env: Record<string, string | undefined> = process.env): EnvCheckResult {
  const errors: string[] = [];

  const rawSampleMode = (env.SAMPLE_MODE ?? "true").toLowerCase();
  if (rawSampleMode !== "true" && rawSampleMode !== "false") {
    errors.push(`SAMPLE_MODE must be 'true' or 'false', got '${env.SAMPLE_MODE}'`);
  }
  const sampleMode = rawSampleMode === "true";

  const rawProvider = (env.LLM_PROVIDER ?? "meterless").toLowerCase();
  if (!["meterless", "nvidia", "replay"].includes(rawProvider)) {
    errors.push(`LLM_PROVIDER must be 'meterless', 'nvidia', or 'replay', got '${env.LLM_PROVIDER}'`);
  }
  const provider = rawProvider as "meterless" | "nvidia" | "replay";

  // Provider-specific checks
  if (provider === "nvidia") {
    if (!env.NVIDIA_API_KEY || env.NVIDIA_API_KEY.trim() === "") {
      errors.push("Missing required environment variable: NVIDIA_API_KEY (required when LLM_PROVIDER is 'nvidia')");
    }
    if (!env.NVIDIA_BASE_URL || env.NVIDIA_BASE_URL.trim() === "") {
      errors.push("Missing required environment variable: NVIDIA_BASE_URL (required when LLM_PROVIDER is 'nvidia')");
    }
  } else if (provider === "meterless") {
    if (!env.METERLESS_BASE_URL || env.METERLESS_BASE_URL.trim() === "") {
      errors.push("Missing required environment variable: METERLESS_BASE_URL (required when LLM_PROVIDER is 'meterless')");
    }
  }

  // Zetaris checks (only required when NOT in sample mode)
  if (!sampleMode) {
    if (!env.ZETARIS_API_KEY || env.ZETARIS_API_KEY.trim() === "") {
      errors.push("Missing required environment variable: ZETARIS_API_KEY (required when SAMPLE_MODE is false)");
    }
    if (!env.ZETARIS_REST_URL || env.ZETARIS_REST_URL.trim() === "") {
      errors.push("Missing required environment variable: ZETARIS_REST_URL (required when SAMPLE_MODE is false)");
    }
  }

  const modeDescription = `SAMPLE_MODE=${sampleMode} (store: ${sampleMode ? "local sample store" : "live Zetaris"}), LLM_PROVIDER=${provider}`;

  return {
    valid: errors.length === 0,
    modeDescription,
    errors,
  };
}

export function loadConfig(env: Record<string, string | undefined> = process.env): AppConfig {
  const check = validateEnv(env);
  if (!check.valid) {
    throw new Error(`Environment configuration error:\n${check.errors.join("\n")}`);
  }

  const sample_mode = (env.SAMPLE_MODE ?? "true").toLowerCase() === "true";
  const llm_provider = (env.LLM_PROVIDER ?? "meterless").toLowerCase() as "meterless" | "nvidia" | "replay";

  return {
    sample_mode,
    llm_provider,
    log_level: env.LOG_LEVEL || "info",
    log_dir: env.LOG_DIR || "./logs",
    canary_key: env.CANARY_KEY || undefined,

    meterless_base_url: env.METERLESS_BASE_URL || "http://127.0.0.1:8088/v1",
    meterless_runtime_token: env.METERLESS_RUNTIME_TOKEN || undefined,
    meterless_model: env.METERLESS_MODEL || "meterless/auto",
    meterless_model_reasoning: env.METERLESS_MODEL_REASONING || undefined,
    meterless_model_fast: env.METERLESS_MODEL_FAST || undefined,
    meterless_app_id: env.METERLESS_APP_ID || "antibody",

    nvidia_base_url: env.NVIDIA_BASE_URL || undefined,
    nvidia_api_key: env.NVIDIA_API_KEY || undefined,
    model_reasoning: env.MODEL_REASONING || "nvidia/nemotron-3.5-super-vl-120b-a12b",
    model_fast: env.MODEL_FAST || "nvidia/nemotron-3.5-lightning-30b-a3b",

    zetaris_rest_url: env.ZETARIS_REST_URL || "http://localhost:8888/api/v1.0",
    zetaris_org_id: Number.parseInt(env.ZETARIS_ORG_ID || "1", 10),
    zetaris_api_key: env.ZETARIS_API_KEY || undefined,
    zetaris_timeout_seconds: Number.parseInt(env.ZETARIS_TIMEOUT_SECONDS || "20", 10),

    max_retries: Number.parseInt(env.MAX_RETRIES || "2", 10),
    attack_trials: Number.parseInt(env.ATTACK_TRIALS || "1", 10),
    concurrency: Number.parseInt(env.CONCURRENCY || "4", 10),
    run_max_llm_calls: Number.parseInt(env.RUN_MAX_LLM_CALLS || "400", 10),
    run_max_seconds: Number.parseInt(env.RUN_MAX_SECONDS || "420", 10),
    target_max_steps: Number.parseInt(env.TARGET_MAX_STEPS || "8", 10),
    target_max_tokens: Number.parseInt(env.TARGET_MAX_TOKENS || "4000", 10),

    api_port: Number.parseInt(env.API_PORT || "8000", 10),
    ui_port: Number.parseInt(env.UI_PORT || "3100", 10),
  };
}
