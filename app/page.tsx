import Link from "next/link";

export default function HomePage() {
  return (
    <main style={{ padding: "4rem 2rem", maxWidth: "800px", margin: "0 auto", fontFamily: "sans-serif" }}>
      <h1 style={{ fontSize: "2.5rem", marginBottom: "1rem" }}>Antibody</h1>
      <p style={{ fontSize: "1.25rem", lineHeight: "1.6", color: "var(--ab-text-2, #A1A1A8)", marginBottom: "2rem" }}>
        Antibody tests an AI automation before you launch it: it attacks the automation in a sandbox, diagnoses what
        broke, patches it, re-runs the same attacks to prove the patch works, and remembers the fix so the next
        automation it tests starts smarter.
      </p>
      <div style={{ marginTop: "2rem" }}>
        <Link
          href="/runs"
          style={{
            display: "inline-block",
            padding: "0.75rem 1.5rem",
            backgroundColor: "var(--ab-accent, #B8F200)",
            color: "#07080B",
            fontWeight: "bold",
            borderRadius: "6px",
            textDecoration: "none",
          }}
        >
          View Runs
        </Link>
      </div>
    </main>
  );
}
