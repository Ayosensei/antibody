#!/usr/bin/env tsx
import { validateEnv } from "../src/config";

const result = validateEnv(process.env);

if (result.valid) {
  console.log(`[Antibody Env Check] OK`);
  console.log(`Active mode: ${result.modeDescription}`);
  process.exit(0);
} else {
  console.error(`[Antibody Env Check] FAILED`);
  console.error(`Active mode: ${result.modeDescription}`);
  console.error("Configuration errors:");
  for (const err of result.errors) {
    console.error(` - ${err}`);
  }
  process.exit(1);
}
