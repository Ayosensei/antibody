import React from "react";

export default function NotFound() {
  return (
    <div
      className="ab-plate"
      style={{
        maxWidth: "520px",
        margin: "80px auto",
        textAlign: "center",
        padding: "40px 24px",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: "16px",
      }}
    >
      <h2 style={{ fontSize: "var(--ab-fs-h2)", color: "var(--ab-text-1)", margin: 0 }}>
        We can't find that page.
      </h2>
      <p style={{ color: "var(--ab-text-2)", fontSize: "var(--ab-fs-body-md)", margin: 0 }}>
        Check the address, or go back to the launcher.
      </p>
      <a href="/" className="ab-btn ab-btn--secondary" style={{ marginTop: "12px" }}>
        Back to launcher
      </a>
    </div>
  );
}
