import type { ReactNode } from "react";
import "./styles/index.css";

export const metadata = {
  title: "Antibody",
  description: "Your automations get attacked, learn, and come back immune.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body style={{ backgroundColor: "var(--ab-bg, #07080B)", color: "var(--ab-text-1, #EDEDEE)", margin: 0, padding: 0 }}>
        {children}
      </body>
    </html>
  );
}
