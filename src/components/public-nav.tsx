"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Calendar, Hand, FileText, ClipboardList, Smartphone, LogIn } from "lucide-react";
import { cn } from "@/lib/utils";

const navLinks = [
  { href: "/", matchPaths: ["/", "/schedule"], label: "Schedule", icon: Calendar },
  { href: "/help-wanted", matchPaths: ["/help-wanted"], label: "Volunteer", icon: Hand },
  { href: "/documents", matchPaths: ["/documents"], label: "Docs", icon: FileText },
  { href: "/my-signups", matchPaths: ["/my-signups"], label: "My Signups", icon: ClipboardList },
  { href: "/install", matchPaths: ["/install"], label: "Install", icon: Smartphone },
  { href: "/login", matchPaths: ["/login"], label: "Login", icon: LogIn },
] as const;

function isActive(matchPaths: readonly string[], pathname: string) {
  return matchPaths.some(
    (p) => pathname === p || (p !== "/" && pathname.startsWith(`${p}/`))
  );
}

export function PublicNav({ hideLogin = false }: { hideLogin?: boolean } = {}) {
  const pathname = usePathname();

  const visibleLinks = hideLogin
    ? navLinks.filter((l) => l.href !== "/login")
    : navLinks;

  return (
    <>
      {/* Desktop: horizontal pill bar */}
      <nav className="hidden md:flex items-center justify-center gap-1">
        {visibleLinks.map(({ href, matchPaths, label, icon: Icon }) => {
          const active = isActive(matchPaths, pathname);
          return (
            <Link
              key={href}
              href={href}
              className={cn(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                active
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground hover:text-foreground hover:bg-accent/50",
                href === "/login" && "ml-auto"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {label}
            </Link>
          );
        })}
      </nav>

      {/* Mobile: fixed bottom bar matching dashboard bottom-nav */}
      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 backdrop-blur-md border-t border-border/50 pb-[env(safe-area-inset-bottom)]">
        <div className="flex items-stretch justify-around px-1">
          {visibleLinks.map(({ href, matchPaths, label, icon: Icon }) => {
            const active = isActive(matchPaths, pathname);
            return (
              <Link
                key={href}
                href={href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-2 min-w-[3.5rem] touch-manipulation transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <Icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className="text-[11px] font-semibold leading-snug text-center">
                  {label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>
    </>
  );
}
