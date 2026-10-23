/**
 * Plain HTML report generator for Antibody runs.
 * Per DATA_CONTRACTS.md §11 & DESIGN.md §8.3 (S2b section order):
 * 1. Header & Readiness Plate (readiness status, medal, trace_id, target, created_at)
 * 2. Metrics Cards (ASR before/after, regressions before/after, fixes, unresolved)
 * 3. Warning Banners (degraded flags, unverified explanations)
 * 4. What broke and how it was fixed (findings, diagnoses, fixes, verifications)
 * 5. Guardrails before and after (config diff)
 * 6. What is still risky (remaining risks)
 * 7. What Antibody remembered (retrieved and stored memory items)
 * 8. Evidence map (cited refs with snippets)
 */

import type { Report, Readiness } from "../schemas.js";

function escapeHtml(text: string | number | boolean | null | undefined): string {
  if (text === null || text === undefined) return "";
  return String(text)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function readinessMedal(readiness: Readiness): { label: string; medal: string; color: string } {
  switch (readiness) {
    case "ready":
      return { label: "Ready", medal: "GOLD", color: "#d4af37" };
    case "ready_with_risks":
      return { label: "Ready with risks", medal: "SILVER", color: "#c0c0c0" };
    case "not_ready":
    default:
      return { label: "Not ready", medal: "BRONZE", color: "#cd7f32" };
  }
}

export function buildHtmlReport(report: Report): string {
  const medalInfo = readinessMedal(report.readiness);
  const readinessExplanation = report.explanations.find((e) => e.subject === "readiness");

  const css = `
    :root {
      --bg: #07080b;
      --surface-1: #111318;
      --surface-2: #181b22;
      --surface-3: #1f232c;
      --border: #2b313d;
      --border-chrome: rgba(255, 255, 255, 0.12);
      --text-main: #f0f3f8;
      --text-muted: #9aa2b1;
      --text-dim: #606877;
      --accent-lime: #b0fb59;
      --accent-ember: #ff5e5b;
      --accent-amber: #fca311;
      --accent-ice: #64b5f6;
    }
    * { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      background: var(--bg);
      color: var(--text-main);
      font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif;
      line-height: 1.5;
      padding: 32px 16px;
      display: flex;
      justify-content: center;
    }
    .container {
      width: 100%;
      max-width: 1100px;
      display: flex;
      flex-direction: column;
      gap: 32px;
    }
    h1, h2, h3, h4 { color: var(--text-main); font-weight: 600; }
    h1 { font-size: 28px; }
    h2 { font-size: 20px; border-bottom: 1px solid var(--border); padding-bottom: 8px; margin-top: 16px; }
    h3 { font-size: 16px; margin-bottom: 8px; }
    p, li { color: var(--text-muted); font-size: 14px; }
    code, pre { font-family: "JetBrains Mono", Consolas, Monaco, monospace; font-size: 13px; }
    .mono { font-family: "JetBrains Mono", Consolas, Monaco, monospace; font-size: 13px; }
    
    .plate {
      background: var(--surface-1);
      border: 1px solid var(--border);
      box-shadow: inset 0 1px 0 var(--border-chrome);
      border-radius: 12px;
      padding: 24px;
    }

    .readiness-plate {
      border: 2px solid ${medalInfo.color};
      background: linear-gradient(180deg, rgba(255,255,255,0.03) 0%, var(--surface-1) 100%);
      display: flex;
      flex-direction: column;
      gap: 16px;
    }
    .readiness-header {
      display: flex;
      align-items: center;
      gap: 16px;
    }
    .medal-badge {
      font-size: 14px;
      font-weight: 700;
      color: ${medalInfo.color};
      background: rgba(255,255,255,0.05);
      border: 1px solid ${medalInfo.color};
      padding: 6px 12px;
      border-radius: 20px;
      text-transform: uppercase;
      letter-spacing: 1px;
    }
    .readiness-title {
      font-size: 24px;
      font-weight: 700;
    }
    .meta-row {
      display: flex;
      flex-wrap: wrap;
      gap: 16px;
      font-size: 13px;
      color: var(--text-dim);
    }

    .metrics-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
      gap: 16px;
    }
    .metric-card {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
      display: flex;
      flex-direction: column;
      gap: 8px;
    }
    .metric-label { font-size: 12px; color: var(--text-dim); text-transform: uppercase; }
    .metric-val { font-size: 22px; font-weight: 700; color: var(--text-main); font-family: "JetBrains Mono", monospace; }
    .metric-sub { font-size: 12px; color: var(--text-muted); }

    .banner {
      padding: 12px 16px;
      border-radius: 8px;
      font-size: 14px;
    }
    .banner-warn {
      background: rgba(252, 163, 17, 0.12);
      border: 1px solid var(--accent-amber);
      color: #ffd166;
    }

    table {
      width: 100%;
      border-collapse: collapse;
      font-size: 13px;
      margin-top: 12px;
    }
    th, td {
      text-align: left;
      padding: 10px 12px;
      border-bottom: 1px solid var(--border);
    }
    th { color: var(--text-dim); font-size: 12px; font-weight: 600; text-transform: uppercase; }
    tr:hover { background: rgba(255, 255, 255, 0.02); }

    .tag {
      display: inline-block;
      padding: 2px 8px;
      border-radius: 4px;
      font-size: 12px;
      font-weight: 500;
      border: 1px solid var(--border);
    }
    .tag-ok { background: rgba(176, 251, 89, 0.15); border-color: var(--accent-lime); color: var(--accent-lime); }
    .tag-bad { background: rgba(255, 94, 91, 0.15); border-color: var(--accent-ember); color: var(--accent-ember); }
    .tag-warn { background: rgba(252, 163, 17, 0.15); border-color: var(--accent-amber); color: var(--accent-amber); }

    .chip {
      display: inline-block;
      padding: 2px 6px;
      background: var(--surface-3);
      border: 1px solid var(--border);
      border-radius: 4px;
      font-family: monospace;
      font-size: 11px;
      color: var(--accent-ice);
      margin-right: 4px;
      margin-bottom: 4px;
    }

    .diff-box {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 16px;
      margin-top: 12px;
    }
    .diff-col {
      background: var(--surface-2);
      border: 1px solid var(--border);
      border-radius: 8px;
      padding: 16px;
    }
    pre {
      background: rgba(0,0,0,0.3);
      padding: 12px;
      border-radius: 6px;
      overflow-x: auto;
      margin-top: 8px;
    }
  `;

  // Explanations & Evidence mapping
  const evidenceEntries = Object.entries(report.evidence || {});

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>Antibody Report: ${escapeHtml(report.trace_id)}</title>
  <style>${css}</style>
</head>
<body>
  <div class="container">
    <!-- Header -->
    <header>
      <h1>Antibody Audit Report</h1>
      <div class="meta-row" style="margin-top: 8px;">
        <span>Run ID: <strong class="mono">${escapeHtml(report.trace_id)}</strong></span>
        <span>Target: <strong class="mono">${escapeHtml(report.target_id)}</strong></span>
        <span>Generated: <time datetime="${escapeHtml(report.created_at)}">${escapeHtml(new Date(report.created_at).toUTCString())}</time></span>
      </div>
    </header>

    <!-- 1. Readiness Plate -->
    <section class="plate readiness-plate" id="readiness">
      <div class="readiness-header">
        <span class="medal-badge">${escapeHtml(medalInfo.medal)}</span>
        <h2 class="readiness-title" style="border:none; margin:0; padding:0;">${escapeHtml(medalInfo.label)}</h2>
      </div>
      <p style="font-size: 15px; color: var(--text-main);">
        Attack success rate shifted from <strong>${escapeHtml(report.metrics.asr_before.toFixed(3))}</strong> to <strong>${escapeHtml(report.metrics.asr_after.toFixed(3))}</strong>.
        Normal tasks passing: <strong>${escapeHtml(report.metrics.regression_after.passed)}/${escapeHtml(report.metrics.regression_after.total)}</strong>.
        ${report.unresolved.length > 0 ? `<strong>${report.unresolved.length}</strong> attack(s) could not be resolved.` : "All attacked vulnerabilities addressed."}
      </p>
      ${readinessExplanation ? `
        <div style="background: rgba(0,0,0,0.25); padding: 12px; border-radius: 6px; margin-top: 8px;">
          <h4 style="font-size: 13px; text-transform: uppercase; color: var(--text-dim); margin-bottom: 6px;">Verdict Explanation Claims</h4>
          <ul style="padding-left: 20px;">
            ${readinessExplanation.claims.map((c) => `
              <li style="margin-bottom: 4px;">
                ${escapeHtml(c.text)}
                ${c.evidence.map((ev) => `<span class="chip">${escapeHtml(ev)}</span>`).join("")}
              </li>
            `).join("")}
          </ul>
        </div>
      ` : ""}
    </section>

    <!-- 2. Metrics Cards -->
    <section>
      <h2>Metrics Comparison</h2>
      <div class="metrics-grid" style="margin-top: 16px;">
        <div class="metric-card">
          <div class="metric-label">Attack Success Rate</div>
          <div class="metric-val">${escapeHtml(report.metrics.asr_before.toFixed(3))} &rarr; ${escapeHtml(report.metrics.asr_after.toFixed(3))}</div>
          <div class="metric-sub">${escapeHtml(report.metrics.hits_before)} hits before, ${escapeHtml(report.metrics.hits_after)} hits after</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Normal Tasks Passing</div>
          <div class="metric-val">${escapeHtml(report.metrics.regression_before.passed)} &rarr; ${escapeHtml(report.metrics.regression_after.passed)} / ${escapeHtml(report.metrics.regression_after.total)}</div>
          <div class="metric-sub">${report.metrics.regression_newly_failing.length > 0 ? `${report.metrics.regression_newly_failing.length} broke` : "Zero regression breaks"}</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Fixes Verified & Committed</div>
          <div class="metric-val" style="color: var(--accent-lime);">${escapeHtml(report.metrics.fixes_accepted)}</div>
          <div class="metric-sub">${escapeHtml(report.metrics.fixes_rejected)} rejected proposals</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Unresolved Attacks</div>
          <div class="metric-val" style="${report.metrics.unresolved > 0 ? "color: var(--accent-amber);" : ""}">${escapeHtml(report.metrics.unresolved)}</div>
          <div class="metric-sub">${escapeHtml(report.metrics.attacks_total)} total evaluated attacks</div>
        </div>

        <div class="metric-card">
          <div class="metric-label">Total Execution Time</div>
          <div class="metric-val">${escapeHtml(report.metrics.wall_seconds.toFixed(1))}s</div>
          <div class="metric-sub">${escapeHtml(report.metrics.llm_calls)} model calls, ${escapeHtml(report.metrics.zetaris_calls)} Zetaris queries</div>
        </div>
      </div>
    </section>

    <!-- 3. Warnings & Degraded Flags -->
    ${report.degraded.length > 0 ? `
      <section>
        <div class="banner banner-warn">
          <strong>Degraded Run:</strong> This run experienced limitations:
          <ul style="margin-top: 6px; padding-left: 20px;">
            ${report.degraded.map((d) => `<li>${escapeHtml(d)}</li>`).join("")}
          </ul>
        </div>
      </section>
    ` : ""}

    <!-- 4. What Broke and How It Was Fixed -->
    <section>
      <h2>Findings &amp; Fixes</h2>
      ${report.findings.length === 0 ? `
        <p style="margin-top: 12px;">No vulnerabilities or hits detected during attack execution.</p>
      ` : `
        <table>
          <thead>
            <tr>
              <th>Finding</th>
              <th>Attack &amp; Class</th>
              <th>Diagnosis</th>
              <th>Fix Status</th>
              <th>Attempts</th>
            </tr>
          </thead>
          <tbody>
            ${report.findings.map((f) => {
              const accepted = f.fixes.some((fix) => fix.status === "verified");
              return `
                <tr>
                  <td class="mono"><strong>${escapeHtml(f.finding.finding_id)}</strong></td>
                  <td>
                    <div class="mono" style="font-weight:600;">${escapeHtml(f.attack.attack_id)}</div>
                    <div style="font-size: 11px; color: var(--text-dim);">${escapeHtml(f.attack.class)} (${escapeHtml(f.attack.carrier)})</div>
                  </td>
                  <td>
                    <div><strong>${escapeHtml(f.diagnosis.root_cause_code)}</strong>: ${escapeHtml(f.diagnosis.summary)}</div>
                    <div style="margin-top: 4px;">
                      ${f.diagnosis.explanation.claims.map((c) => `
                        <div style="font-size: 12px; color: var(--text-muted);">${escapeHtml(c.text)}</div>
                      `).join("")}
                    </div>
                  </td>
                  <td>
                    <span class="tag ${accepted ? "tag-ok" : "tag-bad"}">
                      ${accepted ? "Resolved" : "Unresolved"}
                    </span>
                  </td>
                  <td class="mono">${escapeHtml(f.fixes.length)}</td>
                </tr>
              `;
            }).join("")}
          </tbody>
        </table>
      `}
    </section>

    <!-- 5. Guardrails Before and After -->
    <section>
      <h2>Guardrails Configuration Diff</h2>
      <div class="diff-box">
        <div class="diff-col">
          <h3>Before (v${escapeHtml(report.config_before.version)})</h3>
          <p style="font-size: 12px; margin-bottom: 8px;">Prompt Rules (${report.config_before.prompt_rules.length}):</p>
          <pre>${escapeHtml(JSON.stringify(report.config_before.prompt_rules, null, 2))}</pre>
          <p style="font-size: 12px; margin-top: 12px; margin-bottom: 8px;">Tool Permissions:</p>
          <pre>${escapeHtml(JSON.stringify(report.config_before.tool_permissions, null, 2))}</pre>
          <p style="font-size: 12px; margin-top: 12px; margin-bottom: 8px;">Input Filters (${report.config_before.input_filters.length}):</p>
          <pre>${escapeHtml(JSON.stringify(report.config_before.input_filters, null, 2))}</pre>
        </div>

        <div class="diff-col">
          <h3>After (v${escapeHtml(report.config_after.version)})</h3>
          <p style="font-size: 12px; margin-bottom: 8px;">Prompt Rules (${report.config_after.prompt_rules.length}):</p>
          <pre>${escapeHtml(JSON.stringify(report.config_after.prompt_rules, null, 2))}</pre>
          <p style="font-size: 12px; margin-top: 12px; margin-bottom: 8px;">Tool Permissions:</p>
          <pre>${escapeHtml(JSON.stringify(report.config_after.tool_permissions, null, 2))}</pre>
          <p style="font-size: 12px; margin-top: 12px; margin-bottom: 8px;">Input Filters (${report.config_after.input_filters.length}):</p>
          <pre>${escapeHtml(JSON.stringify(report.config_after.input_filters, null, 2))}</pre>
        </div>
      </div>
    </section>

    <!-- 6. What Is Still Risky -->
    <section>
      <h2>What Is Still Risky</h2>
      <ul style="margin-top: 12px; padding-left: 20px;">
        ${report.remaining_risks.map((r) => `<li style="margin-bottom: 6px;">${escapeHtml(r)}</li>`).join("")}
      </ul>
    </section>

    <!-- 7. What Antibody Remembered -->
    <section>
      <h2>What Antibody Remembered</h2>
      <div style="display: flex; gap: 24px; margin-top: 12px;">
        <div>
          <h4 style="font-size: 12px; color: var(--text-dim); text-transform: uppercase;">Retrieved (${report.memory.retrieved.length})</h4>
          <div style="margin-top: 6px;">
            ${report.memory.retrieved.length === 0 ? '<span style="color:var(--text-dim); font-size:13px;">None</span>' : report.memory.retrieved.map((m) => `<span class="chip">${escapeHtml(m)}</span>`).join("")}
          </div>
        </div>
        <div>
          <h4 style="font-size: 12px; color: var(--text-dim); text-transform: uppercase;">Stored (${report.memory.stored.length})</h4>
          <div style="margin-top: 6px;">
            ${report.memory.stored.length === 0 ? '<span style="color:var(--text-dim); font-size:13px;">None</span>' : report.memory.stored.map((m) => `<span class="chip">${escapeHtml(m)}</span>`).join("")}
          </div>
        </div>
      </div>
    </section>

    <!-- 8. Evidence Map -->
    <section>
      <h2>Cited Evidence Map (${evidenceEntries.length} items)</h2>
      <table>
        <thead>
          <tr>
            <th style="width: 200px;">Reference</th>
            <th style="width: 100px;">Source</th>
            <th>Snippet</th>
          </tr>
        </thead>
        <tbody>
          ${evidenceEntries.map(([ref, item]) => `
            <tr>
              <td class="mono" style="color: var(--accent-ice);">${escapeHtml(ref)}</td>
              <td><span class="tag">${escapeHtml(item.source)}</span></td>
              <td style="color: var(--text-muted);">${escapeHtml(item.snippet)}</td>
            </tr>
          `).join("")}
        </tbody>
      </table>
    </section>
  </div>
</body>
</html>`;
}
