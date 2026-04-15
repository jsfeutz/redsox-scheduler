"use client";

import { useState } from "react";
import Link from "next/link";
import { Smartphone, Share, PlusSquare, Loader2, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { cn } from "@/lib/utils";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { usePwaInstall } from "@/components/providers/pwa-install-provider";
import { toast } from "sonner";
import { PublicFooter } from "@/components/public-footer";
import { PublicNav } from "@/components/public-nav";

function isIos(): boolean {
  if (typeof navigator === "undefined") return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function InstallAppContent() {
  const { canPrompt, isStandalone, promptInstall } = usePwaInstall();
  const [installing, setInstalling] = useState(false);
  const ios = isIos();

  async function onInstallClick() {
    setInstalling(true);
    try {
      const result = await promptInstall();
      if (result === "accepted") {
        toast.success("App installed");
      } else if (result === "dismissed") {
        toast.message("Install cancelled — you can try again anytime from this page.");
      } else {
        toast.message(
          "Install isn’t available in this browser. Use the steps below for your device."
        );
      }
    } finally {
      setInstalling(false);
    }
  }

  return (
    <div className="min-h-dvh bg-background flex flex-col pb-20 md:pb-0">
      <div className="flex-1 mx-auto w-full max-w-lg px-4 py-6 md:py-14">
        <PublicNav />
        <div className="text-center mb-8 mt-4">
          <div className="inline-flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/10 text-primary mb-4">
            <Smartphone className="h-7 w-7" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight">Install the Redsox App</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Add Rubicon Redsox Scheduler to your home screen for quick access and
            a full-screen experience.
          </p>
        </div>

        {isStandalone ? (
          <Card className="rounded-2xl border-border/50">
            <CardHeader>
              <CardTitle className="text-base flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                You&apos;re using the installed app
              </CardTitle>
              <CardDescription>
                This page is already running as a standalone app. Use the icon on
                your home screen to open it next time.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Link
                href="/dashboard"
                className={cn(
                  buttonVariants({ variant: "outline", size: "default" }),
                  "rounded-xl w-full inline-flex"
                )}
              >
                Go to dashboard
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-4">
            {canPrompt && (
              <Card className="rounded-2xl border-primary/30 bg-primary/5">
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">Install on this device</CardTitle>
                  <CardDescription>
                    Your browser can add the app in one step.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Button
                    className="rounded-xl w-full"
                    size="lg"
                    disabled={installing}
                    onClick={onInstallClick}
                  >
                    {installing ? (
                      <>
                        <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                        Installing…
                      </>
                    ) : (
                      <>
                        <Smartphone className="h-4 w-4 mr-2" />
                        Install app
                      </>
                    )}
                  </Button>
                </CardContent>
              </Card>
            )}

            {ios && (
              <Card className="rounded-2xl border-border/50">
                <CardHeader>
                  <CardTitle className="text-base">iPhone or iPad (Safari)</CardTitle>
                  <CardDescription>
                    Apple doesn&apos;t show a system install popup. Add the app
                    manually:
                  </CardDescription>
                </CardHeader>
                <CardContent className="space-y-3 text-sm text-muted-foreground">
                  <ol className="list-decimal list-inside space-y-2">
                    <li className="flex gap-2 items-start">
                      <span className="shrink-0">Tap the</span>
                      <Share className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        <strong className="text-foreground">Share</strong> button in
                        Safari&apos;s toolbar.
                      </span>
                    </li>
                    <li>
                      Scroll and tap{" "}
                      <strong className="text-foreground">Add to Home Screen</strong>
                      .
                    </li>
                    <li className="flex gap-2 items-start">
                      <PlusSquare className="h-4 w-4 shrink-0 text-primary mt-0.5" />
                      <span>
                        Confirm with <strong className="text-foreground">Add</strong>
                        .
                      </span>
                    </li>
                  </ol>
                </CardContent>
              </Card>
            )}

            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Android (Chrome)</CardTitle>
                <CardDescription>
                  If you don&apos;t see the button above, use the browser menu.
                </CardDescription>
              </CardHeader>
              <CardContent className="text-sm text-muted-foreground space-y-2">
                <p>
                  Open the <strong className="text-foreground">⋮</strong> menu →{" "}
                  <strong className="text-foreground">Install app</strong> or{" "}
                  <strong className="text-foreground">Add to Home screen</strong>.
                </p>
              </CardContent>
            </Card>

            <Card className="rounded-2xl border-border/50">
              <CardHeader>
                <CardTitle className="text-base">Desktop (Chrome / Edge)</CardTitle>
                <CardDescription>
                  Look for the install icon in the address bar, or use the menu →{" "}
                  <strong className="text-foreground">Install Rubicon Redsox…</strong>
                </CardDescription>
              </CardHeader>
            </Card>

            {!canPrompt && !ios && (
              <p className="text-xs text-center text-muted-foreground px-2">
                If you dismissed the install prompt earlier, try reloading this site
                once, then return here — some browsers only offer the prompt again
                after a fresh visit.
              </p>
            )}
          </div>
        )}

        <PublicFooter />
      </div>
    </div>
  );
}
