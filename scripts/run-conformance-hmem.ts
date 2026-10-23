#!/usr/bin/env tsx
import { spawn } from "node:child_process";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const rootDir = path.resolve(__dirname, "..");
const logsDir = path.join(rootDir, "logs");
const outputFile = path.join(logsDir, "conformance_hmem.txt");

if (!fs.existsSync(logsDir)) {
  fs.mkdirSync(logsDir, { recursive: true });
}

const implPath =
  process.env.HMEM_IMPL ??
  path.resolve(rootDir, "src", "adapters", "engines", "hmem-ref", "index.ts");
const runnerPath = path.resolve(rootDir, "test", "conformance", "hmem", "runner.ts");

console.log(`Running H-MEM Conformance Suite against: ${implPath}`);

const child = spawn(
  process.execPath,
  [path.resolve(rootDir, "node_modules", "tsx", "dist", "cli.mjs"), runnerPath],
  {
    cwd: rootDir,
    env: {
      ...process.env,
      HMEM_IMPL: implPath,
    },
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
  fs.writeFileSync(outputFile, fullOutput, "utf-8");
  console.log(`\nConformance output saved to: ${path.relative(rootDir, outputFile)}`);
  process.exit(code ?? 0);
});
