import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "BugSnap — From bug spotted to bug understood",
  description:
    "Lightweight, privacy-conscious visual bug reporting. Capture screenshots, redact sensitive data, generate AI-structured reports, and export to GitHub Issues in under two minutes.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <body className="min-h-screen bg-zinc-950 font-sans text-zinc-50">
        {children}
      </body>
    </html>
  );
}
