"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

export function Nav() {
  const pathname = usePathname();

  return (
    <header>
      <nav className="ab-nav-pill" aria-label="Main">
        <Link href="/" className="ab-nav-wordmark">
          Antibody
        </Link>
        <Link
          href="/"
          className="ab-nav-link"
          aria-current={pathname === "/" ? "page" : undefined}
        >
          Run
        </Link>
      </nav>
    </header>
  );
}
