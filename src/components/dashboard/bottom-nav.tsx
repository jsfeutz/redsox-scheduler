"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Calendar,
  Heart,
  Settings,
  MoreHorizontal,
  MapPin,
  Users,
  UsersRound,
  Megaphone,
  UserCog,
  X,
} from "lucide-react";
import { useState } from "react";

const primaryTabs = [
  { href: "/dashboard/schedules", label: "Schedule", icon: Calendar },
  { href: "/dashboard/volunteers", label: "Jobs", icon: Heart },
  { href: "/dashboard/teams", label: "Teams", icon: Users },
  { href: "/help-wanted", label: "Vol. Signup", icon: Megaphone },
];

const moreTabs: { href: string; label: string; icon: typeof LayoutDashboard; adminOnly?: boolean }[] = [
  { href: "/dashboard/facilities", label: "Facilities", icon: MapPin },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
  { href: "/dashboard/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/dashboard/profile", label: "Profile", icon: UserCog },
];

export function BottomNav() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [moreOpen, setMoreOpen] = useState(false);

  const role = (session?.user as { role?: string })?.role;
  const isAdmin = role === "ADMIN";

  const visibleMoreTabs = moreTabs.filter((t) => !t.adminOnly || isAdmin);

  const isMoreActive = visibleMoreTabs.some(
    (t) => pathname === t.href || pathname.startsWith(t.href + "/")
  );

  return (
    <>
      {moreOpen && (
        <div
          className="fixed inset-0 bg-black/50 glass z-40 md:hidden"
          onClick={() => setMoreOpen(false)}
        />
      )}

      {moreOpen && (
        <div className="fixed bottom-[calc(4rem+env(safe-area-inset-bottom))] left-3 right-3 z-50 md:hidden animate-in slide-in-from-bottom-4 fade-in duration-200">
          <div className="bg-card border border-border/50 rounded-2xl shadow-2xl shadow-black/30 p-2 space-y-0.5">
            {visibleMoreTabs.map((tab) => {
              const active =
                pathname === tab.href || pathname.startsWith(tab.href + "/");
              return (
                <Link
                  key={tab.href}
                  href={tab.href}
                  onClick={() => setMoreOpen(false)}
                  className={cn(
                    "flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium transition-colors touch-target",
                    active
                      ? "bg-primary/15 text-primary"
                      : "text-muted-foreground active:bg-accent/50"
                  )}
                >
                  <tab.icon className="h-5 w-5 shrink-0" />
                  {tab.label}
                </Link>
              );
            })}
            <button
              onClick={() => setMoreOpen(false)}
              className="flex items-center gap-3 rounded-xl px-4 py-3 text-sm font-medium text-muted-foreground w-full active:bg-accent/50 touch-target"
            >
              <X className="h-5 w-5 shrink-0" />
              Close
            </button>
          </div>
        </div>
      )}

      <nav className="fixed bottom-0 left-0 right-0 z-40 md:hidden bg-card/95 glass border-t border-border/50 safe-bottom">
        <div className="flex items-stretch justify-around px-2">
          {primaryTabs.map((tab) => {
            const active =
              pathname === tab.href || pathname.startsWith(tab.href + "/");
            return (
              <Link
                key={tab.href}
                href={tab.href}
                className={cn(
                  "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[4rem] touch-target transition-colors",
                  active ? "text-primary" : "text-muted-foreground"
                )}
              >
                <tab.icon
                  className={cn(
                    "h-6 w-6 transition-transform",
                    active && "scale-110"
                  )}
                  strokeWidth={active ? 2.5 : 1.8}
                />
                <span className="text-[10px] font-semibold leading-tight">
                  {tab.label}
                </span>
              </Link>
            );
          })}

          <button
            onClick={() => setMoreOpen(!moreOpen)}
            className={cn(
              "flex flex-col items-center justify-center gap-0.5 py-2 px-3 min-w-[4rem] touch-target transition-colors",
              isMoreActive || moreOpen
                ? "text-primary"
                : "text-muted-foreground"
            )}
          >
            <MoreHorizontal
              className={cn(
                "h-6 w-6 transition-transform",
                (isMoreActive || moreOpen) && "scale-110"
              )}
              strokeWidth={isMoreActive || moreOpen ? 2.5 : 1.8}
            />
            <span className="text-[10px] font-semibold leading-tight">
              More
            </span>
          </button>
        </div>
      </nav>
    </>
  );
}
