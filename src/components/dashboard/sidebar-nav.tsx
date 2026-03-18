"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { signOut, useSession } from "next-auth/react";
import { cn } from "@/lib/utils";
import {
  MapPin,
  Users,
  UsersRound,
  Calendar,
  Heart,
  Megaphone,
  Settings,
  LogOut,
  ChevronRight,
  UserCog,
} from "lucide-react";
import { Button } from "@/components/ui/button";

const navItems: { href: string; label: string; icon: typeof Calendar; adminOnly?: boolean }[] = [
  { href: "/dashboard/schedules", label: "Schedule", icon: Calendar },
  { href: "/dashboard/volunteers", label: "Jobs", icon: Heart },
  { href: "/dashboard/teams", label: "Teams", icon: Users },
  { href: "/help-wanted", label: "Volunteer Signup", icon: Megaphone },
  { href: "/dashboard/facilities", label: "Facilities", icon: MapPin },
  { href: "/dashboard/users", label: "Users", icon: UsersRound, adminOnly: true },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
];

export function SidebarNav() {
  const pathname = usePathname();
  const { data: session } = useSession();

  return (
    <aside className="fixed inset-y-0 left-0 z-40 w-72 bg-sidebar border-r border-sidebar-border hidden md:flex flex-col">
      <div className="flex items-center gap-3 px-6 py-5">
        <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-primary to-primary/80 text-white font-black text-xs shadow-lg shadow-primary/25 shrink-0">
          RR
        </div>
        <div className="min-w-0">
          <span className="text-base font-bold tracking-tight block">
            Rubicon Redsox
          </span>
          <span className="text-[11px] text-muted-foreground font-medium uppercase tracking-widest">
            Scheduler
          </span>
        </div>
      </div>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

      <nav className="flex-1 overflow-y-auto px-3 py-4 space-y-0.5">
        {navItems.filter((item) => {
          if (item.adminOnly) {
            const role = (session?.user as { role?: string })?.role;
            return role === "ADMIN";
          }
          return true;
        }).map((item) => {
          const active =
            pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200",
                active
                  ? "bg-primary/15 text-primary shadow-sm"
                  : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
              )}
            >
              <item.icon
                className={cn(
                  "h-[18px] w-[18px] shrink-0 transition-colors",
                  active
                    ? "text-primary"
                    : "text-muted-foreground group-hover:text-foreground"
                )}
              />
              <span className="flex-1">{item.label}</span>
              {active && (
                <ChevronRight className="h-3.5 w-3.5 text-primary/50" />
              )}
            </Link>
          );
        })}
      </nav>

      <div className="h-px bg-gradient-to-r from-transparent via-border to-transparent mx-4" />

      <div className="p-4">
        <div className="flex items-center gap-3 mb-3 px-1">
          <div className="flex h-9 w-9 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold ring-2 ring-primary/10">
            {session?.user?.name?.[0]?.toUpperCase() || "?"}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold truncate">
              {session?.user?.name || "User"}
            </p>
            <p className="text-[11px] text-muted-foreground truncate capitalize">
              {session?.user?.role?.replace(/_/g, " ").toLowerCase() || ""}
            </p>
          </div>
        </div>
        <Link
          href="/dashboard/profile"
          className={cn(
            "flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-medium transition-colors",
            pathname === "/dashboard/profile"
              ? "bg-primary/15 text-primary"
              : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
          )}
        >
          <UserCog className="h-4 w-4" />
          Profile
        </Link>
        <Button
          variant="ghost"
          size="sm"
          className="w-full justify-start text-muted-foreground hover:text-destructive rounded-xl"
          onClick={() => signOut({ callbackUrl: "/login" })}
        >
          <LogOut className="mr-2 h-4 w-4" />
          Sign Out
        </Button>
      </div>
    </aside>
  );
}
