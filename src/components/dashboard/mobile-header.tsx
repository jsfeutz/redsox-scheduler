"use client";

import { useSession, signOut } from "next-auth/react";
import { LogOut } from "lucide-react";

export function MobileHeader() {
  const { data: session } = useSession();

  return (
    <header className="fixed top-0 left-0 right-0 z-30 md:hidden bg-card/95 glass border-b border-border/50">
      <div
        className="flex items-center justify-between px-4 h-14"
        style={{ paddingTop: "env(safe-area-inset-top)" }}
      >
        <div className="flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-gradient-to-br from-primary to-primary/80 text-white font-black text-[10px] shadow-md shadow-primary/20">
            RR
          </div>
          <span className="text-sm font-bold tracking-tight">
            Rubicon Redsox
          </span>
        </div>
        <button
          onClick={() => signOut({ callbackUrl: "/login" })}
          className="flex items-center gap-1.5 text-muted-foreground active:text-destructive touch-target justify-center"
        >
          <span className="text-xs font-medium hidden min-[380px]:inline">
            {session?.user?.name?.split(" ")[0]}
          </span>
          <LogOut className="h-4 w-4" />
        </button>
      </div>
    </header>
  );
}
