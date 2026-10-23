#!/usr/bin/env tsx
import { validateEnv, loadConfig } from "../src/config";
import { getMeterlessModels } from "../src/adapters/llm/meterless";

async function main() {
  const result = validateEnv(process.env);

  if (!result.valid) {
    console.error(`[Antibody Env Check] FAILED`);
    console.error(`Active mode: ${result.modeDescription}`);
    console.error("Configuration errors:");
    for (const err of result.errors) {
      console.error(` - ${err}`);
    }
    process.exit(1);
  }

  console.log(`[Antibody Env Check] OK`);
  console.log(`Active mode: ${result.modeDescription}`);

  try {
    const cfg = loadConfig(process.env);
    if (cfg.llm_provider === "meterless") {
      try {
        const models = await getMeterlessModels(cfg);
        console.log(`Meterless discovered models (${models.length}): ${models.join(", ")}`);
      } catch {
        console.log(`Meterless Nightshift runtime not currently reachable at ${cfg.meterless_base_url}`);
      }
    } else if (cfg.llm_provider === "nvidia") {
      console.log(`NVIDIA models: reasoning=${cfg.model_reasoning}, fast=${cfg.model_fast}`);
    }
  } catch {
    // Non-fatal for env check
  }

  process.exit(0);
}

main().catch((err) => {
  console.error("Unexpected error during check:env:", err);
  process.exit(1);
});
