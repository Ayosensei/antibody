import React from "react";

export interface MetricCardProps {
  label: string;
  value: React.ReactNode;
  footnote: string;
  attention?: boolean;
}

export function MetricCard({ label, value, footnote, attention }: MetricCardProps) {
  return (
    <div className={`ab-metric-card ${attention ? "ab-metric-card--attention" : ""}`}>
      <span className="ab-metric-card__label">{label}</span>
      <div className="ab-metric-card__value">{value}</div>
      <span className="ab-metric-card__sub">{footnote}</span>
    </div>
  );
}
