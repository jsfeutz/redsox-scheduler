"use client";

import { useState, useMemo } from "react";
import Link from "next/link";
import { useSession, signOut } from "next-auth/react";
import {
  ChevronDown,
  LogOut,
  Megaphone,
  UserCog,
  Settings,
  Download,
} from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { cn } from "@/lib/utils";
import { BrandingMark } from "@/components/branding/branding-mark";
import { useBranding } from "@/components/branding/branding-context";

export function MobileHeader() {
  const { data: session } = useSession();
  const { organizationName } = useBranding();
  const [menuOpen, setMenuOpen] = useState(false);
  const role = session?.user?.role;
  const roleLabel =
    typeof role === "string"
      ? role.replace(/_/g, " ").toLowerCase()
      : "";

  const menuSubtitle = useMemo(() => {
    const parts = [roleLabel, session?.user?.email].filter(Boolean);
    return parts.length > 0 ? parts.join(" · ") : "Manage your account";
  }, [roleLabel, session?.user?.email]);

  function closeMenu() {
    setMenuOpen(false);
  }

  return (
    <>
      <header className="fixed top-0 left-0 right-0 z-30 md:hidden bg-card/95 glass border-b border-border/50">
        <div
          className="flex items-center justify-between px-3 min-h-12 h-14"
          style={{ paddingTop: "env(safe-area-inset-top)" }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <BrandingMark variant="mobile" />
            <span className="text-base font-bold tracking-tight truncate">
              {organizationName}
            </span>
          </div>

          <button
            type="button"
            onClick={() => setMenuOpen(true)}
            aria-expanded={menuOpen}
            aria-haspopup="dialog"
            aria-label="Open account menu"
            className={cn(
              "flex items-center gap-2 rounded-xl px-2 py-1.5 -mr-1",
              "min-h-[44px] min-w-[44px] sm:min-w-0",
              "active:bg-accent/60 outline-none touch-manipulation"
            )}
          >
            <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-primary/20 to-primary/5 text-primary text-sm font-bold ring-2 ring-primary/10">
              {session?.user?.name?.[0]?.toUpperCase() || "?"}
            </div>
            <div className="hidden min-[360px]:flex flex-col items-start min-w-0 text-left">
              <span className="text-sm font-semibold leading-snug truncate max-w-[120px]">
                {session?.user?.name || "Account"}
              </span>
              {roleLabel && (
                <span className="text-xs text-primary/80 capitalize truncate max-w-[120px]">
                  {roleLabel}
                </span>
              )}
            </div>
            <ChevronDown className="h-4 w-4 shrink-0 text-muted-foreground" />
          </button>
        </div>
      </header>

      <Sheet open={menuOpen} onOpenChange={setMenuOpen}>
        <SheetContent
          side="bottom"
          showCloseButton
          className="rounded-t-2xl p-0 max-h-[min(85dvh,28rem)] flex flex-col z-[60]"
        >
          <SheetHeader className="px-4 pt-2 pb-3 text-left border-b border-border/50 space-y-1">
            <SheetTitle className="text-lg">
              {session?.user?.name || "Account"}
            </SheetTitle>
            <SheetDescription className="line-clamp-2 break-all">
              {menuSubtitle}
            </SheetDescription>
          </SheetHeader>

          <nav
            className="flex flex-col py-2 px-2 pb-[max(1rem,env(safe-area-inset-bottom))] overflow-y-auto"
            aria-label="Account"
          >
            <Link
              href="/dashboard/profile"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-foreground active:bg-accent/80 transition-colors touch-manipulation"
            >
              <UserCog className="h-5 w-5 shrink-0 text-muted-foreground" />
              Profile
            </Link>
            <Link
              href="/dashboard/settings"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-foreground active:bg-accent/80 transition-colors touch-manipulation"
            >
              <Settings className="h-5 w-5 shrink-0 text-muted-foreground" />
              Settings
            </Link>
            <Link
              href="/help-wanted"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-foreground active:bg-accent/80 transition-colors touch-manipulation"
            >
              <Megaphone className="h-5 w-5 shrink-0 text-muted-foreground" />
              Volunteer signup
            </Link>
            <Link
              href="/install"
              onClick={closeMenu}
              className="flex items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-foreground active:bg-accent/80 transition-colors touch-manipulation"
            >
              <Download className="h-5 w-5 shrink-0 text-muted-foreground" />
              Install app
            </Link>
            <div className="h-px bg-border/60 my-1 mx-2" />
            <button
              type="button"
              onClick={() => {
                closeMenu();
                signOut({ callbackUrl: "/login" });
              }}
              className="flex w-full items-center gap-3 rounded-xl px-4 py-3.5 text-base font-medium text-destructive active:bg-destructive/10 transition-colors touch-manipulation text-left"
            >
              <LogOut className="h-5 w-5 shrink-0" />
              Sign out
            </button>
          </nav>
        </SheetContent>
      </Sheet>
    </>
  );
}
