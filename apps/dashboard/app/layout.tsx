import type { Metadata } from "next";
import "./globals.css";
import { NavBar } from "../components/nav-bar";

export const metadata: Metadata = {
  title: "AI Coding Agent Observatory",
  description: "Real OpenTelemetry observability for Claude Code, Codex CLI, and Gemini CLI.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-background font-sans antialiased">
        <div className="flex min-h-screen flex-col">
          <NavBar />
          <main className="flex-1 px-6 py-8 md:px-10">
            <div className="mx-auto w-full max-w-7xl">{children}</div>
          </main>
        </div>
      </body>
    </html>
  );
}
