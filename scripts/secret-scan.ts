#!/usr/bin/env tsx
/**
 * scripts/secret-scan.ts
 * Scans all tracked git files for accidental secrets, tokens, API keys, or private keys.
 * Implements DEMO_AND_SUBMISSION.md §6.
 */

import { execSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

function runSecretScan() {
  console.log("============================================================");
  console.log("Antibody Repository Secret Scan");
  console.log("Per docs/DEMO_AND_SUBMISSION.md §6");
  console.log("============================================================\n");

  const trackedOutput = execSync("git ls-files", { encoding: "utf-8" });
  const files = trackedOutput.trim().split(/\r?\n/).filter(Boolean);

  console.log(`[Step 1] Scanning ${files.length} tracked git files for secret filenames...`);
  const forbiddenFilePatterns = [/^\.env$/, /\.pem$/, /\.key$/, /id_rsa/];

  let fileViolations = 0;
  for (const file of files) {
    const base = path.basename(file);
    if (forbiddenFilePatterns.some((pattern) => pattern.test(base))) {
      console.error(`  [FAIL] Forbidden secret file tracked in git: ${file}`);
      fileViolations++;
    }
  }

  if (fileViolations > 0) {
    throw new Error(`Found ${fileViolations} forbidden secret files tracked in git!`);
  }
  console.log("  => Check: No .env, .pem, or .key files are tracked. (PASS)\n");

  console.log("[Step 2] Scanning file contents for secret/token/password patterns...");
  const secretRegex = /(api[_-]?key|token|secret|password)\s*[:=]\s*['"]?[A-Za-z0-9_\-]{16,}/i;
  const ignoredFiles = [
    "package-lock.json",
    "scratch/hmem/reference/package-lock.json",
    "scripts/secret-scan.ts",
  ];

  const binaryExtensions = [
    ".png", ".jpg", ".jpeg", ".gif", ".webp",
    ".mp4", ".mov", ".avi", ".webm",
    ".pdf", ".ico", ".woff", ".woff2", ".ttf", ".eot",
    ".zip", ".tar", ".gz"
  ];

  let contentViolations = 0;
  for (const file of files) {
    if (ignoredFiles.some((ign) => file === ign || file.endsWith(ign))) {
      continue;
    }
    // Skip binary media, documents, and archives
    if (binaryExtensions.some((ext) => file.toLowerCase().endsWith(ext))) {
      continue;
    }
    const fullPath = path.resolve(process.cwd(), file);
    if (!fs.existsSync(fullPath) || fs.statSync(fullPath).isDirectory()) {
      continue;
    }

    const content = fs.readFileSync(fullPath, "utf-8");
    const lines = content.split("\n");
    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (secretRegex.test(line)) {
        // Allow empty assignments or documentation placeholders (e.g., METERLESS_RUNTIME_TOKEN= or <...>)
        const emptyEnvMatch = line.match(/^\s*(METERLESS_RUNTIME_TOKEN|NVIDIA_API_KEY|ZETARIS_API_KEY)\s*=\s*(<.*>|\s*(#.*)?)$/i);
        if (emptyEnvMatch) {
          continue;
        }

        // Exclude placeholder, test doubles, mock values, or canary masking
        if (
          line.includes("example") ||
          line.includes("placeholder") ||
          line.includes("test_secret") ||
          line.includes("test_key") ||
          line.includes("test-token") ||
          line.includes("super_secret") ||
          line.includes("SECRET_TOKEN") ||
          line.includes("SECRET_KEY") ||
          line.includes("canary") ||
          line.includes("CANARY") ||
          line.includes("Bearer test")
        ) {
          continue;
        }

        console.error(`  [FAIL] Potential secret in ${file} at line ${i + 1}: ${line.trim().slice(0, 80)}`);
        contentViolations++;
      }
    }
  }

  if (contentViolations > 0) {
    throw new Error(`Found ${contentViolations} potential secrets in tracked file contents!`);
  }
  console.log("  => Check: No exposed credentials found in tracked file contents. (PASS)\n");

  console.log("============================================================");
  console.log("Secret Scan Verdict: PASSED (Clean for submission)");
  console.log("============================================================\n");
}

runSecretScan();
