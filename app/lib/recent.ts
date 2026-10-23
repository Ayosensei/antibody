/**
 * Client-side recent runs manager using localStorage.
 * Docs: docs/DESIGN.md §2.4.
 */

export interface RecentRunItem {
  trace_id: string;
  target_id: string;
  started_at: string;
}

const STORAGE_KEY = "antibody.recent_runs";
const MAX_RECENT = 10;

export function getRecentRuns(): RecentRunItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.slice(0, MAX_RECENT);
    }
  } catch {
    // ignore
  }
  return [];
}

export function saveRecentRun(item: RecentRunItem): void {
  if (typeof window === "undefined") return;
  try {
    const existing = getRecentRuns().filter((r) => r.trace_id !== item.trace_id);
    const updated = [item, ...existing].slice(0, MAX_RECENT);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(updated));
  } catch {
    // ignore
  }
}
