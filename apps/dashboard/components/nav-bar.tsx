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

// /timeline immediately redirects (server-side) to /sessions/[id], so the
// browser's actual URL is always under /sessions/* by the time this runs --
// a plain prefix match would always highlight "Sessions" instead. Treat a
// session *detail* page as the Timeline tab; only the bare list is Sessions.
function isActive(href: string, pathname: string): boolean {
  if (href === "/") return pathname === "/";
  if (href === "/sessions") return pathname === "/sessions";
  if (href === "/timeline") return pathname === "/timeline" || pathname.startsWith("/sessions/");
  return pathname.startsWith(href);
}

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
            const active = isActive(link.href, pathname);
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
