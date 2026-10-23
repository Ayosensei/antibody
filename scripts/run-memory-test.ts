#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const logsDir = path.join(rootDir, "logs");
const outputFile = path.join(logsDir, "memory_feature_test.txt");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

console.log("Running Memory Feature Test Suite (test/memory.test.ts)...");

const vitestBin = path.resolve(rootDir, "node_modules", "vitest", "vitest.mjs");

const child = spawn(
  process.execPath,
  [vitestBin, "run", "test/memory.test.ts"],
  {
    cwd: rootDir,
    env: process.env,
    stdio: ["inherit", "pipe", "pipe"],
  }
);

let fullOutput = "";

child.stdout.on("data", (chunk: Buffer) => {
  const str = chunk.toString();
  process.stdout.write(str);
  fullOutput += str;
});

child.stderr.on("data", (chunk: Buffer) => {
  const str = chunk.toString();
  process.stderr.write(str);
  fullOutput += str;
});

child.on("close", (code) => {
  // Strip ANSI color escape codes for clean text log evidence
  const cleanOutput = fullOutput.replace(/\u001b\[[0-9;]*m/g, "");
  fs.writeFileSync(outputFile, cleanOutput, "utf-8");
  console.log(`\nMemory feature test output saved to: ${path.relative(rootDir, outputFile)}`);
  process.exit(code ?? 0);
});
