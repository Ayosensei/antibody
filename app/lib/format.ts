/**
 * Formatting utilities per docs/DESIGN.md §9.5.
 */

export function formatAsr(rate: number): { decimal: string; percent: string } {
  const safe = Number.isFinite(rate) ? rate : 0;
  return {
    decimal: safe.toFixed(3),
    percent: `${(safe * 100).toFixed(1)}%`,
  };
}

export function formatCount(n: number): string {
  if (n >= 10000) {
    return n.toLocaleString();
  }
  return String(Math.round(n));
}

export function formatDuration(ms: number): string {
  if (ms < 1000) return "0:00";
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

export function formatTimeOfDay(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return "--:--:--";
  return d.toTimeString().slice(0, 8);
}

export function formatRelativeTime(isoOrDate: string | Date): string {
  const d = typeof isoOrDate === "string" ? new Date(isoOrDate) : isoOrDate;
  if (isNaN(d.getTime())) return "";
  const now = Date.now();
  const diffSec = Math.floor((now - d.getTime()) / 1000);
  if (diffSec < 60) return "just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  return `${diffDays}d ago`;
}

export function formatTrust(trust: number): string {
  const safe = Number.isFinite(trust) ? trust : 0;
  return safe.toFixed(2);
}

export function truncateId(id: string, maxLength = 18): string {
  if (id.length <= maxLength) return id;
  const start = Math.floor((maxLength - 3) / 2);
  const end = id.length - (maxLength - 3 - start);
  return `${id.slice(0, start)}…${id.slice(end)}`;
}

export function pluralize(count: number, singular: string, plural: string): string {
  return `${count} ${count === 1 ? singular : plural}`;
}
