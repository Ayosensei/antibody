import { describe, it, expect, beforeAll, afterAll, beforeEach } from "vitest";
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { generator } from "../src/adapters/llm";
import { AppConfig } from "../src/config";
import { resetTraceCounter } from "../src/tracing";

let fakeMeterlessPort: number;
let fakeNvidiaPort: number;
let meterlessServer: http.Server;
let nvidiaServer: http.Server;

let meterlessHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void;
let nvidiaHandler: (req: http.IncomingMessage, res: http.ServerResponse) => void;

const TEST_LOG_DIR = path.resolve(__dirname, "../tmp_llm_test_logs");
const TEST_TRACE_ID = "run_20261024T120000Z_e5f6";
const METERLESS_SECRET_TOKEN = "rt_super_secret_meterless_token_99999";
const NVIDIA_SECRET_KEY = "nv_super_secret_nvidia_api_key_88888";

beforeAll(async () => {
  meterlessServer = http.createServer((req, res) => meterlessHandler(req, res));
  nvidiaServer = http.createServer((req, res) => nvidiaHandler(req, res));

  await new Promise<void>((resolve) => {
    meterlessServer.listen(0, "127.0.0.1", () => {
      fakeMeterlessPort = (meterlessServer.address() as { port: number }).port;
      resolve();
    });
  });

  await new Promise<void>((resolve) => {
    nvidiaServer.listen(0, "127.0.0.1", () => {
      fakeNvidiaPort = (nvidiaServer.address() as { port: number }).port;
      resolve();
    });
  });
});

afterAll(async () => {
  await new Promise((resolve) => meterlessServer.close(resolve));
  await new Promise((resolve) => nvidiaServer.close(resolve));
  if (fs.existsSync(TEST_LOG_DIR)) {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  }
});

beforeEach(() => {
  if (fs.existsSync(TEST_LOG_DIR)) {
    fs.rmSync(TEST_LOG_DIR, { recursive: true, force: true });
  }
  resetTraceCounter(TEST_TRACE_ID);
});

function createTestConfig(overrides?: Partial<AppConfig>): AppConfig {
  return {
    sample_mode: true,
    llm_provider: "meterless",
    log_level: "info",
    log_dir: TEST_LOG_DIR,
    canary_key: undefined,

    meterless_base_url: `http://127.0.0.1:${fakeMeterlessPort}/v1`,
    meterless_runtime_token: METERLESS_SECRET_TOKEN,
    meterless_model: "meterless/auto",
    meterless_model_reasoning: "meterless/reasoning-model",
    meterless_model_fast: "meterless/fast-model",
    meterless_app_id: "antibody",

    nvidia_base_url: `http://127.0.0.1:${fakeNvidiaPort}/v1`,
    nvidia_api_key: NVIDIA_SECRET_KEY,
    model_reasoning: "nvidia/nemotron-3.5-super-vl-120b-a12b",
    model_fast: "nvidia/nemotron-3.5-lightning-30b-a3b",

    zetaris_rest_url: "http://localhost:8888/api/v1.0",
    zetaris_org_id: 1,
    zetaris_timeout_seconds: 20,

    max_retries: 1,
    attack_trials: 1,
    concurrency: 2,
    run_max_llm_calls: 100,
    run_max_seconds: 120,
    target_max_steps: 8,
    target_max_tokens: 4000,
    api_port: 8000,
    ui_port: 3100,
    ...overrides,
  };
}

describe("LLM Adapters & Unified Generator", () => {
  it("successfully calls Meterless Nightshift and receives completion", async () => {
    let receivedAuth = "";
    let receivedApp = "";
    let receivedScope = "";

    meterlessHandler = async (req, res) => {
      receivedAuth = req.headers["authorization"] || "";
      receivedApp = (req.headers["meterless-app"] as string) || "";
      receivedScope = (req.headers["meterless-scope"] as string) || "";

      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-123",
          model: "meterless/reasoning-model",
          choices: [{ message: { role: "assistant", content: "Hello from Nightshift!" } }],
          usage: { prompt_tokens: 10, completion_tokens: 5, total_tokens: 15 },
        })
      );
    };

    const cfg = createTestConfig();
    const result = await generator(
      "reasoning",
      [{ role: "user", content: "Test prompt" }],
      { traceId: TEST_TRACE_ID },
      cfg
    );

    expect(result.text).toBe("Hello from Nightshift!");
    expect(result.provider).toBe("meterless");
    expect(result.model).toBe("meterless/reasoning-model");
    expect(receivedAuth).toBe(`Bearer ${METERLESS_SECRET_TOKEN}`);
    expect(receivedApp).toBe("antibody");
    expect(receivedScope).toBe("user");

    // Check trace line was written
    const traceFile = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    expect(fs.existsSync(traceFile)).toBe(true);
    const traceLines = fs.readFileSync(traceFile, "utf-8").trim().split("\n").map((l) => JSON.parse(l));
    expect(traceLines.some((l) => l.action === "llm_call" && l.status === "success")).toBe(true);
  });

  it("surfaces HTTP 401 Unauthorized from Meterless cleanly without swallowing or falling back", async () => {
    meterlessHandler = (_req, res) => {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: { message: "Invalid runtime token" } }));
    };

    let nvidiaCalled = false;
    nvidiaHandler = (_req, res) => {
      nvidiaCalled = true;
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ choices: [{ message: { content: "Should not be called" } }] }));
    };

    const cfg = createTestConfig();
    await expect(
      generator(
        "reasoning",
        [{ role: "user", content: "Auth test" }],
        { traceId: TEST_TRACE_ID },
        cfg
      )
    ).rejects.toThrow(/401 Unauthorized/);

    expect(nvidiaCalled).toBe(false);
  });

  it("falls back to NVIDIA direct when Meterless fails with connection error, writing fallback_provider trace", async () => {
    // Meterless returns 500 error on every attempt
    meterlessHandler = (_req, res) => {
      res.writeHead(500, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Nightshift worker crashed" }));
    };

    let nvidiaReceivedAuth = "";
    nvidiaHandler = (req, res) => {
      nvidiaReceivedAuth = req.headers["authorization"] || "";
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          id: "chatcmpl-nv-123",
          model: "nvidia/nemotron-3.5-super-vl-120b-a12b",
          choices: [{ message: { role: "assistant", content: "Fallback response from NVIDIA!" } }],
          usage: { total_tokens: 20 },
        })
      );
    };

    const cfg = createTestConfig();
    const result = await generator(
      "reasoning",
      [{ role: "user", content: "Fallback test" }],
      { traceId: TEST_TRACE_ID },
      cfg
    );

    expect(result.text).toBe("Fallback response from NVIDIA!");
    expect(result.provider).toBe("nvidia");
    expect(nvidiaReceivedAuth).toBe(`Bearer ${NVIDIA_SECRET_KEY}`);

    // Verify trace lines
    const traceFile = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    expect(fs.existsSync(traceFile)).toBe(true);
    const traceLines = fs.readFileSync(traceFile, "utf-8").trim().split("\n").map((l) => JSON.parse(l));

    const fallbackTrace = traceLines.find((l) => l.action === "fallback_provider");
    expect(fallbackTrace).toBeDefined();
    expect(fallbackTrace?.status).toBe("fallback");
    expect(fallbackTrace?.output_summary).toContain("switched to provider=nvidia");

    const llmCallTrace = traceLines.find((l) => l.action === "llm_call" && l.input_summary.includes("nvidia"));
    expect(llmCallTrace).toBeDefined();
  });

  it("throws not implemented when replay provider is requested", async () => {
    const cfg = createTestConfig({ llm_provider: "replay" });
    await expect(
      generator("reasoning", [{ role: "user", content: "Replay test" }], {}, cfg)
    ).rejects.toThrow(/Replay provider not implemented yet/);
  });

  it("never writes secrets or runtime tokens into trace logs (grep test)", async () => {
    meterlessHandler = (_req, res) => {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(
        JSON.stringify({
          choices: [{ message: { content: "Sample output" } }],
        })
      );
    };

    const cfg = createTestConfig();
    await generator("fast", [{ role: "user", content: "Secret check" }], { traceId: TEST_TRACE_ID }, cfg);

    const traceFile = path.join(TEST_LOG_DIR, `${TEST_TRACE_ID}.jsonl`);
    const traceContent = fs.readFileSync(traceFile, "utf-8");

    expect(traceContent).not.toContain(METERLESS_SECRET_TOKEN);
    expect(traceContent).not.toContain(NVIDIA_SECRET_KEY);
  });
});
