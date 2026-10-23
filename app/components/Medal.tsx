import React from "react";
import { ShieldIcon, CheckIcon, AlertIcon } from "./Icons";

export interface MedalProps {
  type: "gold" | "silver" | "bronze";
}

export function Medal({ type }: MedalProps) {
  return (
    <div className={`ab-medal ab-medal--${type}`} aria-hidden="true">
      {type === "gold" && <CheckIcon size={28} color="#2e2004" />}
      {type === "silver" && <ShieldIcon size={28} color="#1a1e27" />}
      {type === "bronze" && <AlertIcon size={28} color="#2e1604" />}
    </div>
  );
}
