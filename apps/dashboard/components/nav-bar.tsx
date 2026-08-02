"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "../lib/utils";

const LINKS = [
  { href: "/", label: "Overview" },
  { href: "/sessions", label: "Sessions" },
  { href: "/timeline", label: "Timeline" },
  { href: "/metrics", label: "Metrics" },
  { href: "/leaderboard", label: "Leaderboard" },
];

export function NavBar() {
  const pathname = usePathname();
  return (
    <header className="border-b border-border">
      <div className="mx-auto flex w-full max-w-7xl items-center gap-8 px-6 py-4 md:px-10">
        <Link href="/" className="text-sm font-semibold tracking-tight">
          AI Coding Agent Observatory
        </Link>
        <nav className="flex items-center gap-1">
          {LINKS.map((link) => {
            const active = link.href === "/" ? pathname === "/" : pathname.startsWith(link.href);
            return (
              <Link
                key={link.href}
                href={link.href}
                className={cn(
                  "rounded-md px-3 py-1.5 text-sm font-medium transition-colors",
                  active ? "bg-accent text-accent-foreground" : "text-muted-foreground hover:bg-muted hover:text-foreground"
                )}
              >
                {link.label}
              </Link>
            );
          })}
        </nav>
      </div>
    </header>
  );
}
