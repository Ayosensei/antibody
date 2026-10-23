import type { ReactNode } from "react";
import "./styles/index.css";
import { Nav } from "./components/Nav";

export const metadata = {
  title: "Antibody — Attack your automation first. Launch it with proof.",
  description: "Antibody attacks a sandbox copy of your automation, fixes what breaks, and explains every decision with evidence you can check.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <a href="#main" className="ab-skip-link">
          Skip to content
        </a>

        <div className="ab-container">
          <header>
            <Nav />
          </header>

          <main id="main" className="ab-main" tabIndex={-1}>
            {children}
          </main>

          <footer className="ab-footer">
            <p style={{ margin: 0 }}>Antibody. Built for the Open Agent Hackathon 2026.</p>
          </footer>
        </div>

        {/* Global polite live region for screen reader announcements */}
        <div id="ab-live-region" aria-live="polite" aria-atomic="true" className="ab-sr-only" />
      </body>
    </html>
  );
}
