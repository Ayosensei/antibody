/**
 * Evidence chip labels and source helpers per docs/DESIGN.md §9.3.
 */

export interface EvidenceChipInfo {
  label: string;
  fullLabel: string;
  sourceLabel: string;
}

export function parseEvidenceRef(ref: string): EvidenceChipInfo {
  let fullLabel = ref;
  let sourceLabel = "Run data";

  if (ref.startsWith("zetaris:")) {
    sourceLabel = "Zetaris";
  } else if (ref.startsWith("local:")) {
    sourceLabel = "local store";
  }

  // Ref pattern matching per DESIGN.md §9.3
  if (ref.startsWith("attack:")) {
    fullLabel = "attack input";
  } else if (/^run:.+#step(\d+)$/.test(ref)) {
    const match = ref.match(/^run:.+#step(\d+)$/);
    fullLabel = `tool call step ${match ? match[1] : ""}`;
  } else if (/^hit:.+#(\d+)$/.test(ref)) {
    const match = ref.match(/^hit:.+#(\d+)$/);
    const k = match ? parseInt(match[1], 10) : 0;
    fullLabel = k > 0 ? `judge hit ${k + 1}` : "judge hit";
  } else if (ref.startsWith("zetaris:policies/") || ref.startsWith("local:policies/")) {
    const isZetaris = ref.startsWith("zetaris:");
    const rest = ref.split("/")[1] || "";
    const tool = rest.includes(":") ? rest.split(":")[1] : rest;
    fullLabel = `policy: ${tool} (${isZetaris ? "Zetaris" : "local store"})`;
  } else if (ref.startsWith("zetaris:attacks/") || ref.startsWith("local:attacks/")) {
    const isZetaris = ref.startsWith("zetaris:");
    fullLabel = `attack record (${isZetaris ? "Zetaris" : "local store"})`;
  } else if (ref.startsWith("zetaris:fixes/") || ref.startsWith("local:fixes/")) {
    const isZetaris = ref.startsWith("zetaris:");
    const mem = ref.split("/")[1] || "";
    fullLabel = `past fix ${mem} (${isZetaris ? "Zetaris" : "local store"})`;
  } else if (ref.startsWith("memory:")) {
    const mem = ref.replace("memory:", "");
    fullLabel = `memory ${mem}`;
  } else if (/^config:[^@]+@v(\d+)\/prompt_rules$/.test(ref)) {
    const match = ref.match(/^config:[^@]+@v(\d+)\/prompt_rules$/);
    fullLabel = `guardrails: rules for the model (v${match ? match[1] : ""})`;
  } else if (/^config:[^@]+@v(\d+)\/tool_permissions\.(.+)$/.test(ref)) {
    const match = ref.match(/^config:[^@]+@v(\d+)\/tool_permissions\.(.+)$/);
    fullLabel = `guardrails: ${match ? match[2] : "tool"} permission (v${match ? match[1] : ""})`;
  } else if (/^config:[^@]+@v(\d+)\/input_filters$/.test(ref)) {
    const match = ref.match(/^config:[^@]+@v(\d+)\/input_filters$/);
    fullLabel = `guardrails: input filters (v${match ? match[1] : ""})`;
  } else if (ref.startsWith("diagnosis:")) {
    fullLabel = "diagnosis";
  } else if (ref.startsWith("verify:")) {
    const fix = ref.replace("verify:", "");
    fullLabel = `verification of ${fix}`;
  } else if (ref === "suite:before") {
    fullLabel = "results before fixes";
  } else if (ref === "suite:after") {
    fullLabel = "results after fixes";
  } else if (/^trace:.+#(\d+)$/.test(ref)) {
    const match = ref.match(/^trace:.+#(\d+)$/);
    fullLabel = `trace line ${match ? match[1] : ""}`;
  }

  // Truncate label to 32 characters with ellipsis
  let label = fullLabel;
  if (label.length > 32) {
    label = `${label.slice(0, 31)}…`;
  }

  return {
    label,
    fullLabel,
    sourceLabel,
  };
}
