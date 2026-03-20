"use client";

import { useState } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import { ChevronDown, LogOut, Megaphone, UserCog } from "lucide-react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { cn } from "@/lib/utils";

export function MobileHeader() {
  const { data: session } = useSession();
  const [open, setOpen] = useState(false);
  const role = session?.user?.role;
  const roleLabel =
    typeof role === "string"
      ? role.replace(/_/g, " ").toLowerCase()
      : "";

  return (
    <header className="fixed top-0 left-0 right-0 z-30 md:hidden bg-card/95 glass border-b border-border/50">
      <div
        className="flex items-center justify-between px-3 h-12"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2 min-w-0">
          <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white font-black text-[9px] shadow-md shadow-primary/20">
            RR
          </div>
          <span className="text-sm font-bold tracking-tight truncate">
            Rubicon Redsox
          </span>
        </div>

        <Popover open={open} onOpenChange={setOpen}>
          <PopoverTrigger
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5 -mr-1",
              "min-h-[44px] min-w-[44px] sm:min-w-0",
              "active:bg-accent/60 outline-none touch-manipulation"
            )}
          >
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-xs font-bold ring-2 ring-primary/10">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="hidden min-[360px]:flex flex-col items-start min-w-0 text-left">
              <span className="text-xs font-semibold leading-tight truncate max-w-[120px]">
                {session?.user?.name || "Account"}
              </span>
              {roleLabel && (
                <span className="text-[10px] text-primary/80 capitalize truncate max-w-[120px]">
                  {roleLabel}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </PopoverTrigger>
          <PopoverContent align="end" side="bottom" sideOffset={8} className="w-56 p-1.5">
            <div className="px-2 py-2 border-b border-border/50 mb-1 min-[360px]:hidden">
              <p className="text-sm font-semibold truncate">
                {session?.user?.name || "Account"}
              </p>
              {roleLabel && (
                <p className="text-[11px] text-primary/80 capitalize">{roleLabel}</p>
              )}
            </div>
            <Link
              href="/dashboard/profile"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent/80 transition-colors"
            >
              <UserCog className="h-4 w-4 text-muted-foreground" />
              Profile
            </Link>
            <Link
              href="/help-wanted"
              onClick={() => setOpen(false)}
              className="flex items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium hover:bg-accent/80 transition-colors"
            >
              <Megaphone className="h-4 w-4 text-muted-foreground" />
              Volunteer Signup
            </Link>
            <button
              type="button"
              onClick={() => {
                setOpen(false);
                signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-sm font-medium text-muted-foreground hover:bg-destructive/10 hover:text-destructive transition-colors"
            >
              <LogOut className="h-4 w-4" />
              Sign Out
            </button>
          </PopoverContent>
        </Popover>
      </div>
    </header>
  );
}
