import { describe, it, expect } from "vitest";
import { validateEnv, maskSecret } from "../src/config";

describe("Config & Environment Validation", () => {
  it("validates successful configuration in sample mode with meterless", () => {
    const env = {
      SAMPLE_MODE: "true",
      LLM_PROVIDER: "meterless",
      METERLESS_BASE_URL: "http://127.0.0.1:8088/v1",
    };
    const res = validateEnv(env);
    expect(res.valid).toBe(true);
    expect(res.errors).toHaveLength(0);
    expect(res.modeDescription).toContain("SAMPLE_MODE=true");
  });

  it("fails with plain message when METERLESS_BASE_URL is missing in meterless mode", () => {
    const env = {
      SAMPLE_MODE: "true",
      LLM_PROVIDER: "meterless",
    };
    const res = validateEnv(env);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("METERLESS_BASE_URL"))).toBe(true);
  });

  it("fails when NVIDIA credentials are missing in nvidia provider mode", () => {
    const env = {
      SAMPLE_MODE: "true",
      LLM_PROVIDER: "nvidia",
    };
    const res = validateEnv(env);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("NVIDIA_API_KEY"))).toBe(true);
    expect(res.errors.some((e) => e.includes("NVIDIA_BASE_URL"))).toBe(true);
  });

  it("fails when Zetaris credentials are missing in live mode (SAMPLE_MODE=false)", () => {
    const env = {
      SAMPLE_MODE: "false",
      LLM_PROVIDER: "replay",
    };
    const res = validateEnv(env);
    expect(res.valid).toBe(false);
    expect(res.errors.some((e) => e.includes("ZETARIS_API_KEY"))).toBe(true);
    expect(res.errors.some((e) => e.includes("ZETARIS_REST_URL"))).toBe(true);
  });

  it("masks secrets without leaking full sensitive values", () => {
    expect(maskSecret("")).toBe("(unset)");
    expect(maskSecret("12345")).toBe("***");
    const masked = maskSecret("sk-1234567890abcdef123456");
    expect(masked).toBe("sk-...***...456");
    expect(masked).not.toContain("1234567890abcdef");
  });
});
