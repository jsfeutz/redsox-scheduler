"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import { format, parseISO } from "date-fns";
import { toast } from "sonner";
import {
  Mail,
  Loader2,
  Calendar,
  Clock,
  MapPin,
  XCircle,
  CheckCircle2,
  ClipboardList,
  LogOut,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";
import { useVolunteerIdentity } from "@/components/providers/volunteer-identity";
import { PublicFooter } from "@/components/public-footer";

interface Signup {
  id: string;
  cancelToken: string;
  name: string;
  playerName: string | null;
  jobName: string;
  eventTitle: string;
  startTime: string | null;
  endTime: string | null;
  teamName: string;
  teamColor: string;
  facilityName: string;
  subFacilityName: string;
  hoursEarned: number | null;
  isTeamRole?: boolean;
  createdAt: string;
}

function MySignupsContent() {
  const searchParams = useSearchParams();
  const tokenParam = searchParams.get("token");
  const { identity, setIdentity, clearIdentity } = useVolunteerIdentity();

  const effectiveToken = tokenParam || identity?.token || null;

  const [view, setView] = useState<"email" | "sent" | "signups" | "loading">(
    effectiveToken ? "loading" : "email"
  );
  const [email, setEmail] = useState("");
  const [signups, setSignups] = useState<Signup[]>([]);
  const [verifiedEmail, setVerifiedEmail] = useState("");
  const [verifiedToken, setVerifiedToken] = useState("");
  const [sendingEmail, setSendingEmail] = useState(false);

  useEffect(() => {
    if (effectiveToken) {
      verifyToken(effectiveToken);
    }
  }, [effectiveToken]); // eslint-disable-line react-hooks/exhaustive-deps

  async function verifyToken(token: string) {
    setView("loading");
    try {
      const res = await fetch("/api/signup/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (identity?.token === token) clearIdentity();
        toast.error(data.error || "Link expired or invalid");
        setView("email");
        return;
      }
      setVerifiedEmail(data.email);
      setVerifiedToken(token);
      setSignups(data.signups);
      setView("signups");

      const firstName = data.signups?.[0]?.name || identity?.name || "";
      setIdentity({ email: data.email, name: firstName, token });
    } catch {
      toast.error("Something went wrong");
      setView("email");
    }
  }

  async function handleRequestLink(e: React.FormEvent) {
    e.preventDefault();
    if (!email.trim()) return;
    setSendingEmail(true);
    try {
      await fetch("/api/signup/request-link", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim() }),
      });
      setView("sent");
    } catch {
      toast.error("Failed to send link");
    } finally {
      setSendingEmail(false);
    }
  }

  async function handleCancel(cancelToken: string) {
    try {
      const res = await fetch("/api/signup/cancel", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token: cancelToken }),
      });
      if (!res.ok) {
        const data = await res.json();
        toast.error(data.error || "Failed to cancel");
        return;
      }
      setSignups((prev) => prev.filter((s) => s.cancelToken !== cancelToken));
      toast.success("Signup cancelled");
    } catch {
      toast.error("Something went wrong");
    }
  }

  return (
    <div className="min-h-dvh bg-background">
      <div className="bg-gradient-to-b from-primary/10 via-background to-background">
        <div className="mx-auto max-w-xl px-4 py-10 sm:py-16">
          <div className="mb-8 text-center">
            <div className="mx-auto mb-5 flex h-14 w-14 sm:h-16 sm:w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-primary to-primary/80 text-white shadow-lg shadow-primary/25">
              <ClipboardList className="h-7 w-7" />
            </div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight">
              My Signups
            </h1>
            <p className="mt-3 text-muted-foreground max-w-md mx-auto">
              View and manage your volunteer signups
            </p>
          </div>

          {/* Email entry */}
          {view === "email" && (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="py-10 px-6 sm:px-8">
                <div className="text-center mb-6">
                  <Mail className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
                  <p className="text-sm text-muted-foreground">
                    Enter the email you used to sign up and we&apos;ll send you a
                    link to manage your signups.
                  </p>
                </div>
                <form onSubmit={handleRequestLink} className="space-y-4">
                  <Input
                    type="email"
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    required
                    className="h-12 rounded-xl text-base"
                  />
                  <Button
                    type="submit"
                    disabled={sendingEmail}
                    className="w-full h-12 rounded-xl text-base font-semibold shadow-md shadow-primary/15 active:scale-[0.98] transition-all"
                  >
                    {sendingEmail ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      "Send Me a Link"
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          )}

          {/* Email sent */}
          {view === "sent" && (
            <Card className="rounded-2xl border-border/50">
              <CardContent className="flex flex-col items-center text-center py-12 px-6">
                <CheckCircle2 className="h-12 w-12 text-emerald-500 mb-4" />
                <h2 className="text-xl font-bold">Check Your Email</h2>
                <p className="mt-2 text-sm text-muted-foreground max-w-sm">
                  If there are signups associated with that email, you&apos;ll
                  receive a link shortly. Check your inbox (and spam folder).
                </p>
                <p className="mt-4 text-sm text-muted-foreground">
                  Testing locally?{" "}
                  <a
                    href="http://localhost:8025"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Open Mailpit
                  </a>
                </p>
              </CardContent>
            </Card>
          )}

          {/* Loading */}
          {view === "loading" && (
            <div className="flex justify-center py-20">
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
          )}

          {/* Signups list */}
          {view === "signups" && (
            <div className="space-y-4">
              <div className="flex items-center justify-between flex-wrap gap-3">
                <div className="flex items-center gap-2 min-w-0 flex-wrap">
                  <p className="text-sm text-muted-foreground truncate">
                    Signed up as <strong>{verifiedEmail}</strong>
                  </p>
                  <button
                    onClick={() => { clearIdentity(); setView("email"); setVerifiedEmail(""); setVerifiedToken(""); setSignups([]); }}
                    className="text-muted-foreground hover:text-foreground shrink-0"
                    title="Switch account"
                  >
                    <LogOut className="h-3.5 w-3.5" />
                  </button>
                </div>
                {signups.length > 0 && verifiedToken && (
                  <a
                    href={`/api/signup/calendar/all/${verifiedToken}.ics`}
                    className="inline-flex items-center gap-2 rounded-xl border border-border/50 bg-card px-4 py-2.5 text-sm font-medium hover:bg-accent/50 transition-colors"
                  >
                    <Calendar className="h-4 w-4" />
                    Add All to Calendar
                  </a>
                )}
              </div>

              {signups.length > 0 && (
                <div className="grid grid-cols-2 gap-3">
                  <Card className="rounded-2xl border-border/50">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-muted-foreground font-medium">Events</p>
                      <p className="text-2xl font-bold mt-1">{signups.length}</p>
                    </CardContent>
                  </Card>
                  <Card className="rounded-2xl border-border/50">
                    <CardContent className="py-4 text-center">
                      <p className="text-sm text-muted-foreground font-medium">Total Hours</p>
                      <p className="text-2xl font-bold mt-1">{signups.reduce((sum, s) => sum + (s.hoursEarned ?? 0), 0)}</p>
                    </CardContent>
                  </Card>
                </div>
              )}

              {signups.length === 0 ? (
                <Card className="rounded-2xl border-border/50">
                  <CardContent className="flex flex-col items-center py-12">
                    <Calendar className="h-12 w-12 text-muted-foreground/30 mb-3" />
                    <p className="font-semibold">No active signups</p>
                    <p className="mt-1 text-sm text-muted-foreground">
                      All caught up! Browse jobs on the{" "}
                      <Link
                        href="/help-wanted"
                        className="text-primary hover:underline"
                      >
                        Volunteer Signup
                      </Link>{" "}
                      board.
                    </p>
                  </CardContent>
                </Card>
              ) : (
                signups.map((signup) => (
                  <SignupCard
                    key={signup.id}
                    signup={signup}
                    onCancel={handleCancel}
                  />
                ))
              )}
            </div>
          )}

          <div className="mt-10 flex items-center justify-center gap-4 text-sm">
            <Link href="/" className="text-primary hover:underline font-medium">
              Home
            </Link>
            <span className="text-border">|</span>
            <Link href="/help-wanted" className="text-primary hover:underline font-medium">
              Volunteer Signup
            </Link>
          </div>
          <PublicFooter />
        </div>
      </div>
    </div>
  );
}

function SignupCard({
  signup,
  onCancel,
}: {
  signup: Signup;
  onCancel: (token: string) => void;
}) {
  const [confirming, setConfirming] = useState(false);
  const isPast = signup.startTime
    ? new Date(signup.startTime) < new Date()
    : false;

  return (
    <Card className="rounded-2xl border-border/50 overflow-hidden">
      <div
        className="h-1"
        style={{ backgroundColor: signup.teamColor }}
      />
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0 flex-1">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold">{signup.jobName}</span>
              <Badge
                variant="outline"
                style={{
                  borderColor: signup.teamColor,
                  color: signup.teamColor,
                }}
                className="text-sm"
              >
                {signup.teamName}
              </Badge>
              {signup.hoursEarned != null && (
                <Badge variant="secondary" className="text-sm rounded-lg">
                  {signup.hoursEarned}h
                </Badge>
              )}
              {signup.isTeamRole && (
                <Badge variant="secondary" className="text-sm rounded-lg">
                  Team Role
                </Badge>
              )}
              {isPast && !signup.isTeamRole && (
                <Badge variant="secondary" className="text-sm rounded-lg">
                  Past
                </Badge>
              )}
            </div>
            {signup.playerName && (
              <p className="mt-1 text-sm text-primary font-medium">
                Volunteering for {signup.playerName}
              </p>
            )}
            <p className="mt-1 font-medium text-base">{signup.eventTitle}</p>
            <div className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
              {signup.startTime && (
                <>
                  <span className="flex items-center gap-1">
                    <Calendar className="h-4 w-4" />
                    {format(parseISO(signup.startTime), "EEEE, MMM d")}
                  </span>
                  <span className="flex items-center gap-1">
                    <Clock className="h-4 w-4" />
                    {format(parseISO(signup.startTime), "h:mm a")}
                    {signup.endTime &&
                      ` – ${format(parseISO(signup.endTime), "h:mm a")}`}
                  </span>
                </>
              )}
              <span className="flex items-center gap-1">
                <MapPin className="h-4 w-4" />
                {signup.facilityName}
                {signup.subFacilityName && ` – ${signup.subFacilityName}`}
              </span>
            </div>
          </div>
        </div>

        {!isPast && (
          <div className="mt-4 pt-3 border-t border-border/50">
            {confirming ? (
              <div className="flex items-center gap-2">
                <span className="text-sm text-muted-foreground flex-1">
                  Cancel this signup?
                </span>
                <Button
                  variant="outline"
                  size="sm"
                  className="rounded-lg"
                  onClick={() => setConfirming(false)}
                >
                  No
                </Button>
                <Button
                  size="sm"
                  className="rounded-lg bg-destructive hover:bg-destructive/90"
                  onClick={() => onCancel(signup.cancelToken)}
                >
                  Yes, Cancel
                </Button>
              </div>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                className="text-destructive hover:text-destructive hover:bg-destructive/10 rounded-lg"
                onClick={() => setConfirming(true)}
              >
                <XCircle className="mr-1.5 h-3.5 w-3.5" />
                Cancel Signup
              </Button>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}

export default function MySignupsPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-dvh flex items-center justify-center bg-background">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      }
    >
      <MySignupsContent />
    </Suspense>
  );
}
