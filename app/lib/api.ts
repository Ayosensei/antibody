/**
 * Typed API Client for the Antibody API server (port 8000).
 * Docs: docs/DATA_CONTRACTS.md §11.
 */

import type { Report, RunRequest, MemoryRecord, TargetId, MemoryMode, CustomAttackInput } from "../../src/schemas";

export interface RunRequestInput {
  target: TargetId;
  attack_budget?: number;
  trials?: number;
  seed?: number;
  memory_mode?: MemoryMode;
  custom_attacks?: CustomAttackInput[];
  wait?: boolean;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export interface HealthResponse {
  ok: boolean;
  sample_mode: boolean;
  llm_provider: "meterless" | "nvidia" | "replay";
  zetaris: "up" | "fallback";
}

export interface RunningRunResponse {
  status: "running";
  started_at: string;
  request: RunRequest;
  last_trace_line?: Record<string, unknown>;
}

export interface FailedRunResponse {
  status: "failed";
  error: { code: string; message: string };
}

export async function fetchHealth(): Promise<HealthResponse> {
  const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Health check failed with HTTP ${res.status}`);
  }
  return res.json();
}

export async function startRunSync(request: RunRequestInput): Promise<Report> {
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, wait: true }),
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error?.message || `HTTP ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export async function startRunAsync(request: RunRequestInput): Promise<{ trace_id: string }> {
  const res = await fetch(`${API_BASE}/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...request, wait: false }),
  });
  const data = await res.json();
  if (!res.ok) {
    const errorMsg = data.error?.message || `HTTP ${res.status}`;
    throw new Error(errorMsg);
  }
  return data;
}

export interface FetchRunResult {
  status: number;
  report?: Report;
  running?: RunningRunResponse;
  failed?: FailedRunResponse;
  error?: { code: string; message: string };
}

export async function fetchRun(traceId: string): Promise<FetchRunResult> {
  const res = await fetch(`${API_BASE}/runs/${traceId}`, { cache: "no-store" });
  let data: any = null;
  try {
    data = await res.json();
  } catch {
    // not json
  }

  if (res.status === 200) {
    return { status: 200, report: data as Report };
  }
  if (res.status === 202) {
    return { status: 202, running: data as RunningRunResponse };
  }
  if (res.status === 404) {
    return { status: 404, error: data?.error || { code: "unknown_run", message: "Run not found" } };
  }
  if (res.status === 500) {
    return { status: 500, failed: data as FailedRunResponse, error: data?.error };
  }

  return { status: res.status, error: data?.error || { code: "api_error", message: `HTTP ${res.status}` } };
}

export async function fetchMemory(): Promise<MemoryRecord[]> {
  const res = await fetch(`${API_BASE}/memory`, { cache: "no-store" });
  if (!res.ok) {
    throw new Error(`Failed to load memory: HTTP ${res.status}`);
  }
  return res.json();
}

export async function resetMemory(): Promise<{ ok: boolean }> {
  const res = await fetch(`${API_BASE}/memory/reset`, {
    method: "POST",
    headers: { "X-Confirm": "reset" },
  });
  if (!res.ok) {
    throw new Error(`Failed to reset memory: HTTP ${res.status}`);
  }
  return res.json();
}

export function getEventsUrl(traceId: string): string {
  return `${API_BASE}/runs/${traceId}/events`;
}
