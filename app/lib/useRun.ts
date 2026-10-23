"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import type { TraceLine, Report } from "../../src/schemas";
import { fetchRun, getEventsUrl } from "./api";

export type RunState = "connecting" | "running" | "finished" | "failed" | "lost" | "not_found";

export interface ProgressMeta {
  findingIndex?: number;
  findingsTotal?: number;
  attempt?: number;
  attemptsMax?: number;
  queueLeft?: number;
}

export interface RunCounters {
  modelCalls: number;
  zetarisQueries: number;
  fixAttempts: number;
  elapsedMs: number;
}

export function useRun(traceId: string) {
  const [state, setState] = useState<RunState>("connecting");
  const [report, setReport] = useState<Report | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [traceLines, setTraceLines] = useState<TraceLine[]>([]);
  const [counters, setCounters] = useState<RunCounters>({
    modelCalls: 0,
    zetarisQueries: 0,
    fixAttempts: 0,
    elapsedMs: 0,
  });
  const [progressMeta, setProgressMeta] = useState<ProgressMeta>({});
  const [headsUp, setHeadsUp] = useState<string[]>([]);

  // Refs for stateful values inside event handlers
  const highestIdRef = useRef<number>(0);
  const bufferedLinesRef = useRef<TraceLine[]>([]);
  const flushTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const pollIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const lostTimerRef = useRef<NodeJS.Timeout | null>(null);
  const eventSourceRef = useRef<EventSource | null>(null);
  const firstLineTimeRef = useRef<number | null>(null);
  const lastLineTimeRef = useRef<number | null>(null);
  const headsUpSetRef = useRef<Set<string>>(new Set());

  const recalculateFromLines = useCallback((lines: TraceLine[]) => {
    let calls = 0;
    let queries = 0;
    let attempts = 0;
    const meta: ProgressMeta = {};

    lines.forEach((l) => {
      if (l.action === "llm_call") calls++;
      if (l.action === "zetaris_query") queries++;
      if (l.action === "propose_fix" || l.action === "revise_fix" || l.action === "apply_fallback_fix") {
        attempts++;
      }

      // Heads up
      if (l.action === "fallback_provider") {
        headsUpSetRef.current.add("Switched model provider");
      }
      if (l.action === "zetaris_query" && typeof l.output_summary === "string" && l.output_summary.startsWith("local store")) {
        headsUpSetRef.current.add("Zetaris unavailable, using the local store");
      }
      if (l.action === "retrieve_memory" && l.status === "fallback") {
        headsUpSetRef.current.add("Memory unavailable");
      }
      if (l.action === "validate_explanation" && (l.status === "needs_revision" || l.status === "failed")) {
        headsUpSetRef.current.add("An explanation could not be fully checked");
      }
      if (l.replayed) {
        headsUpSetRef.current.add("Model output is replayed from recordings");
      }

      // Meta
      if (l.meta) {
        if (typeof l.meta.finding_index === "number") meta.findingIndex = l.meta.finding_index;
        if (typeof l.meta.findings_total === "number") meta.findingsTotal = l.meta.findings_total;
        if (typeof l.meta.attempt === "number") meta.attempt = l.meta.attempt;
        if (typeof l.meta.attempts_max === "number") meta.attemptsMax = l.meta.attempts_max;
        if (typeof l.meta.queue_left === "number") meta.queueLeft = l.meta.queue_left;
      }
    });

    const firstTime = lines[0] ? new Date(lines[0].timestamp).getTime() : Date.now();
    const lastTime = lines[lines.length - 1] ? new Date(lines[lines.length - 1].timestamp).getTime() : Date.now();
    firstLineTimeRef.current = firstTime;
    lastLineTimeRef.current = lastTime;

    setCounters({
      modelCalls: calls,
      zetarisQueries: queries,
      fixAttempts: attempts,
      elapsedMs: Math.max(0, lastTime - firstTime),
    });
    setProgressMeta(meta);
    setHeadsUp(Array.from(headsUpSetRef.current));
  }, []);

  const flushBuffer = useCallback(() => {
    if (bufferedLinesRef.current.length === 0) return;
    const newItems = bufferedLinesRef.current;
    bufferedLinesRef.current = [];

    setTraceLines((prev) => {
      const merged = [...prev, ...newItems];
      recalculateFromLines(merged);
      return merged;
    });
  }, [recalculateFromLines]);

  const scheduleFlush = useCallback(() => {
    if (!flushTimeoutRef.current) {
      flushTimeoutRef.current = setTimeout(() => {
        flushTimeoutRef.current = null;
        flushBuffer();
      }, 100);
    }
  }, [flushBuffer]);

  useEffect(() => {
    if (!traceId) return;

    let isMounted = true;

    async function initialCheck() {
      try {
        const res = await fetchRun(traceId);
        if (!isMounted) return;

        if (res.status === 404) {
          setState("not_found");
          return;
        }

        if (res.status === 200 && res.report) {
          setReport(res.report);
          setState("finished");
          // Connect to SSE replay to get past trace lines
          connectSSE();
          return;
        }

        if (res.status === 500) {
          setState("failed");
          setErrorMessage("Run failed with internal error");
          return;
        }

        // 202: Running or connecting
        setState("running");
        connectSSE();
      } catch (err: unknown) {
        if (!isMounted) return;
        setState("lost");
      }
    }

    function connectSSE() {
      if (eventSourceRef.current) {
        eventSourceRef.current.close();
      }

      const es = new EventSource(getEventsUrl(traceId));
      eventSourceRef.current = es;

      es.onopen = () => {
        if (!isMounted) return;
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        if (lostTimerRef.current) {
          clearTimeout(lostTimerRef.current);
          lostTimerRef.current = null;
        }
      };

      es.addEventListener("trace", (event: MessageEvent) => {
        if (!isMounted) return;
        setState("running");

        const idNum = parseInt(event.lastEventId, 10);
        if (Number.isFinite(idNum)) {
          if (idNum <= highestIdRef.current) {
            return; // Duplicate
          }
          highestIdRef.current = idNum;
        }

        try {
          const parsed = JSON.parse(event.data) as TraceLine;
          bufferedLinesRef.current.push(parsed);
          scheduleFlush();
        } catch {
          // Ignore invalid line
        }
      });

      es.addEventListener("end", async (event: MessageEvent) => {
        if (!isMounted) return;
        flushBuffer();
        try {
          const data = JSON.parse(event.data);
          if (data.status === "finished") {
            const res = await fetchRun(traceId);
            if (res.status === 200 && res.report) {
              setReport(res.report);
            }
            setState("finished");
          } else {
            setState("failed");
            setErrorMessage("Run ended with failure status");
          }
        } catch {
          setState("finished");
        }
        es.close();
      });

      es.onerror = () => {
        if (!isMounted) return;
        // Don't mark lost if we already finished
        setState((current) => (current === "finished" ? "finished" : "lost"));

        // Poll every 3000ms as fallback
        if (!pollIntervalRef.current) {
          pollIntervalRef.current = setInterval(async () => {
            try {
              const res = await fetchRun(traceId);
              if (res.status === 200 && res.report) {
                setReport(res.report);
                setState("finished");
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
                es.close();
              } else if (res.status === 500) {
                setState("failed");
                if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
                es.close();
              }
            } catch {
              // keep polling
            }
          }, 3000);
        }

        // Hard lost after 30s
        if (!lostTimerRef.current) {
          lostTimerRef.current = setTimeout(() => {
            setState((c) => (c === "finished" ? "finished" : "lost"));
          }, 30000);
        }
      };
    }

    initialCheck();

    return () => {
      isMounted = false;
      if (flushTimeoutRef.current) clearTimeout(flushTimeoutRef.current);
      if (pollIntervalRef.current) clearInterval(pollIntervalRef.current);
      if (lostTimerRef.current) clearTimeout(lostTimerRef.current);
      if (eventSourceRef.current) eventSourceRef.current.close();
    };
  }, [traceId, scheduleFlush, flushBuffer]);

  return {
    state,
    report,
    errorMessage,
    traceLines,
    counters,
    progressMeta,
    headsUp,
  };
}
