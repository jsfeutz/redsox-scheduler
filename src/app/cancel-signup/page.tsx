"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CheckCircle2, XCircle, Loader2, AlertTriangle } from "lucide-react";
import Link from "next/link";
import { useVolunteerIdentity } from "@/components/providers/volunteer-identity";
import { PublicFooter } from "@/components/public-footer";

function CancelContent() {
  const { identity } = useVolunteerIdentity();
  const searchParams = useSearchParams();
  const token = searchParams.get("token");

  const [status, setStatus] = useState<
    "confirm" | "loading" | "success" | "error" | "invalid"
  >(token ? "confirm" : "invalid");
  const [result, setResult] = useState<{
    jobName?: string;
    eventTitle?: string;
    error?: string;
  }>({});

  async function handleCancel() {
    setStatus("loading");
    try {
      const res = await fetch("/api/signup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        setResult({ error: data.error || "Failed to cancel" });
        setStatus("error");
        return;
      }
      setResult({ jobName: data.jobName, eventTitle: data.eventTitle });
      setStatus("success");
    } catch {
      setResult({ error: "Something went wrong" });
      setStatus("error");
    }
  }

  return (
    <div className="min-h-dvh flex items-center justify-center px-4 bg-background">
      <Card className="w-full max-w-sm rounded-2xl border-border/50">
        <CardContent className="flex flex-col items-center text-center py-12 px-6">
          {status === "invalid" && (
            <>
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h1 className="text-xl font-bold">Invalid Link</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                This cancel link is missing or invalid.
              </p>
            </>
          )}

          {status === "confirm" && (
            <>
              <XCircle className="h-12 w-12 text-destructive mb-4" />
              <h1 className="text-xl font-bold">Cancel Signup?</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Are you sure you want to cancel your volunteer signup?
              </p>
              <div className="flex gap-3 mt-6 w-full">
                <Link
                  href="/help-wanted"
                  className="flex-1 inline-flex items-center justify-center h-12 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                >
                  Keep It
                </Link>
                <Button
                  onClick={handleCancel}
                  className="flex-1 h-12 rounded-xl bg-destructive hover:bg-destructive/90"
                >
                  Yes, Cancel
                </Button>
              </div>
            </>
          )}

          {status === "loading" && (
            <>
              <Loader2 className="h-12 w-12 text-muted-foreground animate-spin mb-4" />
              <h1 className="text-xl font-bold">Cancelling...</h1>
            </>
          )}

          {status === "success" && (
            <>
              <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
              <h1 className="text-xl font-bold">Signup Cancelled</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                Your signup for{" "}
                <strong>{result.jobName}</strong> at{" "}
                <strong>{result.eventTitle}</strong> has been cancelled.
              </p>
              <div className="flex gap-3 mt-6 w-full">
                <Link
                  href="/help-wanted"
                  className="flex-1 inline-flex items-center justify-center h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium"
                >
                  Volunteer Signup
                </Link>
                {identity?.token && (
                  <Link
                    href={`/my-signups?token=${identity.token}`}
                    className="flex-1 inline-flex items-center justify-center h-10 rounded-xl border border-input bg-background hover:bg-accent hover:text-accent-foreground text-sm font-medium"
                  >
                    My Signups
                  </Link>
                )}
              </div>
            </>
          )}

          {status === "error" && (
            <>
              <AlertTriangle className="h-12 w-12 text-amber-500 mb-4" />
              <h1 className="text-xl font-bold">Oops</h1>
              <p className="mt-2 text-sm text-muted-foreground">
                {result.error}
              </p>
              <Link
                href="/help-wanted"
                className="mt-6 inline-flex items-center justify-center h-10 rounded-xl bg-primary text-primary-foreground hover:bg-primary/90 text-sm font-medium px-6"
              >
                Back to Volunteer Signup
              </Link>
            </>
          )}
        </CardContent>
      </Card>
      <div className="mt-6">
        <PublicFooter />
      </div>
    </div>
  );
}

export default function CancelSignupPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <CancelContent />
    </Suspense>
  );
}
