import React from "react";
import type { TargetConfig } from "../../src/schemas";
import { formatCarriers } from "../lib/labels";

export interface GuardrailDiffProps {
  before: TargetConfig;
  after: TargetConfig;
}

export function GuardrailDiff({ before, after }: GuardrailDiffProps) {
  // 1. Prompt rules diff
  const beforeRules = before.prompt_rules || [];
  const afterRules = after.prompt_rules || [];
  const addedRules = afterRules.filter((r) => !beforeRules.includes(r));

  // 2. Tool permissions diff
  const beforePerms = (before.tool_permissions || {}) as Record<string, { enabled: boolean; requires_approval: boolean; max_amount?: number }>;
  const afterPerms = (after.tool_permissions || {}) as Record<string, { enabled: boolean; requires_approval: boolean; max_amount?: number }>;
  const tools = Array.from(new Set([...Object.keys(beforePerms), ...Object.keys(afterPerms)]));
  const changedTools: { tool: string; beforeDesc: string; afterDesc: string }[] = [];

  const formatToolPerm = (perm?: { enabled: boolean; requires_approval: boolean; max_amount?: number }) => {
    if (!perm) return "not configured";
    const parts: string[] = [];
    parts.push(perm.enabled ? "on" : "off");
    if (perm.requires_approval) parts.push("needs approval");
    if (typeof perm.max_amount === "number") parts.push(`limited to amount ${perm.max_amount}`);
    return parts.join(", ");
  };

  tools.forEach((t) => {
    const b = beforePerms[t];
    const a = afterPerms[t];
    const bDesc = formatToolPerm(b);
    const aDesc = formatToolPerm(a);
    if (bDesc !== aDesc) {
      changedTools.push({ tool: t, beforeDesc: bDesc, afterDesc: aDesc });
    }
  });

  // 3. Input filters diff
  const beforeFilters = before.input_filters || [];
  const afterFilters = after.input_filters || [];
  const formatFilter = (f: { kind: string; applies_to: any[]; pattern?: string }) => {
    const c = formatCarriers(f.applies_to);
    if (f.kind === "wrap_untrusted") return `Treat ${c} text as data, not instructions`;
    if (f.kind === "strip_pattern") return `Remove text matching "${f.pattern}" from ${c}`;
    if (f.kind === "block_pattern") return `Reject inputs matching "${f.pattern}" in ${c}`;
    return `${f.kind} on ${c}`;
  };

  const beforeFilterStrs = beforeFilters.map(formatFilter);
  const afterFilterStrs = afterFilters.map(formatFilter);
  const addedFilters = afterFilterStrs.filter((f) => !beforeFilterStrs.includes(f));

  const hasChanges = addedRules.length > 0 || changedTools.length > 0 || addedFilters.length > 0;

  if (!hasChanges) {
    return (
      <div className="ab-plate">
        <h3 style={{ margin: "0 0 12px", fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
          Guardrails before and after
        </h3>
        <p style={{ margin: 0, fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-3)" }}>
          No guardrails changed in this run.
        </p>
      </div>
    );
  }

  return (
    <div className="ab-plate" style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
      <h3 style={{ margin: 0, fontSize: "var(--ab-fs-h3)", fontWeight: 500, color: "var(--ab-text-1)" }}>
        Guardrails before and after
      </h3>

      {/* Rules for the model */}
      <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
        <h4 style={{ margin: 0, fontSize: "var(--ab-fs-body-md)", fontWeight: 600, color: "var(--ab-text-2)" }}>
          Rules for the model
        </h4>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
          <div className="ab-inlay" style={{ padding: "12px 16px" }}>
            <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>Before (v{before.version})</span>
            <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
              {beforeRules.length === 0 ? <li>(none)</li> : beforeRules.map((r, i) => <li key={i}>{r}</li>)}
            </ul>
          </div>
          <div className="ab-inlay" style={{ padding: "12px 16px" }}>
            <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>After (v{after.version})</span>
            <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)" }}>
              {afterRules.length === 0 ? <li>(none)</li> : afterRules.map((r, i) => {
                const isAdded = addedRules.includes(r);
                return (
                  <li key={i} style={{ color: isAdded ? "var(--ab-lime)" : "var(--ab-text-1)", fontWeight: isAdded ? 500 : 400 }}>
                    {r} {isAdded && <span className="ab-tag ab-tag--ok" style={{ marginLeft: "6px" }}>added</span>}
                  </li>
                );
              })}
            </ul>
          </div>
        </div>
      </div>

      {/* Tool permissions */}
      {changedTools.length > 0 && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h4 style={{ margin: 0, fontSize: "var(--ab-fs-body-md)", fontWeight: 600, color: "var(--ab-text-2)" }}>
            Tool permissions
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="ab-inlay" style={{ padding: "12px 16px" }}>
              <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>Before</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
                {changedTools.map((t) => (
                  <li key={t.tool}>
                    <code style={{ fontFamily: "var(--ab-font-mono)" }}>{t.tool}</code>: {t.beforeDesc}
                  </li>
                ))}
              </ul>
            </div>
            <div className="ab-inlay" style={{ padding: "12px 16px" }}>
              <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>After</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)" }}>
                {changedTools.map((t) => (
                  <li key={t.tool} style={{ color: "var(--ab-lime)", fontWeight: 500 }}>
                    <code style={{ fontFamily: "var(--ab-font-mono)", color: "var(--ab-text-1)" }}>{t.tool}</code>: {t.afterDesc}
                    <span className="ab-tag ab-tag--ok" style={{ marginLeft: "6px" }}>changed</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}

      {/* Input filters */}
      {(beforeFilters.length > 0 || afterFilters.length > 0) && (
        <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
          <h4 style={{ margin: 0, fontSize: "var(--ab-fs-body-md)", fontWeight: 600, color: "var(--ab-text-2)" }}>
            Input filters
          </h4>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px" }}>
            <div className="ab-inlay" style={{ padding: "12px 16px" }}>
              <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>Before</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-2)" }}>
                {beforeFilterStrs.length === 0 ? <li>(none)</li> : beforeFilterStrs.map((f, i) => <li key={i}>{f}</li>)}
              </ul>
            </div>
            <div className="ab-inlay" style={{ padding: "12px 16px" }}>
              <span style={{ fontSize: "var(--ab-fs-caption)", color: "var(--ab-text-3)", textTransform: "uppercase" }}>After</span>
              <ul style={{ margin: "8px 0 0", paddingLeft: "20px", fontSize: "var(--ab-fs-body-sm)", color: "var(--ab-text-1)" }}>
                {afterFilterStrs.length === 0 ? <li>(none)</li> : afterFilterStrs.map((f, i) => {
                  const isAdded = addedFilters.includes(f);
                  return (
                    <li key={i} style={{ color: isAdded ? "var(--ab-lime)" : "var(--ab-text-1)", fontWeight: isAdded ? 500 : 400 }}>
                      {f} {isAdded && <span className="ab-tag ab-tag--ok" style={{ marginLeft: "6px" }}>added</span>}
                    </li>
                  );
                })}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
